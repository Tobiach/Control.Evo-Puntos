import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import CartaPublica from './components/carta/CartaPublica';
import './index.css';

// Ruta pública de la carta digital (menú QR): `?carta=<negocioId>`. Se detecta acá, antes
// de montar App, para que funcione sin sesión, sin elegir rubro y sin nada previo. Es un
// query param (no path segment) porque el proyecto no tiene rewrite de SPA en Vercel.
const cartaNegocioId = new URLSearchParams(window.location.search).get('carta');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {cartaNegocioId ? <CartaPublica negocioId={cartaNegocioId} /> : <App />}
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
