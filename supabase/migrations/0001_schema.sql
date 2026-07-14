-- Control.Evo — Club de Puntos
-- Schema diseñado 1:1 sobre los tipos TypeScript ya existentes en src/data/ y src/lib/,
-- para que migrar de datos mock a Supabase real sea un cambio de capa de datos, no un
-- rediseño. Siempre RLS activado. Backup antes de correr en producción.

-- ============================================================
-- NEGOCIOS (marketplace de locales afiliados)
-- ============================================================

CREATE TABLE negocios (
  id TEXT PRIMARY KEY,                  -- slug legible, ej. 'cafe-nardo' (igual que el mock)
  dueno_user_id UUID REFERENCES auth.users(id),  -- null hasta que el dueño complete el onboarding
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  rubro TEXT NOT NULL CHECK (rubro IN ('gastro', 'super')),
  emoji TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  clientes_activos INT DEFAULT 0,       -- contador cacheado para el marketplace, no fuente de verdad
  horario_valle JSONB,                  -- { desde, hasta, dias: number[] } — null si no aplica
  beneficios_vip TEXT[],                -- beneficios no monetarios del nivel más alto
  moneda_prefijo TEXT NOT NULL DEFAULT '$',
  monto_por_punto DECIMAL(10,2) NOT NULL DEFAULT 100,  -- 1 punto cada N de moneda local
  plan TEXT NOT NULL DEFAULT 'setup_mensual' CHECK (plan IN ('setup_mensual', 'comision')),
  activo BOOLEAN DEFAULT true,          -- para "dar de baja" sin borrar (ver ERROR_REGISTRY del repo madre)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública del marketplace" ON negocios FOR SELECT USING (activo = true);
CREATE POLICY "El dueño edita solo su negocio" ON negocios
  FOR UPDATE USING (auth.uid() = dueno_user_id);
CREATE POLICY "El dueño inserta su negocio en el onboarding" ON negocios
  FOR INSERT WITH CHECK (auth.uid() = dueno_user_id);

CREATE INDEX idx_negocios_rubro ON negocios(rubro);
CREATE INDEX idx_negocios_dueno ON negocios(dueno_user_id);

-- Niveles (Nuevo/Frecuente/VIP) por negocio — hoy son 3 fijos, pero el dueño podría
-- ajustar los umbrales sin tocar código.
CREATE TABLE niveles (
  id BIGSERIAL PRIMARY KEY,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,                 -- 'Nuevo' | 'Frecuente' | 'VIP' (u otro que defina el dueño)
  minimo_puntos INT NOT NULL,
  orden INT NOT NULL DEFAULT 0
);

ALTER TABLE niveles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON niveles FOR SELECT USING (true);
CREATE POLICY "El dueño gestiona los niveles de su negocio" ON niveles
  FOR ALL USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

-- ============================================================
-- RECOMPENSAS Y EVENTOS DEL NEGOCIO
-- ============================================================

CREATE TABLE recompensas (
  id BIGSERIAL PRIMARY KEY,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  pts INT NOT NULL,
  descripcion TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('Bebidas', 'Comida', 'Descuentos', 'Regalos')),
  costo_dinero DECIMAL(10,2),           -- null = 100% puntos; con valor = combo puntos+plata
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recompensas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON recompensas FOR SELECT USING (activa = true);
CREATE POLICY "El dueño gestiona las recompensas de su negocio" ON recompensas
  FOR ALL USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

CREATE INDEX idx_recompensas_negocio ON recompensas(negocio_id);

CREATE TABLE eventos_negocio (
  id BIGSERIAL PRIMARY KEY,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  recompensa_extra TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE eventos_negocio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON eventos_negocio FOR SELECT USING (true);
CREATE POLICY "El dueño gestiona los eventos de su negocio" ON eventos_negocio
  FOR ALL USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

-- ============================================================
-- CLIENTES (socios del club — comparten cuenta entre todos los negocios)
-- ============================================================

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),  -- null si todavía no completó el registro real
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL UNIQUE,         -- documento único del cliente en todo el sistema
  nacimiento DATE,                       -- para el beneficio/notificación de cumpleaños
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente ve y edita su propio perfil" ON clientes
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_clientes_telefono ON clientes(telefono);

-- ============================================================
-- RELACIÓN CLIENTE ↔ NEGOCIO (puntos independientes por local)
-- ============================================================

CREATE TABLE relaciones_negocio (
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  puntos INT NOT NULL DEFAULT 0,
  ultima_visita_at TIMESTAMPTZ,
  puntos_vencen_at TIMESTAMPTZ,          -- calculado: última visita + 60 días
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cliente_id, negocio_id)
);

