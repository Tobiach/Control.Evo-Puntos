# Checklist de imágenes a preparar

> Pedido de Tobías (15/9): "no hay fondos buenos, imagen, movimiento" + "dime todas las
> imágenes que debo de preparar para reemplazar en donde deba de ir". Esto es la lista de
> ACCIÓN (qué conseguir/subir), no el audit de código — para eso ver
> [SISTEMA-IMAGENES.md](SISTEMA-IMAGENES.md) (dónde aparece cada campo, tamaños, fallbacks).

## El hallazgo que cambia la prioridad de todo esto

Antes de armar la lista, verifiqué cuántos de los negocios reales tienen alguna imagen
cargada. **Resultado, contra la base real (no una estimación): 79 de 80 negocios reales
(`es_muestra = false`) no tienen ni logo ni portada — 0%.** El único con algo es Victoria
Café, y solo tiene logo (sin portada). Los 73 del lote de CABA: **0 de 73**.

Esto importa porque cambia el diagnóstico: el Home nuevo (`CardEstado`, foto de fondo con
movimiento) y toda la app en general no se sienten "sin fondos" por un problema de diseño —
es que **no hay ninguna foto real cargada para casi ningún negocio todavía**. El fallback
(degradé de color por rubro + emoji) es exactamente eso, un fallback — está haciendo su
trabajo, pero el 99% del catálogo lo está usando como si fuera lo normal. Cargar fotos reales
es la palanca más grande para que la app se sienta viva, más que cualquier ajuste de código.

## Cómo se cargan (para que sepas el flujo antes de juntar fotos)

Los campos `logo_url`/`portada_url` de `negocios` son **URLs a una imagen ya alojada en otro
lado** — la app no tiene upload propio todavía. Dos caminos:

1. **Uno por uno, vos como dueño de muestra**: entrando a `?admin` con
   `dueno.muestras-premia.demo@gmail.com` / `ControlEvo2026!`, elegís el negocio y pegás la URL
   en el panel (`SeccionNegocio.tsx`). Sirve para 1-2 negocios puntuales.
2. **En lote, con un script** (igual patrón que
   `scripts/set-logo-victoria-cafe.mjs`): me pasás las fotos (o una carpeta/planilla con
   negocio → link), las subo a algún hosting (o las subís vos donde prefieras — no hace falta
   que sea Supabase Storage, cualquier URL pública funciona) y corro un script que actualiza
   los 73 de una — mismo criterio que ya usé para sembrar sus recompensas.

## Qué priorizar primero

No hace falta perseguir las 73 a la vez. Orden sugerido:

1. **Los 5 negocios que ya usás para demos/testing** (Bavieca, Baum Catrina, Dársena Bar,
   Hoppe, Verduras y Frutas El Gringo — la cuenta `premia.latam@gmail.com`). Son los que
   aparecen en TODAS las capturas que me mandaste — cargarles foto real cambia lo que estás
   viendo ahora mismo, antes de tocar las otras 68.
2. **Premín** (ver abajo) — un solo asset, pero aparece en casi todas las pantallas.
3. El resto de los 73, cuando haya tiempo — no bloquea nada mientras tanto (el fallback de
   color se ve prolijo, no roto).

## 1 — Premín: 5 formas + 5 siluetas (el más importante, un solo asset que se ve en todos lados)

Ya está **aprobado** (hoja del 8/9) — falta el corte final. Brief completo con los 5
conceptos en [NIVELES-Y-PREMIN.md](NIVELES-Y-PREMIN.md#3-evolución-de-premín--las-5-formas-aprobadas-892026).

- **Formato:** PNG, fondo transparente, canvas cuadrado, personaje centrado y parado, **misma
  altura visual en las 5** (para que no salte al evolucionar).
- **Archivos:** `public/premin/1.png` … `public/premin/5.png` + silueta de cada una (relleno
  oscuro sobre transparente, mismo recorte) para los niveles bloqueados de la Pokédex.
- **Dónde se ve ya, esperando el asset:** header del Home, `CardNivelXp` (Home/Perfil/Mis
  premios), `TrackEvolucion` (Pokédex en Perfil), momento "Premín evolucionó".
- **Nota importante:** te pedí la imagen de referencia de nuevo esta sesión y no la tengo
  guardada en ningún lado accesible — solo tengo la descripción en texto de la tabla del doc
  (la de arriba). Si querés que revise algo puntual contra el dibujo real, pegámelo de nuevo
  en el chat.

## 2 — Portada (`portadaUrl`) — panorámica, la que más impacto visual tiene

Aparece en: héroe/card de estado del Home (fondo con movimiento, recién agregado), "Descubrí
nuevos lugares", "Tus lugares" no la usa (solo logo chico), Explorar (`TarjetaExplorar`),
header al entrar a un negocio (`TabInicio`, la más grande — 176px de alto).

- **Formato:** foto horizontal (panorámica), buena luz, que se vea el lugar o un producto
  destacado — mismo criterio que ya usa Victoria Café en la demo (ambiente real, no stock).
- **Por negocio, 1 sola foto alcanza** (se reusa en todos los lugares de arriba).

## 3 — Logo (`logoUrl`) — cuadrado, para reconocimiento rápido

Aparece en: "Tus lugares" (Home, 36px), "Mis premios" (44px), carta pública (64px).

- **Formato:** cuadrado, fondo blanco o transparente (nunca panorámico — si mandás el mismo
  archivo que la portada, se va a ver recortado feo, son dos fotos distintas).

## 4 — Foto de producto (`fotoUrl` en items de carta) — opcional, más adelante

Aparece en la carta digital de cada negocio ("Sumá puntos", carta pública completa). Es por
ítem del menú, no por negocio — mucho más trabajo (potencialmente decenas por negocio). Lo
dejaría para después de portada+logo, y no para los 73 sino solo para negocios que ya
muestren interés real en su cuenta.

## Fuera de esta lista (ya resuelto, o no depende de fotos)

- El mapa (pines) usa emoji siempre, nunca foto — es la decisión correcta a esa escala, no
  hace falta nada ahí.
- "Foto pendiente" (ícono de cámara explícito) está documentado pero sin ningún uso real hoy
  — no hace falta prepararle nada.
