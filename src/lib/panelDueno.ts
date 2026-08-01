import { supabase } from './supabase';
import { COLUMNAS_CARTA, mapearItemCarta, type FilaItemCarta, type ItemCarta } from './carta';
import type {
  CategoriaRecompensa,
  EventoNegocio,
  HorarioValle,
  Promo,
  Recompensa,
  Rubro,
  TipoPromo,
} from '../data/mockClientes';
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
  /** Dirección real (strings vacíos por default para inputs controlados, igual que `nombre`). */
  calle: string;
  altura: string;
  codigoPostal: string;
  lat: number | null;
  lng: number | null;
  horarioValle: HorarioValle | null;
  beneficiosVip: string[];
  /** Puntos desde los que un cliente es VIP acá. `null` = sin configurar (usa el umbral genérico). */
  vipDesdePuntos: number | null;
  /** PIN de 4 dígitos para que el cajero entre a cobrar sin cuenta de Auth. `null` = sin configurar. */
  pinCajero: string | null;
  /** `false` = club pausado: no aparece en el marketplace (la policy pública filtra por `activo`). */
  activo: boolean;
  /** URL ya subida a otro lado (sin upload propio, mismo patrón que `carta_items.foto_url`). */
  logoUrl: string | null;
  /** Imagen de portada/cabecera del negocio. Mismo patrón sin upload que `logoUrl`. */
  portadaUrl: string | null;
}

/** Un cliente del negocio para el CRM del dueño (viene de la RPC `clientes_del_negocio`). */
export interface ClienteDelNegocio {
  clienteId: string;
  nombre: string;
  telefono: string;
  puntos: number;
  /** ISO de la última visita, o `null` si todavía no registró ninguna. */
  ultimaVisitaAt: string | null;
  /** Cantidad real de visitas registradas en este negocio. */
  cantidadVisitas: number;
  /** Suma real de `visitas.monto` en este negocio ("valor estimado" del CRM). */
  valorTotal: number;
  /** Cantidad real de recompensas canjeadas en este negocio (tabla `canjes`, 0017). */
  recompensasUsadas: number;
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
  calle: string | null;
  altura: string | null;
  codigo_postal: string | null;
  lat: number | null;
  lng: number | null;
  horario_valle: HorarioValle | null;
  beneficios_vip: string[] | null;
  vip_desde_puntos: number | null;
  activo: boolean | null;
  logo_url: string | null;
  portada_url: string | null;
}

/** Fila cruda que devuelve la RPC `clientes_del_negocio` (ver 0006 + 0018 que la extiende). */
interface FilaClienteCrm {
  cliente_id: string;
  nombre: string | null;
  telefono: string | null;
  puntos: number | null;
  ultima_visita_at: string | null;
  cantidad_visitas: number | string | null;
  valor_total: number | string | null;
  recompensas_usadas: number | string | null;
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
    calle: fila.calle ?? '',
    altura: fila.altura ?? '',
    codigoPostal: fila.codigo_postal ?? '',
    lat: fila.lat,
    lng: fila.lng,
    horarioValle: fila.horario_valle,
    beneficiosVip: fila.beneficios_vip ?? [],
    vipDesdePuntos: fila.vip_desde_puntos,
    pinCajero,
    activo: fila.activo ?? true,
    logoUrl: fila.logo_url,
    portadaUrl: fila.portada_url,
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
    .select(
      'id, nombre, categoria, rubro, emoji, calle, altura, codigo_postal, lat, lng, horario_valle, beneficios_vip, vip_desde_puntos, activo, logo_url, portada_url',
    )
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
      calle: negocio.calle.trim() || null,
      altura: negocio.altura.trim() || null,
      codigo_postal: negocio.codigoPostal.trim() || null,
      lat: negocio.lat,
      lng: negocio.lng,
      horario_valle: negocio.horarioValle,
      beneficios_vip: negocio.beneficiosVip,
      vip_desde_puntos: negocio.vipDesdePuntos,
      logo_url: negocio.logoUrl?.trim() || null,
      portada_url: negocio.portadaUrl?.trim() || null,
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
      cantidadVisitas: Number(fila.cantidad_visitas ?? 0),
      valorTotal: Number(fila.valor_total ?? 0),
      recompensasUsadas: Number(fila.recompensas_usadas ?? 0),
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

// ============================================================
// PERFIL DEL DUEÑO — datos personales, separados del negocio (ver 0012_perfil_dueno.sql).
// RLS: cada dueño solo lee/escribe su propia fila (auth.uid() = dueno_user_id).
// ============================================================

interface FilaPerfilDueno {
  nombre_persona: string | null;
}

/** Trae el perfil del dueño logueado, o `null` si todavía no guardó ninguno. */
export async function cargarPerfilDueno(
  duenoUserId: string,
): Promise<ResultadoPanel<{ nombrePersona: string } | null>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase
    .from('dueno_perfil')
    .select('nombre_persona')
    .eq('dueno_user_id', duenoUserId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, valor: null };
  return { ok: true, valor: { nombrePersona: (data as FilaPerfilDueno).nombre_persona ?? '' } };
}

