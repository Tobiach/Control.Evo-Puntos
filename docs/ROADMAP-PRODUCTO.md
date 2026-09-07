# Roadmap de producto — Premia.ar

> Arranque: 2026-09-06. Basado en [DIAGNOSTICO-PRODUCTO.md](DIAGNOSTICO-PRODUCTO.md).
> Punto de retorno seguro: rama `snapshot/pre-roadmap-2026-09-06` / tag
> `snapshot-pre-roadmap-2026-09-06` (commit `40c0d70`). Cómo volver: al final de este doc.

## Principio rector

Tres movimientos, en este orden, y todo lo demás es soporte:

1. **Celebrar el mostrador** — el momento de más frecuencia y emoción, hoy silencioso (F3).
2. **Convertir el Home en motor de relevancia** — subir el cerebro que ya existe
   (`avisosCliente`) y hacerlo cross-comercio (F1, F6, F8).
3. **Abrir un canal para volver** — reenganche real, sin el cual todo lo anterior cae en el
   bosque (F2).

Regla de foco: por cada cosa nueva que entra a una pantalla, sale una. `TabInicio` no se agranda.

## Modo de trabajo — autónomo

Tobías pidió ejecutar sin depender de sus permisos a cada paso. Reglas:

- Trabajo por bloques; cada bloque se commitea **solo con `lint` + `test` + `build` en verde**,
  verificados por mí en el mismo turno.
- El checklist de abajo se actualiza en el **mismo commit** que resuelve cada ítem.
- No narro cada edit; resumo al cerrar cada fase.
- **Solo freno en los "checkpoints humanos"** listados abajo (migraciones en Supabase, deploy a
  prod). Para todo lo demás, si hay una decisión abierta, tomo el default documentado acá y sigo
  — Tobías puede revertir con el snapshot o pedir cambio.

## Decisiones (tomadas o con default asumido)

| Tema | Estado | Qué se hace |
|---|---|---|
| **F0** — negocios de ejemplo con saldo para usuarios reales | **Decidido por Tobías** | Un usuario autenticado real arranca sin relaciones de ejemplo (solo lo de Supabase). Los saldos demo solo se siembran para invitado/demo. Nota agregada en `ARQUITECTURA.md`: "para ver la experiencia con datos, entrar con un usuario de demostración". **✅ hecho** (`MarketplaceApp.tsx`). |
| **Rama `design/explorar-mis-premios-xp`** | **Resuelto (era info vieja)** | Ya está mergeada a `main` (`9d290c0`). El choque de `0022` se resolvió absorbiéndolo en `0024_consolidado_rate_limiting.sql`. Nada que reconciliar. Próxima migración = **`0025`**. |
| **Analítica de producto** | **Default asumido** | NO se instala PostHog ahora (≈0 usuarios reales). Se crea `docs/METRICAS.sql` con 4-5 queries sobre tablas existentes (`visitas`, `canjes`, `relaciones_negocio`) para correr a mano semanalmente. PostHog recién con ~50 usuarios activos/semana. |
| **Canal de reenganche (Fase 3)** | **Default asumido** | Web Push (ServiceWorker + VAPID): gratis, sin cuenta externa, la PWA ya existe. WhatsApp saliente queda como capa aditiva futura, no bloquea. |
| **Qué desbloquea el XP global (Fase 4)** | **Default asumido, marcar para revisión** | Reconocimiento visible (estatus que se ve/comparte) + acceso anticipado a comercios nuevos de la red. **No toca la economía de puntos.** Si Tobías quiere que desbloquee beneficios reales, es cambio posterior. |
| **Retiro de gamificación sin backend (F5)** | **Cubierto por "hacemos todo"** | Ruleta y recompensa sorpresa: fuera de la vista del negocio hasta tener persistencia server-side. "Tu grupo esta semana" y "Desafío entre amigos" mock de `TabPerfil` (`lib/social.ts`): solo en demo (`!supabaseEnabled`); con backend, la capa social real la cubren `SeccionReferidos` + `SeccionDesafios` (esa sí es real, RPC migración 0009). Todo detrás de flags en `src/lib/flags.ts`, reversible. |

