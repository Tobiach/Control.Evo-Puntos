# Roadmap de producto — Premia.ar

> Fecha de arranque: 2026-09-06. Basado en [DIAGNOSTICO-PRODUCTO.md](DIAGNOSTICO-PRODUCTO.md).
> Punto de retorno seguro: rama `snapshot/pre-roadmap-2026-09-06` / tag
> `snapshot-pre-roadmap-2026-09-06` (commit `40c0d70`). Cómo volver: al final de este doc.

## Principio rector

Tres movimientos, en este orden, y todo lo demás es soporte:

1. **Celebrar el mostrador** — el momento de más frecuencia y emoción, hoy silencioso (F3).
2. **Convertir el Home en motor de relevancia** — subir el cerebro que ya existe
   (`avisosCliente`) y hacerlo cross-comercio (F1, F6, F8).
3. **Abrir un canal para volver** — reenganche real, sin el cual todo lo anterior cae en el
   bosque (F2).

Regla de foco: por cada cosa nueva que entra a una pantalla, sale una. No se agranda `TabInicio`.

## Qué lidero yo vs. qué necesito de Tobías

**Yo me encargo (diseño + producto + implementación + QA):**
- Specs por fase (objetivo, JTBD, jerarquía, estados, métrica) antes de tocar código.
- Implementación de las Fases 0, 1 y 2 (no tocan economía de puntos ni requieren backend nuevo).
- Reducción de ruido y retiro de lo mock según tenga o no backend.
- Verificación (`lint` + `build` + `test` + prueba en navegador) antes de dar nada por hecho.

**Decisiones de Tobías (bloquean o condicionan fases):**
- **Instrumentación de analítica de producto.** Hoy NO hay forma de medir impacto (solo Sentry
  para errores). Sin esto el roadmap avanza a ciegas. Opciones: (a) PostHog free, (b) tabla de
  eventos propia en Supabase + panel simple. Decidir antes de la Fase 1.
- **Canal de reenganche (Fase 3):** ¿Web Push (ServiceWorker + VAPID, gratis, requiere que el
  usuario acepte) o WhatsApp saliente (el dueño ya opera ahí, tiene costo/API)? Define la fase.
- **XP global (Fase 4):** ¿qué desbloquea? Si no desbloquea nada, se saca hasta que lo haga.
- **F0 integridad:** ¿los negocios de ejemplo arrancan en cero para usuarios reales, o llevan
  saldo demo para todos? (Ver F0 en el diagnóstico.)
- **Conectar el CLI de Supabase** (login interactivo, no lo puede hacer un agente) — necesario
  para las migraciones de las Fases 3 y 4.
- Presupuesto de horas/semana y orden si querés alterar la prioridad.

---

## Fases

Cada fase: entregable concreto → definición de hecho → métrica que mueve. Estimaciones en
semanas-persona de trabajo efectivo, no calendario.

### Fase 0 — Cimientos y resguardo · ~2-3 días · SIN riesgo

| # | Entregable | Def. de hecho |
|---|---|---|
| 0.1 | Snapshot del estado actual | Rama + tag creados en `40c0d70` ✅ (hecho en esta sesión) |
| 0.2 | Diagnóstico y roadmap versionados en `docs/` | Este doc + `DIAGNOSTICO-PRODUCTO.md` commiteados ✅ |
| 0.3 | Decisión de instrumentación + evento mínimo | 6 eventos definidos y disparándose: `app_abierta`, `home_heroe_visto`, `home_heroe_click`, `negocio_abierto`, `canje_iniciado`, `canje_confirmado`. Panel o export accesible. |
| 0.4 | Higiene de credibilidad (retiros, no diseño) | (a) datos de ejemplo dejan de contar como saldo propio de usuarios reales — condicionar el merge de `RELACIONES_INICIALES` a `!usarReal`; (b) amigos/desafío mock (`social.ts`) ocultos en `TabPerfil`; (c) ruleta y recompensa sorpresa ocultas hasta tener backend. Todo detrás de un flag, reversible. |

