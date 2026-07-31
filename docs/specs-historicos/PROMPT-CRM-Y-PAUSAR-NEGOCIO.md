# Lista de clientes (mini-CRM) + pausar negocio

## Contexto

Leé primero completo: `src/lib/panelDueno.ts`, `src/components/dueno/PanelDueno.tsx`,
`src/components/dueno/SeccionNegocio.tsx`, `src/components/dueno/SeccionMetricas.tsx` —
para reusar los mismos patrones (`ResultadoPanel<T>`, tipos `Fila*`, null-safe, mismo
estilo visual Tailwind ya usado en las otras secciones del panel).

Hoy el dueño solo ve un total agregado (`cargarMetricas`: cuántos clientes y cuántos
puntos en total) pero no puede ver QUIÉN es cada cliente. Y el campo `activo` de
`negocios` existe en el schema pero no hay ningún botón para apagarlo/prenderlo.

## Qué SÍ hacer

### 1. Lista de clientes (mini-CRM)
- Nueva función en `panelDueno.ts`: `cargarClientesDelNegocio(negocioId: string):
  Promise<ResultadoPanel<ClienteDelNegocio[]>>` — trae de `relaciones_negocio` JOIN
  `clientes` (nombre, teléfono, puntos, `ultima_visita_at`) para ese negocio, ordenado
  por `ultima_visita_at` descendente (los más recientes primero). Revisá las policies
  RLS de `relaciones_negocio` y `clientes` en `supabase/migrations/0001_schema.sql`
  antes de escribir la query — la policy de `clientes` es `auth.uid() = user_id`
  (el propio cliente), así que probablemente necesites traer los datos vía
  `relaciones_negocio` (que sí tiene policy de dueño) y hacer un `select` con join
  embebido de Supabase (`clientes(nombre, telefono)`) en vez de tocar `clientes`
  directo — si el join no funciona por RLS, documentá el problema en el commit y
  proponé la alternativa (ej. una función RPC `SECURITY DEFINER` que devuelva los
  datos ya armados, siguiendo el patrón de `cobrar_con_pin`).
- Nuevo componente `src/components/dueno/SeccionClientes.tsx`: lista simple con
  nombre, teléfono, puntos y "hace X días" de la última visita (podés reusar/adaptar
  el cálculo de días relativo que ya existe en otros lados del proyecto, ej.
  `diasDesde` en `src/lib/panelCliente.ts`). Buscador simple por nombre/teléfono.
  Estado vacío honesto ("Todavía no tenés clientes — vas a verlos acá apenas
  alguien sume sus primeros puntos") en vez de una tabla vacía sin contexto.
- Integrar como una sección/tab más dentro de `PanelDueno.tsx`, con el mismo patrón
  de navegación que ya usan `SeccionNegocio`/`SeccionRecompensas`/`SeccionMetricas`.

### 2. Pausar/desactivar el negocio
- Nueva función en `panelDueno.ts`: `cambiarEstadoNegocio(negocioId: string, activo:
  boolean): Promise<ResultadoPanel<void>>` — hace `UPDATE negocios SET activo = ...`
  (la policy de UPDATE del dueño ya cubre esto, no hace falta tocar SQL).
- Un toggle/botón claro en `SeccionNegocio.tsx` o en un lugar visible de
  `PanelDueno.tsx` ("Pausar mi club" / "Reactivar mi club"), con una confirmación
  antes de pausar (modal o mensaje simple) explicando qué implica: mientras está
  pausado, el negocio no aparece en el marketplace de los clientes (la policy
  pública ya filtra por `activo = true`, así que alcanza con este UPDATE — no hace
  falta tocar nada más).
- Mostrar un estado visual claro cuando el negocio está pausado (banner o badge en
  el panel del dueño).

## Qué NO hacer

- No tocar `src/lib/auth.ts`, `LoginDueno.tsx`, `LoginCliente.tsx` — son de otra
  tanda en paralelo, no te cruces.
- No tocar el marketplace del cliente (`Marketplace.tsx`, `MarketplaceApp.tsx`,
  `MapaNegocios.tsx`) — la policy pública ya filtra por `activo`, no hace falta
  ningún cambio ahí para que pausar funcione.
- No borrar clientes ni relaciones — esto es solo lectura + el toggle de `activo`.

## Checklist antes de terminar

- `npm run lint` → 0 errores
- `npm run build` → sin warnings críticos nuevos
- `npm run test` → todos los tests existentes en verde + tests nuevos si agregás
  lógica pura (ej. el cálculo de "hace X días")
- Commit con mensaje claro
