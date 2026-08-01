-- Control.Evo Puntos (Premia.ar) — Promos reales por negocio + regalar puntos real
-- Backup antes de correr en producción.

-- ============================================================
-- PROMOS (antes solo existían en el marketplace ficticio; ahora el dueño real las carga)
-- ============================================================
CREATE TABLE promos (
  id BIGSERIAL PRIMARY KEY,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('2x1', 'horario', 'descuento')),
  titulo TEXT NOT NULL,
  detalle TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON promos FOR SELECT USING (activa = true);
CREATE POLICY "El dueño gestiona las promos de su negocio" ON promos
  FOR ALL USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

CREATE INDEX idx_promos_negocio ON promos(negocio_id);

-- ============================================================
-- REGALAR PUNTOS (real, atómico, acotado al MISMO negocio)
-- ============================================================
-- Antes era demo local (no persistía). Ahora: el remitente y el destino tienen que tener
-- una relación (puntos) en el MISMO negocio_id — no se puede regalar entre locales
-- distintos. Se identifica al destino por teléfono (no se expone una lista de clientes del
-- negocio a otro cliente, evita filtrar datos de terceros). Mismo patrón SECURITY DEFINER
-- que canjear_recompensa (0004): valida todo del lado del servidor, bloquea la fila con
-- FOR UPDATE para que dos regalos simultáneos no descuenten el mismo saldo dos veces.

CREATE OR REPLACE FUNCTION regalar_puntos(p_negocio_id TEXT, p_telefono_destino TEXT, p_pts INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_origen UUID;
  v_cliente_destino UUID;
  v_puntos_origen INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;
  IF p_pts IS NULL OR p_pts <= 0 THEN
    RAISE EXCEPTION 'pts_invalidos';
  END IF;

  SELECT id INTO v_cliente_origen FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_origen IS NULL THEN
    RAISE EXCEPTION 'cliente_no_vinculado';
  END IF;

  SELECT id INTO v_cliente_destino FROM clientes WHERE telefono = p_telefono_destino;
  IF v_cliente_destino IS NULL THEN
    RAISE EXCEPTION 'destino_no_existe';
  END IF;
  IF v_cliente_destino = v_cliente_origen THEN
    RAISE EXCEPTION 'destino_invalido';
  END IF;

  -- Bloqueamos la relación del remitente mientras validamos y descontamos.
  SELECT puntos INTO v_puntos_origen
  FROM relaciones_negocio
  WHERE cliente_id = v_cliente_origen AND negocio_id = p_negocio_id
  FOR UPDATE;

  IF v_puntos_origen IS NULL THEN
    RAISE EXCEPTION 'sin_relacion_origen';
  END IF;
  IF v_puntos_origen < p_pts THEN
    RAISE EXCEPTION 'puntos_insuficientes';
  END IF;

  -- El destino tiene que ser YA cliente de ESTE MISMO negocio (nunca de otro local).
  IF NOT EXISTS (
    SELECT 1 FROM relaciones_negocio WHERE cliente_id = v_cliente_destino AND negocio_id = p_negocio_id
  ) THEN
    RAISE EXCEPTION 'destino_no_es_cliente_de_este_local';
  END IF;

  UPDATE relaciones_negocio SET puntos = puntos - p_pts
    WHERE cliente_id = v_cliente_origen AND negocio_id = p_negocio_id;
  UPDATE relaciones_negocio SET puntos = puntos + p_pts
    WHERE cliente_id = v_cliente_destino AND negocio_id = p_negocio_id;

  RETURN jsonb_build_object('ok', true, 'puntos_restantes', v_puntos_origen - p_pts);
END;
$$;

GRANT EXECUTE ON FUNCTION regalar_puntos(TEXT, TEXT, INT) TO authenticated;
