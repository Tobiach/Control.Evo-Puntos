-- Premia.ar — Registro real de canjes de recompensa (para el panel operativo del dueño)
-- `canjear_recompensa()` (0004) hoy solo resta puntos de `relaciones_negocio`: no queda
-- rastro de QUÉ recompensa se canjeó, CUÁNDO, ni CUÁNTO. Sin esto, "puntos redimidos por
-- semana" y "recompensas más elegidas" no son calculables. Backup antes de correr en producción.

-- ============================================================
-- TABLA canjes
-- ============================================================

CREATE TABLE canjes (
  id BIGSERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL,
  negocio_id TEXT NOT NULL,
  recompensa_id BIGINT REFERENCES recompensas(id) ON DELETE SET NULL, -- null si la recompensa se borró después
  pts INT NOT NULL,
  descripcion TEXT NOT NULL, -- snapshot del texto de la recompensa al momento del canje, no cambia si el dueño edita/borra la recompensa después
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (cliente_id, negocio_id) REFERENCES relaciones_negocio(cliente_id, negocio_id) ON DELETE CASCADE
);

ALTER TABLE canjes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente ve sus propios canjes" ON canjes
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id)
  );
CREATE POLICY "El dueño ve los canjes de su negocio" ON canjes
  FOR SELECT USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

CREATE INDEX idx_canjes_negocio_fecha ON canjes(negocio_id, created_at);
CREATE INDEX idx_canjes_recompensa ON canjes(recompensa_id);

-- ============================================================
-- canjear_recompensa(): mismo comportamiento de antes + ahora deja registro
-- ============================================================

CREATE OR REPLACE FUNCTION canjear_recompensa(p_negocio_id TEXT, p_pts INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
  v_puntos INT;
  v_recompensa_id BIGINT;
  v_descripcion TEXT;
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

  -- Antes solo se validaba que existiera; ahora también guardamos su id/descripción
  -- para dejar el snapshot en `canjes`.
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

  INSERT INTO canjes (cliente_id, negocio_id, recompensa_id, pts, descripcion)
  VALUES (v_cliente_id, p_negocio_id, v_recompensa_id, p_pts, v_descripcion);

  RETURN jsonb_build_object(
    'negocio_id', p_negocio_id,
    'puntos_descontados', p_pts,
    'puntos_restantes', v_puntos - p_pts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION canjear_recompensa(TEXT, INT) TO authenticated;
