-- Premia.ar — el bono de referido se gana en la 1ra visita del referido, no en la 4ta.
--
-- Decisión de producto ya tomada por Tobías (confirmada de nuevo el 13/9/2026): la migración
-- 0023_rate_limiting_rpcs.sql (aplicada en producción) dejó `revisar_premio_referido()` con
-- `v_necesarias := 4` por error de arrastre — ese valor viene de antes de que se decidiera
-- bajarlo a 1. Este archivo es la única diferencia real que traía
-- 0024_consolidado_rate_limiting.sql sobre lo que ya está en producción: cambia el 4 por un 1
-- y no toca nada más (nada de RLS, nada de columnas, nada de otras funciones).
--
-- CREATE OR REPLACE es idempotente. Backup antes de correr en producción (mismo criterio que
-- el resto de las migraciones de este proyecto).

CREATE OR REPLACE FUNCTION revisar_premio_referido(p_negocio_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_necesarias CONSTANT INT := 1;
  v_bonus CONSTANT INT := 100;
  r RECORD;
  v_visitas INT;
  v_premiado BOOLEAN;
  v_invitados JSONB := '[]'::jsonb;
  v_como_referido JSONB := NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;
  IF NOT verificar_rate_limit('revisar_premio_referido', auth.uid()::text, 30, interval '1 minute') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
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
      INSERT INTO relaciones_negocio (cliente_id, negocio_id, puntos)
      VALUES (r.referente_cliente_id, p_negocio_id, v_bonus)
      ON CONFLICT (cliente_id, negocio_id) DO UPDATE SET puntos = relaciones_negocio.puntos + v_bonus;
      INSERT INTO relaciones_negocio (cliente_id, negocio_id, puntos)
      VALUES (r.referido_cliente_id, p_negocio_id, v_bonus)
      ON CONFLICT (cliente_id, negocio_id) DO UPDATE SET puntos = relaciones_negocio.puntos + v_bonus;
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
    'visitas_necesarias', v_necesarias, 'bonus', v_bonus,
    'invitados', v_invitados, 'como_referido', v_como_referido
  );
END;
$$;

GRANT EXECUTE ON FUNCTION revisar_premio_referido(TEXT) TO authenticated;
