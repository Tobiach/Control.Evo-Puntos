import {
  DIAS_INACTIVO,
  type CategoriaRecompensa,
  type Cliente,
  type Nivel,
  type Recompensa,
  type RubroData,
  type Visita,
} from '../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../data/negocios';

const MS_DIA = 86_400_000;

/** Los puntos vencen a los 60 días de la última visita del cliente (mecánica tipo Pasito). */
export const DIAS_VENCIMIENTO = 60;

export const soloDigitos = (valor: string) => valor.replace(/\D/g, '');

/** Genérico en el nombre del nivel: sirve tanto para `Nivel` (por negocio) como para
 *  `NIVELES_XP_GLOBAL` (nombres propios, ej. "Explorador ⭐", fuera de `NombreNivel`). */
export function nivelDe<T extends { nombre: string; min: number }>(niveles: T[], puntos: number): T {
  let actual = niveles[0];
  for (const nivel of niveles) {
    if (puntos >= nivel.min) actual = nivel;
  }
  return actual;
}

/**
 * Niveles a usar para UN negocio: si el dueño configuró un umbral real de VIP
 * (`vipDesdePuntos`), reemplaza la curva genérica de demo por la real de ese local
 * (Nuevo → VIP, sin nivel intermedio inventado). Si no lo configuró, se mantiene el
 * umbral genérico (`nivelesBase`) para no romper negocios demo sin este dato.
 */
export function nivelesDeNegocio(vipDesdePuntos: number | null | undefined, nivelesBase: Nivel[]): Nivel[] {
  if (vipDesdePuntos == null || vipDesdePuntos <= 0) return nivelesBase;
  return [
    { nombre: 'Nuevo', min: 0 },
    { nombre: 'VIP', min: vipDesdePuntos },
  ];
}

export function progresoNivel<T extends { nombre: string; min: number }>(niveles: T[], puntos: number) {
  const actual = nivelDe(niveles, puntos);
  const siguiente = niveles.find((nivel) => nivel.min > puntos) ?? null;
  const pct = siguiente
    ? Math.min(100, Math.round(((puntos - actual.min) / (siguiente.min - actual.min)) * 100))
    : 100;
  return { actual, siguiente, pct };
}

export function proximaRecompensa(recompensas: Recompensa[], puntos: number): Recompensa | null {
  return recompensas.find((recompensa) => recompensa.pts > puntos) ?? null;
}

/** La recompensa más cara que el cliente ya puede pagar, o null si ninguna está a su alcance. */
export function mejorRecompensaDisponible(recompensas: Recompensa[], puntos: number): Recompensa | null {
  const alcanzables = recompensas.filter((recompensa) => recompensa.pts <= puntos);
  if (alcanzables.length === 0) return null;
  return alcanzables.reduce((mejor, actual) => (actual.pts > mejor.pts ? actual : mejor));
}

/**
 * Color semántico de una barra de progreso hacia una recompensa — misma regla en todas
 * las pantallas donde aparece (mapa, Mis Premios): 100% lista = premio (coral), ≥80% casi
 * = acento (dorado), el resto = verde (acumulando).
 */
export function colorBarraProgreso(pct: number): string {
  if (pct >= 100) return 'bg-premio';
  if (pct >= 80) return 'bg-acento';
  return 'bg-verde-ok';
}

export interface RecompensaCercana {
  cliente: Cliente;
  recompensa: Recompensa;
  faltan: number;
}

export function recompensaMasCercana(
  clientes: Cliente[],
  recompensas: Recompensa[],
): RecompensaCercana | null {
  let mejor: RecompensaCercana | null = null;
  for (const cliente of clientes) {
    const recompensa = proximaRecompensa(recompensas, cliente.puntos);
    if (!recompensa) continue;
    const faltan = recompensa.pts - cliente.puntos;
    if (!mejor || faltan < mejor.faltan) mejor = { cliente, recompensa, faltan };
  }
  return mejor;
}

