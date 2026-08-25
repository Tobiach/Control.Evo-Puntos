-- Premia.ar — Rate limiting en las RPC de puntos/canjes/referidos
--
-- Gap confirmado en docs/SEGURIDAD.md §5.1: ninguna función SECURITY DEFINER tenía control de
-- frecuencia. Nada impedía automatizar `cobrar_con_pin` en loop con un PIN filtrado, ni fuerza
-- bruta contra `verificar_pin_cajero`/`confirmar_canje` (ambas anon, sin sesión), ni spamear
-- `iniciar_canje`/`registrar_referido`/`crear_desafio` con una cuenta autenticada.
--
-- Diseño: una tabla de eventos + una función helper que cuenta intentos recientes por
-- (función, clave) y corta si se pasa del máximo en la ventana. La clave es `p_negocio_id`
-- para las funciones sin sesión (PIN de mostrador) y `auth.uid()` para las que sí tienen
-- sesión real — así el límite es por negocio o por cliente, nunca global (un negocio con
-- mucho movimiento no bloquea a otro).
--
-- Los límites son generosos a propósito: muy por encima de lo que una persona puede hacer a
-- mano (tipear PIN+monto, tocar "canjear"), pero muy por debajo de lo que un script en loop
-- haría. Ajustar con más señal real de uso si hace falta.

-- ============================================================
-- Infraestructura: tabla de eventos + helper de verificación
-- ============================================================

CREATE TABLE rate_limit_eventos (
  id BIGSERIAL PRIMARY KEY,
  funcion TEXT NOT NULL,
  clave TEXT NOT NULL,
  creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_funcion_clave_fecha ON rate_limit_eventos(funcion, clave, creado_at);

ALTER TABLE rate_limit_eventos ENABLE ROW LEVEL SECURITY;
-- Sin ninguna policy: ni anon ni authenticated pueden leer ni escribir esta tabla directo,
-- a propósito (mismo criterio que `negocio_pin` en 0005). Solo la tocan funciones
-- SECURITY DEFINER, que corren con los privilegios del dueño y no dependen de RLS/GRANT.

-- No confía en pg_cron (no hay uno configurado en este proyecto todavía, ver 0021): la propia
-- función helper barre eventos viejos cada vez que corre, así la tabla nunca crece sin límite.
CREATE OR REPLACE FUNCTION verificar_rate_limit(
  p_funcion TEXT,
  p_clave TEXT,
  p_max_intentos INT,
  p_ventana INTERVAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intentos INT;
BEGIN
  DELETE FROM rate_limit_eventos WHERE creado_at < now() - interval '1 day';

  SELECT count(*) INTO v_intentos
  FROM rate_limit_eventos
  WHERE funcion = p_funcion AND clave = p_clave AND creado_at > now() - p_ventana;

  IF v_intentos >= p_max_intentos THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_eventos (funcion, clave) VALUES (p_funcion, p_clave);
  RETURN true;
END;
$$;

-- Solo la llaman otras funciones SECURITY DEFINER (mismo dueño): no necesita GRANT a
-- anon/authenticated, y se lo revocamos explícito porque Postgres por default le da EXECUTE
-- a PUBLIC en toda función nueva.
REVOKE ALL ON FUNCTION verificar_rate_limit(TEXT, TEXT, INT, INTERVAL) FROM PUBLIC;

-- ============================================================
-- verificar_pin_cajero — login del cajero (0005). Clave: negocio_id.
-- ============================================================
-- Máximo 20 intentos de PIN por negocio por minuto: cubre de sobra a alguien tipeando mal el
-- PIN varias veces, corta un ataque de fuerza bruta contra un negocio puntual.

CREATE OR REPLACE FUNCTION verificar_pin_cajero(p_negocio_id TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_negocio negocios%ROWTYPE;
  v_recompensas JSONB;
BEGIN
  IF NOT verificar_rate_limit('verificar_pin_cajero', p_negocio_id, 20, interval '1 minute') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
  END IF;

  SELECT n.* INTO v_negocio
  FROM negocios n
  JOIN negocio_pin p ON p.negocio_id = n.id
  WHERE n.id = p_negocio_id AND n.activo = true AND p.pin_cajero = p_pin;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'pts', pts,
        'descripcion', descripcion,
        'categoria', categoria,
        'costo_dinero', costo_dinero
      )
      ORDER BY pts
    ),
    '[]'::jsonb
  )
  INTO v_recompensas
  FROM recompensas
  WHERE negocio_id = p_negocio_id AND activa = true;

  RETURN jsonb_build_object(
    'id', v_negocio.id,
    'nombre', v_negocio.nombre,
    'rubro', v_negocio.rubro,
    'moneda_prefijo', v_negocio.moneda_prefijo,
    'monto_por_punto', v_negocio.monto_por_punto,
    'recompensas', v_recompensas
  );
