import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import CartaPublica from './components/carta/CartaPublica';
import { iniciarSentry, sentryEnabled } from './lib/sentry';
import './index.css';

// Antes que nada: si hay DSN configurado, que Sentry esté escuchando desde el primer
// render — un error en el montaje inicial también nos tiene que llegar.
iniciarSentry();

// Ruta pública de la carta digital (menú QR): `?carta=<negocioId>`. Se detecta acá, antes
// de montar App, para que funcione sin sesión, sin elegir rubro y sin nada previo. Es un
// query param (no path segment) porque el proyecto no tiene rewrite de SPA en Vercel.
const cartaNegocioId = new URLSearchParams(window.location.search).get('carta');
const pantalla = cartaNegocioId ? <CartaPublica negocioId={cartaNegocioId} /> : <App />;

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
      <Sentry.ErrorBoundary fallback={pantallaDeError}>{pantalla}</Sentry.ErrorBoundary>
    ) : (
      pantalla
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
