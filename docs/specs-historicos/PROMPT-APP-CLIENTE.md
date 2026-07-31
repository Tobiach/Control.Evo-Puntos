# PROMPT — Modo "App del Cliente" (estilo Pasito, adaptado a un solo negocio)

## Contexto — leer antes de tocar código

Este repo (`controlevo-puntos`) ya tiene un flujo funcionando: Bienvenida → Paso Cliente → Paso
Cajero → Paso Dueño → Cierre, en `src/App.tsx` + `src/components/`. Ese flujo es un **modo demo
de venta** (un dueño de bar/súper lo toca en el pitch para entender el sistema) y **debe seguir
existiendo tal cual está** — no lo borres, no lo reescribas, no cambies su comportamiento.

Tu tarea es agregar un **segundo modo**, nuevo: la **app real que usaría el cliente final** del
bar/supermercado en su celular, día a día. Está inspirada en la app argentina "Pasito" (premia
caminar con puntos canjeables en comercios) pero **adaptada a un solo negocio, no a un
marketplace de varios locales** — acá el "logro" que genera puntos es consumir en ESE bar/súper,
no caminar.

Reusá lo que ya existe: `src/data/mockClientes.ts` (clientes, recompensas, negocios por rubro),
`src/lib/club.ts` (helpers de nivel/progreso), las variables de tema en `src/index.css`
(`--color-fondo`, `--color-acento`, etc., alternadas por `data-rubro`). No dupliques esa data —
extendela si te falta un campo, no la reescribas desde cero.

## Selector de modo

En la pantalla de Bienvenida (`src/components/Bienvenida.tsx`), además del selector de rubro que
ya existe, agregá un selector de modo: **"Modo demo de venta"** (el flujo actual) vs **"App del
cliente"** (lo nuevo). Al elegir "App del cliente" se entra directo a una experiencia con tab bar
inferior — nada de pasos 1/2/3 con flechita "Siguiente", eso es solo del modo demo.

## Las 4 pantallas de la app del cliente (tab bar inferior: Inicio / Recompensas / Actividad / Perfil)

**Inicio** — header con el nombre del negocio del rubro elegido (no "Control.Evo" visible, el
consumidor ve la marca del bar/súper). Debajo, una pill persistente con puntos actuales + racha
(🔥 semanas seguidas con al menos una visita — calculá esto a partir de un historial de visitas
mock que vas a crear, no lo inventes por pantalla). Barra de progreso hacia el próximo nivel
(reusar `club.ts`). Botón grande "Ver mis recompensas" que navega al tab Recompensas.

**Recompensas** — catálogo de TODAS las recompensas de ese negocio (ya existen ~5 por rubro en
`mockClientes.ts`, podés sumar 2-3 más si el catálogo se ve pobre) como tarjetas con: nombre,
costo en puntos, filtros por categoría en pills arriba (ej. Bebidas / Comida / Descuentos —
inventá la categoría de cada recompensa existente, es metadata nueva). Cada tarjeta marca
"Ya podés canjear" (si el cliente activo tiene puntos suficientes) o "Te faltan X pts" — y el
botón "Canjear" debe funcionar de verdad: descuenta los puntos del cliente en memoria y muestra
una confirmación (no hace falta persistencia real, sí que el estado cambie y se refleje en Inicio).

**Actividad** — anillo de progreso hacia el próximo nivel (no "pasos", es "puntos hacia [nivel]"),
historial de visitas mock (fecha, monto gastado, puntos ganados esa visita — 6-8 entradas),
gráfico de racha semanal (barras, últimos 7 días, con esas mismas visitas mock).

**Perfil** — sección Cuenta (nombre, teléfono del cliente activo), sección **"Invitá un amigo"**
con un código de referido mock (ej. `CLIENTE-XXXX` generado del id del cliente) y el texto
"vos y tu amigo ganan 50 pts cada uno" — con un botón que simule compartir (podés usar la Web
Share API con fallback a copiar al portapapeles, no hace falta que funcione en todos los
navegadores, con que no rompa alcanza). Sección Permisos con un toggle **"Aparecer en el ranking
de clientes frecuentes de este local"** — al activarlo, mostrar debajo una lista mock de 3-4
clientes rankeados por puntos (incluido el cliente activo en su posición real dentro del mock).

## Vencimiento de puntos (mecánica nueva, tomada de Pasito)

Agregá a los datos mock de cada cliente una fecha de vencimiento de sus puntos (60 días desde su
última visita, calculado, no hardcodeado por cliente). Mostrala como aviso breve en Inicio si
vencen en menos de 15 días (ej. "150 pts vencen en 8 días") — sutil, no un banner agresivo.

## Identidad visual — qué copiar de Pasito y qué NO

**Copiar (son patrones de UX, no marca):** tipografía de título bold y redondeada (agregá
la fuente 'Fredoka' de Google Fonts en `index.html`, usarla solo en títulos/números grandes,
'Inter' se mantiene en el resto), tarjetas y botones muy redondeados (`rounded-3xl` o similar),
la pill de puntos+racha siempre visible arriba, emojis funcionales con moderación (🔥 para racha,
🎁 para recompensas).

**NO copiar:** la paleta verde/lima de Pasito. Usá las paletas ya definidas en `src/index.css`
por rubro (gastro: fondo oscuro `--color-fondo`/acento dorado `--color-acento`; súper: fondo
claro `--color-fondo` con `data-rubro='super'`/acento rojo). Si necesitás una variable de color
nueva que no exista, agregala al `@theme` de ambos rubros, no hardcodees un hex suelto en un
componente.

## Requisitos técnicos (iguales al resto del repo)

- TypeScript estricto, sin `any` sin comentario.
- Sin dependencias nuevas salvo que sea imprescindible (justificalo si agregás alguna).
- Mobile-first 375px.
- Animaciones con `motion` (ya instalado) para transiciones entre tabs y al canjear una
  recompensa — nada brusco.
- Todos los botones tienen que funcionar de verdad (canjear resta puntos, navegar entre tabs
  cambia la vista, compartir referido no debe tirar error aunque el navegador no soporte
  Web Share API).

## Al terminar

Corré `npm run lint` y `npm run build` vos mismo — 0 errores antes de darte por terminado. Un
solo commit con mensaje `feat: modo app del cliente estilo Pasito (Inicio/Recompensas/Actividad/Perfil)`.
No hagas push.
