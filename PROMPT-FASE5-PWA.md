# PROMPT — Fase 5: PWA instalable (para Opus 4.8)

## Alcance exacto — leelo antes de nada

Solo **instalabilidad y cache básico** (ícono en el home del celular, funciona algo offline).
**NO implementes Web Push en background ni VAPID keys ni nada que dependa de un servidor para
disparar notificaciones** — eso quedó explícitamente descartado. Las notificaciones que ya
existen (Tanda 3, `src/lib/notificaciones.ts`) usan el constructor `Notification` directo con
la pestaña abierta y no dependen de esto — no las toques, no las "mejores" agregando push real.

## Qué construir

1. **`public/manifest.json`** — `name`: "Control.Evo — Club de Puntos", `short_name`: "Club de
   Puntos", `start_url`: "/", `display`: "standalone", `background_color` y `theme_color`
   acordes al tema gastro oscuro por defecto (`#0D0D0D` / `#C9973A` — ver `src/index.css`),
   `icons` con al menos 192x192 y 512x512.

2. **Íconos** — no hay logo real todavía. Generá un ícono simple pero prolijo: un SVG con fondo
   redondeado color `--color-acento` (#C9973A) y las iniciales "CE" o un ícono simple (una
   estrella/moneda) en el centro, en `--color-fondo` (#0D0D0D) — usalo como
   `public/icons/icon.svg` y referencialo en el manifest con `"type": "image/svg+xml"` (los
   navegadores modernos lo aceptan; no hace falta generar PNG binario). Dejá un comentario en
   el manifest indicando que esto es un ícono placeholder a reemplazar por el logo real.

3. **`public/service-worker.js`** — cache básico del shell de la app (estrategia simple
   cache-first para los assets estáticos generados por el build), registrado desde
   `src/main.tsx`. Sin lógica de push. Manejá el registro de forma que no rompa el entorno de
   desarrollo (`npm run dev`) — condicionalo a producción si hace falta.

4. **`index.html`** — agregá el link al manifest y las meta tags estándar de PWA (theme-color
   ya existe, agregá `apple-touch-icon` apuntando al ícono).

## Requisitos técnicos

- Sin dependencias nuevas (nada de `vite-plugin-pwa` — hacelo a mano, es simple y así queda
  bajo control total sin magia de build).
- No rompas el modo demo ni ningún flujo ya construido.

## Al terminar

Corré `npm run lint` y `npm run build` vos mismo — 0 errores antes de darte por terminado. Un
solo commit con mensaje `feat: PWA instalable (manifest + service worker basico, sin push)`.
No hagas push.
