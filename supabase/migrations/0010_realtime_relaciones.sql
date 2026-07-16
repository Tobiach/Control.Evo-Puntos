-- Control.Evo — Habilitar Realtime en relaciones_negocio
-- Sin esto, la app del cliente no recibe el cambio de puntos en vivo cuando el cajero
-- cobra: la RLS ya filtra correctamente (el cliente solo recibe SUS propias filas), acá
-- solo falta sumar la tabla a la publicación que usa Supabase Realtime.

ALTER PUBLICATION supabase_realtime ADD TABLE relaciones_negocio;
