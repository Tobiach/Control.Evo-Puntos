# Diagnóstico de producto — Premia.ar

> Fecha: 2026-09-06. Snapshot del código en el momento del diagnóstico:
> rama `snapshot/pre-roadmap-2026-09-06` / tag `snapshot-pre-roadmap-2026-09-06` (commit `40c0d70`).
> Este documento es el "por qué". El "qué y cuándo" está en [ROADMAP-PRODUCTO.md](ROADMAP-PRODUCTO.md).

## Lectura de una línea

Premia ya construyó lo difícil —red real de dos lados, crédito de puntos en vivo, referido real
y corto, economía configurable por comercio— y lo está presentando como **una tarjeta de puntos
con pantallas de más**. El producto tiene un cerebro de relevancia y no lo usa donde el usuario
decide (el Home) ni donde más lo sentiría (el mostrador).

## Tres hechos de código que sostienen todo el diagnóstico

1. **El cerebro de relevancia existe, mal enchufado.** `avisosCliente()` (`src/lib/notificaciones.ts`)
   calcula 4 señales accionables —puntos por vencer, recompensa recién alcanzada, racha en riesgo,
   cumpleaños— pero **solo corre dentro de `AppCliente.tsx`, sobre el historial de UN negocio**. El
   Home del marketplace (`Marketplace.tsx`) no consume ni una de esas señales.
2. **No hay canal de reenganche.** `dispararNotificacion()` usa `new Notification()` en primer plano,
   sin ServiceWorker; el `Set` de disparados se pierde al desmontar. No hay push, ni email, ni
   WhatsApp saliente. Un usuario que cierra la app vuelve solo si se acuerda.
3. **La gamificación social es ficción.** `src/lib/social.ts` → `AMIGOS_MOCK` (Juan P., Sofi R.,
   Nico D.) y `desafioSemanal()` fabrican "Juan te desafió a visitar 3 veces". Se muestra a todos
   en `TabPerfil`. La ruleta (`tiradasRuleta`) y la recompensa sorpresa (`sorpresasUsadas`) son
   `useState` en memoria: al recargar, vuelven a estar disponibles.

---

## Hallazgos

Formato: PROBLEMA / EVIDENCIA / COMPORTAMIENTO ACTUAL / COMPORTAMIENTO DESEADO / POR QUÉ / IMPACTO / PRIORIDAD.

### F1 · La app no tiene puerta de entrada
- **Problema:** el Home no responde "¿por qué abro Premia hoy?". Es un catálogo de secciones.
- **Evidencia:** `Marketplace.tsx:149-497` apila siempre, sin priorizar: banner Comunidad, chips de
  intención, resumen de puntos, card "N locales cerca", buscador, filtros, "Nuevos para vos",
  "Los más elegidos", "Hoy pasa esto", "Premia recomienda", "Tu historia reciente" y la lista
  completa. Todo gateado por un único `!sinCuraduria`.
- **Actual:** el usuario ve 6 pantallas de alto de contenido parejo, no encuentra una acción, y va
  directo al negocio que ya tenía en la cabeza. La app fue el espejo de una decisión ya tomada.
- **Deseado:** abrir Premia = ver en 2 s la única cosa relevante hoy (near-win, puntos por vencer,
  x2 activo, racha en riesgo), con una acción. Un bloque héroe elegido por urgencia real.
- **Por qué:** el Home es el 100% de las sesiones. Si no genera intención, la app registra la
  recurrencia en vez de generarla.
- **Impacto:** alto — palanca sesiones→visita.
- **Prioridad:** P0.

### F2 · No existe un canal para volver
- **Problema:** producto de recurrencia sin ningún mecanismo de reenganche.
- **Evidencia:** `src/lib/notificaciones.ts` (foreground, sin SW). `ultimaVisitaDias` por relación
  está disponible y sin usar. `RELACIONES_INICIALES` incluye a propósito un caso lapsado
  (Rooftop Malabia, 47 días, puntos por vencer) que la app ignora.
