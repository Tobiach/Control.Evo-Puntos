-- Premia.ar — Canje verificable con código de mostrador
-- Hueco encontrado por el Estudio de Diseño: `canjear_recompensa()` (0004/0017) descuenta
-- puntos pero no deja nada que el cajero pueda confirmar — el código que mostraba
-- TabRecompensas.tsx era `Math.random()` puro, nunca guardado ni validado. Cualquiera podía
-- decir "ya canjeé" sin verificación real. Esta migración separa "iniciar" (cliente, genera
-- código) de "confirmar" (cajero, lo valida contra su PIN), con vencimiento a 10 minutos.
-- Backup antes de correr en producción.

-- ============================================================
-- Columnas nuevas en `canjes`
-- ============================================================

ALTER TABLE canjes ADD COLUMN IF NOT EXISTS codigo_verificacion TEXT UNIQUE;
ALTER TABLE canjes ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendiente'
  CHECK (estado IN ('pendiente', 'confirmado', 'expirado'));
ALTER TABLE canjes ADD COLUMN IF NOT EXISTS expira_at TIMESTAMPTZ;
ALTER TABLE canjes ADD COLUMN IF NOT EXISTS confirmado_at TIMESTAMPTZ;

-- Los canjes previos a esta migración ya sucedieron sin ningún código que confirmar: se
-- marcan confirmados retroactivamente (con la fecha en que se cargaron), nunca "pendientes"
-- de algo que ya pasó hace tiempo.
UPDATE canjes SET estado = 'confirmado', confirmado_at = created_at
WHERE codigo_verificacion IS NULL;

CREATE INDEX idx_canjes_codigo ON canjes(codigo_verificacion) WHERE codigo_verificacion IS NOT NULL;

-- ============================================================
-- iniciar_canje — el cliente arranca un canje: valida puntos, descuenta y genera el código
-- ============================================================
-- Mismo criterio de seguridad que canjear_recompensa (0004/0017): el cliente nunca pasa su
-- propio cliente_id, se resuelve del lado del servidor vía auth.uid() — así nadie puede
-- iniciar un canje a nombre de otro cliente pasando un id ajeno.
-- Sigue tomando `p_pts` (no `p_recompensa_id`) por el mismo motivo original: los negocios
-- de ejemplo del marketplace (mock, sin fila real en `recompensas`) no tienen id numérico en
-- el frontend, y el monto en puntos ya identifica la recompensa sin ambigüedad real.
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

  -- Bloqueamos la fila de la relación mientras validamos y descontamos (mismo criterio que
  -- canjear_recompensa: evita que dos canjes simultáneos gasten el mismo saldo).
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

  -- Reintenta si el código de 6 caracteres colisiona con uno ya vigente (espacio de ~2.100M
  -- combinaciones — casi nunca pasa, pero el UNIQUE existe justamente para no confiar en "casi").
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
-- confirmar_canje — el cajero valida el código en el mostrador
-- ============================================================
-- El cajero no tiene sesión de Supabase Auth (mismo esquema que cobrar_con_pin, 0002): se
-- autoriza validando `p_pin` contra `negocios.pin_cajero`, nunca con auth.uid(). `mensaje`
-- devuelve un código de error corto (no texto para mostrar) para que el copy final lo
-- controle el frontend, mismo criterio que ya usa `regalar_puntos` (0016) del lado cliente.
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
  SELECT * INTO v_negocio
  FROM negocios
  WHERE id = p_negocio_id AND activo = true AND pin_cajero IS NOT NULL AND pin_cajero = p_pin;

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

-- ============================================================
-- expirar_mis_canjes — el cliente recupera solo, al abrir la app, los puntos de códigos
-- propios que vencieron sin que nadie los confirmara en el mostrador
-- ============================================================
-- Sin esto, un código que expira con la app cerrada (o sin que el cajero llegue a tipearlo)
-- deja los puntos descontados para siempre hasta que alguien corra `limpiar_canjes_expirados`
-- manualmente. Se llama en cada carga de `cargarAppCliente` (panelCliente.ts): barato, scoped
-- al propio cliente vía auth.uid(), sin necesidad de cron para el caso común.
CREATE OR REPLACE FUNCTION expirar_mis_canjes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_fila canjes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NULL THEN RETURN; END IF;

  FOR v_fila IN
    SELECT * FROM canjes
      WHERE cliente_id = v_cliente_id AND estado = 'pendiente' AND expira_at < now()
      FOR UPDATE
  LOOP
    UPDATE relaciones_negocio SET puntos = puntos + v_fila.pts
      WHERE cliente_id = v_fila.cliente_id AND negocio_id = v_fila.negocio_id;
    UPDATE canjes SET estado = 'expirado' WHERE id = v_fila.id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION expirar_mis_canjes() TO authenticated;

-- ============================================================
-- limpiar_canjes_expirados — red de seguridad global (sin cron todavía)
-- ============================================================
-- Cubre el caso que `expirar_mis_canjes` no puede: un cliente que nunca vuelve a abrir la
-- app. No se programa un cron acá (decisión de infraestructura fuera de este cambio) — queda
-- lista para colgarla de pg_cron el día que se decida. No se otorga GRANT a anon/authenticated
-- a propósito: solo pensada para correr como service_role/cron, no desde el cliente.
CREATE OR REPLACE FUNCTION limpiar_canjes_expirados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fila canjes%ROWTYPE;
BEGIN
  FOR v_fila IN
    SELECT * FROM canjes WHERE estado = 'pendiente' AND expira_at < now() FOR UPDATE
  LOOP
    UPDATE relaciones_negocio SET puntos = puntos + v_fila.pts
      WHERE cliente_id = v_fila.cliente_id AND negocio_id = v_fila.negocio_id;
    UPDATE canjes SET estado = 'expirado' WHERE id = v_fila.id;
  END LOOP;
END;
$$;
