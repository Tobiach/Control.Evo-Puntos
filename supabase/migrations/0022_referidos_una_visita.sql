-- Referidos: el premio se acredita con 1 visita real, no con 4 (0008 original).
-- Decisión de producto: el umbral de 4 visitas retrasaba demasiado el premio y bajaba la
-- conversión del link de invitación. Único cambio: la constante de visitas necesarias. El
-- resto del mecanismo (server-side, SECURITY DEFINER, FOR UPDATE, idempotente) no se toca.

CREATE OR REPLACE FUNCTION revisar_premio_referido(p_negocio_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_necesarias CONSTANT INT := 1;    -- visitas reales requeridas antes de premiar (antes: 4)
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