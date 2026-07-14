import { supabase } from './supabase';
import type { CategoriaRecompensa, HorarioValle, Recompensa, Rubro } from '../data/mockClientes';

// Capa de datos del panel del dueño. Todo null-safe: sin backend conectado
// (`supabase === null`) estas funciones devuelven { ok:false, error:'sin-conexion' }
// y el panel corre en modo "vista previa" (memoria de React, sin persistencia).

/** Datos del negocio que el dueño carga/edita en el onboarding. */
export interface DatosNegocioForm {
  /** Slug (PK en Supabase). `null` mientras el negocio no se guardó nunca. */
  id: string | null;
  nombre: string;
  categoria: string;
  rubro: Rubro;
  emoji: string;
  lat: number | null;
  lng: number | null;
  horarioValle: HorarioValle | null;
  beneficiosVip: string[];
  /** PIN de 4 dígitos para que el cajero entre a cobrar sin cuenta de Auth. `null` = sin configurar. */
  pinCajero: string | null;
}

export interface MetricasNegocio {
  clientesConRelacion: number;
  puntosAcreditados: number;
}

export type ResultadoPanel<T> = { ok: true; valor: T } | { ok: false; error: string };

// Forma cruda de las filas de Supabase (el cliente no está tipado con el schema).
interface FilaNegocio {
  id: string;
  nombre: string | null;
  categoria: string | null;
  rubro: string | null;
  emoji: string | null;
  lat: number | null;
  lng: number | null;
  horario_valle: HorarioValle | null;
  beneficios_vip: string[] | null;
  pin_cajero: string | null;
}

interface FilaRecompensa {
  pts: number;
  descripcion: string;
  categoria: string;
  costo_dinero: number | null;
}

/** Slug legible + sufijo corto para no colisionar en la PK (`cafe-nardo-a3f9k`). */
export function generarSlug(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const sufijo = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${sufijo}` : `negocio-${sufijo}`;
}

function filaANegocio(fila: FilaNegocio): DatosNegocioForm {
  return {
    id: fila.id,
    nombre: fila.nombre ?? '',
    categoria: fila.categoria ?? '',
    rubro: fila.rubro === 'super' ? 'super' : 'gastro',
    emoji: fila.emoji ?? '🏪',
    lat: fila.lat,
    lng: fila.lng,
    horarioValle: fila.horario_valle,
    beneficiosVip: fila.beneficios_vip ?? [],
    pinCajero: fila.pin_cajero,
  };
}

const CATEGORIAS_VALIDAS: readonly CategoriaRecompensa[] = ['Bebidas', 'Comida', 'Descuentos', 'Regalos'];

function filaARecompensa(fila: FilaRecompensa): Recompensa {
  const categoria = CATEGORIAS_VALIDAS.includes(fila.categoria as CategoriaRecompensa)
    ? (fila.categoria as CategoriaRecompensa)
    : 'Regalos';
  return {
    pts: fila.pts,
    descripcion: fila.descripcion,
    categoria,
    ...(fila.costo_dinero != null ? { costoDinero: fila.costo_dinero } : {}),
  };
}

/** Trae el negocio del dueño logueado (o `null` si todavía no cargó ninguno) + sus recompensas. */
export async function cargarNegocioDelDueno(
  duenoUserId: string,
): Promise<ResultadoPanel<{ negocio: DatosNegocioForm; recompensas: Recompensa[] } | null>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase
    .from('negocios')
    .select('id, nombre, categoria, rubro, emoji, lat, lng, horario_valle, beneficios_vip, pin_cajero')
    .eq('dueno_user_id', duenoUserId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, valor: null };

  const negocio = filaANegocio(data as FilaNegocio);
  const { data: recs, error: errRecs } = await supabase
    .from('recompensas')
    .select('pts, descripcion, categoria, costo_dinero')
    .eq('negocio_id', negocio.id)
    .eq('activa', true)
    .order('pts', { ascending: true });
  if (errRecs) return { ok: false, error: errRecs.message };

  const recompensas = (recs ?? []).map((r) => filaARecompensa(r as FilaRecompensa));
  return { ok: true, valor: { negocio, recompensas } };
}

/**
 * Guarda (upsert) el negocio del dueño y reemplaza sus recompensas por la lista actual.
 * Devuelve el `id` (slug) definitivo para que el panel lo conserve entre guardados.
 */
export async function guardarNegocioYRecompensas(
  duenoUserId: string,
  negocio: DatosNegocioForm,
  recompensas: Recompensa[],
): Promise<ResultadoPanel<{ id: string }>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const id = negocio.id ?? generarSlug(negocio.nombre);

  const { error } = await supabase.from('negocios').upsert(
    {
      id,
      dueno_user_id: duenoUserId,
      nombre: negocio.nombre,
      categoria: negocio.categoria,
      rubro: negocio.rubro,
      emoji: negocio.emoji,
      lat: negocio.lat,
      lng: negocio.lng,
      horario_valle: negocio.horarioValle,
      beneficios_vip: negocio.beneficiosVip,
      pin_cajero: negocio.pinCajero,
    },
    { onConflict: 'id' },
  );
  if (error) return { ok: false, error: error.message };

  // Reemplazo completo: la lista de recompensas es chica y así queda idempotente.
  const { error: errDel } = await supabase.from('recompensas').delete().eq('negocio_id', id);
  if (errDel) return { ok: false, error: errDel.message };

  if (recompensas.length > 0) {
    const filas = recompensas.map((r) => ({
      negocio_id: id,
      pts: r.pts,
      descripcion: r.descripcion,
      categoria: r.categoria,
      costo_dinero: r.costoDinero ?? null,
    }));
    const { error: errIns } = await supabase.from('recompensas').insert(filas);
    if (errIns) return { ok: false, error: errIns.message };
  }

  return { ok: true, valor: { id } };
}

/** Métricas reales del negocio: clientes con relación y puntos acreditados. */
export async function cargarMetricas(negocioId: string): Promise<ResultadoPanel<MetricasNegocio>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase
    .from('relaciones_negocio')
    .select('puntos')
    .eq('negocio_id', negocioId);
  if (error) return { ok: false, error: error.message };

  const filas = (data ?? []) as { puntos: number | null }[];
  return {
    ok: true,
    valor: {
      clientesConRelacion: filas.length,
      puntosAcreditados: filas.reduce((total, fila) => total + (fila.puntos ?? 0), 0),
    },
  };
}
