-- Premia.ar — Ruleta semanal y "recompensa sorpresa" con persistencia REAL
--
-- Hasta ahora estas dos mecánicas (`RuletaSemanal.tsx`, `RecompensaSorpresa.tsx`) corrían
-- 100% en memoria del navegador: el premio se elegía con Math.random() en el cliente, el
-- cooldown de 7 días se guardaba en un useState que se borraba al refrescar la página, y no
-- se generaba ningún código que el cajero pudiera confirmar. Estaban ocultas detrás de
-- `MOSTRAR_RULETA_Y_SORPRESA = false` (src/lib/flags.ts) por eso mismo, no por el diseño.
-- Esta migración les da el mismo tratamiento que ya tienen los canjes (0017/0021): la RPC
-- que arranca la jugada corre server-side, persiste el resultado y genera un código real que
-- el cajero valida en el mostrador con su PIN. Backup antes de correr en producción.

-- ============================================================
-- TABLA tiradas_juego — un renglón por tirada de ruleta o sorpresa revelada
-- ============================================================

CREATE TABLE tiradas_juego (
  id BIGSERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL,
  negocio_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ruleta', 'sorpresa')),
  premio_id TEXT NOT NULL,
  premio_label TEXT NOT NULL,
  premio_emoji TEXT NOT NULL,
  bueno BOOLEAN NOT NULL DEFAULT false,
  codigo_verificacion TEXT UNIQUE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'expirado')),
  expira_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmado_at TIMESTAMPTZ,
  FOREIGN KEY (cliente_id, negocio_id) REFERENCES relaciones_negocio(cliente_id, negocio_id) ON DELETE CASCADE
);

ALTER TABLE tiradas_juego ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente ve sus propias tiradas" ON tiradas_juego
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id)
  );
CREATE POLICY "El dueño ve las tiradas de su negocio" ON tiradas_juego
  FOR SELECT USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );
-- Sin policy de INSERT a propósito: solo escriben las RPC SECURITY DEFINER de abajo, mismo
-- criterio que `canjes` (0017) — nadie inserta una tirada directo contra la tabla.

CREATE INDEX idx_tiradas_juego_cliente_negocio_tipo ON tiradas_juego(cliente_id, negocio_id, tipo, created_at);
CREATE INDEX idx_tiradas_juego_codigo ON tiradas_juego(codigo_verificacion) WHERE codigo_verificacion IS NOT NULL;

-- ============================================================
-- girar_ruleta — el cliente gira: valida cooldown real (7 días), elige premio pesado
-- ============================================================
-- Usa el pool configurado por el dueño en `premios_ruleta` (0014) si tiene filas activas;
-- si no, el mismo pool genérico que ya vive en `src/lib/ruleta.ts` (`PREMIOS_RULETA`),
-- copiado acá literal para que el server elija exactamente con los mismos pesos que el
-- cliente ya mostraba.