- **Actual:** los puntos por vencer vencen sin aviso. El "hace 21 días que no volvés" que el
  Copiloto le muestra al dueño no le llega nunca al cliente.
- **Deseado:** push real (o WhatsApp) en 3 disparadores: puntos por vencer, recompensa recién
  alcanzada, hábito en riesgo. El mensaje siempre trae algo, nunca pide algo.
- **Por qué:** sin canal de salida, toda la gamificación es un árbol que cae en el bosque.
- **Impacto:** el más alto para retención D30/D90.
- **Prioridad:** P0. Dependencia de infra (ServiceWorker + Web Push, o integración WhatsApp).

### F3 · El momento del mostrador pasa sin que nadie lo note
- **Problema:** el instante en que el cajero acredita y los puntos aparecen en vivo no tiene
  respuesta emocional en la UI.
- **Evidencia:** `MarketplaceApp.tsx:131-167` — la suscripción realtime a `relaciones_negocio`
  hace `setRelaciones` en silencio. El único `lanzarConfetti` del producto está atado a
  `temporada.completa`, que es mock.
- **Actual:** el cliente ve un número más grande la próxima vez que mira. Compra y recompensa
  quedan desacopladas en el tiempo y en la emoción.
- **Deseado:** comprás → vibra el teléfono → "+40 pts en Café Nardo · te faltan 30 para tu café
  gratis", con movimiento del progreso y sonido. El anillo avanza delante tuyo.
- **Por qué:** máxima carga emocional + máxima frecuencia (cada visita). Es lo que un punch card
  no puede hacer. Está construido a nivel de datos y tirado a nivel de experiencia.
- **Impacto:** alto y barato — sube valor percibido por visita sin tocar la economía de puntos.
- **Prioridad:** P0.

### F4 · Dentro del negocio: el CTA primario no ejecuta nada y la pantalla está saturada
- **Problema:** `TabInicio` tiene ~18 bloques y 3 botones dorados full-width compitiendo; el más
  prominente, "Sumá puntos", abre un catálogo informativo.
- **Evidencia:** `TabInicio.tsx:319` "Sumá puntos" → `TabCartaPuntos` (solo muestra cuántos pts da
  cada producto). "Ver mis recompensas" aparece dos veces (`:319`, `:509`).
- **Actual:** el usuario entra a "su" negocio y recibe un muro sin acción obvia.
- **Deseado:** card de puntos + progreso a premio nombrado → una acción (la que aplique) → un
  bloque de oportunidad activa. El resto, colapsado.
- **Por qué:** si todo pesa igual, nada pesa.
- **Impacto:** medio-alto sobre tasa de canje y comprensión.
- **Prioridad:** P1.

### F5 · La gamificación: la social es falsa, la de azar es relleno, la real está apagada
- **Problema:** el stack de juego está invertido — lo que grita más (amigos, desafíos, ruleta,
  sorpresa) es ficticio o no persiste; lo que motiva (progreso a recompensa nombrada, referido,
  VIP del local) está diluido.
- **Evidencia:** `src/lib/social.ts` (`AMIGOS_MOCK`, `desafioSemanal`); ruleta y sorpresa en
  `useState`; temporada/racha/insignias no acreditan puntos (comentario propio en `club.ts:163`).
- **Actual:** el usuario gasta atención en un ranking de amigos que no son sus amigos y en una
  ruleta que no recuerda si giró.
- **Deseado:** sacar de producción lo que no tiene backend; amplificar progreso a recompensa
  nombrada, referido y nivel del local con beneficios reales.
- **Por qué:** la gamificación sirve al comportamiento real (visitar), no genera clicks vacíos.
  Un producto de barrio se juega la credibilidad en no mentir.
- **Impacto:** medio en métricas, alto en integridad de marca y en foco.
- **Prioridad:** P1.