## Checkpoints humanos (lo único que necesita a Tobías)

1. **Aplicar migraciones nuevas en el SQL Editor de Supabase** — no hay CLI conectado. Por cada
   migración nueva dejo el `.sql` en `supabase/migrations/` + aviso con el texto exacto a pegar.
   Bloquea: Fase 3 (tabla `push_subscriptions` + cron), y cualquier cambio de esquema de Fase 4.
2. **Deploy a producción** (`npx vercel --yes --prod` desde PC B, ver `docs/DEPLOY.md`). Dejo cada
   fase verificada y con el aviso "listo para deploy"; el comando lo corre Tobías (o lo autoriza
   explícito). Un push a `main` no despliega nada solo.
3. **Confirmar en el SQL Editor si `0022` / `0023` / `0024` ya corrieron en producción**
   (pendiente viejo, ver `docs/SUPABASE.md` y `SEGURIDAD.md` §5.1). No bloquea el front.
4. **(Opcional)** Hacer el CI obligatorio para mergear a `main` (branch protection en GitHub).

---

# CHECKLIST MAESTRO

Marcar acá el avance. `[~]` = en progreso.

## Fase 0 — Cimientos y resguardo

- [x] 0.1 · Snapshot del estado actual (rama + tag en `40c0d70`)
- [x] 0.2 · Diagnóstico + roadmap versionados en `docs/`
- [x] 0.3 · Decisión de analítica (archivo SQL, no PostHog aún) — documentado arriba
- [x] 0.4a · **F0** — usuarios reales sin relaciones de ejemplo (`MarketplaceApp.tsx`)
- [x] 0.4b · `src/lib/flags.ts` + ocultar ruleta y recompensa sorpresa en `TabInicio`
- [x] 0.4c · Ocultar "Tu grupo esta semana" y "Desafío entre amigos" mock de `TabPerfil` cuando hay backend
- [x] 0.4d · Nota en `docs/ARQUITECTURA.md`: demos = usuario de demostración
- [x] 0.5 · `docs/METRICAS.sql` — queries de funnel sobre tablas existentes

## Fase 1 — El momento del mostrador (F3)

- [ ] 1.1 · Detectar el delta positivo de puntos en la suscripción realtime de
  `relaciones_negocio` (`MarketplaceApp.tsx:131-167`)
- [ ] 1.2 · Componente `CreditoEnVivo`: overlay "+N pts en {negocio}" + vibración
  (`navigator.vibrate`) + sonido (`lib/sonidos.ts`) + confetti (`lib/confetti.ts`)
- [ ] 1.3 · El progreso a la próxima recompensa **nombrada** (`proximaRecompensa`) se anima con
  ese evento — barra de `TabInicio` y anillo de `TabActividad`
- [ ] 1.4 · Estado "crédito reciente" accesible al reabrir la app (no se pierde si bloqueó el
  teléfono unos segundos)
- [ ] 1.5 · Tests nuevos (patrón del `*.test.tsx` vecino) + verificación en navegador móvil
- [ ] 1.6 · Aviso "listo para deploy" → **checkpoint humano**

## Fase 2 — El Home como motor de relevancia (F1, F6, F8)

- [ ] 2.0 · Spec escrita en `docs/` (objetivo, JTBD, jerarquía, estados, métrica) antes de tocar código
- [ ] 2.1 · Subir `avisosCliente` a nivel marketplace + hacerlo **cross-comercio**: recorrer
  todas las relaciones, calcular señales (vencimiento, near-win, recompensa alcanzada, x2
  activo/próximo, racha en riesgo), rankear por urgencia, elegir **1 héroe**
- [ ] 2.2 · Rediseñar `Marketplace.tsx`: héroe + máx. 2 secciones curadas. Buscador y filtros de
  rubro se van a `Explorar`. Retirar chips de intención y "Premia recomienda" con "Foto pendiente"
- [ ] 2.3 · Estados del héroe: sin señales / invitado / 1 sola relación / usuario nuevo real (0 relaciones)
- [ ] 2.4 · Post-canje reabre el loop (F8): pantalla de cierre con próxima meta nombrada + razón
  concreta de próxima visita (x2 / evento / combo) + gancho de referido
