/* Service Worker — Control.Evo Club de Puntos
 * Cache basico del shell (cache-first para assets estaticos).
 * Sin logica de push / VAPID: solo instalabilidad y offline basico.
 */

const CACHE = 'controlevo-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET del mismo origen; el resto pasa directo a la red.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Navegaciones (HTML): red primero, cae al shell cacheado si no hay conexion.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r || Response.error())),
    );
    return;
  }

  // Assets estaticos: cache-first, con guardado en segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
