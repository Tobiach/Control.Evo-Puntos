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
| 5 | **Leyenda del Barrio** | 8.000 | Es parte del paisaje. Forma final. |

Distinto del **rango por local** (`vipDesdePuntos` → "Nuevo → VIP de ESE comercio", con
`beneficiosVip` que configura el dueño): eso es "tu estatus en {local}". La evolución de Premín
es tu identidad global en toda la Red.

## 3. Evolución de Premín — las 5 formas ✅ (assets reales cargados 23/9/2026)

5 formas, una por nivel, sobre el Premín real (copa dorada, "P", brújula, zapatillas coral).
Nombre del nivel 5 confirmado en la hoja final de códigos: **"Leyenda del Barrio"** (no
"Prócer del Barrio", nombre de un borrador anterior — ya actualizado en `club.ts` y sus tests).

| Nivel | Forma | Asset |
|---|---|---|
| Recién Llegado | Premín base, tal cual `/premin.png`. Sin accesorios. | `/premin.png` (sin cambios) |
| Cliente Fijo | **Gorra roja** con "P", postura simple. | `/premin/2.png` |
| Habitué | **Bufanda tejida coral/crema**, **taza de café** en una mano. | `/premin/3.png` |
| Cráneo del Barrio | **Gorra verde + lentes de sol + campera**, **mapa en mano**. | `/premin/4.png` |
| Leyenda del Barrio | **Corona dorada**, **capa corta coral**, **medalla "P"**, destellos alrededor. | `/premin/5.png` |

Los 4 PNG (niveles 2-5) salieron de las fotos reales aprobadas por Tobías (Drive, 23/9/2026):
fondo quitado con la integración de Canva (`remove-background`), recortados y reencuadrados
sobre un canvas transparente de 400×400 con altura visual consistente entre los 4 (el nivel
"Cliente Fijo" queda algo más chico porque esa pose tiene los brazos muy abiertos y no entraba
más grande sin recortarse). Resolución fuente ≈200px de ancho — de sobra para los usos actuales
(`CardNivelXp` y `TrackEvolucion` muestran ≤72px, la celebración `PreminEvoluciono` usa 128px),
pero si en el futuro se necesita un uso más grande (ej. una pieza de marketing a tamaño real),
pedirle al diseñador el recorte en alta resolución en vez de reescalar estos.

No se generaron las siluetas planas separadas mencionadas en una versión anterior de este doc:
`TrackEvolucion.tsx` ya deriva la silueta de las formas bloqueadas al vuelo con un filtro CSS
(`brightness-0 opacity-30`) sobre el mismo PNG transparente — no hace falta un archivo aparte.

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
