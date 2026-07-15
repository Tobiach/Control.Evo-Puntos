-- Control.Evo — Referidos con beneficio real (invitá a un amigo)
-- Distinto de lo "social" (regalar puntos propios, que es 100% demo/local): acá un cliente
-- comparte el código/link de SU club en un negocio; cuando el invitado se registra con ese
-- código y visita ESE MISMO negocio al menos 4 veces, AMBOS reciben puntos bonus en ese
-- negocio. Antes de las 4 visitas no pasa nada (no hay premio anticipado ni parcial).
-- Todo el cálculo del premio es server-side en funciones SECURITY DEFINER (mismo patrón que
-- `vincular_cliente` 0003 y `canjear_recompensa` 0004): nunca se confía en el conteo de
-- visitas ni en quién es el referente que venga del cliente. Backup antes de correr en prod.

-- ============================================================
-- 1. CÓDIGO DE REFERIDO POR CLIENTE
-- ============================================================
-- Código corto y compartible (6 chars, alfabeto sin caracteres ambiguos O/0/I/1/L).
-- Se genera automáticamente en el alta vía trigger, en TODA vía de INSERT de `clientes`
-- (vincular_cliente, primer cobro del cajero, etc.). Colisión resuelta con reintento.

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_referido TEXT UNIQUE;

CREATE OR REPLACE FUNCTION generar_codigo_referido()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_alfabeto CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- sin O,0,I,1,L
  v_codigo TEXT;
  v_i INT;
BEGIN
  LOOP
    v_codigo := '';
    FOR v_i IN 1..6 LOOP
      v_codigo := v_codigo || substr(v_alfabeto, floor(random() * length(v_alfabeto))::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM clientes WHERE codigo_referido = v_codigo);
  END LOOP;
  RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION set_codigo_referido()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_referido IS NULL THEN
    NEW.codigo_referido := generar_codigo_referido();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_codigo_referido ON clientes;
CREATE TRIGGER trg_codigo_referido
  BEFORE INSERT ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_codigo_referido();

-- Backfill de los clientes que ya existían antes de esta migración.
UPDATE clientes SET codigo_referido = generar_codigo_referido() WHERE codigo_referido IS NULL;

-- ============================================================
-- 2. TABLA DE REFERIDOS
-- ============================================================

CREATE TABLE referidos (
  id BIGSERIAL PRIMARY KEY,
  referente_cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  referido_cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  creado_at TIMESTAMPTZ DEFAULT NOW(),
  premiado_at TIMESTAMPTZ,               -- NULL = todavía no cumplió las 4 visitas
  CHECK (referente_cliente_id <> referido_cliente_id),
  -- Una persona sólo puede haber sido invitada UNA vez por negocio.
  UNIQUE (referido_cliente_id, negocio_id)
);

ALTER TABLE referidos ENABLE ROW LEVEL SECURITY;

-- El cliente ve los referidos que él generó (como referente). El progreso del invitado y todo
-- el crédito de puntos pasa por las funciones SECURITY DEFINER de abajo (bypassean RLS).
CREATE POLICY "El referente ve sus propios referidos" ON referidos
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = referente_cliente_id)
  );

CREATE INDEX idx_referidos_referente ON referidos(referente_cliente_id, negocio_id);
CREATE INDEX idx_referidos_referido ON referidos(referido_cliente_id, negocio_id);

-- ============================================================
-- 3. REGISTRAR EL REFERIDO (al vincularse con un link de invitación)
-- ============================================================
-- Se llama apenas la persona invitada tiene sesión activa + fila de `clientes`. Valida que el
-- código exista y que no sea auto-referencia. Idempotente: si ya existe esa combinación
-- referido+negocio, no hace nada y no es error.

