-- Control.Evo — Perfil del dueño + dirección real del negocio
--
-- Dos cosas en esta migración:
--   1) Tabla `dueno_perfil`: datos personales del dueño (hoy, solo su nombre), separados
--      del negocio. Un dueño ↔ una fila (PK = su user_id de Auth). RLS estricto: cada dueño
--      solo ve/edita su propia fila, nunca hay lectura pública.
--   2) Columnas de dirección en `negocios` (`calle`, `altura`, `codigo_postal`): la dirección
--      real vive acá, junto a lat/lng que ya existen. La sección "Perfil" y "Negocio → Ubicación"
--      son dos vistas del MISMO dato, no se duplica en otra tabla.
--
-- Backup antes de correr en producción. Pegar tal cual en el SQL Editor de Supabase.

-- ============================================================
-- 1) PERFIL DEL DUEÑO
-- ============================================================

CREATE TABLE dueno_perfil (
  dueno_user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre_persona TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dueno_perfil ENABLE ROW LEVEL SECURITY;

-- Sin lectura pública: cada dueño solo lee/inserta/actualiza su propia fila.
CREATE POLICY "El dueño ve su propio perfil" ON dueno_perfil
  FOR SELECT USING (auth.uid() = dueno_user_id);
CREATE POLICY "El dueño crea su propio perfil" ON dueno_perfil
  FOR INSERT WITH CHECK (auth.uid() = dueno_user_id);
CREATE POLICY "El dueño edita su propio perfil" ON dueno_perfil
  FOR UPDATE USING (auth.uid() = dueno_user_id) WITH CHECK (auth.uid() = dueno_user_id);

-- ============================================================
-- 2) DIRECCIÓN REAL DEL NEGOCIO (mismo dato que lat/lng, no se duplica)
-- ============================================================

ALTER TABLE negocios ADD COLUMN IF NOT EXISTS calle TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS altura TEXT;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
