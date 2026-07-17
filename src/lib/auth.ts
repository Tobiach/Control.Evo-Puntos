import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from './supabase';

// Auth real de SumaPuntos — SIEMPRE sobre Supabase Auth (el servidor hashea la contraseña).
// Nunca se implementa hashing propio en el cliente (el error de btoa() en bar-restaurante-arg
// no se repite). Todo es null-safe: sin env vars (`supabaseEnabled === false`) la app sigue
// corriendo sobre los datos mock y estas funciones devuelven un resultado 'sin-conexion' que
// las pantallas traducen a su modo demo.

export type ResultadoAuth = { ok: true; session: Session | null } | { ok: false; error: string };

/** Normaliza el teléfono a solo dígitos con prefijo internacional para Supabase (formato E.164). */
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  return digitos.startsWith('54') ? `+${digitos}` : `+54${digitos}`;
}

// ── Validaciones (mensajes humanos, en español) ──────────────────

export function validarPassword(password: string): string | null {
  if (password.length < 6) return 'La contraseña necesita al menos 6 caracteres.';
  return null;
}

export function validarTelefono(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '');
  if (digitos.length < 8) return 'Ingresá un número de teléfono válido.';
  return null;
}

export function validarEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Ingresá un email válido.';
  return null;
}

// ── Traducción de errores crudos de Supabase a mensajes humanos ──

function traducirError(
  mensaje: string,
  contexto: 'ingresar' | 'registrar' | 'recuperar' | 'actualizar',
): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes('invalid login credentials')) return 'Los datos no coinciden. Revisalos e intentá de nuevo.';
  if (texto.includes('already registered') || texto.includes('already exists')) {
    return 'Ya existe una cuenta con esos datos. Probá iniciar sesión.';
  }
  if (texto.includes('email not confirmed')) return 'Todavía no confirmaste tu cuenta. Revisá tu correo.';
  if (texto.includes('rate limit') || texto.includes('too many')) {
    return 'Demasiados intentos. Esperá un momento y probá de nuevo.';
  }
  if (texto.includes('should be different') || texto.includes('same as the old')) {
    return 'La nueva contraseña tiene que ser distinta de la anterior.';
  }
  if (texto.includes('auth session missing') || texto.includes('session') || texto.includes('expired')) {
    return 'El link de recuperación expiró o ya se usó. Pedí uno nuevo.';
  }
  if (texto.includes('network') || texto.includes('fetch')) {
    return 'No pudimos conectar. Revisá tu internet e intentá de nuevo.';
  }
  switch (contexto) {
    case 'registrar':
      return 'No pudimos crear la cuenta. Intentá de nuevo.';
    case 'recuperar':
      return 'No pudimos enviar el link. Intentá de nuevo.';
    case 'actualizar':
      return 'No pudimos guardar la contraseña. Intentá de nuevo.';
    default:
      return 'No pudimos iniciar sesión. Intentá de nuevo.';
  }
}

// ── Cliente (socio del club): email + contraseña ─────────────────
// El teléfono sigue siendo el documento único del club (lo usa el cajero sin auth), pero el
// login del cliente final es por email: el proveedor de teléfono de Supabase Auth está
// deshabilitado (requeriría un proveedor SMS de pago tipo Twilio + verificación por OTP).
// Tras el signUp/login, `vincularCliente` asocia esta cuenta a su fila en `clientes` por
// teléfono — reclama la fila si el cajero ya cobró antes a ese número, o crea una nueva.

const CLAVE_PENDIENTE = 'celp_vinculo_pendiente';

export async function registrarCliente(
  email: string,
  password: string,
  telefono: string,
  nombre: string,
): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) return { ok: false, error: traducirError(error.message, 'registrar') };

  // Si Supabase exige confirmar el email, todavía no hay sesión para llamar a la RPC
  // (necesita auth.uid()). Guardamos el teléfono en este dispositivo para vincularlo
  // automáticamente en el primer login posterior a la confirmación.
  const telefonoNormalizado = normalizarTelefono(telefono);
  if (!data.session) {
    localStorage.setItem(CLAVE_PENDIENTE, JSON.stringify({ telefono: telefonoNormalizado, nombre }));
    return { ok: true, session: null };
  }

  const vinculo = await vincularCliente(telefonoNormalizado, nombre);
  if (!vinculo.ok) return vinculo;
  return { ok: true, session: data.session };
}

export async function ingresarCliente(email: string, password: string): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: traducirError(error.message, 'ingresar') };

  // Si quedó un vínculo pendiente de un registro anterior en este mismo dispositivo
  // (esperando confirmación de email), lo completamos ahora que ya hay sesión.
  const pendiente = localStorage.getItem(CLAVE_PENDIENTE);
  if (pendiente) {
    try {
      const { telefono, nombre } = JSON.parse(pendiente) as { telefono: string; nombre: string };
      await vincularCliente(telefono, nombre);
    } finally {
      localStorage.removeItem(CLAVE_PENDIENTE);
    }
  }

  return { ok: true, session: data.session };
}

/** Vincula (o crea) la fila de `clientes` de la cuenta logueada con su teléfono. */
async function vincularCliente(telefono: string, nombre: string): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { error } = await supabase.rpc('vincular_cliente', { p_telefono: telefono, p_nombre: nombre });
  if (error) return { ok: false, error: 'No pudimos vincular tu teléfono. Intentá de nuevo.' };
  return { ok: true, session: null };
}

// ── Dueño de negocio: email + contraseña ─────────────────────────

export async function registrarDueno(email: string, password: string): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) return { ok: false, error: traducirError(error.message, 'registrar') };
  return { ok: true, session: data.session };
}

export async function ingresarDueno(email: string, password: string): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, error: traducirError(error.message, 'ingresar') };
  return { ok: true, session: data.session };
}

// ── Recuperar contraseña (olvidé mi contraseña) ──────────────────
// Estándar del SDK: `resetPasswordForEmail` manda un mail con un link que vuelve a la app
// con una sesión de recuperación activa (Supabase parsea el hash del link solo, gracias a
// `detectSessionInUrl`). El `redirectTo` lleva el query param `?modo=restablecer`, que
// sobrevive al hash que agrega Supabase y `App.tsx` usa para mostrar `RestablecerPassword`.
// Ahí el usuario carga la nueva clave con `actualizarPassword` — no vuelve a pedir el email.

/** Ruta a la que Supabase redirige tras tocar el link del mail (ver `App.tsx`). */
export const RUTA_RESTABLECER = '/?modo=restablecer';

/** True si la URL actual corresponde al flujo de restablecimiento (link de recuperación). */
export function esModoRecuperacion(): boolean {
  if (typeof window === 'undefined') return false;
  const query = new URLSearchParams(window.location.search).get('modo') === 'restablecer';
  const hash = window.location.hash.includes('type=recovery');
  return query || hash;
}

export async function solicitarRecuperacion(email: string): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}${RUTA_RESTABLECER}`,
  });
  if (error) return { ok: false, error: traducirError(error.message, 'recuperar') };
  return { ok: true, session: null };
}

export async function actualizarPassword(nuevaPassword: string): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.auth.updateUser({ password: nuevaPassword });
  if (error) return { ok: false, error: traducirError(error.message, 'actualizar') };
  return { ok: true, session: data.user ? await obtenerSesion() : null };
}

// ── Manejo de sesión (SDK estándar, sin persistencia casera) ─────

export async function obtenerSesion(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Suscribe a cambios de sesión y devuelve la función para desuscribirse. */
export function suscribirseASesion(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_evento, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function cerrarSesion(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export { supabaseEnabled };
