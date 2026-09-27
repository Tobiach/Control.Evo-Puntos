# Premia.ar — contexto para Claude Code

Leer antes de tocar código: [README.md](README.md) (qué es, stack, estructura),
[CONTRIBUTING.md](CONTRIBUTING.md) (reglas no negociables de este repo),
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) (cómo está armada la app),
[docs/SUPABASE.md](docs/SUPABASE.md) (estado real de la base — leer antes de tocar
`supabase/migrations/`), [docs/DEPLOY.md](docs/DEPLOY.md) (deploy es manual, un push a
`main` no despliega nada).

Este archivo es solo el "estado actual" — no repite lo que ya está en esos docs.

## Roadmap de experiencia (activo desde 6/9/2026)

Diagnóstico de producto y plan de reconstrucción de la experiencia del cliente:
[docs/DIAGNOSTICO-PRODUCTO.md](docs/DIAGNOSTICO-PRODUCTO.md) (el porqué — F1-F8, experience
map, el "momento hábito") y [docs/ROADMAP-PRODUCTO.md](docs/ROADMAP-PRODUCTO.md) (fases,
qué decide Tobías, checklist de avance). Antes de trabajar en Home/marketplace, mostrador,
gamificación o reenganche, leer esos dos. Estado previo al roadmap guardado en la rama
`snapshot/pre-roadmap-2026-09-06` / tag `snapshot-pre-roadmap-2026-09-06` (commit `40c0d70`).

## Pendientes activos (actualizar esta sección a medida que se resuelven)

- **🟡 EN CURSO (27/9) — ruleta/rascar con persistencia real + rediseño de `TabInicio.tsx` +
  2 toques de juego en el Home.** Plan completo en
  `C:\Users\estudiante\.claude\plans\dynamic-sauteeing-pizza.md` (fuera del repo). **Las 3
  partes del plan ya están commiteadas y pusheadas, deployadas a un preview** (no a
  producción — falta que Tobías lo revise y, sobre todo, corra la migración):
  `https://premia-jzgvecoyd-tobiachs-projects.vercel.app`.
  - **Parte 1 (ruleta/sorpresa)**: `supabase/migrations/0026_juego_ruleta_sorpresa.sql` — tabla
    `tiradas_juego` + RPCs `girar_ruleta`/`usar_sorpresa`/`confirmar_premio_juego`/
    `expirar_mis_tiradas` (mismo patrón que `iniciar_canje`/`confirmar_canje` de 0021).
    Frontend ya conectado: `RuletaSemanal.tsx`/`RecompensaSorpresa.tsx` muestran el premio +
    código que devuelve el server (con cuenta regresiva), no eligen nada localmente;
    `panelCliente.ts` tiene `girarRuletaReal`/`usarSorpresaReal`; el cajero confirma cualquier
    código (canje o premio de juego) con un solo input (`confirmarPremioMostrador`).
    **Tobías ya corrió `0026` (27/9) y se probó en vivo contra producción** (cliente demo
    `premia.latam@gmail.com`, negocio `bavieca`): `usar_sorpresa` y `confirmar_premio_juego`
    andan bien de punta a punta (revelar, confirmar con PIN, rechazar código repetido/
    inexistente). **`girar_ruleta` tiró error `column reference "bueno" is ambiguous`** — bug
    real de PL/pgSQL (`RETURNS TABLE(...)` declara sus columnas como variables de la función, y
    colisionaba con la columna `bueno` de una CTE) que ninguna revisión estática iba a
    encontrar. **`0027_fix_girar_ruleta_ambiguo.sql` NO alcanzó** — solo calificó la última de
    tres referencias ambiguas a `bueno` dentro del mismo statement compuesto, probado en vivo
    de nuevo (28/9) y falló idéntico. **`0028_fix_girar_ruleta_ambiguo_completo.sql`** es el fix
    real: usa `#variable_conflict use_column` (mecanismo oficial de Postgres para esto, no
    depende de cazar cada referencia a mano) + las 3 referencias ya calificadas de refuerzo —
    **falta que Tobías corra esta migración**, y recién ahí reintentar `girar_ruleta` en vivo
    antes de activar `MOSTRAR_RULETA_Y_SORPRESA` (`src/lib/flags.ts`, sigue en `false`).
  - **Parte 2**: `TabInicio.tsx` reordenado en grupos por relevancia (mismo criterio que el
    Home v2) — sin funcionalidad nueva, solo reagrupado. No depende de la migración 0026.
  - **Parte 3**: Premín pulsa sutil en el header del Home cuando hay un premio listo, y la card
    de estado da sonido+vibración al tocarla (`sonidoTap` en `lib/sonidos.ts`).
  - Si otra sesión retoma esto, releer el archivo de plan primero.
