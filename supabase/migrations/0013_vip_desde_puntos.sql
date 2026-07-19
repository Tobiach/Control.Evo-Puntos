-- Umbral real de VIP por negocio: a partir de cuántos puntos un cliente es VIP en ESE
-- local. Nullable: mientras el dueño no lo configure, la app sigue mostrando el umbral
-- genérico de demo (no rompe negocios ya sembrados sin este dato).
alter table negocios
  add column vip_desde_puntos integer;
