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

0. ~~🚨 P0 — aplicar `0021`→`0022`→`0023`→`0024`~~: **RESUELTO (13/9)**. `0021`/`0022`/`0023`
   aplicadas y verificadas con un canje real de punta a punta. `0024` no hizo falta completa
   (era redundante con `0023`); su único cambio real quedó en `0025_referido_primera_visita.sql`
   — pendiente de pegar, más una limpieza (`DELETE FROM canjes WHERE descripcion = 'TEST';`).
   Detalle en `AUDITORIA-REFERENCIAS-PASITO.md`.
1. **Aplicar migraciones nuevas en el SQL Editor de Supabase** — no hay CLI conectado. Por cada
   migración nueva dejo el `.sql` en `supabase/migrations/` + aviso con el texto exacto a pegar.
   Bloquea: Fase 3 (tabla `push_subscriptions` + cron), y cualquier cambio de esquema de Fase 4.
2. **Deploy a producción** (`npx vercel --yes --prod` desde PC B, ver `docs/DEPLOY.md`). Dejo cada
   fase verificada y con el aviso "listo para deploy"; el comando lo corre Tobías (o lo autoriza
   explícito). Un push a `main` no despliega nada solo.
3. **Confirmar en el SQL Editor si `0022` / `0023` / `0024` ya corrieron en producción**
   (pendiente viejo, ver `docs/SUPABASE.md` y `SEGURIDAD.md` §5.1). No bloquea el front.
4. **(Opcional)** Hacer el CI obligatorio para mergear a `main` (branch protection en GitHub).
5. **Assets de Premín**: las 5 formas están **aprobadas** (hoja del 8/9). Falta el corte fino:
   5 PNG transparentes por nivel (`public/premin/1..5.png`) + 5 siluetas + subir la hoja a
   `docs/assets/`. Los produce el diseñador. Sin esto, `TrackEvolucion` y `CardNivelXp` funcionan
   igual con `/premin.png`; el momento "evolucionó" (2.6b) se puede construir en paralelo.

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

- [x] 1.1 · Detectar el delta positivo de puntos en la suscripción realtime de
  `relaciones_negocio` (`MarketplaceApp.tsx`, con `relacionesRef`/`negociosRef`/`cargaListaRef`
  para no re-suscribir el canal ni disparar un delta falso antes del primer snapshot)
- [x] 1.2 · Componente `CreditoEnVivo`: overlay "+N pts en {negocio}" (zona del pulgar) +
  vibración (`navigator.vibrate`) + sonido (`sonidoPuntos` nuevo en `lib/sonidos.ts`) +
  confetti (`lib/confetti.ts`) + barra a la próxima recompensa nombrada. Se va solo a los ~5 s.
- [x] 1.3 · El progreso a la próxima recompensa se anima con el evento: `useConteoAnimado`
  extraído a `src/hooks/` y ahora anima desde el valor anterior (no siempre desde 0), y las
  barras/anillo de `TabInicio`/`TabActividad` ya reaccionan al cambio de `cliente.puntos`
- [x] 1.4 · Crédito reciente persistido en `sessionStorage` (90 s): sobrevive un bloqueo corto
  de pantalla / reapertura de la app
- [x] 1.5 · `CreditoEnVivo.test.tsx` (5 tests, sin fake timers — usa `msVisible` + `waitFor`).
  lint 0 · build ok. `CreditoEnVivo` y `Marketplace` pasan aislados (5/5 y 10/10). **Flake
  pre-existente** (ya se veía antes de Fase 1): `Marketplace.test.tsx` / `TabRecompensas.test.tsx`
  fallan de forma intermitente en la corrida completa bajo carga de CPU, en los `waitFor` sobre
  animaciones de salida de `AnimatePresence`. No lo introdujo este cambio y no toca `Marketplace.tsx`.
  Se sube `asyncUtilTimeout` a 5 s (mejora real). Fix de raíz → C.5.
- [ ] 1.6 · Verificación en navegador móvil real (cajero acredita → cliente lo siente) → **pendiente**
- [ ] 1.7 · Aviso "listo para deploy" → **checkpoint humano**

## Fase 2 — El Home como motor de relevancia (F1, F6, F8)

