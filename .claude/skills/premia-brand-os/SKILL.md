---
name: premia-brand-os
description: Sistema de marca de Premia.ar (paleta real, tipografía, Premín, voz, buyer personas, los 15 templates de contenido y el protocolo de prompts para IA de imagen). Usar para cualquier pieza de Instagram, copy, o material de marca de Premia.ar.
---

# Premia.ar — Brand OS operativo

Fuente de verdad dual, en este orden de prioridad:
1. **El código real** (`src/index.css`, este repo) para paleta y tipografía — siempre gana.
2. **Brand OS v3 (Master)**, Drive, para estructura, templates, composición y voz — vigente
   salvo en los HEX de color y en el rol del verde, que están desactualizados (ver más abajo).

No inventar valores que no estén acá. Si hace falta algo que no está documentado (ej. un
template de los 15 sin prompt detallado), decirlo explícitamente y ofrecer construirlo
siguiendo el mismo patrón, no rellenar con algo plausible.

## Paleta — HEX reales (v4, 2026-07-30, de `src/index.css`)

⚠️ El doc de Drive "Brand OS v3 (Master)" tiene la paleta v1
(`#F04818`/`#FF8A5B`/`#00C08B`/`#111827`) Y el rol de los colores desactualizados —
**no usarla**. Corrección clave (2026-08-03, confirmada por Tobias): **el coral ya NO es
el fondo dominante. El color de marca / fondo principal ahora es el verde claro del logo,
el mismo que ya usa la app real.** Esta es la paleta vigente:

| Rol | HEX | Uso |
|---|---|---|
| **Fondo / verde claro (color de marca)** | `#F3F8F1` | **Fondo dominante de toda pieza** — igual al logo y al fondo real de la app |
| Fondo medio | `#EEF7EE` | Variante de fondo claro para separar secciones dentro de una pieza |
| Acento (dorado, CTA/Premín) | `#D89B2B` | Acento — botones, elementos protagónicos, nunca fondo pleno |
| Acento suave | `#FFF3D7` | Fondos suaves de badges/highlights dorados |
| Premio (coral) | `#F28A63` | Acento secundario — recompensas, celebración, nunca fondo pleno |
| Premio suave | `#FFE2D7` | Fondos suaves coral |
| Verde comunidad (saturado) | `#34C759` | Comunidad, progreso, estados activos, checks — distinto del verde claro de fondo |
| Verde suave | `#E7F7EA` | Fondos suaves verdes |
| Texto / grafito | `#1E2430` | Texto principal, y fondo oscuro cuando la pieza pide contraste fuerte (dato, mito/realidad) |
| Texto muted | `#667085` | Subtítulos, texto secundario, fuentes citadas |
| Rojo (alerta) | `#D75B4C` | Urgencia real únicamente — nunca decorativo |
| Azul ubicación | `#003399` | SOLO brújula de Premín, mapas, dirección — nunca fondo ni botón |
| Surface oscuro | `#1A1A1D` | Fondo oscuro deliberado para piezas de contraste tipográfico fuerte |

**Reglas no negociables (actualizadas):**
- **Fondo dominante = verde claro `#F3F8F1`** (o `#EEF7EE` como variante). Es el color de
  marca, no un accent — así se ve el logo y la app real.
- Dorado y coral son **acentos**, nunca fondo pleno de la pieza completa: van en CTAs,
  badges, Premín, elementos protagónicos puntuales.
- El fondo oscuro (`#1E2430`/`#1A1A1D`) sigue siendo válido para piezas que necesitan
  contraste tipográfico fuerte (ej. T02 Dato, T08 Mito/Realidad) — es la excepción
  intencional, no el default.
- Máximo 2 acentos por pieza. Azul (`#003399`) es exclusivo de la brújula/mapas — nunca en
  botones, texto general, ni fondo.
