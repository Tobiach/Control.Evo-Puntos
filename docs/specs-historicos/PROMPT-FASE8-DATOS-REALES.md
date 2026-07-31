# FASE 8 — Conectar la app del cliente a datos reales de Supabase

## Contexto

El proyecto Supabase real (`ajydiowgrdtivndthidh`) ya está conectado (`supabaseEnabled = true`).
Cajero y dueño ya operan 100% real (RPC `cobrar_con_pin`, `verificar_pin_cajero`, tablas
`negocios`/`recompensas` vía `panelDueno.ts`). El auth de cliente (email + `vincular_cliente`
RPC) también ya está resuelto (ver `src/lib/auth.ts`).

**El problema que resuelve esta fase:** toda la carpeta `src/components/appcliente/` sigue
funcionando 100% sobre datos mock (`src/data/mockClientes.ts`, `src/lib/club.ts`), incluso
para un cliente que ya inició sesión de verdad. El login no alimenta ninguna pantalla real.

## Qué SÍ hacer en esta fase

Conectar estas pantallas a Supabase cuando `supabaseEnabled === true` y hay una sesión de
cliente activa (usar `useSesion` ya existente en `src/hooks/useSesion.ts`):

1. **Puntos por negocio** — reemplazar el mock de `relaciones_negocio` por un `select` real
   filtrado por el `cliente_id` de la sesión (obtenido de `clientes.user_id = auth.uid()`).
   Mostrar puntos reales por negocio en `TabInicio.tsx`.
2. **Historial de visitas** — `TabActividad.tsx` debe leer de la tabla `visitas` real (join
   con `negocios` para nombre/emoji), no del mock.
3. **Canje de recompensas** — cuando el cliente "canjea" una recompensa, debe descontarse
   puntos reales en `relaciones_negocio` (vía una función RPC nueva `canjear_recompensa`,
   `SECURITY DEFINER`, siguiendo el mismo patrón que `cobrar_con_pin` en
   `supabase/migrations/0002_pin_cajero.sql` — valida que el cliente tenga puntos suficientes
   antes de descontar, todo en una transacción atómica).
4. **Marketplace** — los negocios reales cargados por dueños (tabla `negocios` con
   `activo = true`) deben aparecer junto a (o en reemplazo de, si ya no quedan negocios mock
   relevantes — usar tu criterio y documentarlo) los negocios ficticios de
   `src/data/negocios.ts`.
5. **Insignias/misiones** — pueden seguir siendo cálculo en el cliente a partir de las
   visitas reales ya traídas (no hace falta tabla nueva más allá de `insignias_conseguidas`
   que ya existe en el schema).

## Qué NO hacer en esta fase

- No tocar el auth (`src/lib/auth.ts`, `LoginCliente.tsx`) — ya está resuelto.
- No tocar cajero ni dueño (`src/components/cajero/`, `src/components/dueno/`) — ya operan reales.
- No implementar social (amigos/grupos/desafíos) contra Supabase todavía — pueden seguir en
  mock por ahora, es la parte de menor impacto comercial.
- No borrar los datos mock (`src/data/`) — siguen siendo el fallback cuando
  `supabaseEnabled === false` (modo demo/preview, debe seguir funcionando sin backend).
- Nueva migración SQL: crear `supabase/migrations/0004_canje_recompensa.sql` — no edites las
  migraciones `0001`/`0002`/`0003` ya aplicadas en el proyecto real.

## Checklist antes de terminar

- `npm run lint` → 0 errores
- `npm run build` → sin warnings críticos nuevos
- `npm run test` → todos los tests existentes siguen pasando (agregá tests nuevos para
  `canjear_recompensa` y la carga real de puntos/visitas si el tiempo lo permite)
- Commit con mensaje claro describiendo qué quedó conectado a datos reales
