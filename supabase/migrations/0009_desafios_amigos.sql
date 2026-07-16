-- Control.Evo — Desafíos entre amigos (mini red social, primera pieza)
-- Un cliente (retador) reta a OTRO cliente puntual (retado) dentro de un negocio: "3 visitas
-- antes de tal fecha" o "probá el producto nuevo". Cuando el retado cumple la meta REAL —
-- verificada server-side contra la tabla `visitas` — AMBOS ganan puntos bonus en ese negocio.
-- Antes de cumplirse no pasa nada (sin premio anticipado ni parcial).
--
-- DECISIONES DE DISEÑO (documentadas):
--   1. TABLA NUEVA `desafios_amigos`, no se extiende `desafios`. La tabla `desafios` (0001) es
--      de UN solo cliente, guarda `progreso`/`estado` escribibles por el cliente (policy FOR ALL)
--      y no tiene noción de "retado". Meter una segunda parte ahí obligaría a rehacer su RLS y a
--      confiar en un progreso venido del navegador. Esta tabla nueva copia el patrón probado de
--      `referidos` (0008): relación de dos clientes + `premiado_at`, progreso SIEMPRE calculado
--      server-side, crédito de puntos vía funciones SECURITY DEFINER que bypassean RLS.
--   2. METAS SOPORTADAS: sólo 2 tipos, ambos contables contra `visitas` reales (nada de texto
--      libre no verificable): 'visitas' (N visitas dentro de la ventana del desafío) y
--      'probar_nuevo' (N visitas con es_nuevo=true dentro de la ventana).
--   3. AL RETADO SE LO IDENTIFICA POR SU `codigo_referido` (el mismo código corto ya existente de
--      0008), no por una lista de amigos real ni por teléfono. Reusa infraestructura probada, no
--      expone el teléfono (documento único) y evita construir un flujo de "solicitudes de amistad"
--      en esta primera versión. La tabla `amigos` de 0001 queda para una iteración futura.
--   4. La VENTANA de conteo es [creado_at, vence_at]: sólo cuentan las visitas hechas después de
--      lanzado el desafío y antes del vencimiento. Por eso premiar es seguro aunque la revisión
--      corra pasada la fecha: si `progreso >= meta`, esas visitas cayeron dentro del plazo.
--
-- Backup antes de correr en producción.

-- ============================================================
-- 1. TABLA DE DESAFÍOS ENTRE AMIGOS
-- ============================================================

CREATE TABLE desafios_amigos (
  id BIGSERIAL PRIMARY KEY,
  retador_cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  retado_cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('visitas', 'probar_nuevo')),
  meta INT NOT NULL CHECK (meta > 0),
  vence_at TIMESTAMPTZ NOT NULL,
  creado_at TIMESTAMPTZ DEFAULT NOW(),
  premiado_at TIMESTAMPTZ,                 -- NULL = todavía no cumplido/premiado
  CHECK (retador_cliente_id <> retado_cliente_id)
);

ALTER TABLE desafios_amigos ENABLE ROW LEVEL SECURITY;

-- Cada cliente ve los desafíos donde participa (como retador O como retado). El progreso y el
-- crédito de puntos pasan por las funciones SECURITY DEFINER de abajo (bypassean RLS).
CREATE POLICY "El participante ve sus desafíos" ON desafios_amigos
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = retador_cliente_id)
    OR auth.uid() = (SELECT user_id FROM clientes WHERE id = retado_cliente_id)
  );

CREATE INDEX idx_desafios_amigos_retador ON desafios_amigos(retador_cliente_id, negocio_id);
CREATE INDEX idx_desafios_amigos_retado ON desafios_amigos(retado_cliente_id, negocio_id);

-- ============================================================
-- 2. CREAR UN DESAFÍO
-- ============================================================
-- El retador es SIEMPRE el cliente logueado (auth.uid(), nunca del navegador). El retado se
-- resuelve por su código de referido. Valida que ambos sean clientes reales, que no sea
-- auto-desafío, y que AMBOS tengan relación con el negocio (no se puede retar a alguien que
-- nunca fue a ese local). El servidor calcula `vence_at` a partir de los días (evita depender
-- del reloj del cliente). Guarda contra duplicados: si ya hay un desafío en curso del mismo tipo
-- entre las dos partes en ese negocio, no crea otro.

