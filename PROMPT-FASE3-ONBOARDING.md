# PROMPT — Fase 3: Onboarding / panel del dueño (para Opus 4.8)

## Contexto — leer antes de tocar código

Desde la Fase 2 existe `src/components/auth/LoginDueno.tsx` (login/registro real de dueño con
Supabase Auth, null-safe) y `src/lib/auth.ts` / `src/hooks/useSesion.ts`. Desde la Fase 1 existe
el schema en `supabase/migrations/0001_schema.sql` — la tabla `negocios` tiene `dueno_user_id`,
`recompensas` referencia `negocio_id`. Leé esos archivos antes de escribir nada, junto con
`src/data/negocios.ts` (para copiar la forma exacta de los datos que hoy son mock) y
`src/lib/supabase.ts`.

## Qué construir

Un panel al que entra el dueño **después de loguearse** (extiende el flujo de `LoginDueno.tsx`,
no lo dupliques) con 3 secciones:

1. **Cargar mi negocio** — formulario con los mismos campos que ya existen en el tipo `Negocio`
   de `src/data/negocios.ts`: nombre, categoría, rubro (gastro/super), emoji, ubicación (podés
   pedir lat/lng con el mismo patrón de geolocalización real ya usado en el marketplace —
   `src/lib/geo.ts` — con un botón "Usar mi ubicación actual", o carga manual si el dueño
   prefiere), horario valle opcional, beneficios VIP (lista simple de texto).

2. **Cargar recompensas** — lista editable de recompensas (pts, descripción, categoría, costo en
   dinero opcional para combos) — igual forma que `Recompensa` en `src/data/mockClientes.ts`.
   Agregar, editar, eliminar.

3. **Mis métricas** — vista simple con lo que haya disponible: cantidad de clientes con
   relación en este negocio, puntos acreditados, sin necesidad de gráficos complejos — una
   versión chica de lo que ya existe en el modo demo (`PasoDueno.tsx`) pero para el negocio real
   del dueño logueado, no para el negocio de ejemplo del rubro.

## Cómo persistir — importante, leelo dos veces

- **Si `supabaseEnabled` es `true`:** todo esto debe insertar/actualizar de verdad en las
  tablas `negocios` y `recompensas` de Supabase, asociado a `auth.uid()` del dueño logueado.
- **Si `supabaseEnabled` es `false`** (el caso de hoy, sin proyecto conectado): el formulario
  tiene que funcionar igual, pero en modo **"vista previa"** — no hay dónde persistir de verdad
  todavía. Guardalo en memoria de React nada más (se pierde al recargar, y está bien que sea
  así) y mostrá un aviso claro y breve, no alarmante, tipo "Vista previa — se va a guardar de
  verdad cuando conectemos tu negocio". No inventes una persistencia falsa en localStorage que
  simule ser real — sé honesto en la UI sobre qué es demo y qué no.

## Requisitos técnicos (iguales al resto del repo)

- TypeScript estricto, sin `any` sin comentario.
- Mobile-first 375px, estética consistente (Fredoka en títulos, tarjetas redondeadas).
- No dupliques el tipo `Negocio` ni `Recompensa` — importalos de donde ya existen.

## Al terminar

Corré `npm run lint` y `npm run build` vos mismo — 0 errores antes de darte por terminado. Un
solo commit con mensaje `feat: onboarding y panel del dueño (con y sin Supabase conectado)`.
No hagas push.
