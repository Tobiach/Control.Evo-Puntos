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

- **P0 — NINGÚN CLIENTE REAL PUEDE USAR LA APP EN PRODUCCIÓN (confirmado en vivo el
  13/9/2026, peor de lo que se pensaba al principio).** `0021_canjes_verificables.sql` nunca
  se aplicó: la tabla `canjes` real no tiene las columnas que `panelCliente.ts` YA usa en su
  query de carga de perfil (`.select('...confirmado_at').eq('estado','confirmado')`). Como esa
  query es parte del `Promise.all` de `cargarAppCliente` y cualquier error ahí tira `{ok:false}`
  para TODO el perfil, **hoy ningún cliente real ve sus puntos, negocios ni actividad al
  loguearse** — no es solo que no pueda canjear, no carga nada. **Arreglo:** pegar en el SQL
  Editor, EN ESTE ORDEN, `0021_canjes_verificables.sql` → `0022_fix_confirmar_canje_pin.sql` →
  `0023_rate_limiting_rpcs.sql` → `0024_consolidado_rate_limiting.sql` (los últimos 3 son
  idempotentes, no rompen nada si se pegan de más). Backup antes de correr. Texto completo de
  los 4 archivos, cómo se confirmó y una limpieza aparte pendiente (una fila de prueba en
  `canjes`) en `docs/AUDITORIA-REFERENCIAS-PASITO.md`. La última migración del repo es `0024`;
  **la próxima es `0025`**.
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