### F6 · El loop más fuerte y real es el que está peor ubicado
- **Problema:** el referido tiene backend real y ciclo cortísimo, y aparece escondido.
- **Evidencia:** `src/lib/referidos.ts` → `VISITAS_PARA_PREMIO = 1`. El invitado se registra con el
  código, visita el negocio una vez, y ambos ganan 100 pts (RPC server-side). Se muestra solo en
  `TabInicio` si `esNuevo`, y en `SeccionReferidos` dentro de `TabPerfil`.
- **Actual:** el usuario más contento (acaba de canjear, subió de nivel) no recibe ningún empujón
  para invitar.
- **Deseado:** "invitá y ganan los dos" como cierre de cada pico emocional (post-canje,
  post-nivel) y como bloque del Home cuando no hay urgencia mayor.
- **Por qué:** el referido de 1 visita es el motor de densidad de la red — lo único que hace que
  Premia escale como red y no como suma de tarjetas.
- **Impacto:** alto sobre CAC y densidad por barrio.
- **Prioridad:** P1.

### F7 · La red es invisible: el usuario tiene N tarjetas, no "un barrio"
- **Problema:** nada hace sentir "estoy dentro de una red". El cross-comercio se reduce a un
  número (XP) que no desbloquea nada.
- **Evidencia:** `NIVELES_XP_GLOBAL` (`club.ts:120-126`): 5 niveles ("VIP del Barrio 👑" a 8000
  pts) que no habilitan ningún beneficio. `TabMapa` es un mapa de utilidad. El banner "Comunidad
  Premia" es copy genérico. Al abrir un negocio no se sugiere otro de la red.