ALTER TABLE relaciones_negocio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente ve su propia relación" ON relaciones_negocio
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id)
  );
CREATE POLICY "El dueño ve las relaciones de su negocio" ON relaciones_negocio
  FOR SELECT USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );
CREATE POLICY "El dueño/cajero acredita o descuenta puntos" ON relaciones_negocio
  FOR UPDATE USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );
CREATE POLICY "El dueño da de alta la relación en el primer cobro" ON relaciones_negocio
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

CREATE INDEX idx_relaciones_negocio ON relaciones_negocio(negocio_id);

-- ============================================================
-- VISITAS (historial de consumo — origen de puntos, rachas y misiones)
-- ============================================================

CREATE TABLE visitas (
  id BIGSERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL,
  negocio_id TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  puntos INT NOT NULL,
  es_nuevo BOOLEAN DEFAULT false,        -- misión "probá algo nuevo"
  categoria TEXT CHECK (categoria IN ('Bebidas', 'Comida', 'Descuentos', 'Regalos')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (cliente_id, negocio_id) REFERENCES relaciones_negocio(cliente_id, negocio_id) ON DELETE CASCADE
);

ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente ve sus propias visitas" ON visitas
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id)
  );
CREATE POLICY "El dueño ve y carga visitas de su negocio" ON visitas
  FOR ALL USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

CREATE INDEX idx_visitas_relacion ON visitas(cliente_id, negocio_id);
CREATE INDEX idx_visitas_fecha ON visitas(created_at);

-- ============================================================
-- INSIGNIAS (logros conseguidos — se persiste el momento en que se desbloquean)
-- ============================================================

CREATE TABLE insignias_conseguidas (
  id BIGSERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL,
  negocio_id TEXT NOT NULL,
  id_insignia TEXT NOT NULL CHECK (id_insignia IN ('racha-semanal', 'racha-larga', 'probo-nuevo', 'evento')),
  conseguida_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (cliente_id, negocio_id) REFERENCES relaciones_negocio(cliente_id, negocio_id) ON DELETE CASCADE,
  UNIQUE (cliente_id, negocio_id, id_insignia)
);

ALTER TABLE insignias_conseguidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente ve sus propias insignias" ON insignias_conseguidas
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id)
  );
CREATE POLICY "El sistema/dueño registra insignias de su negocio" ON insignias_conseguidas
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

-- ============================================================
-- SOCIAL — amigos, grupos y desafíos (todo acotado a un negocio)
-- ============================================================

CREATE TABLE amigos (
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  amigo_cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cliente_id, amigo_cliente_id),
  CHECK (cliente_id <> amigo_cliente_id)
);

ALTER TABLE amigos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente gestiona su propia lista de amigos" ON amigos
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id)
  );

CREATE TABLE grupos (
  id BIGSERIAL PRIMARY KEY,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES clientes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grupo_miembros (
  grupo_id BIGINT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  PRIMARY KEY (grupo_id, cliente_id)
);

ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_miembros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los miembros ven su grupo" ON grupos
  FOR SELECT USING (
    id IN (SELECT grupo_id FROM grupo_miembros gm JOIN clientes c ON c.id = gm.cliente_id WHERE c.user_id = auth.uid())
  );
CREATE POLICY "Un cliente crea un grupo" ON grupos
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = creado_por)
  );
CREATE POLICY "Los miembros ven la lista del grupo" ON grupo_miembros
  FOR SELECT USING (
    cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
    OR grupo_id IN (SELECT grupo_id FROM grupo_miembros gm JOIN clientes c ON c.id = gm.cliente_id WHERE c.user_id = auth.uid())
  );

CREATE TABLE desafios (
  id BIGSERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  meta INT NOT NULL,                     -- ej. 3 visitas
  progreso INT NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'en-curso' CHECK (estado IN ('en-curso', 'cumplido', 'fallado')),
  vence_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE desafios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente ve y actualiza sus propios desafíos" ON desafios
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id)
  );

-- ============================================================
-- NOTIFICACIONES ENVIADAS (para no repetir el mismo aviso)
-- ============================================================

CREATE TABLE notificaciones_enviadas (
  id BIGSERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  id_aviso TEXT NOT NULL CHECK (id_aviso IN ('racha-riesgo', 'puntos-vencen', 'recompensa-nueva', 'cumple')),
  enviada_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notificaciones_enviadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "El cliente ve sus propias notificaciones" ON notificaciones_enviadas
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM clientes WHERE id = cliente_id)
  );
CREATE POLICY "El sistema registra notificaciones" ON notificaciones_enviadas
  FOR INSERT WITH CHECK (true);