/** Guarda (upsert por `dueno_user_id`) el nombre personal del dueño. */
export async function guardarPerfilDueno(
  duenoUserId: string,
  nombrePersona: string,
): Promise<ResultadoPanel<void>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { error } = await supabase.from('dueno_perfil').upsert(
    {
      dueno_user_id: duenoUserId,
      nombre_persona: nombrePersona,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'dueno_user_id' },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: undefined };
}

// ============================================================
// PROMOS — CRUD por item (ver 0016_promos_y_regalos.sql). Antes solo existían en el
// marketplace ficticio; el dueño real las carga acá, mismo patrón que la carta digital.
// ============================================================

export interface PromoInput {
  id: number | null;
  tipo: TipoPromo;
  titulo: string;
  detalle: string;
  activa: boolean;
}

interface FilaPromo {
  id: number;
  tipo: string;
  titulo: string;
  detalle: string | null;
  activa: boolean;
  orden: number | null;
}

const TIPOS_PROMO_VALIDOS: readonly TipoPromo[] = ['2x1', 'horario', 'descuento'];

function filaAPromo(fila: FilaPromo): Promo & { id: number; activa: boolean } {
  const tipo = TIPOS_PROMO_VALIDOS.includes(fila.tipo as TipoPromo) ? (fila.tipo as TipoPromo) : 'descuento';
  return {
    id: fila.id,
    tipo,
    titulo: fila.titulo,
    ...(fila.detalle ? { detalle: fila.detalle } : {}),
    activa: fila.activa,
  };
}

export async function cargarPromosDelNegocio(
  negocioId: string,
): Promise<ResultadoPanel<(Promo & { id: number; activa: boolean })[]>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase
    .from('promos')
    .select('id, tipo, titulo, detalle, activa, orden')
    .eq('negocio_id', negocioId)
    .order('orden', { ascending: true })
    .order('id', { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: (data ?? []).map((f) => filaAPromo(f as FilaPromo)) };
}

export async function guardarPromo(
  negocioId: string,
  promo: PromoInput,
): Promise<ResultadoPanel<Promo & { id: number; activa: boolean }>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const fila = {
    negocio_id: negocioId,
    tipo: promo.tipo,
    titulo: promo.titulo,
    detalle: promo.detalle.trim() || null,
    activa: promo.activa,
  };
  const query =
    promo.id != null
      ? supabase.from('promos').update(fila).eq('id', promo.id)
      : supabase.from('promos').insert(fila);
  const { data, error } = await query.select('id, tipo, titulo, detalle, activa, orden').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: filaAPromo(data as FilaPromo) };
}

export async function borrarPromo(id: number): Promise<ResultadoPanel<void>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { error } = await supabase.from('promos').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: undefined };
}

// ============================================================
// EVENTOS CON FECHA — CRUD por item (tabla `eventos_negocio`, ver 0001_schema.sql). La
// lectura del lado del cliente ya existía; esto habilita que el dueño los cree/edite.
// ============================================================

export interface EventoInput {
  id: number | null;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  recompensaExtra: string;
}

interface FilaEventoDueno {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  recompensa_extra: string;
}

function filaAEventoDueno(fila: FilaEventoDueno): EventoNegocio & { id: number } {
  return {
    id: fila.id,
    nombre: fila.nombre,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    recompensaExtra: fila.recompensa_extra,
  };
}

