import { supabase } from './supabase';
import type {
  CategoriaRecompensa,
  EventoNegocio,
  HorarioValle,
  Recompensa,
  Rubro,
  Visita,
} from '../data/mockClientes';
import { parseRubro } from '../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../data/negocios';

// Capa de datos de la APP DEL CLIENTE (socio del club logueado por email). Espeja el estilo
// de panelDueno.ts: null-safe (sin backend → { ok:false, error:'sin-conexion' }, la app corre
// sobre los datos mock), tipos `Fila*` para las respuestas crudas de Supabase y `ResultadoPanel`.
// El canje pasa por la RPC SECURITY DEFINER `canjear_recompensa` (migración 0004), que valida y
// descuenta los puntos del lado del servidor. El resto (puntos por negocio, historial de visitas,
// marketplace) son SELECT reales acotados por RLS al cliente/negocios activos.

export type ResultadoPanel<T> = { ok: true; valor: T } | { ok: false; error: string };

const MS_DIA = 86_400_000;

/** Coordenadas por defecto (centro de Palermo) para negocios reales sin lat/lng cargada. */
const LAT_DEFECTO = -34.5855;
const LNG_DEFECTO = -58.428;

/** Datos del cliente logueado que necesita la app para mostrar/identificar. */
export interface ClienteApp {
  id: string;
  nombre: string;
  telefono: string;
}

export interface DatosAppCliente {
  cliente: ClienteApp;
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
}

// ── Formas crudas de las filas de Supabase (el cliente no está tipado con el schema) ──

interface FilaCliente {
  id: string;
  nombre: string | null;
  telefono: string | null;
}

interface FilaNegocioMarket {
  id: string;
  nombre: string | null;
  categoria: string | null;
  rubro: string | null;
  emoji: string | null;
  lat: number | null;
  lng: number | null;
  clientes_activos: number | null;
  horario_valle: HorarioValle | null;
  beneficios_vip: string[] | null;
  created_at: string | null;
}

interface FilaRecompensaMarket {
  negocio_id: string;
  pts: number;
  descripcion: string;
  categoria: string;
  costo_dinero: number | null;
}

interface FilaEvento {
  negocio_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  recompensa_extra: string;
}

interface FilaRelacion {
  negocio_id: string;
  puntos: number | null;
  ultima_visita_at: string | null;
}

interface FilaVisita {
  negocio_id: string;
  monto: number | null;
  puntos: number | null;
  categoria: string | null;
  es_nuevo: boolean | null;
  created_at: string | null;
}

const CATEGORIAS_VALIDAS: readonly CategoriaRecompensa[] = ['Bebidas', 'Comida', 'Descuentos', 'Regalos'];

function normalizarCategoria(valor: string | null): CategoriaRecompensa | undefined {
  if (valor && CATEGORIAS_VALIDAS.includes(valor as CategoriaRecompensa)) {
    return valor as CategoriaRecompensa;
  }
  return undefined;
}

// ── Mappers puros (testeables sin backend) ──────────────────────────

/** Días enteros transcurridos entre `iso` y `ahora` (0 si es futuro o inválido). */
export function diasDesde(iso: string | null, ahora: number): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((ahora - t) / MS_DIA));
}

export function filaAVisita(fila: FilaVisita, ahora: number): Visita {
  const categoria = normalizarCategoria(fila.categoria);
  return {
    diasAtras: diasDesde(fila.created_at, ahora),
    monto: fila.monto ?? 0,
    puntos: fila.puntos ?? 0,
    ...(fila.es_nuevo ? { nuevo: true } : {}),
    ...(categoria ? { categoria } : {}),
  };
}

export function filaARecompensaMarket(fila: FilaRecompensaMarket): Recompensa {
  return {
    pts: fila.pts,
    descripcion: fila.descripcion,
    categoria: normalizarCategoria(fila.categoria) ?? 'Regalos',
    ...(fila.costo_dinero != null ? { costoDinero: fila.costo_dinero } : {}),
  };
}

function filaAEvento(fila: FilaEvento): EventoNegocio {
  return {
    nombre: fila.nombre,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    recompensaExtra: fila.recompensa_extra,
  };
}

/**
 * Arma un `Negocio` del marketplace a partir de su fila + las recompensas/eventos ya agrupados.
 * Negocios reales pueden no tener lat/lng cargada: se usa el centro de Palermo por defecto para
 * que el filtro "Cerca tuyo" no rompa.
 */
export function filaANegocioMarket(
  fila: FilaNegocioMarket,
  recompensas: Recompensa[],
  eventos: EventoNegocio[],
): Negocio {
  const rubro: Rubro = parseRubro(fila.rubro);
  return {
    id: fila.id,
    nombre: fila.nombre ?? '',
    categoria: fila.categoria ?? '',
    rubro,
    emoji: fila.emoji ?? '🏪',
    lat: fila.lat ?? LAT_DEFECTO,
    lng: fila.lng ?? LNG_DEFECTO,
    clientesActivos: fila.clientes_activos ?? 0,
    fechaAlta: fila.created_at ? fila.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    recompensas,
    ...(eventos.length > 0 ? { eventos } : {}),
    ...(fila.horario_valle ? { horarioValle: fila.horario_valle } : {}),
    ...(fila.beneficios_vip && fila.beneficios_vip.length > 0
      ? { beneficiosVip: fila.beneficios_vip }
      : {}),
  };
}

