# Invitar a un amigo (referidos con beneficio real, no solo social)

## Contexto

Ya existe una capa "social" (`src/lib/social.ts`, `src/lib/compartir.ts`) pero es
100% demo/local (regalar puntos no persiste en Supabase). El usuario pidió ahora una
funcionalidad de **referidos REAL y operativa**, distinta de eso:

Un cliente comparte el código/link de SU club en un negocio. Cuando otra persona (el
"referido") se registra usando ese código y **visita ESE MISMO negocio al menos 4
veces**, tanto el que invitó como el invitado reciben un beneficio real (puntos bonus
en ese negocio). Antes de las 4 visitas no pasa nada — no hay premio anticipado ni
parcial.

Leé antes de escribir código: `supabase/migrations/0001_schema.sql` (tabla `amigos` ya
existe pero es simple, sin lógica de recompensa — evaluá si conviene una tabla nueva
en vez de forzar `amigos` a hacer algo para lo que no fue pensada), `src/lib/auth.ts`
(patrón `vincularCliente` — mismo estilo de RPC `SECURITY DEFINER` a seguir),
`supabase/migrations/0004_canje_recompensa.sql` (patrón de función atómica con
validación server-side, `FOR UPDATE`), `src/lib/compartir.ts`, `src/lib/social.ts`,
`src/components/appcliente/` (para integrar la UI en el lugar que tenga más sentido,
probablemente `AppCliente.tsx` o una sección de perfil/social ya existente).

## Qué SÍ hacer

### 1. Schema
Nueva migración `supabase/migrations/0008_referidos.sql`:
- Cada `clientes` necesita un código de referido corto y compartible — agregar
  columna `codigo_referido TEXT UNIQUE` a `clientes` (generado en el momento del
  alta, ej. con un patrón corto tipo 6 caracteres alfanuméricos; si ya existe algún
  helper de generación de códigos cortos en el proyecto reusalo, si no armá uno
  simple y determinístico de colisión rarísima).
- Tabla `referidos`: `id BIGSERIAL, referente_cliente_id UUID, referido_cliente_id
  UUID, negocio_id TEXT, creado_at TIMESTAMPTZ, premiado_at TIMESTAMPTZ NULL` (null =
  todavía no cumplió las 4 visitas). Únicos por (referido_cliente_id, negocio_id) —
  una persona solo puede haber sido invitada una vez por negocio.
- RLS: cada cliente puede ver sus propios referidos (como referente) vía
  `auth.uid()` → `clientes.user_id`, igual patrón que el resto de las tablas de
  cliente.

### 2. Registrar el referido (al vincularse)
- Función RPC `SECURITY DEFINER` `registrar_referido(p_codigo_referente TEXT,
  p_negocio_id TEXT)` que: valida que exista un cliente con ese código, que no sea
  el mismo que está llamando (no auto-referirse), y crea la fila en `referidos` con
  `referido_cliente_id = ` el cliente de la sesión actual (resuelto por
  `auth.uid()`, mismo patrón que `vincular_cliente`). Si ya existe esa combinación
  referido+negocio, no hacer nada (idempotente, no error).
- En el cliente: cuando alguien abre la app con un link de invitación (definí un
  query param, ej. `?ref=<codigo>&negocio=<negocioId>`, igual filosofía de query
  param que ya se usa en el resto del proyecto — no hay router), guardar
  `codigo`+`negocio` pendiente (mismo patrón de `localStorage` que ya usa
  `registrarCliente` en `auth.ts` para el vínculo de teléfono pendiente de
  confirmación) y llamar a `registrar_referido` apenas haya sesión activa de esa
  persona (recién registrada o ya logueada).

### 3. Detectar y premiar las 4 visitas
- Función RPC `SECURITY DEFINER` `revisar_premio_referido(p_negocio_id TEXT)`
  (llamada por CUALQUIERA de las dos partes al abrir la app/ese negocio — el
  cálculo es idempotente y server-side, no hace falta un cron ni trigger):
  cuenta las visitas reales (`visitas` table) del `referido_cliente_id` en ese
  `negocio_id`; si son >= 4 y `premiado_at IS NULL`, en una transacción: acredita
  puntos bonus (definí un valor razonable, ej. 100 pts, dejalo como constante
  clara y documentada) a AMBOS (`referente` y `referido`) en `relaciones_negocio`
  de ese negocio, y marca `premiado_at = NOW()`. Si ya estaba premiado o no llegó
  a 4, no hace nada (sin error, solo informa el estado actual).
- Devolver en la respuesta el estado (ej. `{ premiado: boolean, visitas_actuales:
  int, visitas_necesarias: 4 }`) para que la UI pueda mostrar progreso ("Tu amigo
  ya visitó 2 de 4 veces").

### 4. UI
- Botón "Invitá a un amigo" (reusar `compartir()` de `src/lib/compartir.ts`) que arma
  el link con el código propio + negocio actual, mismo tono de copy que el resto
  (español rioplatense).
- Sección simple de "Tus invitados" con el progreso de cada referido (visitas
  actuales / 4) y si ya se cobró el premio.

## Qué NO hacer

- No tocar `regalarPuntos`/`social.ts` existente — es una mecánica distinta
  (compartir puntos propios), no la reemplaces ni la mezcles con esto.
- No premiar antes de las 4 visitas reales, ni de forma parcial.
- No tocar el mapa, la carta digital (si esa tanda corrió en paralelo/antes, no te
  cruces con esos archivos), ni el panel del dueño.
- No confiar en ningún valor que venga del cliente sin validar server-side (ni el
  conteo de visitas ni quién es el referente) — todo el cálculo de premio va en la
  función `SECURITY DEFINER`, nunca confiar en el estado de React para decidir si
  se acredita algo.

## Checklist antes de terminar

- `npm run lint` → 0 errores
- `npm run build` → sin warnings críticos nuevos
- `npm run test` → todos los tests existentes en verde + nuevos para lógica pura
  (generación de código, si aplica)
- Migración `0008_referidos.sql` sin aplicar todavía (se la doy yo al usuario)
- Commit con mensaje claro