END;
$$;

GRANT EXECUTE ON FUNCTION verificar_pin_cajero(TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- cobrar_con_pin — el cajero acredita puntos (0002/0005). Clave: negocio_id.
-- ============================================================
-- Máximo 30 cobros por negocio por minuto: un cajero real tipeando PIN+teléfono+monto a mano
-- no llega ni cerca; un script en loop sí, y ahí es donde corta.

CREATE OR REPLACE FUNCTION cobrar_con_pin(
  p_negocio_id TEXT,
  p_pin TEXT,
  p_telefono TEXT,
  p_monto NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_negocio negocios%ROWTYPE;
  v_cliente_id UUID;
  v_nombre TEXT;
  v_puntos_anteriores INT;
  v_puntos_ganados INT;
BEGIN
  IF NOT verificar_rate_limit('cobrar_con_pin', p_negocio_id, 30, interval '1 minute') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
  END IF;

  SELECT n.* INTO v_negocio
  FROM negocios n
  JOIN negocio_pin p ON p.negocio_id = n.id
  WHERE n.id = p_negocio_id AND n.activo = true AND p.pin_cajero = p_pin;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'monto_invalido';
  END IF;

  v_puntos_ganados := floor(p_monto / v_negocio.monto_por_punto);

  SELECT id, nombre INTO v_cliente_id, v_nombre FROM clientes WHERE telefono = p_telefono;
  IF v_cliente_id IS NULL THEN
    INSERT INTO clientes (nombre, telefono)
    VALUES ('Cliente ' || RIGHT(p_telefono, 4), p_telefono)
    RETURNING id, nombre INTO v_cliente_id, v_nombre;
  END IF;

  INSERT INTO relaciones_negocio (cliente_id, negocio_id, puntos, ultima_visita_at)
  VALUES (v_cliente_id, p_negocio_id, 0, NOW())
  ON CONFLICT (cliente_id, negocio_id) DO NOTHING;

  SELECT puntos INTO v_puntos_anteriores
  FROM relaciones_negocio
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id;

  INSERT INTO visitas (cliente_id, negocio_id, monto, puntos)
  VALUES (v_cliente_id, p_negocio_id, p_monto, v_puntos_ganados);

  UPDATE relaciones_negocio
  SET puntos = puntos + v_puntos_ganados,
      ultima_visita_at = NOW(),
      puntos_vencen_at = NOW() + INTERVAL '60 days'
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id;

  RETURN jsonb_build_object(
    'cliente_nombre', v_nombre,
    'telefono', p_telefono,
    'puntos_ganados', v_puntos_ganados,
    'puntos_anteriores', v_puntos_anteriores
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cobrar_con_pin(TEXT, TEXT, TEXT, NUMERIC) TO anon, authenticated;

-- ============================================================
-- confirmar_canje — el cajero confirma el código de canje (0021, ver hotfix 0022).
-- Clave: negocio_id.
-- ============================================================

CREATE OR REPLACE FUNCTION confirmar_canje(p_negocio_id TEXT, p_pin TEXT, p_codigo TEXT)
RETURNS TABLE(ok BOOLEAN, mensaje TEXT, descripcion TEXT, cliente_nombre TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_negocio negocios%ROWTYPE;
  v_canje canjes%ROWTYPE;
  v_nombre TEXT;
BEGIN
  IF NOT verificar_rate_limit('confirmar_canje', p_negocio_id, 30, interval '1 minute') THEN
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

  SELECT * INTO v_canje
  FROM canjes
  WHERE codigo_verificacion = upper(trim(p_codigo)) AND negocio_id = p_negocio_id
  FOR UPDATE;

  IF v_canje.id IS NULL THEN
    RETURN QUERY SELECT false, 'codigo_inexistente'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_canje.estado = 'confirmado' THEN
    RETURN QUERY SELECT false, 'codigo_ya_usado'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_canje.estado = 'expirado' OR v_canje.expira_at < now() THEN
    IF v_canje.estado = 'pendiente' THEN
      UPDATE relaciones_negocio SET puntos = puntos + v_canje.pts
        WHERE cliente_id = v_canje.cliente_id AND negocio_id = v_canje.negocio_id;
      UPDATE canjes SET estado = 'expirado' WHERE id = v_canje.id;
    END IF;
    RETURN QUERY SELECT false, 'codigo_expirado'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  UPDATE canjes SET estado = 'confirmado', confirmado_at = now() WHERE id = v_canje.id;

  SELECT nombre INTO v_nombre FROM clientes WHERE id = v_canje.cliente_id;

  RETURN QUERY SELECT true, 'ok'::TEXT, v_canje.descripcion, v_nombre;
END;
$$;

GRANT EXECUTE ON FUNCTION confirmar_canje(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- iniciar_canje — el cliente arranca un canje (0021). Clave: auth.uid().
-- ============================================================
-- Máximo 10 canjes iniciados por cliente cada 10 minutos (la misma ventana que dura un
-- código): de sobra para reintentar si algo falla, corta un loop automatizado.

CREATE OR REPLACE FUNCTION iniciar_canje(p_negocio_id TEXT, p_pts INT)
RETURNS TABLE(canje_id BIGINT, codigo TEXT, expira_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_puntos INT;
  v_recompensa_id BIGINT;
  v_descripcion TEXT;
  v_codigo TEXT;
  v_expira TIMESTAMPTZ;
  v_canje_id BIGINT;
  v_intento INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  IF NOT verificar_rate_limit('iniciar_canje', auth.uid()::text, 10, interval '10 minutes') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
  END IF;

  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  IF p_pts IS NULL OR p_pts <= 0 THEN
    RAISE EXCEPTION 'pts_invalidos';
  END IF;

  SELECT id, descripcion INTO v_recompensa_id, v_descripcion
  FROM recompensas
  WHERE negocio_id = p_negocio_id AND activa = true AND pts = p_pts
  LIMIT 1;
  IF v_recompensa_id IS NULL THEN
    RAISE EXCEPTION 'recompensa_inexistente';
  END IF;

  SELECT puntos INTO v_puntos
  FROM relaciones_negocio
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id
  FOR UPDATE;

  IF v_puntos IS NULL THEN
    RAISE EXCEPTION 'sin_relacion';
  END IF;
  IF v_puntos < p_pts THEN
    RAISE EXCEPTION 'puntos_insuficientes';
  END IF;

  UPDATE relaciones_negocio
  SET puntos = puntos - p_pts
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id;

  v_expira := now() + interval '10 minutes';

  LOOP
    v_intento := v_intento + 1;
    v_codigo := upper(substring(md5(random()::text || clock_timestamp()::text) for 6));
    BEGIN
      INSERT INTO canjes (cliente_id, negocio_id, recompensa_id, pts, descripcion, codigo_verificacion, estado, expira_at)
      VALUES (v_cliente_id, p_negocio_id, v_recompensa_id, p_pts, v_descripcion, v_codigo, 'pendiente', v_expira)
      RETURNING id INTO v_canje_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_intento >= 5 THEN
        RAISE EXCEPTION 'no_se_pudo_generar_codigo';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_canje_id, v_codigo, v_expira;
END;
$$;

GRANT EXECUTE ON FUNCTION iniciar_canje(TEXT, INT) TO authenticated;

-- ============================================================
-- registrar_referido — vincula el código de invitación (0008). Clave: auth.uid().
-- ============================================================
-- Máximo 10 por cliente por hora: en la práctica pasa 1 sola vez por cuenta nueva; el margen
-- es por reintentos legítimos (ver panelCliente.ts: se reintenta solo si falla).

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

  IF NOT verificar_rate_limit('registrar_referido', auth.uid()::text, 10, interval '1 hour') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
  END IF;

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
-- revisar_premio_referido — se llama al abrir Perfil (0008). Clave: auth.uid().
-- ============================================================
-- Máximo 30 por cliente por minuto: se dispara en cada montaje de SeccionReferidos.tsx (cada
-- vez que se entra a la pestaña Perfil), así que el límite tiene que tolerar navegación normal
-- yendo y viniendo entre pestañas, no solo una carga inicial.

CREATE OR REPLACE FUNCTION revisar_premio_referido(p_negocio_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_necesarias CONSTANT INT := 4;
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

-- ============================================================
-- crear_desafio — retar a un amigo (0009). Clave: auth.uid().
-- ============================================================
-- Máximo 10 desafíos creados por cliente por día: es una acción explícita del usuario, no
-- algo que se dispare solo — no hace falta una ventana corta.

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

  IF NOT verificar_rate_limit('crear_desafio', auth.uid()::text, 10, interval '1 day') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
  END IF;

  IF p_tipo NOT IN ('visitas', 'probar_nuevo') THEN
    RETURN jsonb_build_object('creado', false, 'motivo', 'tipo_invalido');
  END IF;

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

  IF NOT EXISTS (
    SELECT 1 FROM relaciones_negocio
    WHERE cliente_id = v_retador_id AND negocio_id = p_negocio_id
  ) OR NOT EXISTS (
    SELECT 1 FROM relaciones_negocio
    WHERE cliente_id = v_retado_id AND negocio_id = p_negocio_id
  ) THEN
    RETURN jsonb_build_object('creado', false, 'motivo', 'no_es_cliente_del_negocio');
  END IF;

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
-- revisar_desafios — se llama al abrir Perfil (0009). Clave: auth.uid().
-- ============================================================
-- Mismo criterio que revisar_premio_referido: se dispara en cada montaje de
-- SeccionDesafios.tsx, el límite tiene que tolerar navegación normal entre pestañas.

CREATE OR REPLACE FUNCTION revisar_desafios(p_negocio_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_bonus CONSTANT INT := 50;
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

  IF NOT verificar_rate_limit('revisar_desafios', auth.uid()::text, 30, interval '1 minute') THEN
    RAISE EXCEPTION 'rate_limit_excedido';
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

-- ============================================================
-- canjear_recompensa (0004/0017) — superada por iniciar_canje/confirmar_canje (0021)
-- ============================================================
-- Ya no la llama nada del frontend (verificado: 0 referencias en src/) pero seguía siendo
-- una RPC viva con GRANT a `authenticated` — mismo hueco de rate limiting que las demás,
-- pero sin ningún uso real que justifique mantenerla habilitada. Se cierra el acceso en vez
-- de agregarle rate limiting a código muerto; la función queda en la base por si hace falta
-- consultar canjes viejos, simplemente ya no se puede invocar desde el cliente.

REVOKE EXECUTE ON FUNCTION canjear_recompensa(TEXT, INT) FROM authenticated;
