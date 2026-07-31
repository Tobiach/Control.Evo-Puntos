# PROMPT — Fase 2: Auth real de cliente y de dueño (para Opus 4.8)

## Contexto — leer antes de tocar código

Este repo hoy corre 100% sobre datos mock en memoria (`src/data/mockClientes.ts`,
`src/data/negocios.ts`). Desde la Fase 1 existe el schema real en
`supabase/migrations/0001_schema.sql` y un cliente null-safe en `src/lib/supabase.ts`
(`supabase` es `null` si no hay env vars — hoy no las hay, así que la app debe seguir
funcionando igual que ahora, sobre mock, mientras no se conecte un proyecto real).

**Importante — no repitas el error ya cometido en otro proyecto de Control.Evo:** en
`bar-restaurante-arg` se hasheaban contraseñas con `btoa()` (reversible, no es un hash real) y
tuvo que corregirse después. Acá se hace bien desde el día uno: la auth real tiene que ser
**Supabase Auth** (no un sistema de contraseñas casero), que maneja el hashing del lado del
servidor — nunca implementes tu propio hash de contraseña en el cliente.

## Qué construir

**Dos tipos de cuenta, dos flujos separados:**

1. **Cliente (socio del club):** registro/login por **teléfono + contraseña** usando Supabase
   Auth. Si `supabaseEnabled` es `false` (sin env vars), el login debe caer a un modo "demo"
   que simplemente deja elegir entre los clientes mock existentes, tal como funciona hoy — no
   rompas la demo actual cuando no hay backend conectado.

2. **Dueño de negocio:** registro/login por **email + contraseña** con Supabase Auth. Este es
   un tipo de cuenta nuevo que hoy no existe en ningún lado del código — es el primer paso para
   la Fase 3 (onboarding), pero en esta fase solo construís el login/registro, no el panel
   todavía.

## Cómo debe convivir con lo que ya existe

- El modo demo de venta y el modo "App del cliente" sobre mock **deben seguir funcionando
  exactamente igual que hoy** si no hay Supabase conectado — es el comportamiento null-safe,
  no lo rompas.
- Si en el futuro se conecta un proyecto Supabase real (agregando las env vars), el login de
  cliente pasa a ser real automáticamente — diseñalo para ese día, pero no te preocupes por
  probarlo contra un proyecto real ahora, porque no hay ninguno conectado.
- Guardá la sesión de Supabase con el manejo estándar del SDK (`supabase.auth.getSession()` /
  `onAuthStateChange`), no reinventes persistencia de sesión a mano.

## Pantallas nuevas

- **Login/registro de cliente** — teléfono + contraseña, con validación básica (contraseña
  mínimo 6 caracteres, teléfono con formato mínimo razonable). Mensajes de error humanos, no
  el error crudo de Supabase.
- **Login/registro de dueño** — accesible desde un link discreto ("¿Sos dueño de un negocio?")
  en algún punto razonable del flujo actual (ej. desde Bienvenida o desde el cierre del modo
  demo) — no hace falta un panel todavía, solo que el login/registro funcione y quede la sesión
  guardada, lista para que la Fase 3 la use.

## Requisitos técnicos (iguales al resto del repo)

- TypeScript estricto, sin `any` sin comentario.
- `@supabase/supabase-js` ya está instalado — no agregues otra librería de auth.
- Mobile-first 375px, estética consistente con lo ya construido (Fredoka en títulos, tarjetas
  redondeadas, tema por rubro).
- No implementes tu propio hashing de contraseñas bajo ninguna circunstancia — es Supabase Auth
  o el modo demo actual, nada intermedio.

## Al terminar

Corré `npm run lint` y `npm run build` vos mismo — 0 errores antes de darte por terminado, y
confirmá manualmente (leyendo tu propio código, ya que no hay Supabase real para probar en
vivo) que la app sigue funcionando igual que antes cuando `supabaseEnabled` es `false`. Un solo
commit con mensaje `feat: auth real de cliente y dueño con Supabase Auth (null-safe)`. No hagas
push.