export const esInactivo = (cliente: Cliente) => cliente.ultimaVisitaDias >= DIAS_INACTIVO;

/** Fórmula base de puntos: 1 punto cada `montoPorPunto` de moneda local. */
export const calcularPuntos = (montoPorPunto: number, monto: number) =>
  Math.floor(monto / montoPorPunto);

export const puntosPorMonto = (data: RubroData, monto: number) =>
  calcularPuntos(data.montoPorPunto, monto);

export const formatMonto = (data: RubroData, monto: number) =>
  `${data.monedaPrefijo} ${monto.toLocaleString(data.locale)}`;

export const formatPuntos = (puntos: number) => puntos.toLocaleString('es-AR');

// ── Nivel global cross-negocio (FEATURE NUEVA — no existía en ARQUITECTURA.md antes de
// este pedido) ─────────────────────────────────────────────────────
// Distinto de `nivelDe`/`nivelesDeNegocio` de arriba, que son el nivel POR negocio (los
// puntos que el cliente tiene en ESE local puntual). Este suma los puntos de TODAS las
// relaciones del cliente en el marketplace en un solo "XP" — un sistema adicional, no un
// reemplazo. Los niveles por negocio siguen intactos.
/** Nivel del sistema de XP global — nombres propios, no restringidos a `NombreNivel`. */
export interface NivelXp {
  nombre: string;
  min: number;
}

export const NIVELES_XP_GLOBAL: NivelXp[] = [
  { nombre: 'Nuevo', min: 0 },
  { nombre: 'Explorador ⭐', min: 200 },
  { nombre: 'Habitué 🔥', min: 1000 },
  { nombre: 'Habitué Plus ⚡', min: 3000 },
  { nombre: 'VIP del Barrio 👑', min: 8000 },
];

export function calcularXpTotal(relaciones: Record<string, RelacionNegocio>): number {
  return Object.values(relaciones).reduce((suma, relacion) => suma + relacion.puntos, 0);
}

// ── Perfil: "Tu recorrido" y badges (todo derivado de datos reales, sin thresholds
// inventados) ─────────────────────────────────────────────────────

/** Suma de visitas (compras) reales en todos los negocios donde el cliente tiene relación. */
export function contarVisitasTotales(relaciones: Record<string, RelacionNegocio>): number {
  return Object.values(relaciones).reduce((suma, relacion) => suma + relacion.historial.length, 0);
}

/** Negocios donde el cliente ya tiene relación y son de `rubro` (primario o secundario). */
export function contarNegociosPorRubro(
  negocios: Negocio[],
  relaciones: Record<string, RelacionNegocio>,
  rubro: Negocio['rubro'],
): number {
  return negocios.filter(
    (negocio) =>
      relaciones[negocio.id] && (negocio.rubro === rubro || negocio.rubrosSecundarios?.includes(rubro)),
  ).length;
}

/** El negocio "ancla" del cliente: donde más puntos tiene. Null si no tiene relación en ninguno. */
export function negocioAncla(negocios: Negocio[], relaciones: Record<string, RelacionNegocio>): Negocio | null {
  const conRelacion = negocios.filter((negocio) => relaciones[negocio.id]);
  if (conRelacion.length === 0) return null;
  return conRelacion.reduce((mejor, actual) =>
    relaciones[actual.id].puntos > relaciones[mejor.id].puntos ? actual : mejor,
  );
}

// ── Actividad de UN negocio: timeline fusionada (visitas reales + canjes confirmados
// reales) ──────────────────────────────────────────────────────────
// Sin bonus por racha ni ningún otro evento inventado: la racha hoy es solo un contador
// visual, no acredita puntos de verdad (ver Ola 3).

export type EventoTimeline =
  | { tipo: 'visita'; fechaOrden: number; visita: Visita }
  | { tipo: 'canje'; fechaOrden: number; descripcion: string; pts: number };