- [x] 2.0 · Spec escrita: [SPEC-HOME.md](SPEC-HOME.md) (A–L: objetivo, usuario, JTBD, señales y
  su fuente real, jerarquía, estados, riesgos, métrica)
- [x] 2.1 · Motor de relevancia cross-comercio: `src/lib/home.ts` — `senalesDelCliente()` /
  `heroeDelHome()`, puro y con `ahora` inyectable. Señales: vencimiento (2 niveles de urgencia),
  recompensa-lista, x2-ahora, near-win, racha-riesgo, + fallbacks `al-dia` / `descubrir`.
  `home.test.ts` (9 tests). `horarioValleActivoAhora` ahora acepta `ahora` inyectable.
- [x] 2.2 · **Rediseñado `Marketplace.tsx`**: héroe (`heroeDelHome`) arriba + "Tus lugares" +
  "Nuevos para vos". Retirados: banner Comunidad, chips de intención, card "Puntos sumados",
  card "N locales cerca", "Los más elegidos", "Hoy pasa esto", "Premia recomienda" (Foto
  pendiente), "Tu historia reciente", saludo largo. Buscador + filtros de rubro + lista completa
  se fueron del todo del Home — viven solo en `Explorar` (ver C.6/2.2b). `Marketplace.test.tsx`
  reescrito.
- [x] 2.3a · **Nombres de nivel + evolución de Premín** (decisión de Tobías 7/9): renombrado
  `NIVELES_XP_GLOBAL` (Recién Llegado → Cliente Fijo → Habitué → Cráneo del Barrio → Prócer del
  Barrio, sin emoji), campo `NivelXp.premin` para el asset por nivel, `docs/NIVELES-Y-PREMIN.md`
  con el enfoque de juego + brief de las 5 formas.
- [ ] 2.3b · Usuario nuevo real + estados (SPEC §J, framing de juego): `src/lib/entrada.ts`
  (`contextoDeEntrada()` + clave durable `celp_entrada`), `HomeVacio.tsx` ("Arrancás la partida",
  variantes referido / QR / genérico), `ComoFunciona.tsx`, branch en `Marketplace.tsx`. Tests.
- [x] 2.4 · **Post-canje reabre el loop** (F8): el modal de código, tras confirmar, muestra
  "te quedan X pts · vas para {próxima} · te faltan Y" + si hay horario valle "volvé {texto} y
  sumás el doble". Botón "Seguir sumando". `TabRecompensas.tsx`. El gancho de referido acá va
  en 2.5.
- [ ] 2.5 · Referido en momentos de intención (F6): post-canje, post-subida de nivel, y héroe del
  Home cuando no hay urgencia mayor. Copy con el número real ("cuando vaya 1 vez, 100 pts c/u")
- [x] 2.6a · **Track de evolución de Premín** (Pokédex): `TrackEvolucion.tsx` — 5 formas, actual
  con anillo, bloqueadas en silueta, "Faltan X XP para {forma}". Montado en `TabPerfilMarketplace`.
  Degrada bien con `/premin.png`; mejora solo cuando lleguen los assets. 4 tests. Las 5 formas
  quedaron **aprobadas** (8/9) — ver `docs/NIVELES-Y-PREMIN.md`.
- [x] 2.6b · **Momento "Premín evolucionó"**: `PreminEvoluciono.tsx` + wiring en `MarketplaceApp`
  (detecta el salto de nivel de XP global, gate para no dispararlo en el arranque). Hoja centrada
  con la forma nueva, confetti + `sonidoEvolucion` + vibración. 3 tests. Degrada a `/premin.png`.
- [ ] 2.6c · Assets: 5 PNG por nivel (`public/premin/1..5.png`) + 5 siluetas + subir la hoja
  aprobada a `docs/assets/`. → **checkpoint humano** (los produce el diseñador).
- [ ] 2.7 · Tests + verificación en navegador
- [ ] 2.8 · Aviso "listo para deploy" → **checkpoint humano**

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

## Fase 2b — Backlog de la auditoría de referencias (Pasito, 12/9)

Detalle completo, qué logra cada una y por qué importa:
[AUDITORIA-REFERENCIAS-PASITO.md](AUDITORIA-REFERENCIAS-PASITO.md). Prioridad P1→P3.

