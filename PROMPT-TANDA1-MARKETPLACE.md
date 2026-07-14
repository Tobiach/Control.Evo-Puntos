# PROMPT — Tanda 1: Marketplace de locales + mapa (para Fable 5)

## Contexto — leer antes de tocar código

Este repo (`controlevo-puntos`) ya tiene:
- Un **modo demo de venta** (Bienvenida → Cliente → Cajero → Dueño → Cierre) — no lo toques.
- Un **modo "App del cliente"** de un solo negocio (`src/components/appcliente/`) con tabs
  Inicio/Recompensas/Actividad/Perfil — sirve de referencia de estilo y patrones, no lo borres,
  pero en esta tanda vas a **extenderlo para que el punto de entrada sea un marketplace de varios
  locales**, en vez de un solo negocio fijo por rubro.

Reusá `src/lib/club.ts` (helpers de nivel/progreso), las variables de tema en `src/index.css`
(alternadas por `data-rubro`), la fuente 'Fredoka' ya cargada en `index.html`, y el patrón de
tarjetas redondeadas ya establecido. No reescribas lo que ya funciona bien — extendelo.

## Qué es esta tanda (alcance exacto — NO construyas misiones, rachas, ranking social ni
## notificaciones acá, eso son las tandas 2 y 3, ya definidas aparte)

Un **marketplace de locales afiliados**, estilo la pantalla "Locales que te motivan" de la app
argentina Pasito, pero con nombres 100% ficticios (no marcas reales existentes) y con la lógica
de puntos por negocio de Control.Evo en vez de pasos caminados.

## Modelo de datos nuevo

Creá `src/data/negocios.ts` con un tipo `Negocio`:
```
id, nombre (ficticio, con onda real de Palermo — ej. "Café Nardo", "Bar Aguirre", "Almacén
  Guatemala", "Cervecería Soler" — inventá 8-10 nombres así, mezclando 5-6 de rubro gastro y
  3-4 de rubro super, todos ficticios, ninguno debe coincidir con un negocio real existente),
categoria (ej. "Café", "Cervecería", "Almacén", "Rooftop", "Bar de tragos"),
rubro: 'gastro' | 'super',
emoji o ícono representativo,
lat, lng (coordenadas reales dentro del barrio de Palermo, Buenos Aires — está bien usar
  geografía real de Palermo, lo que no puede ser real es el NOMBRE del negocio),
clientesActivos: number (para mostrar "ya lo usan X personas" — usá números creíbles tipo
  40-300, no miles, es un local de barrio, no una cadena),
fechaAlta (fecha en la que se "sumó" a Control.Evo — todas hace 1-4 meses, para que se vea
  como una base ya establecida, no algo recién lanzado),
recompensas: Recompensa[] (2-4 por negocio, con nombre + costo en puntos, coherentes con la
  categoría del negocio)
```

## Relación cliente ↔ negocio (importante, no lo simplifiques al revés)

El cliente activo (mock) tiene una relación de puntos **independiente por cada negocio** —
como en la vida real, tus puntos en el café de la esquina no son los mismos que en el
supermercado. Si el cliente nunca visitó un negocio del marketplace, mostrale "Sumate — todavía
no tenés puntos acá" en vez de 0 puntos sin contexto. Precargá 3-4 negocios donde el cliente
activo YA tiene puntos (para que la demo no arranque vacía) y el resto sin relación todavía.

## Pantallas

**Marketplace (nueva pantalla, reemplaza el punto de entrada de "App del cliente")**
Lista de negocios con: banner de color según su tema (gastro oscuro / super claro), logo/emoji,
nombre, categoría en pill, 2-3 recompensas visibles como pills chiquitas (igual que las capturas
de Pasito), y un badge sutil "Ya lo usan {clientesActivos} personas" o "Hace {X} meses en
Control.Evo" para el efecto de prueba social. Filtros arriba en pills: Todos / Gastronomía /
Supermercado / Cerca tuyo. Buscador simple por nombre.

**"Cerca tuyo" — geolocalización real**
Al tocar el filtro "Cerca tuyo", pedí permiso real de ubicación con
`navigator.geolocation.getCurrentPosition` (manejá el caso de permiso denegado o no soportado
con un mensaje claro, no rompas la app). Con la ubicación real del usuario, calculá distancia
(fórmula de Haversine, no hace falta librería nueva) a cada negocio mock y ordená por cercanía,
mostrando "a X km" en cada tarjeta.

**Vista de un negocio (al tocar una tarjeta)**
Entra a la experiencia que YA existe en `appcliente/` (Inicio/Recompensas/Actividad/Perfil) pero
ahora con los datos de ESE negocio específico del marketplace, no el negocio único fijo por
rubro que había antes. Agregá un botón "← Volver al marketplace" bien visible (no debe sentirse
como un callejón sin salida).

**Mini-mapa (no hace falta un mapa real de Google Maps/Leaflet — no agregues esa dependencia)**
Una vista simple tipo "mapa" con las tarjetas de negocio posicionadas de forma aproximada según
su distancia relativa entre sí (podés simplificarlo a una lista ordenada por distancia con un
ícono de pin y la distancia en km bien visible, no hace falta un mapa interactivo real — el
objetivo es transmitir la idea de "cerca tuyo", no construir un mapa de verdad).

## Requisitos técnicos (iguales al resto del repo)

- TypeScript estricto, sin `any` sin comentario.
- Sin dependencias nuevas de mapas (nada de Leaflet/Mapbox/Google Maps) — la funcionalidad de
  "cerca tuyo" se resuelve con geolocalización nativa + cálculo de distancia propio.
- Mobile-first 375px, animaciones con `motion` en las transiciones (entrar a un negocio, aplicar
  un filtro).
- Todos los botones funcionan de verdad — filtros realmente filtran, buscador realmente busca,
  "Cerca tuyo" realmente pide permiso y calcula distancia real si el usuario lo concede.

## Al terminar

Corré `npm run lint` y `npm run build` vos mismo — 0 errores antes de darte por terminado. Un
solo commit con mensaje `feat: marketplace de locales afiliados + cerca tuyo con geolocalización`.
No hagas push.