- **Pendiente de confirmar con Tobias**: Brand OS v3 (Drive) todavía describe fondos
  específicos por template (T01 coral, T02/T08 grafito, T04 coral, T06 crema) bajo el
  esquema viejo. Con el cambio a verde claro como color de marca, esos fondos por template
  probablemente cambian también — no remapear los 15 solo, confirmar el criterio general
  con Tobias antes de dar por sentado cómo queda cada uno.

## Tipografía (de `src/index.css` — coincide con Brand OS v3, esto no cambió)

| Rol | Fuente | Peso |
|---|---|---|
| Titulares | Space Grotesk | ExtraBold, tracking -1 a -2px |
| Cuerpo y UI | Inter | Regular / Medium / Bold |
| Notas manuscritas (uso puntual, nunca de cuerpo) | Caveat | 600, rotada -4° a -8° |

Nunca serif, script (salvo Caveat puntual) o decorativas.

## Premín — la mascota

Trofeo dorado personificado con brújula. Brazos y piernas cartoon negros. Zapatillas coral
con detalle crema. Letra "P" grabada en el frente. Brújula con aguja azul (`#003399`). Ojos
ovalados negros, sonrisa mínima cerrada.

**Regla no negociable**: siempre usar el PNG maestro de referencia (carpeta Drive "imagenes
Premia.ar") al generar contenido con IA — adjuntarlo junto al prompt. Nunca redibujar el
personaje desde cero: es el activo más frágil de la marca.

Poses disponibles: parado con brújula (default), saludando, señalando, celebrando, corriendo.

## Voz y comunicación

Rioplatense sin caricatura. Cálido, directo, celebratorio — "como abrir un regalo, no como
leer un balance". Registro: **vos**, nunca tú ni usted.

**Nunca decir**: garantizado, duplicá tus ventas, vas a ganar miles de pesos, nunca más vas a
perder clientes, todos usan esto, revolucionario/disruptivo/optimizar/next-gen.

**Siempre decir**: podés incentivar que vuelvan, podés premiar la frecuencia, podés conocer
mejor a tus clientes — volver, canjear, premio, comunidad, barrio, habitué, cerca tuyo.

**Chequeo obligatorio de cada mensaje**: ¿duele en la primera línea? ¿se entiende en 3
segundos sin contexto? ¿es específico del rubro (un dueño pensaría "eso me pasa")? ¿termina
en una acción concreta, nunca en "¿te interesa?"?

**Regla dura de contenido**: cero prueba social falsa, nunca inventar cifras/testimonios/
tracción. Si un dato no está confirmado, se marca como pendiente.

## Buyer personas (resumen — detalle completo en `DOC-MAESTRO-PREMIA.md`, controlevo-os)

Cada pieza le habla a UNA sola persona, nunca a las dos (regla de oro).

**Dueño del comercio** (30-55 años, aunque puede ser menor): cansado de hacer promociones,
sin tiempo, quiere estabilidad. ✅ "El problema no es que no vengan. El problema es que no
tienen motivos para volver." ❌ "Nuestra plataforma optimiza la fidelización de tus clientes."

**Cliente final** (20-45+ años, urbano, ya tiene lugares de cabecera): quiere que sus lugares
de siempre lo reconozcan, descubrir lugares nuevos que se sientan parecidos. ✅ "Los locales
que ya amás, ahora te premian por volver. Y conocés nuevos lugares." ❌ "Descargá nuestra app
de fidelización con sistema de puntos."

## Formatos

| Formato | Uso |
|---|---|
| 1080x1080 (1:1) | Default, feed |
| 1080x1350 (4:5) | Carruseles largos |
| 1080x1920 (9:16) | Stories, reels, covers |

## Composición y firma (de Brand OS v3, Parte 6/7 — vigente)

- Un elemento protagónico por pieza (titular, número, Premín, o mockup) — nunca varios
  compitiendo.
- Márgenes exteriores mínimo 80px. Mucho aire, poco amontonado.
- Siempre 1-2 blobs de sombra difusos en el fondo para profundidad.
- **Firma estándar en toda pieza**: logotipo abajo izquierda, handle `@premia.ar` abajo
  derecha, numerador ("01/06") arriba derecha, eyebrow de sección (● + texto) arriba
  izquierda.
- **Densidad visual** — cada pieza necesita mínimo 4 de estos 10 elementos: (1) titular
  grande, (2) foto documental real en marco rotado con sombra, (3) badges flotantes
  (número + texto corto), (4) notificación push simulada, (5) mockup de celular con
  interfaz real, (6) personaje Premín, (7) etiqueta manuscrita (máx. 1 por pieza), (8) blobs
  de sombra, (9) eyebrow de sección, (10) firma. Solo titular + firma = pieza incompleta.

## Los 15 templates

| # | Nombre | Objetivo | Formato |
|---|---|---|---|
| T01 | Problema (hook) | Romper scroll, tope de embudo | Pieza única o carrusel 3 |
| T02 | Dato | Educar con evidencia citada | Pieza única |
| T03 | Historia | Identificación, guardados | Carrusel 5-7, caso real (nunca ficticio) |
| T04 | Pantalla real / mockup | Demostrar producto | Pieza única o carrusel 2-3 |
| T05 | Build in public | Transparencia | Reel 30-60s |
| T06 | Antes / después | Contrastar con/sin sistema | Pieza única, split vertical 50/50 |
| T07 | Psicología del cliente | "Eso me pasa" | Carrusel 4, tono editorial |
| T08 | Mito / realidad | Romper creencias | Pieza única, tachado vs. limpio |
| T09 | Caso real | Prueba social | Carrusel 6-8, requiere permiso + cita textual real |
| T10 | Feature (Hormozi 4 pasos) | Problema→función→beneficio dueño→beneficio cliente | Carrusel 4 |
| T11 | Cultura / manifiesto | Valores, visión | Carrusel 8-10, una frase por página |
| T12 | Noticias y tendencias | Relevancia, SEO | Pieza única, actualidad del rubro |
| T13 | Premio canjeado (UGC) | Prueba social del canje | Pieza única o story, etiquetar local + barrio |
| T14 | Ranking del barrio | Viralidad geográfica | Pieza única semanal, podio de 3, etiquetar locales |
| T15 | Desafío entre amigos | Mecánica social del producto | Reel 15-30s o carrusel 3, verde comunidad dominante |

**Reglas duras por template**: T03/T09 requieren caso real documentado, nunca inventado. T04
nunca muestra una función sin nombrar el problema que resuelve. T13/T14 siempre etiquetan al
comercio real.

## Patrón de prompt para IA de imagen

Todo prompt de imagen sigue esta estructura, adaptada del "Sistema maestro" de Brand OS v3
(con la paleta y el rol de fondo corregidos a lo vigente de arriba):

```
Diseño para Instagram feed, [formato según tabla].
Fondo verde claro #F3F8F1 (default, color de marca) — o #1E2430/#1A1A1D si la pieza
necesita contraste tipográfico fuerte (dato, mito/realidad).
Acentos: dorado #D89B2B y/o coral #F28A63, máximo 2, nunca como fondo pleno.
Eyebrow arriba izquierda: [círculo + texto de sección].
Numerador arriba derecha: "XX / XX".
Elemento protagónico: [titular gigante / número / mockup / Premín — uno solo].
[Detalle específico del template — ver tabla de los 15].
[Premín con imagen de referencia adjunta, si el template lo pide — nunca redibujado].
Firma inferior: "Premia.ar" abajo izquierda, "@premia.ar" abajo derecha.
```

Brand OS v3 Parte 7 (Drive) tiene prompts ya redactados con variables para T01, T02, T04,
T06, T08, T10 y T11 — usarlos como base de estructura y variables, pero **reemplazando
siempre el fondo y los HEX por lo vigente de esta skill**, nunca copiar sus HEX literales.
Para el resto (T03, T05, T07, T09, T12, T13, T14, T15), construir el prompt con este patrón
+ la fila correspondiente de la tabla de templates, y avisarle a Tobias que es un prompt
nuevo, no uno ya validado.
