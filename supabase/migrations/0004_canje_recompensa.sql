-- Control.Evo — Fase 8: canje de recompensa del cliente (descuento real de puntos)
-- El cliente final (autenticado por email) canjea una recompensa desde la app y sus puntos
-- se descuentan de `relaciones_negocio` del lado del servidor, en una transacción atómica.
-- SECURITY DEFINER siguiendo el mismo patrón que `cobrar_con_pin` (0002): la función valida
-- del lado del servidor que exista una recompensa activa con ese costo en el negocio y que el
-- cliente tenga puntos suficientes ANTES de descontar; el `FOR UPDATE` evita que dos canjes
-- simultáneos gasten el mismo saldo. Backup antes de correr en producción.

CREATE OR REPLACE FUNCTION canjear_recompensa(p_negocio_id TEXT, p_pts INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_puntos INT;
  v_existe BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  -- El canje siempre es del cliente logueado: resolvemos su fila por auth.uid(),
  -- nunca confiamos en un cliente_id que venga del navegador.
  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  IF p_pts IS NULL OR p_pts <= 0 THEN
    RAISE EXCEPTION 'pts_invalidos';
  END IF;

  -- Tiene que existir una recompensa activa con ese costo en el negocio (evita descontar
  -- un valor arbitrario que el cliente invente desde el front).
  SELECT EXISTS (
    SELECT 1 FROM recompensas
    WHERE negocio_id = p_negocio_id AND activa = true AND pts = p_pts
  ) INTO v_existe;
  IF NOT v_existe THEN
    RAISE EXCEPTION 'recompensa_inexistente';
  END IF;

  -- Bloqueamos la fila de la relación mientras validamos y descontamos.
  SELECT puntos INTO v_puntos
  FROM relaciones_negocio
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id
  FOR UPDATE;

  IF v_puntos IS NULL THEN
    RAISE EXCEPTION 'sin_relacion';   -- el cliente nunca consumió en este negocio
  END IF;

  IF v_puntos < p_pts THEN
    RAISE EXCEPTION 'puntos_insuficientes';
  END IF;

  UPDATE relaciones_negocio
  SET puntos = puntos - p_pts
  WHERE cliente_id = v_cliente_id AND negocio_id = p_negocio_id;

  RETURN jsonb_build_object(
    'negocio_id', p_negocio_id,
    'puntos_descontados', p_pts,
    'puntos_restantes', v_puntos - p_pts
  );
END;
$$;

-- Solo un cliente autenticado puede canjear (el cajero cobra por otra vía, sin auth).
GRANT EXECUTE ON FUNCTION canjear_recompensa(TEXT, INT) TO authenticated;
