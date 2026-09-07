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

## 3. Evolución de Premín — brief de assets

5 formas, una por nivel. **Assets nuevos a encargar** — el brief maestro §16 prohíbe redibujar a
Premín; esto lo hace el diseñador. Base: el Premín actual (`/premin.png`).

| Nivel | Forma de Premín (concepto para el diseñador) |
|---|---|
| Recién Llegado | Premín base, tal cual hoy. Chico, redondo, ojos grandes, expresión de recién llegado. |
| Cliente Fijo | Un poco más grande. Suma **un accesorio del barrio** (bufanda, gorrito, mate en la mano). Postura más cómoda. |
| Habitué | Postura segura, **taza de café en mano**. Se lo ve "en su lugar". Es la forma que más se va a ver — que sea la más carismática. |
| Cráneo del Barrio | Más accesorios: **anteojos, diario bajo el brazo**, quizás una credencial. Cara de "yo te consigo eso". |
| Prócer del Barrio | Forma final. Guiño de "monumento": **pedestal, laureles o busto de bronce**, aura dorada sutil. Épico pero con humor, no solemne. |

Requisitos técnicos: PNG con fondo transparente, misma proporción y encuadre que `/premin.png`
(así el `<img>` no cambia de tamaño al evolucionar), nombres `/premin/1.png` … `/premin/5.png`.

### Wiring (ya listo en el código)

- `NivelXp.premin?: string` — campo por nivel en `NIVELES_XP_GLOBAL`. Se completa con las rutas
  cuando existan los assets (una línea por nivel).
- `CardNivelXp` usa `actual.premin ?? '/premin.png'` — hasta que estén los 5, todos muestran el
  Premín actual. Sin romper nada mientras tanto.

## 4. El momento "Premín evolucionó" (pendiente de implementar)

Cuando el XP global cruza un umbral: pantalla/hoja celebratoria propia — la forma nueva aparece
(transición de la anterior a la nueva), confetti + sonido (reusar `lib/confetti.ts`,
`lib/sonidos.ts`, patrón de `CreditoEnVivo`), copy "Premín evolucionó a **{nombre}**". Es el
gancho más fuerte del sistema de juego: hay que tratarlo como un evento, no como un toast.

## 5. La "Pokédex" — línea de evolución siempre visible

En Perfil (y en `CardNivelXp` expandido): las 5 formas en fila. Las alcanzadas a color, las
próximas **en silueta**, con "Faltan {X} XP para {forma}". Se ve desde el nivel 1 — es lo que
hace que el usuario quiera seguir. Requiere las siluetas (derivables de los assets finales).

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
