-- Control.Evo — Nuevo rubro: cafeterías
-- Mismo patrón que 0011_rubro_carniceria.sql: se reemplaza el CHECK de `negocios.rubro`
-- para admitir 'cafeteria' además de los 3 valores existentes.

ALTER TABLE negocios DROP CONSTRAINT negocios_rubro_check;

ALTER TABLE negocios
  ADD CONSTRAINT negocios_rubro_check
  CHECK (rubro IN ('gastro', 'super', 'carniceria', 'cafeteria'));