> 0.4 es "quitar", no "diseñar" — bajo riesgo, sube foco y credibilidad, y limpia el terreno para
> medir de verdad en las fases siguientes.

### Fase 1 — El momento del mostrador (F3) · ~1-2 semanas · autocontenida

- **1.1** Feedback inmediato sobre el evento realtime de `relaciones_negocio`: cuando `puntos`
  sube mientras la app está abierta, overlay corto "+N pts en {negocio}" + vibración + sonido
  (reusar `lib/sonidos.ts`, `lib/confetti.ts`, `useConteoAnimado`).
- **1.2** El progreso hacia la próxima recompensa **nombrada** se anima con ese evento (el anillo
  de `TabActividad` y la barra de `TabInicio` avanzan delante del usuario).
- **1.3** Estado del crédito reciente accesible al reabrir la app (no se pierde si el usuario
  bloqueó el teléfono 10 s): "sumaste N pts hace un rato en {negocio}".
- **Def. de hecho:** un cajero acredita en staging y el cliente lo siente sin refrescar; `lint`,
  `build`, `test` verdes; probado en navegador móvil real.
- **Métrica:** % de sesiones que ocurren en ventana de visita (±15 min de un `canje`/`visita`);
  encuesta cualitativa a 5 usuarios ("¿qué sentiste cuando cargaron los puntos?").
- **No toca:** economía de puntos, backend, RLS.

### Fase 2 — El Home como motor de relevancia (F1, F6, F8) · ~2-4 semanas

- **2.1** Subir `avisosCliente` a nivel marketplace y hacerlo **cross-comercio**: recorrer todas
  las relaciones, calcular señales (vencimiento, near-win, recompensa alcanzada, x2
  activo/próximo, racha en riesgo), rankear por urgencia, elegir **1 héroe**.
- **2.2** Rediseñar `Marketplace.tsx`: héroe + máx. 2 secciones curadas. Buscador y filtros de
  rubro se van a `Explorar` (ya es su lugar). Retirar chips de intención y "Premia recomienda"
  con "Foto pendiente".
- **2.3** Post-canje reabre el loop (F8): pantalla de cierre con próxima meta nombrada + una
  razón concreta para la próxima visita (x2, evento, combo) + gancho de referido.