export async function cargarEventosDelNegocio(
  negocioId: string,
): Promise<ResultadoPanel<(EventoNegocio & { id: number })[]>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase
    .from('eventos_negocio')
    .select('id, nombre, fecha_inicio, fecha_fin, recompensa_extra')
    .eq('negocio_id', negocioId)
    .order('fecha_inicio', { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: (data ?? []).map((f) => filaAEventoDueno(f as FilaEventoDueno)) };
}

export async function guardarEvento(
  negocioId: string,
  evento: EventoInput,
): Promise<ResultadoPanel<EventoNegocio & { id: number }>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const fila = {
    negocio_id: negocioId,
    nombre: evento.nombre,
    fecha_inicio: evento.fechaInicio,
    fecha_fin: evento.fechaFin,
    recompensa_extra: evento.recompensaExtra,
  };
  const query =
    evento.id != null
      ? supabase.from('eventos_negocio').update(fila).eq('id', evento.id)
      : supabase.from('eventos_negocio').insert(fila);
  const { data, error } = await query.select('id, nombre, fecha_inicio, fecha_fin, recompensa_extra').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: filaAEventoDueno(data as FilaEventoDueno) };
}

export async function borrarEvento(id: number): Promise<ResultadoPanel<void>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { error } = await supabase.from('eventos_negocio').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, valor: undefined };
}

// ============================================================
// PANEL OPERATIVO — resumen, copiloto de acciones y las 6 secciones de datos reales
// (ver docs/ARQUITECTURA.md / KICKOFF-PANEL-PRO.md para el porqué de cada una). Todo sale
// de tablas ya existentes; ninguna sección se muestra si no hay dato real que la sostenga.
// ============================================================

const MS_SEMANA = 7 * MS_DIA;

export interface ResumenSemanal {
  clientesActivos: number;
  nuevosEstaSemana: number;
  /** % de clientes con relación que registran 2 o más visitas reales en este negocio. */
  recurrenciaPct: number;
  puntosAcreditadosSemana: number;
  /** Variación real vs. los 7 días anteriores (puede ser negativa). `null` si no hay base de comparación (0 en la semana previa). */
  variacionPuntosPct: number | null;
  consumoRegistradoSemana: number;
}

/** Resumen de "Inicio": clientes, recurrencia real y puntos/consumo de los últimos 7 días. */
export async function cargarResumenSemanal(negocioId: string): Promise<ResultadoPanel<ResumenSemanal>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };

  const { data: relaciones, error: errRel } = await supabase
    .from('relaciones_negocio')
    .select('created_at')
    .eq('negocio_id', negocioId);
  if (errRel) return { ok: false, error: errRel.message };

  const ahora = Date.now();
  const filasRel = (relaciones ?? []) as { created_at: string | null }[];
  const nuevosEstaSemana = filasRel.filter(
    (f) => f.created_at && ahora - new Date(f.created_at).getTime() <= MS_SEMANA,
  ).length;

  const { data: visitasCliente, error: errVc } = await supabase
    .from('visitas')
    .select('cliente_id')
    .eq('negocio_id', negocioId);
  if (errVc) return { ok: false, error: errVc.message };
  const conteoPorCliente = new Map<string, number>();
  for (const fila of (visitasCliente ?? []) as { cliente_id: string }[]) {
    conteoPorCliente.set(fila.cliente_id, (conteoPorCliente.get(fila.cliente_id) ?? 0) + 1);
  }
  const conVarias = [...conteoPorCliente.values()].filter((n) => n >= 2).length;
  const recurrenciaPct = filasRel.length > 0 ? Math.round((conVarias / filasRel.length) * 100) : 0;

  const { data: visitas2Semanas, error: errV } = await supabase
    .from('visitas')
    .select('puntos, monto, created_at')
    .eq('negocio_id', negocioId)
    .gte('created_at', new Date(ahora - 2 * MS_SEMANA).toISOString());
  if (errV) return { ok: false, error: errV.message };

  let puntosEstaSemana = 0;
  let puntosSemanaAnterior = 0;
  let consumoEstaSemana = 0;
  for (const v of (visitas2Semanas ?? []) as { puntos: number | null; monto: number | null; created_at: string }[]) {
    const antiguedad = ahora - new Date(v.created_at).getTime();
    if (antiguedad <= MS_SEMANA) {
      puntosEstaSemana += v.puntos ?? 0;
      consumoEstaSemana += v.monto ?? 0;
    } else if (antiguedad <= 2 * MS_SEMANA) {
      puntosSemanaAnterior += v.puntos ?? 0;
    }
  }

  return {
    ok: true,
    valor: {
      clientesActivos: filasRel.length,
      nuevosEstaSemana,
      recurrenciaPct,
      puntosAcreditadosSemana: puntosEstaSemana,
      variacionPuntosPct:
        puntosSemanaAnterior > 0
          ? Math.round(((puntosEstaSemana - puntosSemanaAnterior) / puntosSemanaAnterior) * 100)
          : null,
      consumoRegistradoSemana: consumoEstaSemana,
    },
  };
}

