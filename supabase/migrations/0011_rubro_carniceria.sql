-- Control.Evo — Nuevo rubro: carnicerías
-- El CHECK inline original (0001_schema.sql) solo aceptaba 'gastro' y 'super'. Postgres lo
-- nombró automáticamente `negocios_rubro_check`. Lo reemplazamos por uno con los 3 valores
-- para que un carnicero real pueda elegir 'carniceria' en el onboarding.

ALTER TABLE negocios DROP CONSTRAINT negocios_rubro_check;

ALTER TABLE negocios
  ADD CONSTRAINT negocios_rubro_check
  CHECK (rubro IN ('gastro', 'super', 'carniceria'));