CREATE OR REPLACE FUNCTION crear_desafio(
  p_codigo_retado TEXT,
  p_negocio_id TEXT,
  p_tipo TEXT,
  p_meta INT,
  p_dias INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retador_id UUID;
  v_retado_id UUID;
  v_meta INT;
  v_dias INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  IF p_tipo NOT IN ('visitas', 'probar_nuevo') THEN
    RETURN jsonb_build_object('creado', false, 'motivo', 'tipo_invalido');
  END IF;

  -- Acotamos meta (1..20) y plazo (1..30 días) a rangos sanos, sin confiar en el cliente.
  v_meta := LEAST(GREATEST(COALESCE(p_meta, 1), 1), 20);
  v_dias := LEAST(GREATEST(COALESCE(p_dias, 7), 1), 30);

  SELECT id INTO v_retador_id FROM clientes WHERE user_id = auth.uid();
  IF v_retador_id IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  SELECT id INTO v_retado_id
  FROM clientes
  WHERE codigo_referido = upper(trim(p_codigo_retado));
  IF v_retado_id IS NULL THEN
    RETURN jsonb_build_object('creado', false, 'motivo', 'codigo_inexistente');
  END IF;

  IF v_retado_id = v_retador_id THEN
    RETURN jsonb_build_object('creado', false, 'motivo', 'auto_desafio');
  END IF;

  -- Ambos tienen que ser clientes de ese negocio (relación existente).
  IF NOT EXISTS (
    SELECT 1 FROM relaciones_negocio
    WHERE cliente_id = v_retador_id AND negocio_id = p_negocio_id
  ) OR NOT EXISTS (
    SELECT 1 FROM relaciones_negocio
    WHERE cliente_id = v_retado_id AND negocio_id = p_negocio_id
  ) THEN
    RETURN jsonb_build_object('creado', false, 'motivo', 'no_es_cliente_del_negocio');
  END IF;

  -- Evitar duplicados: un solo desafío en curso del mismo tipo entre las dos partes por negocio.
  IF EXISTS (
    SELECT 1 FROM desafios_amigos
    WHERE retador_cliente_id = v_retador_id
      AND retado_cliente_id = v_retado_id
      AND negocio_id = p_negocio_id
      AND tipo = p_tipo
      AND premiado_at IS NULL
      AND vence_at > NOW()
  ) THEN
    RETURN jsonb_build_object('creado', false, 'motivo', 'ya_existe');
  END IF;

  INSERT INTO desafios_amigos (retador_cliente_id, retado_cliente_id, negocio_id, tipo, meta, vence_at)
  VALUES (v_retador_id, v_retado_id, p_negocio_id, p_tipo, v_meta, NOW() + (v_dias || ' days')::interval);

  RETURN jsonb_build_object('creado', true);
END;
$$;

GRANT EXECUTE ON FUNCTION crear_desafio(TEXT, TEXT, TEXT, INT, INT) TO authenticated;

-- ============================================================
-- 3. REVISAR Y PREMIAR LOS DESAFÍOS
-- ============================================================
-- La llama cualquiera de las dos partes al abrir el negocio; idempotente y server-side (sin cron).
-- Recorre los desafíos del negocio en los que el que llama participa, y por cada uno cuenta las
-- visitas REALES del retado dentro de la ventana [creado_at, vence_at] (con es_nuevo=true para el
-- tipo 'probar_nuevo'). Si el progreso alcanza la meta y todavía no se premió, acredita el bonus a
-- AMBOS en la misma transacción y marca `premiado_at`. `FOR UPDATE` serializa el caso de que las
-- dos partes disparen la revisión a la vez (evita doble acreditación). Devuelve el estado para la
-- UI separado en 'enviados' (donde soy retador) y 'recibidos' (donde soy retado).

CREATE OR REPLACE FUNCTION revisar_desafios(p_negocio_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_bonus CONSTANT INT := 50;        -- puntos bonus para cada parte al cumplirse
  r RECORD;
  v_progreso INT;
  v_premiado BOOLEAN;
  v_premiado_ahora BOOLEAN;
  v_estado TEXT;
  v_item JSONB;
  v_enviados JSONB := '[]'::jsonb;
  v_recibidos JSONB := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  FOR r IN
    SELECT * FROM desafios_amigos
    WHERE negocio_id = p_negocio_id
      AND (retador_cliente_id = v_cliente_id OR retado_cliente_id = v_cliente_id)
    FOR UPDATE
  LOOP
    -- Progreso = visitas reales del retado dentro de la ventana del desafío.
    SELECT COUNT(*) INTO v_progreso
    FROM visitas
    WHERE cliente_id = r.retado_cliente_id
      AND negocio_id = p_negocio_id
      AND created_at >= r.creado_at
      AND created_at <= r.vence_at
      AND (r.tipo <> 'probar_nuevo' OR es_nuevo = true);

    v_premiado := r.premiado_at IS NOT NULL;
    v_premiado_ahora := false;

    IF NOT v_premiado AND v_progreso >= r.meta THEN
      -- Acreditar el bonus a AMBOS (crea la relación si hiciera falta, aunque ya validamos que
      -- existe al crear el desafío).
      INSERT INTO relaciones_negocio (cliente_id, negocio_id, puntos)
      VALUES (r.retador_cliente_id, p_negocio_id, v_bonus)
      ON CONFLICT (cliente_id, negocio_id)
        DO UPDATE SET puntos = relaciones_negocio.puntos + v_bonus;

      INSERT INTO relaciones_negocio (cliente_id, negocio_id, puntos)
      VALUES (r.retado_cliente_id, p_negocio_id, v_bonus)
      ON CONFLICT (cliente_id, negocio_id)
        DO UPDATE SET puntos = relaciones_negocio.puntos + v_bonus;

      UPDATE desafios_amigos SET premiado_at = NOW() WHERE id = r.id;
      v_premiado := true;
      v_premiado_ahora := true;
    END IF;

    v_estado := CASE
      WHEN v_premiado THEN 'cumplido'
      WHEN NOW() > r.vence_at THEN 'vencido'
      ELSE 'en-curso'
    END;

    v_item := jsonb_build_object(
      'id', r.id,
      'tipo', r.tipo,
      'meta', r.meta,
      'progreso', LEAST(v_progreso, r.meta),
      'estado', v_estado,
      'vence_at', r.vence_at,
      'premiado', v_premiado,
      'premiado_ahora', v_premiado_ahora
    );

    IF r.retador_cliente_id = v_cliente_id THEN
      v_enviados := v_enviados || (v_item || jsonb_build_object(
        'otro_nombre', (SELECT nombre FROM clientes WHERE id = r.retado_cliente_id)
      ));
    ELSE
      v_recibidos := v_recibidos || (v_item || jsonb_build_object(
        'otro_nombre', (SELECT nombre FROM clientes WHERE id = r.retador_cliente_id)
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'bonus', v_bonus,
    'enviados', v_enviados,
    'recibidos', v_recibidos
  );
END;
$$;

GRANT EXECUTE ON FUNCTION revisar_desafios(TEXT) TO authenticated;
