import { supabase } from './supabase';

// Referidos con beneficio REAL (invitá a un amigo), distinto de lo social (regalar puntos
// propios, que sigue siendo demo local en social.ts). Un cliente comparte el link de su club en
// un negocio; cuando el invitado se registra con ese código y visita ESE negocio 4 veces, ambos
// ganan puntos bonus. Todo el cálculo de premio es server-side (migración 0008): acá sólo se
// captura el link, se guarda el pendiente en localStorage (mismo patrón que el vínculo de
// teléfono en auth.ts) y se llaman las RPC SECURITY DEFINER. Null-safe: sin backend, no-op.

/** Query params del link de invitación: `?ref=<codigo>&negocio=<negocioId>`. */
export const PARAM_REF = 'ref';
export const PARAM_NEGOCIO = 'negocio';

/** Puntos bonus que gana CADA parte cuando el invitado completa las visitas (ver 0008). */
export const PUNTOS_BONUS_REFERIDO = 100;
/** Visitas reales del invitado en el negocio necesarias para premiar (ver 0008). */
export const VISITAS_PARA_PREMIO = 4;

const CLAVE_REFERIDO_PENDIENTE = 'celp_referido_pendiente';

export interface ReferidoPendiente {
  codigo: string;
  negocioId: string;
}

export interface EstadoInvitado {
  referidoClienteId: string;
  nombre: string;
  visitasActuales: number;
  premiado: boolean;
}

export interface EstadoReferidos {
  visitasNecesarias: number;
  bonus: number;
  /** Personas que ESTE cliente invitó en el negocio, con su progreso. */
  invitados: EstadoInvitado[];
  /** Si a este cliente lo invitó alguien en el negocio: su propio progreso hacia el premio. */
  comoReferido: { visitasActuales: number; premiado: boolean } | null;
}

// ── Helpers puros (testeables sin backend ni DOM) ───────────────────

/** Extrae el referido pendiente de un query string (`?ref=...&negocio=...`). Null si falta alguno. */
export function leerReferidoDeQuery(search: string): ReferidoPendiente | null {
  const params = new URLSearchParams(search);
  const codigo = params.get(PARAM_REF)?.trim().toUpperCase();
  const negocioId = params.get(PARAM_NEGOCIO)?.trim();
  if (!codigo || !negocioId) return null;
  return { codigo, negocioId };
}

/** Arma el link de invitación con el código propio + el negocio actual. */
export function armarLinkInvitacion(origin: string, codigo: string, negocioId: string): string {
  const url = new URL(origin);
  url.searchParams.set(PARAM_REF, codigo.trim().toUpperCase());
  url.searchParams.set(PARAM_NEGOCIO, negocioId);
  return url.toString();
}

// ── Captura del link + pendiente en localStorage ────────────────────

/**
 * Si la app se abrió con un link de invitación, guarda el pendiente en este dispositivo y limpia
 * los query params de la URL (se procesa recién cuando haya sesión + cliente vinculado). Se llama
 * una vez al montar la app, igual filosofía que la lectura de `?rubro=` en App.tsx.
 */
export function capturarReferidoPendiente(): void {
  if (typeof window === 'undefined') return;
  const pendiente = leerReferidoDeQuery(window.location.search);
  if (!pendiente) return;
  localStorage.setItem(CLAVE_REFERIDO_PENDIENTE, JSON.stringify(pendiente));
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM_REF);
  url.searchParams.delete(PARAM_NEGOCIO);
  window.history.replaceState(null, '', url);
}

/**
 * Procesa el referido pendiente (si hay uno) apenas el invitado tiene sesión activa + cliente
 * vinculado. Idempotente del lado del servidor. Ante un error de transporte deja el pendiente
 * para reintentar en la próxima sesión; si el servidor respondió (aunque rechace el código),
 * lo limpia para no reintentar en loop.
 */
export async function procesarReferidoPendiente(): Promise<void> {
  if (!supabase) return;
  const raw = localStorage.getItem(CLAVE_REFERIDO_PENDIENTE);
  if (!raw) return;
  let pendiente: ReferidoPendiente;
  try {
    pendiente = JSON.parse(raw) as ReferidoPendiente;
  } catch {
    localStorage.removeItem(CLAVE_REFERIDO_PENDIENTE);
    return;
  }
  if (!pendiente.codigo || !pendiente.negocioId) {
    localStorage.removeItem(CLAVE_REFERIDO_PENDIENTE);
    return;
  }
  const { error } = await supabase.rpc('registrar_referido', {
    p_codigo_referente: pendiente.codigo,
    p_negocio_id: pendiente.negocioId,
  });
  if (error) return; // error de transporte/sesión: se reintenta la próxima vez
  localStorage.removeItem(CLAVE_REFERIDO_PENDIENTE);
  // Cubre el caso raro de que el invitado ya tuviera las 4 visitas al registrarse.
  await revisarPremioReferido(pendiente.negocioId);
}

// ── RPC (todo el cálculo de premio es server-side) ──────────────────

/** Código de referido propio (server-side) del cliente logueado. Null en demo/sin sesión. */
export async function obtenerCodigoReferido(): Promise<string | null> {
  if (!supabase) return null;
  const { data: usuario } = await supabase.auth.getUser();
  const uid = usuario.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('clientes')
    .select('codigo_referido')
    .eq('user_id', uid)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { codigo_referido: string | null }).codigo_referido;
}

interface FilaInvitado {
  referido_cliente_id?: string;
  nombre?: string | null;
  visitas_actuales?: number;
  premiado?: boolean;
}

interface RespuestaRevisar {
  visitas_necesarias?: number;
  bonus?: number;
  invitados?: FilaInvitado[];
  como_referido?: { visitas_actuales?: number; premiado?: boolean } | null;
}

/**
 * Revisa (y premia si corresponde) los referidos del negocio en los que participa el cliente
 * logueado, y devuelve el estado para la UI. La acreditación de puntos ocurre server-side; nunca
 * se decide desde React. Null en demo/sin backend.
 */
export async function revisarPremioReferido(negocioId: string): Promise<EstadoReferidos | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('revisar_premio_referido', {
    p_negocio_id: negocioId,
  });
  if (error || !data) return null;
  const d = data as RespuestaRevisar;
  return {
    visitasNecesarias: d.visitas_necesarias ?? VISITAS_PARA_PREMIO,
    bonus: d.bonus ?? PUNTOS_BONUS_REFERIDO,
    invitados: (d.invitados ?? []).map((i) => ({
      referidoClienteId: i.referido_cliente_id ?? '',
      nombre: i.nombre ?? 'Invitado',
      visitasActuales: i.visitas_actuales ?? 0,
      premiado: !!i.premiado,
    })),
    comoReferido: d.como_referido
      ? {
          visitasActuales: d.como_referido.visitas_actuales ?? 0,
          premiado: !!d.como_referido.premiado,
        }
      : null,
  };
}
