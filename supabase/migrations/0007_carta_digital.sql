-- Control.Evo — Carta digital pública (menú QR por negocio)
-- Cada negocio publica su carta: lo que vende normalmente EN PESOS (distinto de las
-- recompensas, que es "lo que se canjea con puntos"). La carta la ve cualquiera sin
-- login, tipo menú de restaurante escaneado en la mesa. Backup antes de correr en prod.

-- ============================================================
-- CARTA DIGITAL (items en pesos, agrupados por categoría)
-- ============================================================

CREATE TABLE carta_items (
  id BIGSERIAL PRIMARY KEY,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,
  categoria TEXT,                        -- sección del menú, texto libre ('Entradas', 'Bebidas'...)
  foto_url TEXT,                         -- URL de una imagen ya subida a otro lado (sin upload propio)
  disponible BOOLEAN DEFAULT true,       -- false = agotado / oculto de la carta pública
  orden INT DEFAULT 0,                   -- para ordenar los items dentro de su categoría
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE carta_items ENABLE ROW LEVEL SECURITY;

-- Lectura pública SIN autenticación: cualquiera con el link ve la carta de un negocio
-- activo. Igual de pública que `negocios`/`recompensas`; el único filtro es `activo = true`
-- (un club pausado esconde también su carta, ver la vista pública CartaPublica.tsx).
CREATE POLICY "Lectura pública de la carta" ON carta_items
  FOR SELECT USING (
    negocio_id IN (SELECT id FROM negocios WHERE activo = true)
  );

-- Escritura solo del dueño del negocio (mismo patrón que `recompensas`). FOR ALL sin
-- WITH CHECK explícito: Postgres reutiliza la expresión de USING también al insertar.
CREATE POLICY "El dueño gestiona la carta de su negocio" ON carta_items
  FOR ALL USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

CREATE INDEX idx_carta_items_negocio ON carta_items(negocio_id);
