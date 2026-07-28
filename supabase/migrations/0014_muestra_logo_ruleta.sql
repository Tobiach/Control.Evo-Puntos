-- Control.Evo Puntos (Premia.ar) — Negocios de muestra para venta + logo/portada + ruleta por negocio
-- Migración 100% aditiva: columnas nuevas con default (no rompe filas existentes, no toca
-- ninguna policy de RLS ya creada), tabla nueva con el mismo patrón que `recompensas`.
-- Backup antes de correr en producción.

-- ============================================================
-- NEGOCIOS DE MUESTRA (preview de venta para un prospecto puntual)
-- ============================================================
-- `es_muestra` es DISTINTO del concepto "esPreview" que ya existe en el panel del dueño
-- (ese es "todavía no guardé el negocio / sin backend conectado", puramente de UI).
-- Este es un flag persistido: negocio real cargado en Supabase, con `activo = true` para
-- que la carta pública/recompensas/ruleta funcionen igual que cualquier otro negocio vía
-- el link directo `?carta=<id>`, pero excluido del fetch del marketplace en código
-- (ver panelCliente.ts) para que no aparezca ni en la lista ni en "cerca tuyo" de clientes
-- reales. No requiere cambios de RLS: ninguna policy existente depende de este valor.

ALTER TABLE negocios
  ADD COLUMN es_muestra BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN logo_url TEXT,
  ADD COLUMN portada_url TEXT;

-- ============================================================
-- PREMIOS DE LA RULETA (por negocio, opcional)
-- ============================================================
-- Hasta ahora la ruleta semanal (`RuletaSemanal.tsx`) usaba un único pool global
-- (`PREMIOS_RULETA` en `lib/ruleta.ts`) igual para todos los negocios. Esta tabla permite
-- que un negocio cargue su propio pool de premios (por ejemplo, basado en su menú real).
-- Si un negocio no tiene filas acá, la app sigue usando el pool global sin ningún cambio
-- de comportamiento — ningún negocio real existente se ve afectado por esta migración.

CREATE TABLE premios_ruleta (
  id BIGSERIAL PRIMARY KEY,
  negocio_id TEXT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  peso INT NOT NULL DEFAULT 10,           -- mismo concepto que PremioRuleta.peso (probabilidad relativa)
  bueno BOOLEAN NOT NULL DEFAULT false,   -- dispara confetti al caer, igual que en el pool global
  orden INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE premios_ruleta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON premios_ruleta FOR SELECT USING (activo = true);
CREATE POLICY "El dueño gestiona los premios de su negocio" ON premios_ruleta
  FOR ALL USING (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );

CREATE INDEX idx_premios_ruleta_negocio ON premios_ruleta(negocio_id);