- [x] G2 · **Premio visible (pill) en `TarjetaExplorar` — hecho (12/9)**
- [x] G1 · **Filtro "Te alcanza" en `TabMapa` — hecho (12/9)**
- [ ] G4 · Filtros "Abierto ahora" + "Favoritos" en `TabMapa` — P2 ("Favoritos" arranca en localStorage)
- [ ] G3 · Cierre de racha perdida + comparación a tu promedio (`TabActividad`) — P2, valor completo depende de Fase 3
- [ ] G5 · Misión "subí foto y ganá" — P3, **necesita decisión de moderación/fraude antes de construir**
- [ ] G6 · Grupos — P3, espera la investigación 4.1

**Ya resuelto en la auditoría, sin acción nueva:** los 73 negocios sin consentimiento se
mantienen activos a conciencia (decisión de Tobías 12/9, ver `docs/MUESTRAS-LOTE.md`).

- [ ] G7 · Prolijar el sistema de imágenes (logo/portada/foto de carta) antes del lanzamiento —
  inventario completo, inconsistencias y fixes propuestos en
  [SISTEMA-IMAGENES.md](SISTEMA-IMAGENES.md). Incluye una pregunta abierta (`TarjetaMiLugar`)
  que necesita el OK de Tobías antes de tocarla.
- [x] G8 · **Reconciliar el Home (2.2) con la auditoría**: el héroe en tono calmo (al-dia /
  descubrir) usa la foto real del negocio de fondo si existe; "Nuevos para vos" pasó de logo
  chico a card con foto real. Sin secciones nuevas, sin volver a "Los más elegidos"/"Premia
  recomienda". Detalle en `AUDITORIA-REFERENCIAS-PASITO.md` §G8.
- [x] G9 · **"Tu semana" en el Home — hecho (13/9)**: racha de días seguidos (cruzando TODOS
  los negocios) + mini-gráfico de puntos de los últimos 7 días, mismo lenguaje visual que
  `TabActividad`. Responde al pedido de Tobías de que el Home no se sienta vacío vs. Pasito.
  Se oculta si no hubo actividad en la semana. Ver `AUDITORIA-REFERENCIAS-PASITO.md` §"Home vs.
  Pasito".
- [ ] G10 · Segunda card de invitar amigos en el Home (reusa `SeccionReferidos`, no se promueve
  hoy) — P2, chico
- [ ] G11 · Ranking simple ("estás en el top X% de clientes frecuentes de {negocio}") — P3,
  versión reducida de G6 sin esperar la investigación 4.1 completa
- [ ] G12 · Fondo/paleta del héroe más saturada (a diferencia de G9, esto SÍ es una decisión de
  marca — no construir sin mockup/OK explícito de Tobías sobre colores concretos, ver
  `DISENO.md`)

## Continuo — Foco

- [ ] C.1 · Reducir `TabInicio` a: card de puntos + near-win + 1 acción + 1 oportunidad activa (F4)
- [ ] C.2 · Unificar lenguaje de "nivel": dentro de un negocio solo el nivel del local; XP global
  solo en el marketplace, rotulado "Red Premia"
- [ ] C.3 · Mover hex hardcodeados a tokens de `src/index.css`
- [ ] C.4 · `aria-*` en barras de progreso y `aria-current` en las nav
- [ ] C.5 · Estabilizar `Marketplace.test.tsx` / `TabRecompensas.test.tsx`: sus tests esperan a
  animaciones de salida de `AnimatePresence` con `waitFor` y flakean bajo carga. Opciones: mockear
  `AnimatePresence` a passthrough en esos tests, o asertar sin depender del timing de la salida.
- [x] C.6 · **2.2b — hecho (10/9, a pedido de Tobías)**: el Home ya no tiene buscador/filtros/
  lista — eso vive solo en `Explorar`. `TabMapa` ya no gatea la lista detrás de la geo: se ve
  siempre (`TarjetaExplorar.distanciaKm` ahora opcional), solo el mapa y "ver mapa completo"
  siguen pidiendo ubicación. `TabMapa.test.tsx` nuevo (2 tests).

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