- **Actual:** el usuario acumula relaciones sueltas; cambiar de negocio es navegar una lista.
- **Deseado:** "tu barrio en Premia" — panel personal de lugares donde tenés historia, saldo sin
  reclamar y estatus, con la red enrutándote al próximo ("terminaste el café — a 2 cuadras el
  Almacén Guatemala, también sumás"). El XP global desbloquea algo transversal.
- **Por qué:** la red ES el producto. Un cartón de sellos no puede rutear entre comercios ni
  darte identidad de barrio.
- **Impacto:** estratégico — la diferencia entre "otra app de puntos" y una categoría propia.
- **Prioridad:** P1 (con fase de investigación).

### F8 · El canje cierra el loop en vez de reabrirlo
- **Problema:** después de canjear, la experiencia termina.
- **Evidencia:** `TabRecompensas.tsx:229-301` — el modal muestra "Listo" y vuelve a la lista. Sin
  próxima meta, sin razón de próxima visita, sin cross-sell, sin referido.
- **Actual:** el ciclo se apaga en el pico de satisfacción.
- **Deseado:** post-canje = reapertura del loop — siguiente meta nombrada + razón concreta para
  la próxima visita + gancho de referido.
- **Por qué:** el momento de más dopamina es el mejor para pedir el próximo compromiso.
- **Impacto:** medio-alto sobre visitas post-primer-premio.
- **Prioridad:** P1.

### F0 · (arrastre de la auditoría previa) Datos de ejemplo como saldo propio de un usuario real
- **Evidencia:** `MarketplaceApp.tsx:85-87` y `:113` mergean `RELACIONES_INICIALES` (4 negocios,
  ~1.295 pts, ~20 visitas) también para usuarios autenticados reales. `Marketplace.tsx` los suma
  en "Puntos sumados"; `TabMisLocales` los lista como "Tus tarjetas".
- **Por qué importa:** `CONTRIBUTING.md` prohíbe "dato placeholder presentado como definitivo".
  Un usuario que nunca fue a Café Nardo y ve "tenés 320 pts acá" no cree ningún número más.
- **Prioridad:** P0 de integridad. Pendiente de decisión: ¿los negocios de ejemplo arrancan en
  cero para usuarios reales, o llevan saldo demo para todos?

---

## Premia Experience Map

| Etapa | Qué pasa hoy | Dónde se cae el usuario | Qué falta |
|---|---|---|---|
| **Descubrimiento** | Link `?club` peer-to-peer o referido. Onboarding: 3 pantallas de Premín → "Ya hay N locales esperándote" → login | No hay "andá a este lugar ahora". Los locales son en su mayoría el lote placeholder | Onboarding que termine en **un** lugar concreto cerca + su primera recompensa |
| **Primera visita** | El usuario llega al local; los puntos los carga el cajero | No sabe que tiene que avisar "estoy en Premia". El CTA del negocio es un catálogo | Un "decí que estás en Premia" claro, en el momento y lugar justos |
| **Primeros puntos** | Cajero acredita → realtime actualiza el saldo en silencio | Cero celebración; compra y recompensa desacopladas | F3: el momento del mostrador con feedback inmediato y progreso a meta nombrada |
| **Primer premio** | Recompensas 120–450 pts, ~1 pt/$100 → primera ≈ 4 visitas ≈ 1 mes+ | El puente entre primeros puntos y primer premio es largo y el Home no lo sostiene | Near-win como héroe del Home; recordatorio si se estanca |
| **Segunda visita** | Depende de que el usuario se acuerde. Sin push | **Máxima fuga.** Nada trae de vuelta | F2: reenganche por vencimiento / recompensa alcanzada / racha en riesgo |
| **Hábito** | — | No hay ritual a nivel marketplace | "Tu semana en Premia" / cadencia; abrir la app antes de la visita para chequear progreso |
| **Exploración** | Pestaña "Explorar" (mapa). "Nuevos para vos" = top-3 por `clientesActivos` | No hay razón personalizada para probar un segundo comercio | Sugerencia curada post-visita, atada a barrio/afinidad real |
| **Red** | XP global sube; no desbloquea nada. Banner "Comunidad" genérico | El usuario nunca siente "una red", siente varias tarjetas | F7: "tu barrio", ruteo entre comercios, XP con consecuencia |
| **Referidos** | Real y corto (1 visita → +100 c/u). Escondido en Perfil del negocio | El momento de más intención no ofrece invitar | F6: referido como cierre de cada pico emocional + bloque del Home |
| **Defensa / pertenencia** | Badges privados y genéricos | No hay identidad pública, estatus social ni comunidad | "Soy cliente de", estatus que se vea, comunidad del comercio/barrio |

**Las dos fugas principales, en orden:**
1. **Segunda visita** — no hay canal de reenganche (F2).
2. **Descubrimiento → primeros puntos** — el usuario llega pero no activa el mecanismo (F3/F4 + onboarding sin destino).

---

## El momento en que Premia deja de ser "una app de puntos"

Hay dos umbrales. La arquitectura debe girar alrededor del primero y apuntar al segundo.

### Umbral 1 — el micro-hábito
**La tercera vez que el usuario abre Premia *durante* la visita, en el mostrador, para ver sus
puntos caer en vivo.** No es el primer punto (eso es la app de puntos funcionando). No es el
primer canje (mensual, transaccional). Es cuando "ya que estoy comprando, abro Premia" se vuelve
parte de la compra. Frecuencia: cada visita. Hoy Premia hace el ledger y se saltea el ritual (F3).

### Umbral 2 — el lock-in
**La primera vez que el usuario abre Premia para decidir *a dónde ir* y la red le da una buena
respuesta.** Ahí Premia deja de ser el recibo de una decisión y pasa a ser el punto de entrada.
Requiere densidad de red (F6) y que el Home sea un motor de relevancia (F1).

### Implicación de arquitectura
El producto está construido **negocio-primero**: entrás a un comercio y recién ahí pasa todo. Pero
los dos momentos-hábito viven **fuera** del negocio: uno en el mostrador (celebrar el crédito en
vivo) y otro en la puerta (el Home como motor de relevancia). **El centro de Premia debe ser el
Home**, reconcebido de "feed de secciones" a "tu barrio ahora", con el cerebro que hoy corre dentro
de `AppCliente` subido al Home y hecho cross-comercio. El momento del mostrador necesita su propia
inversión de diseño. Todo lo demás es soporte.
