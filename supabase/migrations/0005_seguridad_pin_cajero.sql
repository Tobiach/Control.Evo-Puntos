-- Control.Evo — FIX DE SEGURIDAD CRÍTICO: el PIN de cajero se filtraba públicamente
--
-- Problema: la policy "Lectura pública del marketplace" en `negocios` filtra FILAS
-- (activo = true) pero RLS de Postgres no filtra COLUMNAS. Cualquiera con la key
-- pública (embebida por diseño en el bundle del cliente) podía hacer
-- `negocios?select=pin_cajero` y leer el PIN de CUALQUIER negocio, sin login.
-- Confirmado en vivo contra el proyecto real antes de este fix.
--
-- Solución: sacar `pin_cajero` de `negocios` a una tabla aparte sin ninguna policy
-- pública — solo el dueño puede leer/escribir el PIN de su propio negocio, y las
-- funciones SECURITY DEFINER (que validan el cobro del cajero) siguen pudiendo leerlo
-- porque corren con los privilegios de quien las creó, no del que las llama.

CREATE TABLE negocio_pin (
  negocio_id TEXT PRIMARY KEY REFERENCES negocios(id) ON DELETE CASCADE,
  pin_cajero TEXT NOT NULL
);

-- Migrar los PIN que ya existan en la columna vieja.
INSERT INTO negocio_pin (negocio_id, pin_cajero)
SELECT id, pin_cajero FROM negocios WHERE pin_cajero IS NOT NULL;

ALTER TABLE negocios DROP COLUMN pin_cajero;

ALTER TABLE negocio_pin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El dueño ve y edita el PIN de su propio negocio" ON negocio_pin
  FOR ALL USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  ) WITH CHECK (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );
-- Sin policy de SELECT pública: nadie más puede leer esta tabla, ni con la key pública.

-- ============================================================
-- Actualizar las funciones que validaban contra la columna vieja
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
