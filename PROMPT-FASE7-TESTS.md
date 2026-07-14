# PROMPT — Fase 7 (última): Tests smoke de los flujos críticos (para Opus 4.8)

## Contexto

Todo lo construido en las Fases 1-5 pasó `lint`/`build` en cada corte, pero eso confirma que
"compila", no que "funciona como se espera" — nadie escribió un test real todavía. Esta es la
última fase del plan.

## Qué construir

1. **Instalar Vitest** (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
   `jsdom` como devDependencies — es el runner natural porque ya usamos Vite, comparte config).
   Agregá el script `"test": "vitest run"` a `package.json` y configurá `vite.config.ts` para
   el entorno `jsdom` (sin romper `npm run dev`/`build`).

2. **Tests de lógica pura (los más valiosos, priorizalos):**
   - `src/lib/club.ts` — cálculo de nivel/progreso, `calcularPuntos`, favoritos.
   - `src/lib/misiones.ts` — racha semanal, racha larga, insignias conseguida/bloqueada,
     temporada mensual.
   - `src/lib/geo.ts` — Haversine (`distanciaKm`) con coordenadas conocidas.
   - `src/lib/social.ts` — ranking de grupo, progreso de desafío.

3. **Tests de componentes críticos (smoke — que rendericen y respondan al toque, no
   exhaustivos):**
   - Canjear una recompensa en `TabRecompensas` descuenta los puntos correctos.
   - Cargar un cobro en `PasoCajero` (modo demo) suma los puntos correctos al cliente correcto.
   - El marketplace (`Marketplace.tsx`) filtra correctamente por rubro y por búsqueda de texto.
   - Cambiar de rubro en `Bienvenida` resetea el estado esperado (ver `App.tsx`).

## Requisitos técnicos

- No testees contra Supabase real (no hay proyecto conectado) — todo sobre los datos mock y
  con `supabaseEnabled === false`, que es el modo en que corre hoy.
- Los tests tienen que poder correr con `npm run test` sin ningún setup manual adicional.

## Al terminar

Corré `npm run lint`, `npm run build` y **`npm run test`** vos mismo — los tres en verde antes
de darte por terminado (no alcanza con lint/build esta vez, el objetivo de esta fase es
justamente que los tests pasen de verdad). Un solo commit con mensaje
`test: suite de tests smoke de los flujos criticos`. No hagas push.