/** Agrupa filas por su `negocio_id`. */
function agruparPorNegocio<T extends { negocio_id: string }>(filas: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const fila of filas) {
    const lista = mapa.get(fila.negocio_id);
    if (lista) lista.push(fila);
    else mapa.set(fila.negocio_id, [fila]);
  }
  return mapa;
}

/** Construye el `Record<negocioId, RelacionNegocio>` a partir de relaciones + visitas reales. */
export function construirRelaciones(
  filasRel: FilaRelacion[],
  filasVisita: FilaVisita[],
  ahora: number,
): Record<string, RelacionNegocio> {
  const visitasPorNegocio = agruparPorNegocio(filasVisita);
  const relaciones: Record<string, RelacionNegocio> = {};
  for (const rel of filasRel) {
    const historial = (visitasPorNegocio.get(rel.negocio_id) ?? [])
      .map((v) => filaAVisita(v, ahora))
      .sort((a, b) => a.diasAtras - b.diasAtras);
    const ultimaVisitaDias = rel.ultima_visita_at
      ? diasDesde(rel.ultima_visita_at, ahora)
      : (historial[0]?.diasAtras ?? 0);
    relaciones[rel.negocio_id] = {
      puntos: rel.puntos ?? 0,
      ultimaVisitaDias,
      historial,
    };
  }
  return relaciones;
}

export function construirNegocios(
  filasNegocio: FilaNegocioMarket[],
  filasRecompensa: FilaRecompensaMarket[],
  filasEvento: FilaEvento[],
): Negocio[] {
  const recompensasPorNegocio = agruparPorNegocio(filasRecompensa);
  const eventosPorNegocio = agruparPorNegocio(filasEvento);
  return filasNegocio.map((negocio) =>
    filaANegocioMarket(
      negocio,
      (recompensasPorNegocio.get(negocio.id) ?? [])
        .map(filaARecompensaMarket)
        .sort((a, b) => a.pts - b.pts),
      (eventosPorNegocio.get(negocio.id) ?? []).map(filaAEvento),
    ),
  );
}

// ── Cargas reales contra Supabase ───────────────────────────────────

/**
 * Trae todo lo que la app del cliente necesita para arrancar sobre datos reales:
 * su fila de `clientes`, el marketplace de negocios activos (con recompensas/eventos) y sus
 * relaciones de puntos + historial de visitas por negocio. Null-safe.
 */
export async function cargarAppCliente(userId: string): Promise<ResultadoPanel<DatosAppCliente>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };

  const { data: filaCliente, error: errCliente } = await supabase
    .from('clientes')
    .select('id, nombre, telefono')
    .eq('user_id', userId)
    .maybeSingle();
  if (errCliente) return { ok: false, error: errCliente.message };
  if (!filaCliente) return { ok: false, error: 'cliente-no-vinculado' };
  const cli = filaCliente as FilaCliente;
  const clienteId = cli.id;

  const [negociosRes, recompensasRes, eventosRes, relacionesRes, visitasRes] = await Promise.all([
    supabase
      .from('negocios')
      .select('id, nombre, categoria, rubro, emoji, lat, lng, clientes_activos, horario_valle, beneficios_vip, created_at')
      .eq('activo', true),
    supabase.from('recompensas').select('negocio_id, pts, descripcion, categoria, costo_dinero').eq('activa', true),
    supabase.from('eventos_negocio').select('negocio_id, nombre, fecha_inicio, fecha_fin, recompensa_extra'),
    supabase.from('relaciones_negocio').select('negocio_id, puntos, ultima_visita_at').eq('cliente_id', clienteId),
    supabase
      .from('visitas')
      .select('negocio_id, monto, puntos, categoria, es_nuevo, created_at')
      .eq('cliente_id', clienteId),
  ]);

  const primerError =
    negociosRes.error ?? recompensasRes.error ?? eventosRes.error ?? relacionesRes.error ?? visitasRes.error;
  if (primerError) return { ok: false, error: primerError.message };

  const ahora = Date.now();
  const negocios = construirNegocios(
    (negociosRes.data ?? []) as FilaNegocioMarket[],
    (recompensasRes.data ?? []) as FilaRecompensaMarket[],
    (eventosRes.data ?? []) as FilaEvento[],
  );
  const relaciones = construirRelaciones(
    (relacionesRes.data ?? []) as FilaRelacion[],
    (visitasRes.data ?? []) as FilaVisita[],
    ahora,
  );

  return {
    ok: true,
    valor: {
      cliente: { id: clienteId, nombre: cli.nombre ?? '', telefono: cli.telefono ?? '' },
      negocios,
      relaciones,
    },
  };
}

/**
 * Canjea una recompensa: descuenta `pts` de la relación del cliente con el negocio, del lado del
 * servidor (RPC `canjear_recompensa`, SECURITY DEFINER). Devuelve el saldo restante real.
 */
export async function canjearRecompensa(
  negocioId: string,
  pts: number,
): Promise<ResultadoPanel<{ puntosRestantes: number }>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.rpc('canjear_recompensa', {
    p_negocio_id: negocioId,
    p_pts: pts,
  });
  if (error) return { ok: false, error: error.message };
  const fila = (data ?? {}) as { puntos_restantes?: number };
  return { ok: true, valor: { puntosRestantes: fila.puntos_restantes ?? 0 } };
}
