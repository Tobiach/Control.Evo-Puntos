import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { obtenerSesion, suscribirseASesion } from '../lib/auth';

/**
 * Estado de la sesión de Supabase, con el manejo estándar del SDK
 * (`getSession()` + `onAuthStateChange`). Null-safe: sin backend conectado
 * la sesión es siempre `null` y `cargando` termina de inmediato.
 */
export function useSesion(): { sesion: Session | null; cargando: boolean } {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    obtenerSesion().then((actual) => {
      if (!activo) return;
      setSesion(actual);
      setCargando(false);
    });
    const desuscribir = suscribirseASesion((actual) => {
      if (activo) setSesion(actual);
    });
    return () => {
      activo = false;
      desuscribir();
    };
  }, []);

  return { sesion, cargando };
}