export type AccionReal =
  | { tipo: 'puntos_por_vencer'; clienteNombre: string; puntos: number; diasRestantes: number }
  | { tipo: 'referido_a_un_paso'; clienteNombre: string; visitasFaltantes: number }
  | { tipo: 'recompensa_sin_canjear'; descripcion: string; diasSinCanjes: number };

interface FilaAccionRpc {
  tipo: string;
  cliente_nombre: string | null;
  puntos: number | null;
  dias_restantes: number | null;
  visitas_faltantes: number | null;
}

/**
 * El copiloto de "Para hacer hoy": puntos por vencer + referidos a un paso (RPC
 * `panel_acciones_reales`, 0018, porque necesita el nombre real del cliente) + recompensas
 * activas hace más de 30 días sin ningún canje (consulta directa, sin nombre de por medio).
 * Se ordena por urgencia real, nunca por una heurística inventada.
 */
export async function cargarAccionesReales(negocioId: string): Promise<ResultadoPanel<AccionReal[]>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };

  const { data: filasRpc, error: errRpc } = await supabase.rpc('panel_acciones_reales', {
    p_negocio_id: negocioId,
  });
  if (errRpc) return { ok: false, error: errRpc.message };

  const acciones: AccionReal[] = [];
  for (const fila of (filasRpc ?? []) as FilaAccionRpc[]) {
    if (fila.tipo === 'puntos_por_vencer' && fila.cliente_nombre) {
      acciones.push({
        tipo: 'puntos_por_vencer',
        clienteNombre: fila.cliente_nombre,
        puntos: fila.puntos ?? 0,
        diasRestantes: fila.dias_restantes ?? 0,
      });
    } else if (fila.tipo === 'referido_a_un_paso' && fila.cliente_nombre) {
      acciones.push({
        tipo: 'referido_a_un_paso',
        clienteNombre: fila.cliente_nombre,
        visitasFaltantes: fila.visitas_faltantes ?? 1,
      });
    }
  }

  const treintaDiasAtras = new Date(Date.now() - 30 * MS_DIA).toISOString();
  const { data: recompensas, error: errRec } = await supabase
    .from('recompensas')
    .select('descripcion, created_at')
    .eq('negocio_id', negocioId)
    .eq('activa', true)
    .lte('created_at', treintaDiasAtras);
  if (errRec) return { ok: false, error: errRec.message };

  const { data: canjesDesc, error: errCan } = await supabase
    .from('canjes')
    .select('descripcion')
    .eq('negocio_id', negocioId);
  if (errCan) return { ok: false, error: errCan.message };
  const conCanje = new Set((canjesDesc ?? []).map((c) => (c as { descripcion: string }).descripcion));

  for (const r of (recompensas ?? []) as { descripcion: string; created_at: string }[]) {
    if (conCanje.has(r.descripcion)) continue;
    const dias = Math.floor((Date.now() - new Date(r.created_at).getTime()) / MS_DIA);
    acciones.push({ tipo: 'recompensa_sin_canjear', descripcion: r.descripcion, diasSinCanjes: dias });
  }

  const urgencia = (a: AccionReal) =>
    a.tipo === 'puntos_por_vencer' ? a.diasRestantes : a.tipo === 'referido_a_un_paso' ? 3 : 10;
  acciones.sort((a, b) => urgencia(a) - urgencia(b));
  return { ok: true, valor: acciones };
}

export interface PuntosSemana {
  etiqueta: string;
  acreditados: number;
  redimidos: number;
}