CREATE OR REPLACE FUNCTION girar_ruleta(p_negocio_id TEXT)
RETURNS TABLE(tirada_id BIGINT, codigo TEXT, premio_id TEXT, premio_label TEXT, premio_emoji TEXT, bueno BOOLEAN, expira_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_ultima TIMESTAMPTZ;
  v_premio RECORD;
  v_codigo TEXT;
  v_expira TIMESTAMPTZ;
  v_tirada_id BIGINT;
  v_intento INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  IF NOT verificar_rate_limit('girar_ruleta', auth.uid()::text, 10, interval '1 hour') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
  END IF;

  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM relaciones_negocio WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id
  ) THEN
    RAISE EXCEPTION 'sin_relacion';
  END IF;

  -- Cooldown real de 7 días contra la ÚLTIMA tirada de ESTE cliente en ESTE negocio, sea cual
  -- sea su estado (pendiente/confirmada) — mismo criterio que el `useState` que reemplaza.
  SELECT created_at INTO v_ultima
  FROM tiradas_juego
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id AND tipo = 'ruleta'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_ultima IS NOT NULL AND v_ultima > now() - interval '7 days' THEN
    RAISE EXCEPTION 'cooldown_activo';
  END IF;

  -- Pool del negocio si tiene, si no el genérico (mismo fallback que `RuletaSemanal.tsx`).
  WITH pool AS (
    SELECT id::text AS id, label, emoji, peso, bueno
    FROM premios_ruleta
    WHERE negocio_id = p_negocio_id AND activo = true
    UNION ALL
    SELECT * FROM (VALUES
      ('pts-30', '+30 pts de regalo', '⭐', 22, false),
      ('off-5', '5% off hoy', '🏷️', 20, false),
      ('pts-75', '+75 pts de regalo', '✨', 15, true),
      ('2x1', '2x1 en tu próxima visita', '🍹', 13, true),
      ('envio', 'Envío gratis', '🛵', 12, false),
      ('pts-150', '+150 pts de regalo', '🎯', 10, true),
      ('regalo', 'Regalo de la casa', '🎁', 6, true),
      ('mayor', 'Premio mayor: $10.000 en consumo', '👑', 2, true)
    ) AS generico(id, label, emoji, peso, bueno)
    WHERE NOT EXISTS (
      SELECT 1 FROM premios_ruleta WHERE negocio_id = p_negocio_id AND activo = true
    )
  ),
  pesado AS (
    SELECT id, label, emoji, bueno, peso,
      SUM(peso) OVER () AS total_peso,
      SUM(peso) OVER (ORDER BY id) AS acumulado
    FROM pool
  ),
  -- random() es volátil: si se llama dentro del WHERE de abajo, Postgres la evalúa una vez
  -- POR FILA (no una sola vez para toda la ruleta), rompiendo el sorteo ponderado — cada
  -- premio terminaría con una probabilidad real distinta a su `peso`. Se saca a un CTE propio
  -- para forzar un único sorteo compartido por todas las filas.
  sorteo AS (
    SELECT random() AS r
  )
  SELECT id, label, emoji, bueno INTO v_premio
  FROM pesado, sorteo
  WHERE acumulado > (r * total_peso)
  ORDER BY acumulado
  LIMIT 1;

  IF v_premio IS NULL THEN
    RAISE EXCEPTION 'sin_premios_configurados';
  END IF;

  v_expira := now() + interval '10 minutes';

  LOOP
    v_intento := v_intento + 1;
    v_codigo := upper(substring(md5(random()::text || clock_timestamp()::text) for 6));
    BEGIN
      INSERT INTO tiradas_juego (cliente_id, negocio_id, tipo, premio_id, premio_label, premio_emoji, bueno, codigo_verificacion, estado, expira_at)
      VALUES (v_cliente_id, p_negocio_id, 'ruleta', v_premio.id, v_premio.label, v_premio.emoji, v_premio.bueno, v_codigo, 'pendiente', v_expira)
      RETURNING id INTO v_tirada_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_intento >= 5 THEN
        RAISE EXCEPTION 'no_se_pudo_generar_codigo';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_tirada_id, v_codigo, v_premio.id, v_premio.label, v_premio.emoji, v_premio.bueno, v_expira;
END;
$$;

GRANT EXECUTE ON FUNCTION girar_ruleta(TEXT) TO authenticated;

-- ============================================================
-- usar_sorpresa — el cliente revela: valida el milestone de 200 pts server-side
-- ============================================================
-- Mismo cálculo que hoy hace `TabInicio.tsx` client-side (puntos / 200 = sorpresas
-- disponibles), pero contando cuántas ya se usaron por lo que YA hay en `tiradas_juego`, no
-- por un contador que se resetea al recargar.

