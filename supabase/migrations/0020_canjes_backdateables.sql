-- Premia.ar — El dueño puede cargar canjes de su propio negocio directamente.
-- `canjear_recompensa()` (0017) siempre pone `created_at = NOW()` (mismo criterio que
-- `cobrar_con_pin`): correcto para el uso real, pero impide poblar demos con canjes
-- repartidos en varias semanas (necesario para que "puntos acreditados vs. redimidos"
-- del panel operativo, 0018, no muestre los redimidos apilados en una sola barra).
-- Mismo patrón que ya existe en `visitas` (0001) y `relaciones_negocio` (0001): el dueño
-- tiene una policy de escritura sobre las tablas de SU propio negocio, además de la RPC
-- que usan los clientes. Solo INSERT (no UPDATE/DELETE) — lo mínimo necesario para poder
-- backdatear siembra de demo sin abrir más superficie de la que hace falta.
-- Backup antes de correr en producción.

CREATE POLICY "El dueño carga canjes de su negocio" ON canjes
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT dueno_user_id FROM negocios WHERE id = negocio_id)
  );
