import { supabase } from './supabase';

// Desafíos entre amigos con beneficio REAL: un cliente (retador) reta a otro (retado) en un
// negocio a cumplir una meta concreta y verificable; cuando el retado la cumple —contra las
// `visitas` reales— AMBOS ganan puntos bonus. Todo el cálculo de progreso y el crédito de puntos
// es server-side (migración 0009, funciones SECURITY DEFINER): acá sólo se llaman las RPC y se
// mapea la respuesta para la UI. Null-safe: sin backend, no-op (devuelve null).

/** Puntos bonus que gana CADA parte cuando el desafío se cumple (ver 0009). */
export const PUNTOS_BONUS_DESAFIO = 50;

/** Tipos de meta soportados en esta primera versión (ambos contables contra `visitas` reales). */
export type TipoDesafio = 'visitas' | 'probar_nuevo';

export type EstadoDesafio = 'en-curso' | 'cumplido' | 'vencido';

export interface OpcionMeta {
  tipo: TipoDesafio;
  /** Cantidad objetivo (visitas o productos nuevos a probar). */
  meta: number;
  /** Días de plazo para cumplir. */
  dias: number;
  etiqueta: string;
}

/** Metas ofrecidas en la UI al crear un desafío (el servidor igual acota los rangos). */
export const OPCIONES_META: OpcionMeta[] = [
  { tipo: 'visitas', meta: 3, dias: 7, etiqueta: '3 visitas en 7 días' },
  { tipo: 'visitas', meta: 5, dias: 14, etiqueta: '5 visitas en 14 días' },
  { tipo: 'probar_nuevo', meta: 1, dias: 7, etiqueta: 'Probar el producto nuevo' },
];

export interface DesafioItem {
  id: number;
  /** Nombre de la otra parte (retado si es enviado, retador si es recibido). */
  otroNombre: string;
  tipo: TipoDesafio;
  meta: number;
  progreso: number;
  estado: EstadoDesafio;
  venceAt: string;
  premiado: boolean;
  /** True sólo en la revisión en la que se acreditó el premio (para el confetti). */
  premiadoAhora: boolean;
}

export interface EstadoDesafios {
  bonus: number;
  /** Desafíos que este cliente lanzó (es el retador). */
  enviados: DesafioItem[];
  /** Desafíos que le lanzaron a este cliente (es el retado). */
  recibidos: DesafioItem[];
}

// ── Helpers puros (testeables sin backend ni DOM) ───────────────────

/** Descripción humana de la meta de un desafío. */
export function describirMeta(tipo: TipoDesafio, meta: number): string {
  if (tipo === 'probar_nuevo') {
    return meta === 1 ? 'probar el producto nuevo' : `probar ${meta} productos nuevos`;
  }
  return meta === 1 ? '1 visita' : `${meta} visitas`;
}

/** Unidad del progreso ("2/3 visitas", "0/1 nuevo"). */
export function unidadProgreso(tipo: TipoDesafio): string {
  return tipo === 'probar_nuevo' ? 'nuevo' : 'visitas';
}

/** Estado derivado del desafío a partir de si se premió y de la fecha de vencimiento. */
export function estadoDesafio(premiado: boolean, venceAt: string, ahora: number = Date.now()): EstadoDesafio {
  if (premiado) return 'cumplido';
  if (ahora > new Date(venceAt).getTime()) return 'vencido';
  return 'en-curso';
}

/** Porcentaje de progreso topeado a [0, 100]. */
export function pctProgreso(progreso: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((progreso / meta) * 100)));
}

/** Días enteros que faltan para el vencimiento (0 si ya venció). */
export function diasRestantes(venceAt: string, ahora: number = Date.now()): number {
  const ms = new Date(venceAt).getTime() - ahora;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ── Mapeo de la respuesta cruda del servidor ────────────────────────

interface FilaDesafio {
  id?: number;
  otro_nombre?: string | null;
  tipo?: string;
  meta?: number;
  progreso?: number;
  estado?: string;
  vence_at?: string;
  premiado?: boolean;
  premiado_ahora?: boolean;
}

interface RespuestaRevisar {
  bonus?: number;
  enviados?: FilaDesafio[];
  recibidos?: FilaDesafio[];
}

function mapearItem(fila: FilaDesafio): DesafioItem {
  const tipo: TipoDesafio = fila.tipo === 'probar_nuevo' ? 'probar_nuevo' : 'visitas';
  const estado: EstadoDesafio =
    fila.estado === 'cumplido' || fila.estado === 'vencido' ? fila.estado : 'en-curso';
  return {
    id: fila.id ?? 0,
    otroNombre: fila.otro_nombre ?? 'Amigo',
    tipo,
    meta: fila.meta ?? 1,
    progreso: fila.progreso ?? 0,
    estado,
    venceAt: fila.vence_at ?? new Date().toISOString(),
    premiado: !!fila.premiado,
    premiadoAhora: !!fila.premiado_ahora,
  };
}

// ── RPC (todo el cálculo de premio es server-side) ──────────────────

export type ResultadoCrear =
  | { ok: true }
  | { ok: false; motivo: string };

/** Traduce el motivo de rechazo del servidor a un mensaje humano en español. */
export function mensajeMotivo(motivo: string): string {
  switch (motivo) {
    case 'codigo_inexistente':
      return 'No encontramos a nadie con ese código. Revisalo.';
    case 'auto_desafio':
      return 'No podés desafiarte a vos mismo.';
    case 'no_es_cliente_del_negocio':
      return 'Vos y tu amigo tienen que ser clientes de este local.';
    case 'ya_existe':
      return 'Ya tenés un desafío de ese tipo en curso con esa persona.';
    case 'tipo_invalido':
      return 'Esa meta no está disponible.';
    default:
      return 'No pudimos crear el desafío. Intentá de nuevo.';
  }
}

/**
 * Crea un desafío retando a la persona dueña de `codigoRetado` en el negocio. El servidor valida
 * que ambos sean clientes del local y calcula el vencimiento. Null en demo/sin backend.
 */
export async function crearDesafio(
  codigoRetado: string,
  negocioId: string,
  opcion: OpcionMeta,
): Promise<ResultadoCrear | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('crear_desafio', {
    p_codigo_retado: codigoRetado.trim().toUpperCase(),
    p_negocio_id: negocioId,
    p_tipo: opcion.tipo,
    p_meta: opcion.meta,
    p_dias: opcion.dias,
  });
  if (error) return { ok: false, motivo: 'error_transporte' };
  const d = (data ?? {}) as { creado?: boolean; motivo?: string };
  if (d.creado) return { ok: true };
  return { ok: false, motivo: d.motivo ?? 'desconocido' };
}

/**
 * Revisa (y premia si corresponde) los desafíos del negocio en los que participa el cliente
 * logueado, y devuelve el estado para la UI. La acreditación ocurre server-side; nunca se decide
 * desde React. Null en demo/sin backend.
 */
export async function revisarDesafios(negocioId: string): Promise<EstadoDesafios | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('revisar_desafios', { p_negocio_id: negocioId });
  if (error || !data) return null;
  const d = data as RespuestaRevisar;
  return {
    bonus: d.bonus ?? PUNTOS_BONUS_DESAFIO,
    enviados: (d.enviados ?? []).map(mapearItem),
    recibidos: (d.recibidos ?? []).map(mapearItem),
  };
}
