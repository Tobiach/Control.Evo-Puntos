# Premia.ar — contexto para Claude Code

Leer antes de tocar código: [README.md](README.md) (qué es, stack, estructura),
[CONTRIBUTING.md](CONTRIBUTING.md) (reglas no negociables de este repo),
[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) (cómo está armada la app),
[docs/SUPABASE.md](docs/SUPABASE.md) (estado real de la base — leer antes de tocar
`supabase/migrations/`), [docs/DEPLOY.md](docs/DEPLOY.md) (deploy es manual, un push a
`main` no despliega nada).

Este archivo es solo el "estado actual" — no repite lo que ya está en esos docs.

## Pendientes activos (actualizar esta sección a medida que se resuelven)

- **Confirmar en el SQL Editor de Supabase si `0022_fix_confirmar_canje_pin.sql` y
  `0023_rate_limiting_rpcs.sql` ya corrieron en producción.** Sin esto, no asumir que el
  rate limiting de las RPCs sensibles ni la confirmación de canjes verificables funcionan
  en producción — ver `docs/SEGURIDAD.md` §5.1 y `docs/SUPABASE.md`.
- **Rama `design/explorar-mis-premios-xp`**: 12 commits sin mergear (rediseño de
  Explorar/Mis Premios/Perfil), diverge de `main`, y trae su propia
  `supabase/migrations/0022_referidos_una_visita.sql` que pisa el número de la `0022` que
  ya está en `main` con contenido distinto. No mergear tal cual — primero hay que
  renombrar/reconciliar esa migración. Decisión pendiente de Tobias.
- **CLI de Supabase todavía no conectado** — procedimiento en `docs/SUPABASE.md`, requiere
  login interactivo (no lo puede correr un agente).
- **`main` sin branch protection** — el CI (`.github/workflows/ci.yml`) ya corre en cada
  PR, pero no es obligatorio todavía para poder mergear.

## Convención de trabajo entre sesiones/PCs

Este repo se trabaja desde más de una máquina (ver `docs/DEPLOY.md`: "dos PCs distintas").
Antes de asumir el estado de algo (una migración, una rama, un pendiente), `git pull` y
revisar este archivo y `docs/SUPABASE.md` — pueden haber cambiado desde la última sesión.
Si resolvés algo de la lista de arriba, actualizala en el mismo commit que resuelve el
pendiente.
