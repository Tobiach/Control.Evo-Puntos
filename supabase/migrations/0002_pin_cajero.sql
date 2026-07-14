-- Control.Evo — Fase 4: panel de cajero real con login por PIN
-- El cajero NO tiene cuenta de Supabase Auth: se identifica con un PIN de 4 dígitos
-- que el dueño define para su negocio. El PIN nunca se lee desde el cliente anónimo
-- (la policy pública de SELECT sobre `negocios` NO debe exponerlo): tanto la verificación
-- del PIN como el cobro pasan por funciones SECURITY DEFINER que validan del lado del
-- servidor. Backup antes de correr en producción.

-- ============================================================
-- PIN del cajero por negocio
-- ============================================================

ALTER TABLE negocios ADD COLUMN pin_cajero TEXT;

-- El dueño gestiona su propio PIN a través de la policy de UPDATE ya existente
-- ("El dueño edita solo su negocio", auth.uid() = dueno_user_id), que cubre esta
-- columna nueva. No se agrega ninguna policy que exponga `pin_cajero` en lecturas
-- públicas: solo las funciones de abajo lo comparan, sin devolverlo nunca.

-- ============================================================
-- verificar_pin_cajero — login del cajero (negocio + PIN → datos del negocio)
-- ============================================================

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
  SELECT * INTO v_negocio
  FROM negocios
  WHERE id = p_negocio_id AND activo = true AND pin_cajero IS NOT NULL AND pin_cajero = p_pin;

  IF NOT FOUND THEN
    RETURN NULL;  -- negocio inexistente o PIN incorrecto
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

-- ============================================================
-- cobrar_con_pin — un cobro completo (valida PIN, alta cliente/relación, suma puntos)
-- ============================================================

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
  SELECT * INTO v_negocio
  FROM negocios
  WHERE id = p_negocio_id AND activo = true AND pin_cajero IS NOT NULL AND pin_cajero = p_pin;

  IF NOT FOUND THEN
    RETURN NULL;  -- sin autorización: PIN inválido para ese negocio
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'monto_invalido';
  END IF;

  v_puntos_ganados := floor(p_monto / v_negocio.monto_por_punto);

  -- Cliente por teléfono (alta automática si es su primera vez en el sistema).
  SELECT id, nombre INTO v_cliente_id, v_nombre FROM clientes WHERE telefono = p_telefono;
  IF v_cliente_id IS NULL THEN
    INSERT INTO clientes (nombre, telefono)
    VALUES ('Cliente ' || RIGHT(p_telefono, 4), p_telefono)
    RETURNING id, nombre INTO v_cliente_id, v_nombre;
  END IF;

  -- Relación cliente ↔ negocio (alta automática en el primer cobro de este local).
  INSERT INTO relaciones_negocio (cliente_id, negocio_id, puntos, ultima_visita_at)
  VALUES (v_cliente_id, p_negocio_id, 0, NOW())
  ON CONFLICT (cliente_id, negocio_id) DO NOTHING;

  SELECT puntos INTO v_puntos_anteriores
  FROM relaciones_negocio
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id;

  -- Historial de la venta.
  INSERT INTO visitas (cliente_id, negocio_id, monto, puntos)
  VALUES (v_cliente_id, p_negocio_id, p_monto, v_puntos_ganados);

  -- Acreditación de puntos + vencimiento a 60 días de esta visita.
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

-- El cajero opera sin sesión de Auth: se le permite ejecutar solo estas dos funciones,
-- que validan el PIN internamente antes de tocar cualquier fila.
GRANT EXECUTE ON FUNCTION verificar_pin_cajero(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cobrar_con_pin(TEXT, TEXT, TEXT, NUMERIC) TO anon, authenticated;