/** Puntos acreditados (`visitas`) vs. redimidos (`canjes`, 0017) de las últimas 6 semanas. */
export async function cargarPuntosSemanales(negocioId: string): Promise<ResultadoPanel<PuntosSemana[]>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const desde = new Date(Date.now() - 6 * MS_SEMANA).toISOString();

  const [{ data: visitas, error: errV }, { data: canjes, error: errC }] = await Promise.all([
    supabase.from('visitas').select('puntos, created_at').eq('negocio_id', negocioId).gte('created_at', desde),
    supabase.from('canjes').select('pts, created_at').eq('negocio_id', negocioId).gte('created_at', desde),
  ]);
  if (errV) return { ok: false, error: errV.message };
  if (errC) return { ok: false, error: errC.message };

  const semanas: PuntosSemana[] = Array.from({ length: 6 }, (_, i) => ({
    etiqueta: `S${i + 1}`,
    acreditados: 0,
    redimidos: 0,
  }));
  const ahora = Date.now();
  const indiceSemana = (fecha: string) => {
    const antiguedad = ahora - new Date(fecha).getTime();
    const i = 5 - Math.floor(antiguedad / MS_SEMANA);
    return i >= 0 && i <= 5 ? i : null;
  };
  for (const v of (visitas ?? []) as { puntos: number | null; created_at: string }[]) {
    const i = indiceSemana(v.created_at);
    if (i !== null) semanas[i].acreditados += v.puntos ?? 0;
  }
  for (const c of (canjes ?? []) as { pts: number | null; created_at: string }[]) {
    const i = indiceSemana(c.created_at);
    if (i !== null) semanas[i].redimidos += c.pts ?? 0;
  }
  return { ok: true, valor: semanas };
}

export interface RankingRecompensa {
  descripcion: string;
  pts: number;
  canjes: number;
}

/** Ranking real de recompensas por canjes (tabla `canjes`, 0017) — incluye las de 0 canjes. */
export async function cargarRankingRecompensas(negocioId: string): Promise<ResultadoPanel<RankingRecompensa[]>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const [{ data: recompensas, error: errRec }, { data: canjes, error: errCan }] = await Promise.all([
    supabase.from('recompensas').select('descripcion, pts').eq('negocio_id', negocioId).eq('activa', true),
    supabase.from('canjes').select('descripcion').eq('negocio_id', negocioId),
  ]);
  if (errRec) return { ok: false, error: errRec.message };
  if (errCan) return { ok: false, error: errCan.message };

  const conteo = new Map<string, number>();
  for (const c of (canjes ?? []) as { descripcion: string }[]) {
    conteo.set(c.descripcion, (conteo.get(c.descripcion) ?? 0) + 1);
  }
  const ranking = ((recompensas ?? []) as { descripcion: string; pts: number }[]).map((r) => ({
    descripcion: r.descripcion,
    pts: r.pts,
    canjes: conteo.get(r.descripcion) ?? 0,
  }));
  ranking.sort((a, b) => b.canjes - a.canjes);
  return { ok: true, valor: ranking };
}

export interface EfectoHorarioValle {
  promedioDentro: number;
  promedioFueraPorDia: number;
  desde: string;
  hasta: string;
}

/**
 * Efecto real del horario valle: visitas promedio POR FRANJA (cuando cae un día/horario
 * configurado) vs. visitas promedio POR DÍA en el resto del horario — no son la misma unidad
 * de tiempo, por eso el panel las etiqueta distinto en vez de compararlas como si lo fueran.
 */
export async function cargarEfectoHorarioValle(
  negocioId: string,
  horarioValle: HorarioValle,
): Promise<ResultadoPanel<EfectoHorarioValle>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const DIAS_LOOKBACK = 30;
  const desde = new Date(Date.now() - DIAS_LOOKBACK * MS_DIA);
  const { data, error } = await supabase
    .from('visitas')
    .select('created_at')
    .eq('negocio_id', negocioId)
    .gte('created_at', desde.toISOString());
  if (error) return { ok: false, error: error.message };

  const [hDesde] = horarioValle.desde.split(':').map(Number);
  const [hHasta] = horarioValle.hasta.split(':').map(Number);
  let dentro = 0;
  let fuera = 0;
  let apariciones = 0;
  for (let i = 0; i < DIAS_LOOKBACK; i += 1) {
    const dia = new Date(desde.getTime() + i * MS_DIA).getDay();
    if (horarioValle.dias.includes(dia)) apariciones += 1;
  }
  for (const v of (data ?? []) as { created_at: string }[]) {
    const fecha = new Date(v.created_at);
    const esDiaValle = horarioValle.dias.includes(fecha.getDay());
    const hora = fecha.getHours();
    if (esDiaValle && hora >= hDesde && hora < hHasta) dentro += 1;
    else fuera += 1;
  }

  return {
    ok: true,
    valor: {
      promedioDentro: apariciones > 0 ? Math.round(dentro / apariciones) : 0,
      promedioFueraPorDia: Math.round(fuera / DIAS_LOOKBACK),
      desde: horarioValle.desde,
      hasta: horarioValle.hasta,
    },
  };
}

