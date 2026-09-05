import * as Sentry from '@sentry/react';

// .trim() saca el BOM invisible que quedó pegado en la env var de Vercel (VITE_SENTRY_DSN) al
// cargarla desde Windows — sin esto, Sentry.init() falla en silencio con "Invalid Sentry Dsn"
// y la app queda sin monitoreo de errores sin que nada lo avise.
const SENTRY_DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();

// Null-safe, mismo criterio que src/lib/supabase.ts (PAT-001): sin la env var configurada
// (ej. corriendo local sin .env.local, o un preview de Vercel sin la var cargada), la app
// sigue funcionando igual, solo que sin reportar errores.
export const sentryEnabled = !!SENTRY_DSN;

export function iniciarSentry(): void {
  if (!sentryEnabled) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.PROD ? 'production' : 'development',
    // Trazas de performance al mínimo: el objetivo acá es enterarnos de errores reales
    // antes que el cliente, no monitoreo de performance detallado.
    tracesSampleRate: 0.1,
  });
}
