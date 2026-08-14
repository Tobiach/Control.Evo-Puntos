import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { iniciarSentry, sentryEnabled } from './lib/sentry';
import './index.css';

// Antes que nada: si hay DSN configurado, que Sentry esté escuchando desde el primer
// render — un error en el montaje inicial también nos tiene que llegar.
iniciarSentry();

// Cada rama es un `lazy()` propio: quien entra por `?carta=` nunca descarga el marketplace,
// el panel del dueño ni el resto de App — y viceversa. Antes las 4 ramas se importaban
// eager acá arriba, así que TODAS terminaban en el mismo bundle sin importar cuál se usaba.
const App = lazy(() => import('./App'));
const CartaPublica = lazy(() => import('./components/carta/CartaPublica'));
const PaginaTerminos = lazy(() => import('./components/legal/PaginaTerminos'));
const PaginaPrivacidad = lazy(() => import('./components/legal/PaginaPrivacidad'));
const LandingPremia = lazy(() => import('./components/landing/LandingPremia'));

const parametros = new URLSearchParams(window.location.search);

// Ruta pública de la carta digital (menú QR): `?carta=<negocioId>`. Se detecta acá, antes
// de montar App, para que funcione sin sesión, sin elegir rubro y sin nada previo. Es un
// query param (no path segment) porque el proyecto no tiene rewrite de SPA en Vercel.
const cartaNegocioId = parametros.get('carta');

// Rutas públicas de Términos y Privacidad: mismo criterio que `?carta=`.
const legal = parametros.get('legal');

// Landing informativa para prospectos, en /landing — sí es un path (no query param) porque
// es el link que se manda para afuera y necesita ser memorable. Requiere el rewrite de SPA
// en vercel.json (agregado junto con esta ruta) para no 404 en producción.
const esLanding = window.location.pathname === '/landing';

// `App` es la única rama que necesita Router (navegación real dentro del marketplace y del
// panel del dueño, con historial de verdad para que el atrás del navegador funcione). Carta
// pública, las páginas legales y la landing son documentos sueltos sin navegación interna —
// no lo necesitan.
const pantalla = cartaNegocioId ? (
  <CartaPublica negocioId={cartaNegocioId} />
) : legal === 'terminos' ? (
  <PaginaTerminos />
) : legal === 'privacidad' ? (
  <PaginaPrivacidad />
) : esLanding ? (
  <LandingPremia />
) : (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

function pantallaDeCarga() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-borde border-t-acento" />
    </div>
  );
}

function pantallaDeError() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-bold">Algo salió mal.</p>
      <p className="text-sm text-texto-muted">
        Ya nos enteramos del error. Recargá la página para seguir.
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {sentryEnabled ? (
      <Sentry.ErrorBoundary fallback={pantallaDeError}>
        <Suspense fallback={pantallaDeCarga()}>{pantalla}</Suspense>
      </Sentry.ErrorBoundary>
    ) : (
      <Suspense fallback={pantallaDeCarga()}>{pantalla}</Suspense>
    )}
  </StrictMode>,
);

// PWA: registrar el service worker solo en produccion para no interferir con `npm run dev`.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      /* registro fallido: la app sigue funcionando sin cache offline */
    });
  });
}