/** Cualquier fuente de canjes confirmados que tenga esta forma (evita depender del tipo
 *  nominal `CanjeConfirmado` de panelCliente.ts, que a su vez importa de este módulo). */
export interface CanjeParaTimeline {
  descripcion: string;
  pts: number;
  confirmadoAt: string;
}

/** Fusiona visitas + canjes confirmados de UN negocio en una sola timeline, más reciente
 *  primero. `ahora` inyectado para que sea testeable sin depender del reloj real. */
export function fusionarTimeline(
  historial: Visita[],
  canjes: CanjeParaTimeline[],
  ahora: number,
): EventoTimeline[] {
  const deVisitas: EventoTimeline[] = historial.map((visita) => ({
    tipo: 'visita',
    fechaOrden: ahora - visita.diasAtras * MS_DIA,
    visita,
  }));
  const deCanjes: EventoTimeline[] = canjes
    .filter((canje) => canje.confirmadoAt)
    .map((canje) => ({
      tipo: 'canje',
      fechaOrden: new Date(canje.confirmadoAt).getTime(),
      descripcion: canje.descripcion,
      pts: canje.pts,
    }));
  return [...deVisitas, ...deCanjes].sort((a, b) => b.fechaOrden - a.fechaOrden);
}

// ── Canje verificable (código de mostrador, migración 0021) ──────

/** Código de 6 caracteres + vencimiento que el cliente muestra en el mostrador. */
export interface CanjeIniciado {
  codigo: string;
  expiraAt: string;
}

export type ResultadoCanje = ({ ok: true } & CanjeIniciado) | { ok: false; error: string };

/** MM:SS a partir de milisegundos restantes hasta que vence el código (nunca negativo). */
export function formatCuentaRegresiva(msRestantes: number): string {
  const totalSeg = Math.max(0, Math.ceil(msRestantes / 1000));
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
}

// ── App del cliente ─────────────────────────────────────────────

/** Código de referido determinístico a partir del id del cliente: CLIENTE-XXXX. */
export function codigoReferido(cliente: Cliente): string {
  let hash = 0;
  for (const char of `${cliente.id}-${cliente.nombre}`) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const sufijo = hash.toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `CLIENTE-${sufijo}`;
}

/** Semanas consecutivas (desde la actual hacia atrás) con al menos una visita. */
export function rachaSemanas(visitas: Visita[]): number {
  if (visitas.length === 0) return 0;
  const semanas = new Set(visitas.map((visita) => Math.floor(visita.diasAtras / 7)));
  let racha = 0;
  while (semanas.has(racha)) racha += 1;
  return racha;
}

/**
 * Racha de check-in: la tira más larga de días consecutivos distintos con al menos una visita.
 * A diferencia de la racha semanal, cuenta días seguidos (hook de gamificación diario).
 */
export function rachaDias(visitas: Visita[]): number {
  if (visitas.length === 0) return 0;
  const dias = new Set(visitas.map((visita) => visita.diasAtras));
  let mejor = 0;
  for (const dia of dias) {
    if (dias.has(dia - 1)) continue; // arranca sólo desde el primer día de cada tira
    let largo = 1;
    while (dias.has(dia + largo)) largo += 1;
    if (largo > mejor) mejor = largo;
  }
  return mejor;
}

/** Días y fecha en que vencen los puntos, contando 60 días desde la última visita. */
export function vencimientoPuntos(cliente: Cliente): { dias: number; fecha: Date } {
  const dias = Math.max(0, DIAS_VENCIMIENTO - cliente.ultimaVisitaDias);
  return { dias, fecha: new Date(Date.now() + dias * MS_DIA) };
}

