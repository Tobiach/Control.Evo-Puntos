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
import type { PremioRuleta } from './ruleta';
import type { ResultadoCanje } from './club';

// Capa de datos de la APP DEL CLIENTE (socio del club logueado por email). Espeja el estilo
// de panelDueno.ts: null-safe (sin backend → { ok:false, error:'sin-conexion' }, la app corre
// sobre los datos mock), tipos `Fila*` para las respuestas crudas de Supabase y `ResultadoPanel`.
// El canje pasa por las RPC SECURITY DEFINER `iniciar_canje`/`confirmar_canje` (migración 0021,
// código de mostrador con vencimiento), que validan y descuentan los puntos del lado del
// servidor. El resto (puntos por negocio, historial de visitas, marketplace) son SELECT reales
// acotados por RLS al cliente/negocios activos.

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

/** Un premio ya canjeado y confirmado por el cajero (migración 0021) — para "Premios que ya
 *  conseguiste" en Perfil. Distinto de "Mis premios": eso es progreso/disponible, esto es
 *  historial real de lo que ya se entregó. */
export interface CanjeConfirmado {
  negocioId: string;
  descripcion: string;
  confirmadoAt: string;
}

export interface DatosAppCliente {
  cliente: ClienteApp;
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  canjesConfirmados: CanjeConfirmado[];
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
  vip_desde_puntos: number | null;
  logo_url: string | null;
  portada_url: string | null;
  created_at: string | null;
}

