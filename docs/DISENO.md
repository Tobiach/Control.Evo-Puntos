# Sistema de diseño

Todo el sistema de diseño vive en **un solo archivo: `src/index.css`**. Antes de asumir un
color, tipografía o espaciado, leerlo — cambia de versión seguido y es la única fuente de
verdad (no hay un Figma ni un design-tokens.json separado).

## Cómo funciona

Tailwind CSS v4 genera las clases de utilidad automáticamente a partir del bloque `@theme` en
`src/index.css`. Cada `--color-nombre` se convierte en `bg-nombre`, `text-nombre`,
`border-nombre`, etc. Esto tiene una implicación importante:

**Nunca renombrar un token existente** — romper `--color-acento` en 40 componentes que ya usan
`bg-acento`/`text-acento` es un cambio masivo innecesario. Si hay que cambiar la paleta, se
cambian los VALORES hex dentro de las variables existentes, nunca los nombres.

## Roles de color (no exhaustivo, ver el archivo real para la versión vigente)

| Token | Rol |
|---|---|
| `--color-fondo` / `--color-fondo-medio` | Fondo general de la app |
| `--color-card` | Fondo de tarjetas/superficies elevadas |
| `--color-acento` / `--color-acento-hover` | Color de marca para CTAs primarios |
| `--color-on-acento` | Texto sobre `--color-acento` — elegido por contraste WCAG, no por estética |
| `--color-premio` | Color asociado a recompensas/puntos |
| `--color-verde-ok` | Comunidad, progreso, estados positivos reales (no decorativo) |
| `--color-texto` / `--color-texto-muted` / `--color-texto-disabled` | Jerarquía de texto |
| `--color-surface-dark` | Superficies oscuras deliberadas (bottom nav, modales, celebraciones) — nunca el fondo general |

## Reglas duras

- **Contraste WCAG AA como mínimo** (≥4.5:1 texto normal, ≥3:1 texto grande) en cualquier
  combinación texto/fondo nueva — verificar antes de aplicar un color de referencia tal cual
  venga de un logo o mockup.
- **Cero prueba social falsa**: nunca inventar reseñas, estrellas, cantidades de usuarios o
  countdowns decorativos. Cualquier badge de actividad ("Puntos x2 hasta las...", "N personas
  lo eligieron") sale de un dato real (`horarioValle`, `clientesActivos`), nunca se fabrica.
- **Tipografía**: `Inter` (texto general), `Space Grotesk` (títulos), `Caveat` (acentos tipo
  nota manuscrita, uso puntual). Definidas como `--font-*` en el mismo `@theme`.

## Convenciones de componentes

- Tarjetas: `rounded-2xl`/`rounded-3xl` + `border border-borde` + `bg-card`.
- Chips/pills de filtro: `rounded-full px-3.5 py-1.5 text-xs font-bold`, activo en
  `bg-acento text-on-acento`, inactivo en `border border-borde bg-card text-texto-muted`.
- Logos de negocio: `object-contain` dentro de un contenedor con `bg-white` condicional (nunca
  `object-cover`, recorta logos panorámicos) — con emoji de fallback si no hay `logoUrl`.
- Placeholders de foto pendiente (ej. "Premia recomienda" antes de tener fotos reales): fondo
  `bg-fondo-medio`, ícono de cámara, texto explícito "Foto pendiente" — nunca una imagen
  genérica de stock haciendo de relleno.
