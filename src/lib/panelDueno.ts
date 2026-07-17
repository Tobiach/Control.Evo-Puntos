import { supabase } from './supabase';
import { COLUMNAS_CARTA, mapearItemCarta, type FilaItemCarta, type ItemCarta } from './carta';
import type { CategoriaRecompensa, HorarioValle, Recompensa, Rubro } from '../data/mockClientes';
import { parseRubro } from '../data/mockClientes';

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
  /** `false` = club pausado: no aparece en el marketplace (la policy pública filtra por `activo`). */
  activo: boolean;
}

export interface MetricasNegocio {
  clientesConRelacion: number;
  puntosAcreditados: number;
}

/** Un cliente del negocio para el mini-CRM del dueño (viene de la RPC `clientes_del_negocio`). */
export interface ClienteDelNegocio {
  clienteId: string;
  nombre: string;
  telefono: string;
  puntos: number;
  /** ISO de la última visita, o `null` si todavía no registró ninguna. */
  ultimaVisitaAt: string | null;
}

export type ResultadoPanel<T> = { ok: true; valor: T } | { ok: false; error: string };

const MS_DIA = 86_400_000;

/**
 * Texto relativo de la última visita para la lista de clientes ("hoy", "hace 1 día",
 * "hace N días", o "sin visitas" si nunca vino). Lógica pura y testeable.
 */
export function textoUltimaVisita(ultimaVisitaAt: string | null, ahora: number): string {
  if (!ultimaVisitaAt) return 'sin visitas';
  const t = new Date(ultimaVisitaAt).getTime();
  if (Number.isNaN(t)) return 'sin visitas';
  const dias = Math.max(0, Math.floor((ahora - t) / MS_DIA));
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'hace 1 día';
  return `hace ${dias} días`;
}

// Forma cruda de las filas de Supabase (el cliente no está tipado con el schema).
// El PIN vive en la tabla aparte `negocio_pin` (ver 0005_seguridad_pin_cajero.sql):
// la policy pública de `negocios` filtra filas, no columnas, así que un PIN dentro de
// esta tabla habría quedado legible por cualquiera con la key pública.
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
  activo: boolean | null;
}

/** Fila cruda que devuelve la RPC `clientes_del_negocio` (ver 0006_crm_clientes_del_negocio.sql). */
interface FilaClienteCrm {
  cliente_id: string;
  nombre: string | null;
  telefono: string | null;
  puntos: number | null;
  ultima_visita_at: string | null;
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

function filaANegocio(fila: FilaNegocio, pinCajero: string | null): DatosNegocioForm {
  return {
    id: fila.id,
    nombre: fila.nombre ?? '',
    categoria: fila.categoria ?? '',
    rubro: parseRubro(fila.rubro),
    emoji: fila.emoji ?? '🏪',
    lat: fila.lat,
    lng: fila.lng,
    horarioValle: fila.horario_valle,
    beneficiosVip: fila.beneficios_vip ?? [],
    pinCajero,
    activo: fila.activo ?? true,
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
    .select('id, nombre, categoria, rubro, emoji, lat, lng, horario_valle, beneficios_vip, activo')
    .eq('dueno_user_id', duenoUserId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, valor: null };

  const filaNegocio = data as FilaNegocio;
  // Consulta aparte: solo el dueño puede leer el PIN de su propio negocio (RLS en `negocio_pin`).
  const { data: filaPin, error: errPin } = await supabase
    .from('negocio_pin')
    .select('pin_cajero')
    .eq('negocio_id', filaNegocio.id)
    .maybeSingle();
  if (errPin) return { ok: false, error: errPin.message };

  const negocio = filaANegocio(filaNegocio, (filaPin as { pin_cajero: string } | null)?.pin_cajero ?? null);
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
    },
    { onConflict: 'id' },
  );
  if (error) return { ok: false, error: error.message };