CREATE OR REPLACE FUNCTION usar_sorpresa(p_negocio_id TEXT)
RETURNS TABLE(tirada_id BIGINT, codigo TEXT, premio_label TEXT, premio_emoji TEXT, expira_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_puntos INT;
  v_usadas INT;
  v_premio RECORD;
  v_codigo TEXT;
  v_expira TIMESTAMPTZ;
  v_tirada_id BIGINT;
  v_intento INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  IF NOT verificar_rate_limit('usar_sorpresa', auth.uid()::text, 20, interval '1 hour') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
  END IF;

  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  SELECT puntos INTO v_puntos
  FROM relaciones_negocio
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id;
  IF v_puntos IS NULL THEN
    RAISE EXCEPTION 'sin_relacion';
  END IF;

  SELECT count(*) INTO v_usadas
  FROM tiradas_juego
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id AND tipo = 'sorpresa';

  IF v_usadas >= floor(v_puntos / 200) THEN
    RAISE EXCEPTION 'sin_sorpresa_disponible';
  END IF;

  -- Mismo pool fijo de 6 que ya usa RecompensaSorpresa.tsx, elegido uniforme (sin pesos —
  -- el componente actual tampoco los usa acá).
  SELECT id, label, emoji INTO v_premio
  FROM (VALUES
    ('pts-50', '+50 pts de regalo', '⭐'),
    ('postre', 'Postre gratis', '🍰'),
    ('2x1', '2x1 en tu próxima visita', '🍹'),
    ('pts-20', '+20 pts de regalo', '✨'),
    ('off-10', '10% off hoy', '🏷️'),
    ('cafe', 'Café de la casa', '☕')
  ) AS pool(id, label, emoji)
  OFFSET floor(random() * 6) LIMIT 1;

  v_expira := now() + interval '10 minutes';

  LOOP
    v_intento := v_intento + 1;
    v_codigo := upper(substring(md5(random()::text || clock_timestamp()::text) for 6));
    BEGIN
      INSERT INTO tiradas_juego (cliente_id, negocio_id, tipo, premio_id, premio_label, premio_emoji, bueno, codigo_verificacion, estado, expira_at)
      VALUES (v_cliente_id, p_negocio_id, 'sorpresa', v_premio.id, v_premio.label, v_premio.emoji, true, v_codigo, 'pendiente', v_expira)
      RETURNING id INTO v_tirada_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_intento >= 5 THEN
        RAISE EXCEPTION 'no_se_pudo_generar_codigo';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_tirada_id, v_codigo, v_premio.label, v_premio.emoji, v_expira;
END;
$$;

GRANT EXECUTE ON FUNCTION usar_sorpresa(TEXT) TO authenticated;

-- ============================================================
-- confirmar_premio_juego — el cajero valida el código en el mostrador
-- ============================================================
-- Mismo patrón que `confirmar_canje` (0021/0022): autoriza por PIN contra `negocio_pin`
-- (nunca auth.uid(), el cajero no tiene sesión), nunca por texto de error para mostrar.

CREATE OR REPLACE FUNCTION confirmar_premio_juego(p_negocio_id TEXT, p_pin TEXT, p_codigo TEXT)
RETURNS TABLE(ok BOOLEAN, mensaje TEXT, premio_label TEXT, cliente_nombre TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_negocio negocios%ROWTYPE;
  v_tirada tiradas_juego%ROWTYPE;
  v_nombre TEXT;
BEGIN
  IF NOT verificar_rate_limit('confirmar_premio_juego', p_negocio_id, 30, interval '1 minute') THEN
    RETURN QUERY SELECT false, 'rate_limit_excedido'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT n.* INTO v_negocio
  FROM negocios n
  JOIN negocio_pin p ON p.negocio_id = n.id
  WHERE n.id = p_negocio_id AND n.activo = true AND p.pin_cajero = p_pin;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'pin_invalido'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_tirada
  FROM tiradas_juego
  WHERE codigo_verificacion = upper(trim(p_codigo)) AND negocio_id = p_negocio_id
  FOR UPDATE;

  IF v_tirada.id IS NULL THEN
    RETURN QUERY SELECT false, 'codigo_inexistente'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_tirada.estado = 'confirmado' THEN
    RETURN QUERY SELECT false, 'codigo_ya_usado'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_tirada.estado = 'expirado' OR v_tirada.expira_at < now() THEN
    IF v_tirada.estado = 'pendiente' THEN
      UPDATE tiradas_juego SET estado = 'expirado' WHERE id = v_tirada.id;
    END IF;
    RETURN QUERY SELECT false, 'codigo_expirado'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  UPDATE tiradas_juego SET estado = 'confirmado', confirmado_at = now() WHERE id = v_tirada.id;

  SELECT nombre INTO v_nombre FROM clientes WHERE id = v_tirada.cliente_id;

  RETURN QUERY SELECT true, 'ok'::TEXT, v_tirada.premio_label, v_nombre;
END;
$$;

GRANT EXECUTE ON FUNCTION confirmar_premio_juego(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- expirar_mis_tiradas — limpieza self-service al abrir la app (sin nada que reembolsar: a
-- diferencia de un canje, girar/revelar no descuenta puntos, solo marca el código vencido)
-- ============================================================

CREATE OR REPLACE FUNCTION expirar_mis_tiradas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NULL THEN RETURN; END IF;

  UPDATE tiradas_juego
  SET estado = 'expirado'
  WHERE cliente_id = v_cliente_id AND estado = 'pendiente' AND expira_at < now();
END;
$$;

GRANT EXECUTE ON FUNCTION expirar_mis_tiradas() TO authenticated;
