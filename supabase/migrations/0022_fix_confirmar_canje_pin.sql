-- Premia.ar — HOTFIX CRÍTICO: confirmar_canje() está rota desde que se creó (migración 0021)
--
-- Bug: confirmar_canje() valida el PIN leyendo `negocios.pin_cajero` directamente, pero esa
-- columna se sacó de `negocios` en la migración 0005 (fix de seguridad: se movió a la tabla
-- separada `negocio_pin`, sin policy pública). cobrar_con_pin() y verificar_pin_cajero() ya
-- usan el JOIN correcto contra `negocio_pin` desde 0005 — confirmar_canje() (0021) se escribió
-- copiando el patrón viejo (pre-0005) por error, así que NUNCA llegó a andar: toda llamada
-- tira "column pin_cajero does not exist" en vez de validar el PIN. Mientras esto no se corra,
-- el cajero no puede confirmar NINGÚN canje verificable en el mostrador.
--
-- CREATE OR REPLACE es idempotente: da igual si la 0021 ya se corrió en producción o no.
-- Backup antes de correr en producción (mismo criterio que 0021).

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
    -- Si nadie lo había marcado todavía, lo hacemos ahora y devolvemos los puntos: un código
    -- vencido sin confirmar no puede dejar al cliente sin el premio Y sin los puntos.
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