  // El PIN vive en `negocio_pin` (tabla sin lectura pública, ver 0005_seguridad_pin_cajero.sql).
  if (negocio.pinCajero) {
    const { error: errPin } = await supabase
      .from('negocio_pin')
      .upsert({ negocio_id: id, pin_cajero: negocio.pinCajero }, { onConflict: 'negocio_id' });
    if (errPin) return { ok: false, error: errPin.message };
  } else {
    const { error: errPin } = await supabase.from('negocio_pin').delete().eq('negocio_id', id);
    if (errPin) return { ok: false, error: errPin.message };
  }

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

// ============================================================
// CARTA DIGITAL — CRUD por item (ver 0007_carta_digital.sql)
// A diferencia de las recompensas (reemplazo completo en cada guardado), la carta puede
// tener muchos items, así que se editan/borran de a uno con inserts/updates/deletes puntuales.
// ============================================================

/** Datos de un item que llegan del formulario del panel. `id = null` = item nuevo. */
export interface ItemCartaInput {
  id: number | null;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  fotoUrl: string | null;
  disponible: boolean;
  orden: number;
}

/** Trae todos los items de la carta del negocio (incluye los no disponibles, para el panel). */
export async function cargarCartaDelNegocio(negocioId: string): Promise<ResultadoPanel<ItemCarta[]>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase
    .from('carta_items')
    .select(COLUMNAS_CARTA)
    .eq('negocio_id', negocioId)
    .order('orden', { ascending: true })
    .order('id', { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: (data ?? []).map((f) => mapearItemCarta(f as FilaItemCarta)) };
}

/** Inserta (si `id = null`) o actualiza un item de la carta. Devuelve el item ya guardado. */
export async function guardarItemCarta(
  negocioId: string,
  item: ItemCartaInput,
): Promise<ResultadoPanel<ItemCarta>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const fila = {
    negocio_id: negocioId,
    nombre: item.nombre,
    descripcion: item.descripcion.trim() || null,
    precio: item.precio,
    categoria: item.categoria.trim() || null,
    foto_url: item.fotoUrl?.trim() || null,
    disponible: item.disponible,
    orden: item.orden,
  };

  if (item.id != null) {
    const { data, error } = await supabase
      .from('carta_items')
      .update(fila)
      .eq('id', item.id)
      .select(COLUMNAS_CARTA)
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, valor: mapearItemCarta(data as FilaItemCarta) };
  }

  const { data, error } = await supabase
    .from('carta_items')
    .insert(fila)
    .select(COLUMNAS_CARTA)
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: mapearItemCarta(data as FilaItemCarta) };
}

/** Borra un item de la carta por id. */
export async function borrarItemCarta(id: number): Promise<ResultadoPanel<void>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { error } = await supabase.from('carta_items').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: undefined };
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

/**
 * Lista de clientes del negocio (mini-CRM del dueño): nombre, teléfono, puntos y última
 * visita, ordenados por la más reciente. Pasa por la RPC SECURITY DEFINER
 * `clientes_del_negocio` (0006) porque la RLS de `clientes` (auth.uid() = user_id) impide
 * que el dueño lea esos datos con un SELECT/join directo. Ver la migración para el detalle.
 */
export async function cargarClientesDelNegocio(
  negocioId: string,
): Promise<ResultadoPanel<ClienteDelNegocio[]>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.rpc('clientes_del_negocio', { p_negocio_id: negocioId });
  if (error) return { ok: false, error: error.message };

  const filas = (data ?? []) as FilaClienteCrm[];
  return {
    ok: true,
    valor: filas.map((fila) => ({
      clienteId: fila.cliente_id,
      nombre: fila.nombre ?? 'Cliente',
      telefono: fila.telefono ?? '',
      puntos: fila.puntos ?? 0,
      ultimaVisitaAt: fila.ultima_visita_at,
    })),
  };
}

/**
 * Pausa (`activo = false`) o reactiva (`activo = true`) el negocio. Pausado no aparece en el
 * marketplace: la policy pública de `negocios` ya filtra por `activo = true`, así que alcanza
 * con este UPDATE (cubierto por la policy "El dueño edita solo su negocio").
 */
export async function cambiarEstadoNegocio(
  negocioId: string,
  activo: boolean,
): Promise<ResultadoPanel<void>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { error } = await supabase.from('negocios').update({ activo }).eq('id', negocioId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: undefined };
}
