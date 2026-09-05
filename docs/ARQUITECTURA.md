# Arquitectura

Este documento explica CÓMO está armada la app hoy, para que alguien nuevo (en otra PC, o un
colaborador nuevo) pueda orientarse sin tener que leer todo `src/` de punta a punta.

## Los dos "modos" de la app

Todo entra por `src/App.tsx`, que decide uno de dos modos según la URL:

- **`?club` en la URL → `modo: 'app'`** — entrada real de un cliente final (o de alguien que
  recibe el link para conocer Premia.ar). Salta directo a la portada de marca, sin ver nunca
  el panel interno de ventas.
- **Sin `?club` → `modo: 'demo'`** — pantalla interna ("Elegí tu rubro" / "Demo de venta" vs
  "App del cliente") que usa el equipo de ventas para mostrarle el sistema a un prospecto,
  simulando cliente/cajero/dueño de un rubro elegido.

`App.tsx` es una máquina de estados simple (`Pantalla`): `bienvenida → onboarding-premin →
portada-cliente → auth-cliente → app` (marketplace) es el camino de un cliente real. El resto
de las pantallas (`cliente`, `cajero`, `dueno`, `cierre`) son el recorrido de demo de venta.

## Onboarding (primera vez) vs portada (siempre)

- `OnboardingPremin` (3 pantallas con la mascota Premín) se muestra **una sola vez por
  dispositivo** — gateado por `localStorage` (`src/lib/onboarding.ts`). Un cliente que ya lo
  vio va directo al login en visitas futuras.
- `PortadaCliente` (2 pantallas de marca) se muestra **siempre** después del onboarding, antes
  del login — es la promesa de marca, no una explicación de producto.

## Invitado (guest mode)

`src/lib/invitado.ts` define un `Cliente` sintético (`CLIENTE_INVITADO`) que permite navegar
TODO el marketplace sin cuenta real. Un invitado ve los mismos negocios/datos mock que
cualquier cliente demo, pero no puede acumular puntos reales ni persistir nada — el CTA
"Crear mi cuenta" lo manda a `auth-cliente` sin perder el rubro elegido.

## Mock data vs Supabase real

Dos cosas están desacopladas y conviene no confundirlas:

1. **`supabaseEnabled`** (`src/lib/auth.ts`) — `true` solo si `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` están configuradas. Si es `false`, el login de cliente usa un
   selector de socios mock (`SelectorDemo` en `LoginCliente.tsx`) en vez de email/contraseña.
2. **`usarReal`** (`MarketplaceApp.tsx`) — `supabaseEnabled && !!sesion`. Solo cuando un
   cliente REAL está autenticado se cargan negocios/relaciones desde Supabase
   (`lib/panelCliente.ts`, `cargarAppCliente`, filtrando `es_muestra = false`). Un invitado o
   un cliente demo siempre navega sobre el array mock `NEGOCIOS` (`src/data/negocios.ts`),
   sin importar si Supabase está configurado.

`es_muestra` en la tabla `negocios` de Supabase separa negocios de **demo de venta privada**
(un prospecto viendo su propio local antes de decidir) de negocios **reales del marketplace**
público — solo los segundos aparecen para clientes reales.

## Marketplace (cliente final) vs negocio único (demo de venta)

- **Marketplace** (`components/appcliente/`): la experiencia real de un cliente — `Marketplace.tsx`
  (Home), `TabMapa.tsx` (Explorar), `TabMisLocales.tsx` (Mis premios), `TabPerfilMarketplace.tsx`
  (Perfil), navegación con `MarketplaceShell.tsx`. Cruza datos de TODOS los negocios donde el
  cliente tiene relación.
- **Negocio único** (`PasoCliente.tsx`, `TabInicio.tsx`, `TabActividad.tsx`, `TabPerfil.tsx`,
  etc.): la vista de UN negocio puntual — puntos, nivel, racha, ruleta, recompensas. Vive
  "dentro" del marketplace (se abre al tocar un negocio) y también es la pantalla que ve un
  prospecto en el demo de venta clásico.

No duplicar lógica entre ambos: si un cálculo (ej. cruzar historial de todos los negocios) hace
falta en los dos lados, extraerlo a `lib/` (ver `historialCruzado` en `lib/club.ts`, usado
tanto por el preview del Home como por la vista completa en Perfil).

## Nivel global (XP cross-comercio) — capa nueva, aditiva

Distinto del nivel POR NEGOCIO (`nivelDe`/`nivelesDeNegocio` en `lib/club.ts`, los puntos que
el cliente tiene en ESE local puntual, que sigue existiendo igual): el XP global suma los
puntos de TODOS los negocios donde el cliente tiene relación en un solo número. No es un
sistema de puntos aparte ni una columna nueva en Supabase — es una agregación que se calcula
en el cliente a partir de datos que ya existen.

- **Cálculo**: `calcularXpTotal(relaciones)` en `lib/club.ts` — `Object.values(relaciones)`
  sumando `.puntos` de cada uno. Nada se guarda; se recalcula cada vez que cambian las
  relaciones del cliente.
- **Niveles**: `NIVELES_XP_GLOBAL` en `lib/club.ts` — 5 niveles con nombre propio, fijos para
  todos los rubros (no configurables por negocio, a diferencia de `vipDesdePuntos`): Nuevo (0)
  → Explorador ⭐ (200) → Habitué 🔥 (1000) → Habitué Plus ⚡ (3000) → VIP del Barrio 👑 (8000).
- **Dónde se muestra**: un solo componente, `CardNivelXp.tsx`, reusado sin variación en 3
  lugares — `TabMisLocales.tsx` (Mis Premios), `TabPerfilMarketplace.tsx` (Perfil del
  marketplace) y `TabPerfil.tsx` (Perfil dentro de un negocio, vía el `xpTotal` que ya calcula
  `MarketplaceApp.tsx`) — siempre el mismo número cross-comercio, nunca el de un solo local.
  Premín aparece en la tarjeta celebrando el nivel.
- **Para verlo cambiar de verdad** hace falta un cliente con puntos en más de un negocio — con
  uno solo, el XP global coincide siempre con el nivel de ese local y la capa nueva pasa
  desapercibida.

## Paneles de dueño y cajero

`PasoDueno`/`PasoCajero` (demo) y sus equivalentes reales en `components/dueno/` y
`components/cajero/` — gestión del negocio (CRM, promos, ranking) y acreditación de puntos en
el mostrador, respectivamente. Comparten el mismo Supabase que el cliente, con sus propias
tablas de autenticación (`auth-dueno`, `auth-cajero`).

## Dónde vive cada tipo de dato

| Dato | Dónde |
|---|---|
| Negocios (mock) | `src/data/negocios.ts` — array `NEGOCIOS` + `RELACIONES_INICIALES` |
| Clientes demo por rubro | `src/data/mockClientes.ts` |
| Lógica de puntos/niveles/rachas | `src/lib/club.ts`, `src/lib/misiones.ts` |
| Promos y su iconografía | `src/lib/promos.ts` |
| Sistema de diseño (colores/tipografía) | `src/index.css` — ver [DISENO.md](DISENO.md) |
| Esquema real de Supabase | no versionado en este repo — se aplica a mano en el SQL Editor (ver `docs/specs-historicos/` para el contexto de cada tabla) |
