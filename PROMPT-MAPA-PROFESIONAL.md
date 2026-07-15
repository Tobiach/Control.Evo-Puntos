# Mapa profesional en "Cerca tuyo"

## Contexto

`src/components/appcliente/Marketplace.tsx` tiene un `MiniMapa` que es una aproximación
100% CSS (posiciona pines con un grid, sin mapa real de fondo) — decisión explícita de
una fase anterior para no sumar dependencias. **Esa decisión se revierte ahora**: el
usuario pidió explícitamente un mapa real y profesional.

## Qué hacer

1. Agregar dependencias `leaflet` + `react-leaflet` (versión compatible con React 19 —
   verificar antes de instalar; si `react-leaflet` no soporta React 19 todavía, usar
   `leaflet` a secas con un wrapper propio en vez de forzar una versión rota).
2. Reemplazar el componente `MiniMapa` (dentro de `Marketplace.tsx`, o extraído a su
   propio archivo `src/components/appcliente/MapaNegocios.tsx` — preferible extraerlo)
   por un mapa real:
   - Tiles gratuitos sin API key (ej. CartoDB Voyager/Positron para el tema claro de
     supermercado, CartoDB Dark Matter para el tema oscuro de gastronomía — elegir el
     set de tiles según `document.documentElement.dataset.rubro` o el rubro del negocio
     predominante en la lista visible).
   - Un marcador por negocio en su lat/lng real (`negocio.lat`, `negocio.lng`), con un
     ícono/pin que use el emoji del negocio y el color de acento de Control.Evo (dorado
     `#D4A64A` o el acento del tema activo — revisar `src/index.css` para las CSS vars
     disponibles).
   - Un marcador distinto (con otro color, ej. el acento teal `#0EA5A4`) para la
     ubicación del usuario, cuando `coords` esté disponible.
   - Al hacer click/tap en un pin de negocio: abrir un popup con nombre, categoría,
     distancia formateada (reusar `formatDistancia` de `src/lib/geo.ts`) y un botón que
     llame a `onAbrir(negocio)` (la prop ya existente).
   - Centrado y zoom inicial que encuadre todos los pines visibles + la ubicación del
     usuario (usar `L.latLngBounds` + `fitBounds`, no hardcodear un zoom fijo).
   - Mantener el mismo mensaje de contexto que ya existe abajo del mapa ("Mapa
     aproximado de Palermo — tocá un pin para entrar al local" / distancia al barrio).
3. El mapa debe integrarse en el flujo Vite existente sin romper el build: revisar si
   Leaflet necesita CSS propio (`leaflet/dist/leaflet.css`) y importarlo correctamente
   (Vite lo soporta como import de CSS normal).
4. Mismo comportamiento de entrada/salida que el `MiniMapa` actual (aparece solo cuando
   `filtro === 'cerca'` y hay `coords`), mismo contenedor con `border-radius`/`overflow:
   hidden` consistente con el resto de las tarjetas (`rounded-3xl border border-borde`).

## Qué NO hacer

- No tocar `TarjetaNegocio`, los filtros, la búsqueda ni la lógica de geolocalización
  (`pedirUbicacion`) — están bien y no son parte de esta tarea.
- No usar Google Maps (requiere API key + billing) — la idea es un resultado igual de
  profesional pero gratis y sin configuración externa.
- No tocar `src/data/negocios.ts`, `TabInicio.tsx`, ni ningún archivo fuera de
  `Marketplace.tsx`/el nuevo `MapaNegocios.tsx`/`package.json`.

## Checklist antes de terminar

- `npm run lint` → 0 errores
- `npm run build` → sin warnings críticos nuevos (el warning de chunk >500kB ya existe,
  no es nuevo, no hace falta resolverlo acá)
- `npm run test` → todos los tests existentes siguen pasando
- Mencioná en el mensaje del commit qué versión de `leaflet`/`react-leaflet` quedó
  instalada