export interface ReferidosFunnel {
  registrados: number;
  convertidos: number;
}

/** Referidos reales: registrados (tabla `referidos`) vs. convertidos (`premiado_at` no nulo). */
export async function cargarReferidosFunnel(negocioId: string): Promise<ResultadoPanel<ReferidosFunnel>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.from('referidos').select('premiado_at').eq('negocio_id', negocioId);
  if (error) return { ok: false, error: error.message };
  const filas = (data ?? []) as { premiado_at: string | null }[];
  return {
    ok: true,
    valor: {
      registrados: filas.length,
      convertidos: filas.filter((f) => f.premiado_at !== null).length,
    },
  };
}

export interface ActividadEvento {
  nombre: string;
  visitasDurante: number;
  promedioNormalPorDia: number;
}

/**
 * Compara el evento más reciente (ya empezado) contra el promedio diario de las 4 semanas
 * previas al evento — para saber si el evento realmente movió la aguja, sin inventar un
 * porcentaje: son dos conteos reales, uno al lado del otro.
 */
export async function cargarActividadEventoReciente(
  negocioId: string,
): Promise<ResultadoPanel<ActividadEvento | null>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data: eventos, error: errEv } = await supabase
    .from('eventos_negocio')
    .select('nombre, fecha_inicio, fecha_fin')
    .eq('negocio_id', negocioId)
    .lte('fecha_inicio', new Date().toISOString().slice(0, 10))
    .order('fecha_inicio', { ascending: false })
    .limit(1);
  if (errEv) return { ok: false, error: errEv.message };
  const evento = (eventos ?? [])[0] as { nombre: string; fecha_inicio: string; fecha_fin: string } | undefined;
  if (!evento) return { ok: true, valor: null };

  const inicio = new Date(evento.fecha_inicio);
  const fin = new Date(evento.fecha_fin);
  const diasEvento = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / MS_DIA) + 1);
  const previoDesde = new Date(inicio.getTime() - 28 * MS_DIA);

  const { data: visitas, error: errV } = await supabase
    .from('visitas')
    .select('created_at')
    .eq('negocio_id', negocioId)
    .gte('created_at', previoDesde.toISOString())
    .lte('created_at', fin.toISOString());
  if (errV) return { ok: false, error: errV.message };

  let durante = 0;
  let antes = 0;
  for (const v of (visitas ?? []) as { created_at: string }[]) {
    const t = new Date(v.created_at).getTime();
    if (t >= inicio.getTime()) durante += 1;
    else antes += 1;
  }

  return {
    ok: true,
    valor: {
      nombre: evento.nombre,
      visitasDurante: durante,
      promedioNormalPorDia: Math.round((antes / 28) * diasEvento),
    },
  };
}

export interface DesafiosPorEstado {
  cumplidos: number;
  enCurso: number;
  fallados: number;
}

/** Desafíos entre amigos (0009) por estado real, derivado de `premiado_at`/`vence_at`. */
export async function cargarDesafiosPorEstado(negocioId: string): Promise<ResultadoPanel<DesafiosPorEstado>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase
    .from('desafios_amigos')
    .select('premiado_at, vence_at')
    .eq('negocio_id', negocioId);
  if (error) return { ok: false, error: error.message };

  const ahora = Date.now();
  const filas = (data ?? []) as { premiado_at: string | null; vence_at: string }[];
  const resultado = { cumplidos: 0, enCurso: 0, fallados: 0 };
  for (const f of filas) {
    if (f.premiado_at) resultado.cumplidos += 1;
    else if (new Date(f.vence_at).getTime() < ahora) resultado.fallados += 1;
    else resultado.enCurso += 1;
  }
  return { ok: true, valor: resultado };
}
