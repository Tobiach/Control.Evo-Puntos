# Niveles, evolución de Premín y el enfoque de "juego"

> Decisión de Tobías, 7/9/2026. Guía la comunicación de acá en más — app **e** Instagram
> (ver también la skill `premia-brand-os`). Convive con las reglas del brief maestro (§07, §13,
> §27) y `CONTRIBUTING.md`: el juego se monta sobre la conducta real (ir al local), nunca sobre
> clicks vacíos ni datos inventados.

## 1. El enfoque: Premia es un juego

Premia se comunica como un juego: **progresás, coleccionás, desbloqueás, evolucionás**. La
utilidad ("puntos reales", "canjeás por cosas") sigue siendo el diferencial, pero **no lidera el
mensaje** — lidera el progreso y el momento.

### Cambio de vocabulario

| En vez de… | Decimos… |
|---|---|
| "Sumás puntos reales" | "Cada visita te hace subir" / "Jugás yendo a los lugares del barrio" |
| "Avisá en la caja" | "Registrá tu visita" (check-in) |
| "Tu primera compra ya te acerca" | "Tu primera visita desbloquea tu primer objetivo" |
| "Nivel de fidelidad" | "Premín evoluciona con vos" |
| "Recompensa" | "Lo que desbloqueás" |
| "Cantidad de puntos" | "XP" (a nivel global) |
| "Invitá a un amigo" | "Sumá a tu equipo" / "jueguen juntos" |
| Subir de nivel | "Premín evolucionó" — un **momento**, con celebración propia |

### Qué NO cambia (el límite)

- Cada misión / logro / racha mapea a algo real: una visita, un canje, probar un local nuevo.
- Cero prueba social falsa, cero progreso fabricado, cero número inventado.
- La gamificación sirve a la conducta: **visitar comercios**. No a inflar tiempo en la app.

## 2. Los 5 niveles (XP global cross-comercio)

`NIVELES_XP_GLOBAL` en `src/lib/club.ts`. Umbrales sin cambios; nombres nuevos, **sin emoji**
(el visual de cada nivel es la forma de Premín).

| # | Nombre | XP | Idea |
|---|---|---|---|
| 1 | **Recién Llegado** | 0 | Recién entró, todavía mirando. |
| 2 | **Cliente Fijo** | 200 | Ya vuelve a un par de lugares. |
| 3 | **Habitué** | 1.000 | "Tu lugar de siempre". El nivel-identidad. |
| 4 | **Cráneo del Barrio** | 3.000 | Se las sabe todas, lo consultan. |
| 5 | **Prócer del Barrio** | 8.000 | Es parte del paisaje. Forma final. |

Distinto del **rango por local** (`vipDesdePuntos` → "Nuevo → VIP de ESE comercio", con
`beneficiosVip` que configura el dueño): eso es "tu estatus en {local}". La evolución de Premín
es tu identidad global en toda la Red.

## 3. Evolución de Premín — las 5 formas (APROBADAS 8/9/2026)

5 formas, una por nivel, sobre el Premín real (copa dorada, "P", brújula, zapatillas coral).
La hoja de referencia aprobada la tiene Tobías — **falta subirla al repo** como
`docs/assets/premin-evolucion.png` (fuente de verdad para el diseñador).

| Nivel | Forma (como quedó en la hoja aprobada) |
|---|---|
| Recién Llegado | Premín base, tal cual `/premin.png`. Brújula de esfera coral. |
| Cliente Fijo | + **vincha/cinta coral** en la cabeza (señal de "siempre vuelve"). Parado, calmo. Brújula coral. |
| Habitué | + **bufanda tejida coral/crema** entre las asas, **tacita de café humeante** en una mano, brújula dorada en la otra. La forma más relajada, "como en su casa". |
| Cráneo del Barrio | + **capa corta verde oscuro**, **bandolera verde con "P"**, 3–4 esferitas orbitando (red). Brújula dorada ornamentada. Sonrisa canchera. |
| Prócer del Barrio | Forma final: **capa larga coral al viento**, **corona dorada con gema**, **halo dorado**, destellos, brújula dorada tipo sol. |

Requisitos técnicos: PNG con fondo transparente, canvas cuadrado, personaje centrado y parado,
**misma altura visual en las 5** (que el `<img>` no salte al evolucionar), nombres
`public/premin/1.png` … `public/premin/5.png`. Además: **silueta plana** de cada una (relleno
oscuro sobre transparente) para los estados bloqueados de la Pokédex.

### Wiring (ya en el código)

- `NivelXp.premin?: string` — campo por nivel en `NIVELES_XP_GLOBAL`. Se completa con las rutas
  cuando existan los assets (una línea por nivel).
- `CardNivelXp` y `TrackEvolucion` usan `nivel.premin ?? '/premin.png'` — hasta que estén los 5,
  todos muestran el Premín actual; en `TrackEvolucion` las formas bloqueadas se ven como silueta
  (`brightness-0 opacity-30`), que mejora sola cuando lleguen los assets reales por nivel.

## 4. El momento "Premín evolucionó" ✅ (componente hecho)

`src/components/appcliente/PreminEvoluciono.tsx` + wiring en `MarketplaceApp`: cuando el XP global
cruza un umbral, hoja centrada con la forma nueva entrando con rebote, confetti + fanfarria
(`sonidoEvolucion` en `lib/sonidos.ts`) + vibración, "¡Premín evolucionó! · Llegaste a {nombre}".
No se cierra sola: pide un toque. El salto 0 → real del arranque (carga o siembra de demo) no
cuenta como evolución (gate por `cargando` + `nivelXpListoRef`). Usa `nivel.premin ?? '/premin.png'`.

## 5. La "Pokédex" — línea de evolución siempre visible ✅ (componente hecho)

`src/components/appcliente/TrackEvolucion.tsx` — las 5 formas en fila, la actual con anillo, las
bloqueadas en silueta, y "Faltan {X} XP para que Premín evolucione a {forma}". Ya montado en
`TabPerfilMarketplace` debajo de `CardNivelXp`. Funciona hoy con `/premin.png` + silueta;
mejora solo cuando lleguen los 5 assets por nivel.

## 6. Home del usuario nuevo — framing de juego ("Arrancás la partida")

Reemplaza el enfoque utilitario. Detalle en `docs/SPEC-HOME.md` §J. Resumen:

- Header: Premín base + "Sos {nombre} · Recién Llegado".
- **Héroe = "Misión 1 · Tu primera visita"**: "Andá a {local} y registrá tu visita. Desbloqueás
  {recompensa} y Premín evoluciona." CTA "Empezar".
- **"Cómo se juega" — 3 pasos**: elegís un local → registrás tu visita → subís, desbloqueás,
  Premín evoluciona. (Una vez; se va con la primera relación.)
- **Línea de evolución visible desde cero** (siluetas) — el gancho.
- **"Locales para tu primera visita" — 3** curados.
- Variantes por entrada: referido ("un amigo te sumó a su equipo"), QR en local ("estás en
  {local}, registrá tu primera visita").
- Sin métricas en cero, sin lista de 90, sin tutorial largo.