interface FilaPremioRuleta {
  id: number;
  negocio_id: string;
  label: string;
  emoji: string | null;
  peso: number | null;
  bueno: boolean | null;
  orden: number | null;
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

interface FilaCanjeConfirmado {
  negocio_id: string;
  descripcion: string;
  confirmado_at: string | null;
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

function filaAPremioRuleta(fila: FilaPremioRuleta): PremioRuleta {
  return {
    id: String(fila.id),
    label: fila.label,
    emoji: fila.emoji ?? '🎁',
    peso: fila.peso ?? 10,
    bueno: fila.bueno ?? false,
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
  premiosRuleta: PremioRuleta[] = [],
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
    vipDesdePuntos: fila.vip_desde_puntos,
    ...(fila.logo_url ? { logoUrl: fila.logo_url } : {}),
    ...(fila.portada_url ? { portadaUrl: fila.portada_url } : {}),
    ...(premiosRuleta.length > 0 ? { premiosRuleta } : {}),
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
  filasPremio: FilaPremioRuleta[] = [],
): Negocio[] {
  const recompensasPorNegocio = agruparPorNegocio(filasRecompensa);
  const eventosPorNegocio = agruparPorNegocio(filasEvento);
  const premiosPorNegocio = agruparPorNegocio(filasPremio);
  return filasNegocio.map((negocio) =>
    filaANegocioMarket(
      negocio,
      (recompensasPorNegocio.get(negocio.id) ?? [])
        .map(filaARecompensaMarket)
        .sort((a, b) => a.pts - b.pts),
      (eventosPorNegocio.get(negocio.id) ?? []).map(filaAEvento),
      (premiosPorNegocio.get(negocio.id) ?? [])
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map(filaAPremioRuleta),
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

  // Best-effort: devuelve los puntos de cualquier canje propio que haya vencido sin que el
  // cajero llegara a confirmarlo (migración 0021). Si falla, seguimos cargando igual — no es
  // el camino crítico, y el cajero también recupera esos puntos si intenta confirmar un
  // código ya vencido.
  await supabase.rpc('expirar_mis_canjes');

  const [negociosRes, recompensasRes, eventosRes, premiosRes, relacionesRes, visitasRes, canjesRes] =
    await Promise.all([
      supabase
        .from('negocios')
        .select(
          'id, nombre, categoria, rubro, emoji, lat, lng, clientes_activos, horario_valle, beneficios_vip, vip_desde_puntos, logo_url, portada_url, created_at',
        )
        // `es_muestra`: negocios de preview de venta para un prospecto puntual (ver 0014).
        // No aparecen en el marketplace de un cliente real, aunque sigan activos para
        // quien entra por el link directo `?carta=<id>`.
        .eq('activo', true)
        .eq('es_muestra', false),
      supabase.from('recompensas').select('negocio_id, pts, descripcion, categoria, costo_dinero').eq('activa', true),
      supabase.from('eventos_negocio').select('negocio_id, nombre, fecha_inicio, fecha_fin, recompensa_extra'),
      supabase.from('premios_ruleta').select('id, negocio_id, label, emoji, peso, bueno, orden').eq('activo', true),
      supabase.from('relaciones_negocio').select('negocio_id, puntos, ultima_visita_at').eq('cliente_id', clienteId),
      supabase
        .from('visitas')
        .select('negocio_id, monto, puntos, categoria, es_nuevo, created_at')
        .eq('cliente_id', clienteId),
      // "Premios que ya conseguiste" en Perfil: solo canjes YA confirmados por el cajero
      // (migración 0021) — un código pendiente/expirado no cuenta como premio conseguido.
      supabase
        .from('canjes')
        .select('negocio_id, descripcion, confirmado_at')
        .eq('cliente_id', clienteId)
        .eq('estado', 'confirmado')
        .order('confirmado_at', { ascending: false }),
    ]);

  const primerError =
    negociosRes.error ??
    recompensasRes.error ??
    eventosRes.error ??
    premiosRes.error ??
    relacionesRes.error ??
    visitasRes.error ??
    canjesRes.error;
  if (primerError) return { ok: false, error: primerError.message };

  const ahora = Date.now();
  const negocios = construirNegocios(
    (negociosRes.data ?? []) as FilaNegocioMarket[],
    (recompensasRes.data ?? []) as FilaRecompensaMarket[],
    (eventosRes.data ?? []) as FilaEvento[],
    (premiosRes.data ?? []) as FilaPremioRuleta[],
  );
  const relaciones = construirRelaciones(
    (relacionesRes.data ?? []) as FilaRelacion[],
    (visitasRes.data ?? []) as FilaVisita[],
    ahora,
  );
  const canjesConfirmados = ((canjesRes.data ?? []) as FilaCanjeConfirmado[]).map((fila) => ({
    negocioId: fila.negocio_id,
    descripcion: fila.descripcion,
    confirmadoAt: fila.confirmado_at ?? '',
  }));

  return {
    ok: true,
    valor: {
      cliente: { id: clienteId, nombre: cli.nombre ?? '', telefono: cli.telefono ?? '' },
      negocios,
      relaciones,
      canjesConfirmados,
    },
  };
}

const ERRORES_CANJE: Record<string, string> = {
  recompensa_inexistente: 'Esa recompensa ya no está disponible.',
  sin_relacion: 'Todavía no tenés puntos en este negocio.',
  puntos_insuficientes: 'No tenés puntos suficientes para este premio.',
  cliente_no_vinculado: 'Tu cuenta no está vinculada a ningún cliente.',
  no_se_pudo_generar_codigo: 'No pudimos generar el código. Intentá de nuevo.',
};

/**
 * Inicia un canje verificable (migración 0021): descuenta `pts` de la relación del cliente
 * del lado del servidor (RPC `iniciar_canje`, SECURITY DEFINER) y devuelve un código de 6
 * caracteres con vencimiento a 10 minutos, que el cliente muestra en el mostrador y el
 * cajero confirma con `confirmarCanje` (panelCajero.ts).
 */
export async function iniciarCanje(negocioId: string, pts: number): Promise<ResultadoCanje> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.rpc('iniciar_canje', {
    p_negocio_id: negocioId,
    p_pts: pts,
  });
  if (error) {
    return { ok: false, error: ERRORES_CANJE[error.message] ?? 'No pudimos iniciar el canje. Intentá de nuevo.' };
  }
  const fila = (data?.[0] ?? null) as { codigo: string; expira_at: string } | null;
  if (!fila) return { ok: false, error: 'No pudimos iniciar el canje. Intentá de nuevo.' };
  return { ok: true, codigo: fila.codigo, expiraAt: fila.expira_at };
}

/**
 * Le pide al servidor que devuelva los puntos de cualquier canje propio vencido sin
 * confirmar (RPC `expirar_mis_canjes`, scoped a `auth.uid()`). Fire-and-forget: la
 * suscripción realtime de `relaciones_negocio` ya wireada en MarketplaceApp refleja el
 * reintegro sin lógica adicional acá.
 */
export async function expirarMisCanjes(): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('expirar_mis_canjes');
}

const ERRORES_REGALO: Record<string, string> = {
  destino_no_existe: 'No encontramos a nadie con ese teléfono en Premia.ar.',
  destino_invalido: 'No podés regalarte puntos a vos mismo.',
  sin_relacion_origen: 'Todavía no tenés puntos en este negocio.',
  puntos_insuficientes: 'No tenés suficientes puntos para regalar esa cantidad.',
  destino_no_es_cliente_de_este_local: 'Esa persona todavía no es cliente de este negocio.',
};

/** Regala puntos a otro cliente REAL, acotado al mismo negocio (ver 0016_promos_y_regalos.sql). */
export async function regalarPuntosReal(
  negocioId: string,
  telefonoDestino: string,
  pts: number,
): Promise<ResultadoPanel<{ puntosRestantes: number }>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.rpc('regalar_puntos', {
    p_negocio_id: negocioId,
    p_telefono_destino: telefonoDestino,
    p_pts: pts,
  });
  if (error) {
    return { ok: false, error: ERRORES_REGALO[error.message] ?? 'No pudimos regalar los puntos.' };
  }
  const fila = (data ?? {}) as { puntos_restantes?: number };
  return { ok: true, valor: { puntosRestantes: fila.puntos_restantes ?? 0 } };
}
