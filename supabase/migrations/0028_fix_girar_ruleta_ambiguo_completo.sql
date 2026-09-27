-- Premia.ar — HOTFIX 2: girar_ruleta() seguía rota después de 0027
--
-- El fix de 0027 calificó SOLO la última referencia a `bueno` (en el SELECT final que llena
-- v_premio), pero el mismo statement (un solo WITH ... SELECT compuesto) tiene otras DOS
-- referencias sin calificar más arriba: `SELECT id::text AS id, label, emoji, peso, bueno FROM
-- premios_ruleta ...` (CTE `pool`) y `SELECT id, label, emoji, bueno, peso, ... FROM pool` (CTE
-- `pesado`). La ambigüedad de PL/pgSQL (columna real vs. variable de RETURNS TABLE) aplica a
-- CUALQUIER referencia sin calificar dentro del statement completo, no solo a la última — por
-- eso 0027 no alcanzó y el error era idéntico al probarlo en vivo otra vez.
--
-- Fix definitivo: en vez de perseguir cada referencia a mano (ya se probó y falló una vez),
-- se usa el mecanismo que Postgres documenta para exactamente este caso —
-- `#variable_conflict use_column` como primera línea del cuerpo de la función: cualquier
-- ambigüedad entre una columna real y una variable/parámetro de PL/pgSQL se resuelve SIEMPRE a
-- favor de la columna real, en toda la función, sin depender de calificar cada aparición. Se
-- mantienen además las referencias ya calificadas (`premios_ruleta.bueno`, `pool.bueno`,
-- `pesado.bueno`) como refuerzo, no hace falta pero no está de más.
--
-- CREATE OR REPLACE es idempotente.

CREATE OR REPLACE FUNCTION girar_ruleta(p_negocio_id TEXT)
RETURNS TABLE(tirada_id BIGINT, codigo TEXT, premio_id TEXT, premio_label TEXT, premio_emoji TEXT, bueno BOOLEAN, expira_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
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

  SELECT created_at INTO v_ultima
  FROM tiradas_juego
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id AND tipo = 'ruleta'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_ultima IS NOT NULL AND v_ultima > now() - interval '7 days' THEN
    RAISE EXCEPTION 'cooldown_activo';
  END IF;

  WITH pool AS (
    SELECT id::text AS id, label, emoji, peso, premios_ruleta.bueno AS bueno
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
    SELECT pool.id, pool.label, pool.emoji, pool.bueno, pool.peso,
      SUM(pool.peso) OVER () AS total_peso,
      SUM(pool.peso) OVER (ORDER BY pool.id) AS acumulado
    FROM pool
  ),
  sorteo AS (
    SELECT random() AS r
  )
  SELECT pesado.id, pesado.label, pesado.emoji, pesado.bueno INTO v_premio
  FROM pesado, sorteo
  WHERE pesado.acumulado > (sorteo.r * pesado.total_peso)
  ORDER BY pesado.acumulado
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
