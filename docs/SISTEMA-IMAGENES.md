# Sistema de imágenes del negocio — logo, portada, fotos de carta

> Inventario real del código (no propuesta desde cero) — pedido de Tobías 12/9/2026 de cara al
> lanzamiento: "ordenar lo que ya existe" antes de tocar nada. Complementa
> [DISENO.md](DISENO.md) §Convenciones de componentes, que ya fija la regla general
> (`object-contain` para logos, nunca `object-cover`) pero no dónde se aplica cada una.
> **Ningún click cambia**: la imagen sigue siendo parte de la card que ya navega a donde
> navegaba — esto es orden, no una feature nueva.

## Los 3 tipos de imagen y sus campos

| Campo | Rol | Forma esperada |
|---|---|---|
| `negocio.logoUrl` | Marca del negocio (isotipo/logo) | Cuadrada, fondo blanco o transparente |
| `negocio.portadaUrl` | Imagen de cabecera/ambiente | Panorámica (horizontal) |
| `item.fotoUrl` (carta) | Foto de un producto puntual | Cuadrada o cercana |

## Inventario — dónde aparece cada una hoy

### Logo (`logoUrl`)

| Dónde | Archivo | Tamaño | Fondo | Fill | Fallback | Al tocar |
|---|---|---|---|---|---|---|
| "Tus lugares" / "Nuevos para vos" (Home) | `Marketplace.tsx` → `LogoNegocio` | 36px | `bg-white` / `bg-premio-suave` | `object-contain p-1` | emoji | abre el negocio (card entera) |
| Tarjetas de "Mis premios" | `TabMisLocales.tsx` | 44px | `bg-white` / `bg-premio-suave` | `object-contain p-1` | emoji | abre el negocio |
| Cabecera de la carta pública (`?carta=<id>`) | `CartaPublica.tsx` | 64px | — | **`object-cover`** ⚠️ | (a revisar) | no clickeable |
| Header dentro de un negocio | `TabInicio.tsx` | 64px | `bg-premio-suave` | — | **siempre emoji, nunca `logoUrl`** ⚠️ | no clickeable |

### Portada (`portadaUrl`)

| Dónde | Archivo | Alto | Fill | Fallback | Al tocar |
|---|---|---|---|---|---|
| Card de Explorar | `TarjetaExplorar.tsx` | 110px | `object-cover` | degradé por rubro + emoji + "Sin foto todavía" | abre el negocio |
| "Mis lugares" en Perfil marketplace | `TabPerfilMarketplace.tsx` → `TarjetaMiLugar` | 88px | `object-cover` | degradé por rubro + emoji (sin texto) | **va a la pestaña Mis premios, no abre el negocio** ⚠️ distinto de los demás |
| Header dentro de un negocio | `TabInicio.tsx` | 176px | `object-cover` | degradé por rubro + emoji grande | no clickeable (es fondo) |

### Foto de ítem de carta (`fotoUrl`)

| Dónde | Archivo | Tamaño | Fallback |
|---|---|---|---|
| "Sumá puntos" (catálogo con puntos por ítem) | `TabCartaPuntos.tsx` | 48px | emoji 🍽️ |
| Carta pública completa | `CartaPublica.tsx` | 80px | se oculta el bloque de imagen |

Distinto tamaño entre las dos, pero es **contextual, no un error**: una es lista compacta, la
otra la carta completa con más aire. No lo tocaría.

### Mapa (pines)

Siempre emoji del negocio, nunca logo ni foto (`MapaNegocios.tsx`). Correcto así — a la escala
de un pin, una foto no se lee; no es una inconsistencia, es la decisión correcta.

## Lo que hay que prolijar antes del lanzamiento

1. **`CartaPublica.tsx` usa `object-cover` en el logo** — viola la regla propia de
   `DISENO.md` ("nunca `object-cover` en logos, recorta los panorámicos"). Los otros 2 lugares
   con logo sí usan `object-contain`. Fix: mismo criterio que `LogoNegocio` (contain + fondo
   blanco condicional).
2. **`TabInicio.tsx` nunca muestra el logo real**, aunque el dueño lo haya cargado — siempre
   emoji. Es la pantalla de mayor protagonismo de identidad (la cabecera al entrar a un
   negocio) y es la única que no usa el dato real. Fix: usar `logoUrl` con el mismo criterio
   que el resto, emoji solo como fallback.
3. **El panel del dueño no da ninguna guía de proporción** (`SeccionNegocio.tsx`: "Logo (URL de
   una imagen ya subida a otro lado)", sin decir cuadrada/panorámica). Es probablemente la
   causa raíz de por qué hay logos panorámicos dando vueltas. Fix: una línea de ayuda en cada
   campo ("Logo: imagen cuadrada, fondo blanco o transparente" / "Portada: horizontal").
4. **3 tamaños de logo sueltos (36 / 44 / 64px)** sin una escala declarada — no es un error,
   pero conviene nombrarlos a propósito (chico ~36-44px para listas, cabecera ~64-72px) en vez
   de que haya quedado así por historia de quién tocó cada pantalla.
5. **"Foto pendiente" (cámara + texto explícito) documentado en `DISENO.md` pero sin ningún uso
   real hoy** — se fue junto con "Premia recomienda" en el rediseño del Home (2.2). No es
   urgente, pero si el doc lo sigue prescribiendo sin que exista en la UI, alguien puede
   recrearlo mal más adelante. Dejar la nota de que hoy no se usa en ningún lado.

## Pendiente de confirmar (no lo cambio sin tu OK)

- **`TarjetaMiLugar` (Mis lugares en Perfil) lleva a "Mis premios" en vez de abrir el negocio
  directo** — a diferencia de TODAS las demás cards de negocio en la app. ¿Es a propósito
  (Mis lugares es una vidriera hacia la pestaña completa) o debería abrir el negocio como el
  resto?

## Qué NO cambia

Ningún click nuevo, ninguna galería, ninguna imagen nueva por cargar. Esto es only consistencia
de lo que ya existe — logo cuadrado tratado como logo, portada panorámica tratada como portada,
en todos lados igual.
