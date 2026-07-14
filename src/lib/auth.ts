import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from './supabase';

// Auth real de Control.Evo — SIEMPRE sobre Supabase Auth (el servidor hashea la contraseña).
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

function traducirError(mensaje: string, contexto: 'ingresar' | 'registrar'): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes('invalid login credentials')) return 'Los datos no coinciden. Revisalos e intentá de nuevo.';
  if (texto.includes('already registered') || texto.includes('already exists')) {
    return 'Ya existe una cuenta con esos datos. Probá iniciar sesión.';
  }
  if (texto.includes('email not confirmed')) return 'Todavía no confirmaste tu cuenta. Revisá tu correo.';
  if (texto.includes('rate limit') || texto.includes('too many')) {
    return 'Demasiados intentos. Esperá un momento y probá de nuevo.';
  }
  if (texto.includes('network') || texto.includes('fetch')) {
    return 'No pudimos conectar. Revisá tu internet e intentá de nuevo.';
  }
  return contexto === 'registrar'
    ? 'No pudimos crear la cuenta. Intentá de nuevo.'
    : 'No pudimos iniciar sesión. Intentá de nuevo.';
}

// ── Cliente (socio del club): teléfono + contraseña ──────────────

export async function registrarCliente(telefono: string, password: string): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.auth.signUp({
    phone: normalizarTelefono(telefono),
    password,
  });
  if (error) return { ok: false, error: traducirError(error.message, 'registrar') };
  return { ok: true, session: data.session };
}

export async function ingresarCliente(telefono: string, password: string): Promise<ResultadoAuth> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.auth.signInWithPassword({
    phone: normalizarTelefono(telefono),
    password,
  });
  if (error) return { ok: false, error: traducirError(error.message, 'ingresar') };
  return { ok: true, session: data.session };
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