CREATE OR REPLACE FUNCTION registrar_referido(p_codigo_referente TEXT, p_negocio_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referido_id UUID;
  v_referente_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  -- El referido siempre es el cliente logueado (resuelto por auth.uid(), nunca del navegador).
  SELECT id INTO v_referido_id FROM clientes WHERE user_id = auth.uid();
  IF v_referido_id IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  SELECT id INTO v_referente_id
  FROM clientes
  WHERE codigo_referido = upper(trim(p_codigo_referente));
  IF v_referente_id IS NULL THEN
    RETURN jsonb_build_object('registrado', false, 'motivo', 'codigo_inexistente');
  END IF;

  IF v_referente_id = v_referido_id THEN
    RETURN jsonb_build_object('registrado', false, 'motivo', 'auto_referido');
  END IF;

  INSERT INTO referidos (referente_cliente_id, referido_cliente_id, negocio_id)
  VALUES (v_referente_id, v_referido_id, p_negocio_id)
  ON CONFLICT (referido_cliente_id, negocio_id) DO NOTHING;

  RETURN jsonb_build_object('registrado', true);
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_referido(TEXT, TEXT) TO authenticated;

-- ============================================================
-- 4. DETECTAR Y PREMIAR LAS 4 VISITAS
-- ============================================================
-- La llama CUALQUIERA de las dos partes al abrir ese negocio; el cálculo es idempotente y
-- server-side (no hace falta cron ni trigger). Recorre las referencias del negocio en las que
-- el que llama participa (como referente o como referido), y por cada una: cuenta las visitas
-- REALES del invitado en ese negocio y, si son >= 4 y todavía no se premió, acredita el bonus
-- a AMBOS en una transacción y marca `premiado_at`. El `FOR UPDATE` serializa el caso de que
-- las dos partes disparen la revisión a la vez (evita doble acreditación).

CREATE OR REPLACE FUNCTION revisar_premio_referido(p_negocio_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_necesarias CONSTANT INT := 4;    -- visitas reales requeridas antes de premiar
  v_bonus CONSTANT INT := 100;       -- puntos bonus para cada parte al cumplirse
  r RECORD;
  v_visitas INT;
  v_premiado BOOLEAN;
  v_invitados JSONB := '[]'::jsonb;
  v_como_referido JSONB := NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  FOR r IN
    SELECT * FROM referidos
    WHERE negocio_id = p_negocio_id
      AND (referente_cliente_id = v_cliente_id OR referido_cliente_id = v_cliente_id)
    FOR UPDATE
  LOOP
    SELECT COUNT(*) INTO v_visitas
    FROM visitas
    WHERE cliente_id = r.referido_cliente_id AND negocio_id = p_negocio_id;

    v_premiado := r.premiado_at IS NOT NULL;

    IF NOT v_premiado AND v_visitas >= v_necesarias THEN
      -- Acreditar el bonus a AMBOS (crea la relación si el referente aún no tenía puntos ahí).
      INSERT INTO relaciones_negocio (cliente_id, negocio_id, puntos)
      VALUES (r.referente_cliente_id, p_negocio_id, v_bonus)
      ON CONFLICT (cliente_id, negocio_id)
        DO UPDATE SET puntos = relaciones_negocio.puntos + v_bonus;

      INSERT INTO relaciones_negocio (cliente_id, negocio_id, puntos)
      VALUES (r.referido_cliente_id, p_negocio_id, v_bonus)
      ON CONFLICT (cliente_id, negocio_id)
        DO UPDATE SET puntos = relaciones_negocio.puntos + v_bonus;

      UPDATE referidos SET premiado_at = NOW() WHERE id = r.id;
      v_premiado := true;
    END IF;

    IF r.referente_cliente_id = v_cliente_id THEN
      v_invitados := v_invitados || jsonb_build_object(
        'referido_cliente_id', r.referido_cliente_id,
        'nombre', (SELECT nombre FROM clientes WHERE id = r.referido_cliente_id),
        'visitas_actuales', LEAST(v_visitas, v_necesarias),
        'premiado', v_premiado
      );
    END IF;

    IF r.referido_cliente_id = v_cliente_id THEN
      v_como_referido := jsonb_build_object(
        'visitas_actuales', LEAST(v_visitas, v_necesarias),
        'premiado', v_premiado
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'visitas_necesarias', v_necesarias,
    'bonus', v_bonus,
    'invitados', v_invitados,
    'como_referido', v_como_referido
  );
END;
$$;

GRANT EXECUTE ON FUNCTION revisar_premio_referido(TEXT) TO authenticated;