- **2.4** Referido en momentos de intención (F6): post-canje, post-subida de nivel, y como héroe
  del Home cuando no hay urgencia más alta. Copy con el número real ("cuando vaya 1 vez, 100 pts
  cada uno").
- **Def. de hecho:** un usuario con relaciones en ≥2 negocios ve en el Home la señal más urgente
  primera; specs de estados (sin señales / invitado / 1 sola relación) implementados; verificación
  completa.
- **Métrica:** `home_heroe_click` / `home_heroe_visto`; tiempo a primer `negocio_abierto` por
  sesión; tasa de canje; referidos iniciados por semana.

### Fase 3 — Canal de reenganche (F2) · ~3-6 semanas · DEPENDE de decisión + infra

- **3.0** Decisión de Tobías: Web Push vs WhatsApp (ver arriba).
- **3.1** Infra: si Web Push → ServiceWorker + suscripción VAPID + tabla `push_subscriptions` +
  permiso pedido en el momento correcto (post-primer-canje, no en frío). Si WhatsApp → integración
  API + plantillas aprobadas.
- **3.2** Job/cron server-side que evalúa disparadores una vez al día y encola envíos:
  **empezar solo por "puntos por vencen en ≤7 días"** (dato ya existe, mayor ROI, menor spam).
- **3.3** Sumar disparadores 2 y 3 (recompensa recién alcanzada, hábito en riesgo) recién con el
  primero midiendo bien.
- **Def. de hecho:** un usuario lapsado de staging recibe el aviso, toca, y aterriza en el Home
  con esa señal como héroe; opt-out claro; frecuencia tope 1/semana por usuario.
- **Métrica:** CTR del aviso; visitas atribuibles dentro de 72 h; retención D30 con vs sin push.
- **Bloqueante:** CLI de Supabase conectado o ventana para aplicar migraciones a mano.

### Fase 4 — La red visible (F7) · investigación + diseño primero · ~4+ semanas

- **4.1** Investigación (§33 del master prompt): 5 usuarios frecuentes, 5 nuevos, 5 dueños —
  qué entienden por "red", qué esperan, qué los haría cruzar de un comercio a otro.
- **4.2** Spec de "Tu barrio en Premia": identidad cross-comercio (lugares con historia, saldo
  sin reclamar, estatus) — decidir si reemplaza o convive con Perfil marketplace.
- **4.3** Ruteo entre comercios: sugerencia contextual al salir de un negocio, atada a
  proximidad real + rubro complementario ("terminaste el café — almacén a 2 cuadras").
- **4.4** Resolver el XP global: qué desbloquea (acceso anticipado a comercios nuevos,
  reconocimiento visible, algo). Si la respuesta es "nada por ahora", se oculta.
- **Def. de hecho:** decisión documentada + prototipo validado con usuarios antes de construir.
- **Métrica:** % de usuarios con relación en ≥2 negocios; segundo negocio visitado tras
  sugerencia; tiempo entre primera y segunda relación.

### Continuo — Foco

- Reducir `TabInicio` del negocio a card de puntos + near-win + 1 acción + 1 oportunidad (F4).
- Retirar definitivamente lo mock (F5) a medida que se decide backend sí/no por mecánica.
- Unificar el lenguaje de "nivel": dentro de un negocio, solo el nivel del local; XP global solo
  en el marketplace, rotulado.

---

## Dependencias y riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **No hay analítica de producto** | Roadmap a ciegas, no se puede probar impacto | Fase 0.3 es bloqueante para Fase 1 |
| CLI de Supabase no conectado | Migraciones (Fases 3-4) a mano, lento y riesgoso | Tobías conecta el CLI; hasta entonces, Fases 0-2 no lo necesitan |
| `main` sin branch protection, CI no obligatorio | Un cambio puede romper prod sin que el CI lo frene | Correr `lint`+`build`+`test` a mano siempre; considerar hacer el CI obligatorio |
| Trabajo en 2 PCs (ver `docs/DEPLOY.md`) | Estado desincronizado entre sesiones | `git pull` + leer `CLAUDE.md` y este doc al inicio de cada sesión; actualizar el checklist de abajo en el mismo commit que resuelve algo |
| Rama `design/explorar-mis-premios-xp` sin mergear (12 commits) | Puede chocar con el rediseño del Home de la Fase 2 | Reconciliar o descartar esa rama ANTES de arrancar la Fase 2 |
| Deploy es manual | Nada de lo construido llega a usuarios con solo pushear | Cada fase termina con deploy explícito coordinado con Tobías |

---

## Checklist de avance (actualizar acá)

- [x] Fase 0.1 — snapshot (`snapshot/pre-roadmap-2026-09-06`, tag, commit `40c0d70`)
- [x] Fase 0.2 — diagnóstico + roadmap versionados
- [ ] Fase 0.3 — instrumentación de analítica (BLOQUEA Fase 1) — *decisión de Tobías pendiente*
- [ ] Fase 0.4 — higiene de credibilidad (retiros detrás de flag)
- [ ] Fase 1 — momento del mostrador
- [ ] Fase 2 — Home motor de relevancia
- [ ] Fase 3 — canal de reenganche — *decisión Web Push vs WhatsApp pendiente*
- [ ] Fase 4 — la red visible — *investigación primero*

---

## Cómo volver al estado anterior al roadmap

```bash
# Ver qué cambió desde el snapshot
git diff snapshot-pre-roadmap-2026-09-06 --stat

# Volver del todo (descarta el trabajo del roadmap)
git checkout main
git reset --hard snapshot-pre-roadmap-2026-09-06   # destructivo: solo si estás seguro

# O quedarte con una copia del estado viejo sin perder lo nuevo
git checkout -b revision-estado-viejo snapshot/pre-roadmap-2026-09-06
```

Los docs (`DIAGNOSTICO-PRODUCTO.md`, `ROADMAP-PRODUCTO.md`) se conservan aunque se revierta el
código, porque van en commits aparte y posteriores al snapshot.
