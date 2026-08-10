import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import CartaPublica from './components/carta/CartaPublica';
import PaginaLegal from './components/legal/PaginaLegal';
import { iniciarSentry, sentryEnabled } from './lib/sentry';
import terminos from '../docs/TERMINOS.md?raw';
import privacidad from '../docs/PRIVACIDAD.md?raw';
import './index.css';

// Antes que nada: si hay DSN configurado, que Sentry esté escuchando desde el primer
// render — un error en el montaje inicial también nos tiene que llegar.
iniciarSentry();

const parametros = new URLSearchParams(window.location.search);

// Ruta pública de la carta digital (menú QR): `?carta=<negocioId>`. Se detecta acá, antes
// de montar App, para que funcione sin sesión, sin elegir rubro y sin nada previo. Es un
// query param (no path segment) porque el proyecto no tiene rewrite de SPA en Vercel.
const cartaNegocioId = parametros.get('carta');

// Rutas públicas de Términos y Privacidad: mismo criterio que `?carta=` — `?raw` importa el
// .md tal cual (única fuente real, docs/*.md), así el texto legal nunca queda duplicado y
// desincronizado entre el repo y lo que ve un usuario real.
const legal = parametros.get('legal');

const pantalla = cartaNegocioId ? (
  <CartaPublica negocioId={cartaNegocioId} />
) : legal === 'terminos' ? (
  <PaginaLegal contenido={terminos} />
) : legal === 'privacidad' ? (
  <PaginaLegal contenido={privacidad} />
) : (
  <App />
);

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