- [ ] 2.5 · Referido en momentos de intención (F6): post-canje, post-subida de nivel, y héroe del
  Home cuando no hay urgencia mayor. Copy con el número real ("cuando vaya 1 vez, 100 pts c/u")
- [ ] 2.6 · Tests + verificación en navegador
- [ ] 2.7 · Aviso "listo para deploy" → **checkpoint humano**

## Fase 3 — Canal de reenganche (F2) · Web Push

- [ ] 3.1 · Migración `0025_push_subscriptions.sql` (tabla + RLS) → **checkpoint humano** (aplicar en SQL Editor)
- [ ] 3.2 · ServiceWorker + suscripción VAPID; permiso pedido post-primer-canje, nunca en frío
- [ ] 3.3 · Función/cron server-side que evalúa disparadores 1×/día y encola envíos —
  **empezar solo por "puntos vencen en ≤7 días"**
- [ ] 3.4 · Landing del aviso: al tocar, aterriza en el Home con esa señal como héroe
- [ ] 3.5 · Opt-out claro + tope de frecuencia (1/semana por usuario)
- [ ] 3.6 · Sumar disparadores 2 y 3 (recompensa alcanzada, hábito en riesgo) recién con el 1 midiendo
- [ ] 3.7 · Aviso "listo para deploy" → **checkpoint humano**

## Fase 4 — La red visible (F7)

- [ ] 4.1 · Investigación: 5 usuarios frecuentes + 5 nuevos + 5 dueños (qué entienden por "red")
- [ ] 4.2 · Spec de "Tu barrio en Premia" (identidad cross-comercio) — ¿reemplaza o convive con Perfil marketplace?
- [ ] 4.3 · Ruteo entre comercios: sugerencia contextual al salir de un negocio (proximidad + rubro complementario)
- [ ] 4.4 · Resolver el XP global: aplicar el default (reconocimiento visible + acceso anticipado) o lo que decida Tobías
- [ ] 4.5 · Prototipo validado con usuarios antes de construir
- [ ] 4.6 · Implementación + tests + aviso "listo para deploy" → **checkpoint humano**

## Continuo — Foco

- [ ] C.1 · Reducir `TabInicio` a: card de puntos + near-win + 1 acción + 1 oportunidad activa (F4)
- [ ] C.2 · Unificar lenguaje de "nivel": dentro de un negocio solo el nivel del local; XP global
  solo en el marketplace, rotulado "Red Premia"
- [ ] C.3 · Mover hex hardcodeados a tokens de `src/index.css`
- [ ] C.4 · `aria-*` en barras de progreso y `aria-current` en las nav

---

## Riesgos y dependencias

| Riesgo | Mitigación |
|---|---|
| Sin analítica de producto | `docs/METRICAS.sql` sobre tablas existentes; PostHog diferido a ~50 WAU |
| CLI de Supabase no conectado | Migraciones a mano — checkpoint humano #1; Fases 0-2 no lo necesitan |
| `main` sin branch protection / CI no obligatorio | `lint`+`test`+`build` a mano siempre antes de commit; checkpoint humano #4 (opcional) |
| Trabajo en 2 PCs | `git pull` + leer `CLAUDE.md` y este doc al inicio de cada sesión; checklist se actualiza en el commit que resuelve cada ítem |
| Deploy manual | Cada fase cierra con "listo para deploy"; el `vercel --prod` es checkpoint humano #2 |

---

## Cómo volver al estado anterior al roadmap

```bash
git diff snapshot-pre-roadmap-2026-09-06 --stat            # ver qué cambió
git checkout -b revision-estado-viejo snapshot/pre-roadmap-2026-09-06   # copia sin perder lo nuevo
git checkout main && git reset --hard snapshot-pre-roadmap-2026-09-06   # revertir del todo (destructivo)
```

Los docs (`DIAGNOSTICO-PRODUCTO.md`, `ROADMAP-PRODUCTO.md`, `METRICAS.sql`) se conservan aunque se
revierta el código: van en commits posteriores al snapshot.
