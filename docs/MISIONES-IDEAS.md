# Misiones — lluvia de ideas y formatos

> Pedido de Tobías (15/9). La pestaña "Misiones" del nav (5 tabs) hoy es un placeholder
> honesto (`TabMisionesProximamente.tsx`) — no existe ningún sistema real todavía. Esto es
> brainstorm para elegir dirección, no un plan de implementación. Regla que ya rige todo el
> producto (`CONTRIBUTING.md`, `docs/NIVELES-Y-PREMIN.md`): cada misión mapea a una conducta
> real (visitar, canjear, invitar) — cero progreso fabricado, cero dato inventado.

## El hallazgo que cambia el punto de partida

Antes de tirar ideas nuevas: **gran parte de "Misiones" ya existe, repartido en 2 lugares que
nadie ve como tal.**

1. **Desafíos entre amigos** (`SeccionDesafios.tsx`, tabla `desafios_amigos`, migración 0009)
   — retador elige un amigo + un tipo (`visitas` o `probar_nuevo`) + una meta, y se sigue el
   progreso real contra `visitas`. Ya construido, probado, con bonus de puntos al cumplirse.
   Hoy vive escondido en Perfil.
2. **Racha semanal/diaria** (`rachaSemanal`, `rachaDias`) y **niveles/XP de Premín** — ya son
   misiones implícitas ("segui yendo", "subí de nivel"), solo que no se presentan como tales.
3. **Tabla `insignias_conseguidas`** existe en el schema (migración 0001) con RLS lista —
   **cero código la usa hoy**. Es el lugar natural para "logros" permanentes (medallas por
   misión cumplida), no hace falta crear nada nuevo del lado de la base.

Conclusión: "Misiones" puede arrancar siendo **una superficie nueva sobre datos que ya
existen**, no una feature desde cero. Eso baja mucho el riesgo/costo de la primera versión.

## Formato de la pantalla — 3 opciones, no excluyentes

**A. Lista de misiones activas con progreso** (checklist simple)
Cada misión: título, progreso ("2/3 visitas"), recompensa, y qué falta. Es el formato más
fácil de escanear y el que menos inventa — literalmente mostrar datos que ya se calculan.

**B. Separar "Misiones personales" vs. "Desafíos con amigos"**
Dos secciones dentro de la misma pestaña. Los desafíos (`SeccionDesafios`) se MUEVEN acá desde
Perfil (no se duplican) — le da un hogar más obvio a algo que ya existe pero está perdido.

**C. "Logros" como colección permanente** (usa `insignias_conseguidas`)
A diferencia de las misiones activas (temporales, con vencimiento), un logro es para siempre
una vez conseguido — "Probaste 3 rubros distintos", "Primer canje", "Racha de 30 días". Encaja
con el lenguaje de colección que ya tiene Premín (Pokédex de evolución) — mismo patrón visual
reutilizable (medallas en vez de formas, conseguidas a color / bloqueadas en silueta).

## Ideas de misiones — por qué tan fácil es construirlas hoy

### Ya se puede calcular con datos existentes (sin infraestructura nueva)

| Misión | De dónde sale el dato |
|---|---|
| Probá un lugar nuevo | relación nueva creada (primer `visitas` en un negocio) |
| Volvé 3 veces este mes a tu lugar de siempre | `COUNT(visitas)` filtrado por negocio + mes |
| Racha de 7 días seguidos | `rachaDias` (ya existe, ya se usa en el Home) |
| Subí de nivel | XP global cruza un umbral (ya dispara "Premín evolucionó") |
| Canjeá tu primer premio | primer registro en `canjes` con `estado = confirmado` |
| Sumá a un amigo | sistema de referidos ya construido, solo falta el copy de "misión" |
| Explorá 3 rubros distintos | `negocio.rubro` distinto entre tus relaciones |
| Retá a un amigo (y ganen los dos) | `desafios_amigos`, ya construido — mover a Misiones |
| Probá algo nuevo en la carta | `visitas.es_nuevo`, ya existe el campo, nadie lo usa como misión hoy |

### Necesitan una decisión de negocio antes de construir (riesgo real, no solo diseño)

| Misión | Por qué está bloqueada |
|---|---|
| Subí una foto de tu visita y ganá puntos | Moderación/antifraude — ya identificado como G5 en `AUDITORIA-REFERENCIAS-PASITO.md`, sigue bloqueado |
| Dejá una reseña | Mismo riesgo que arriba — reseñas falsas, moderación |

### Estacionales / del dueño (usan tablas que ya existen)

| Misión | De dónde sale |
|---|---|
| Misión de un evento puntual ("Vení el finde del choripán y ganá X") | `eventos_negocio`, ya existe la tabla y el concepto de "misión por evento" en el código |

## Preguntas para decidir antes de construir (no las contesto yo, son tuyas)

1. ¿Arrancamos con **A** (checklist simple) para tener algo real rápido, y sumamos **B**/**C**
   después? Es mi sugerencia — menor riesgo, reusa más código ya hecho.
2. ¿Los desafíos entre amigos se **mudan** a Misiones o quedan también accesibles desde
   Perfil? (mudarlos es más simple: un solo lugar, no hay que mantener el link en los dos).
3. ¿La recompensa de una misión siempre es puntos, o algún logro puede dar algo no-monetario
   (una insignia/skin coleccionable de Premín, sin plata de por medio)?
4. G5 (foto→puntos) sigue bloqueado hasta que se resuelva moderación — ¿vale la pena
   priorizar esa conversación ahora que "Misiones" tiene un lugar real en el nav, o se puede
   armar una v1 completa sin tocar esto?
