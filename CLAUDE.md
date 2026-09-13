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

- ~~P0 — ningún cliente real podía usar la app en producción~~: **RESUELTO (13/9/2026)**.
  `0021`, `0022` y `0023` ya están aplicadas y **verificadas en vivo con un canje real de
  punta a punta** (`iniciar_canje` → `confirmar_canje` con PIN → perfil del cliente carga
  bien). `0024` NO hace falta pegarla completa — es un archivo de recuperación que reescribe
  lo mismo que ya está andando por `0023`; su único cambio real (bono de referido a la 1ra
  visita, no la 4ta) quedó aislado en `0025_referido_primera_visita.sql`. Detalle completo en
  `docs/AUDITORIA-REFERENCIAS-PASITO.md`.
- **Pendiente de pegar en el SQL Editor:** `0025_referido_primera_visita.sql` (baja
  `v_necesarias` de 4 a 1 en `revisar_premio_referido` — decisión de producto ya tomada antes,
  0023 la había dejado mal en 4 por arrastre) y una limpieza de datos:
  `DELETE FROM canjes WHERE descripcion = 'TEST';` (fila de prueba, sin relación con ninguna
  migración). La próxima migración nueva es **`0026`**.
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