export interface DiaRacha {
  etiqueta: string;
  puntos: number;
  esHoy: boolean;
}

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Puntos ganados en cada uno de los últimos 7 días (para el gráfico de barras). */
export function ultimos7Dias(visitas: Visita[]): DiaRacha[] {
  const dias: DiaRacha[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const fecha = new Date(Date.now() - i * MS_DIA);
    const puntos = visitas
      .filter((visita) => visita.diasAtras === i)
      .reduce((suma, visita) => suma + visita.puntos, 0);
    dias.push({ etiqueta: DIAS_SEMANA[fecha.getDay()], puntos, esHoy: i === 0 });
  }
  return dias;
}

export function fechaDeVisita(diasAtras: number, locale: string): string {
  return new Date(Date.now() - diasAtras * MS_DIA).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
  });
}

/** Fecha corta 'DD/MM/AAAA' a partir de un ISO — string vacío si no es una fecha válida. */
export function formatFechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export interface VisitaCruzada {
  negocio: Negocio;
  visita: Visita;
}

/**
 * Todas las visitas de todos los negocios con relación real, juntas y ordenadas por más
 * reciente primero. Usado tanto en el Home (preview corta) como en Perfil (lista completa) —
 * misma fuente de verdad, mismo dato real, un solo lugar para no duplicar la lógica.
 */
export function historialCruzado(
  negocios: Negocio[],
  relaciones: Record<string, RelacionNegocio>,
  limite = 8,
): VisitaCruzada[] {
  return negocios
    .filter((negocio) => relaciones[negocio.id])
    .flatMap((negocio) => relaciones[negocio.id].historial.map((visita) => ({ negocio, visita })))
    .sort((a, b) => a.visita.diasAtras - b.visita.diasAtras)
    .slice(0, limite);
}

// ── Favoritos ───────────────────────────────────────────────────

/** Categoría que el cliente más consumió en este negocio (según su historial). */
export function categoriaFavorita(historial: Visita[]): CategoriaRecompensa | null {
  const conteo = new Map<CategoriaRecompensa, number>();
  for (const visita of historial) {
    if (!visita.categoria) continue;
    conteo.set(visita.categoria, (conteo.get(visita.categoria) ?? 0) + 1);
  }
  let favorita: CategoriaRecompensa | null = null;
  let maximo = 0;
  for (const [categoria, cantidad] of conteo) {
    if (cantidad > maximo) {
      maximo = cantidad;
      favorita = categoria;
    }
  }
  return favorita;
}

export interface SugerenciaFavorita {
  categoria: CategoriaRecompensa;
  recompensa: Recompensa;
  faltan: number;
  alcanzable: boolean;
}

/**
 * Sugerencia de recompensa de la categoría favorita del cliente: la más cercana a alcanzar
 * (o, si ya puede canjear todas, la más aspiracional de esa categoría).
 */
export function sugerenciaFavorita(
  recompensas: Recompensa[],
  historial: Visita[],
  puntos: number,
): SugerenciaFavorita | null {
  const categoria = categoriaFavorita(historial);
  if (!categoria) return null;
  const deLaCategoria = recompensas.filter((recompensa) => recompensa.categoria === categoria);
  if (deLaCategoria.length === 0) return null;
  const noAlcanzadas = deLaCategoria
    .filter((recompensa) => recompensa.pts > puntos)
    .sort((a, b) => a.pts - b.pts);
  const objetivo =
    noAlcanzadas[0] ?? [...deLaCategoria].sort((a, b) => b.pts - a.pts)[0];
  const faltan = Math.max(0, objetivo.pts - puntos);
  return { categoria, recompensa: objetivo, faltan, alcanzable: faltan === 0 };
}

export function buscarClientes(clientes: Cliente[], consulta: string): Cliente[] {
  const texto = consulta.trim().toLowerCase();
  const digitos = soloDigitos(consulta);
  if (!texto) return clientes;
  return clientes.filter((cliente) => {
    const porNombre = cliente.nombre.toLowerCase().includes(texto);
    const porTelefono = digitos.length > 0 && soloDigitos(cliente.telefono).includes(digitos);
    return porNombre || porTelefono;
  });
}