- ~~P0 — ningún cliente real podía usar la app en producción~~: **RESUELTO (13-14/9/2026),
  todo verificado en vivo, nada pendiente.** `0021`→`0025` aplicadas (`0024` no hizo falta
  completa, era redundante con `0023`). Probado de punta a punta: canje real
  (`iniciar_canje`→`confirmar_canje` con PIN), perfil del cliente carga sin error, y el bono de
  referido ya dispara a la 1ra visita (`revisar_premio_referido` devuelve
  `visitas_necesarias: 1`, probado con un referido real de prueba y limpiado después). Fila
  `TEST` en `canjes` borrada. La próxima migración nueva es **`0026`**. Detalle completo en
  `docs/AUDITORIA-REFERENCIAS-PASITO.md`.
- ~~P0-bis — canje falso/local para clientes reales de los 73 negocios del lote~~:
  **RESUELTO (15/9/2026).** Causa: esos 73 negocios se agregaron a `src/data/negocios.ts`
  (mock) para que un invitado los navegue sin cuenta — pero eso hizo que sus ids TAMBIÉN
  quedaran en `idsEjemplo` (`MarketplaceApp.tsx`), y ese set se usaba (mal) para decidir si un
  canje de un cliente REAL autenticado iba al servidor o al camino local/demo. Un cliente real
  canjeando en Bavieca/Hoppe/Baum Catrina/etc. entraba al camino local: el saldo bajaba solo
  en memoria (nunca en Supabase) y el código de 6 caracteres que se le mostraba para el
  mostrador no existía en la tabla `canjes` — roto en silencio, sin ningún error visible.
  Encontrado auditando por qué `CardNivelXp` no aparecía en el Home real de Tobías (mismo
  `idsEjemplo` también rompía el cálculo de `esNuevo`, dejándolo en `true` para siempre para
  cualquier cliente real de estos 73 negocios). Fix: `esNuevo` ahora mira si `relaciones` está
  vacío (no ids), el canje ahora solo usa el camino local si `!usarReal` (sin mirar
  `idsEjemplo`), y el merge de negocios ahora prioriza el dato real de Supabase por sobre el
  mock cuando colisiona un id. `idsEjemplo` sigue existiendo solo para completar el catálogo
  con relleno mock donde falta un negocio real.
- ~~Rama `design/explorar-mis-premios-xp`~~: **RESUELTO** (6/9/2026) — ya estaba mergeada a
  `main` (`9d290c0`); el choque del número `0022` se resolvió absorbiendo
  `0022_referidos_una_visita.sql` en `0024_consolidado_rate_limiting.sql`. Nada pendiente.
- **CLI de Supabase todavía no conectado** — procedimiento en `docs/SUPABASE.md`, requiere
  login interactivo (no lo puede correr un agente). Toda migración nueva del roadmap se
  aplica a mano en el SQL Editor (checkpoint humano #1 en `docs/ROADMAP-PRODUCTO.md`).
- **`main` sin branch protection** — el CI (`.github/workflows/ci.yml`) ya corre en cada
  PR, pero no es obligatorio todavía para poder mergear.
- **Lote de 73 locales reales de CABA publicados en el marketplace** (`es_muestra = false`
  en Supabase + agregados a `src/data/negocios.ts` para invitados; cuenta dueño
  `dueno.muestras-premia.demo@gmail.com`). Decisión de Tobías del 6/9/2026 — los dueños no
  dieron consentimiento y las cartas/recompensas son **genéricas por rubro** (placeholder).
  **Reafirmada el 12/9/2026**: se mantienen activos a conciencia (riesgo aceptado, no
  olvidado) — ver `docs/AUDITORIA-REFERENCIAS-PASITO.md`. **Deployado a producción el
  12/9/2026** (todo lo acumulado del roadmap de experiencia hasta `7c68a70`, incluido esto).
  Cómo revertir y todo el detalle en
  [docs/MUESTRAS-LOTE.md](docs/MUESTRAS-LOTE.md).

## Convención de trabajo entre sesiones/PCs

Este repo se trabaja desde más de una máquina (ver `docs/DEPLOY.md`: "dos PCs distintas").
Antes de asumir el estado de algo (una migración, una rama, un pendiente), `git pull` y
revisar este archivo y `docs/SUPABASE.md` — pueden haber cambiado desde la última sesión.
Si resolvés algo de la lista de arriba, actualizala en el mismo commit que resuelve el
pendiente.
