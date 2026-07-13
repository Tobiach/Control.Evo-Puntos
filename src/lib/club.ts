import {
  DIAS_INACTIVO,
  type Cliente,
  type Nivel,
  type Recompensa,
  type RubroData,
  type Visita,
} from '../data/mockClientes';

const MS_DIA = 86_400_000;

/** Los puntos vencen a los 60 días de la última visita del cliente (mecánica tipo Pasito). */
export const DIAS_VENCIMIENTO = 60;

export const soloDigitos = (valor: string) => valor.replace(/\D/g, '');

export function nivelDe(niveles: Nivel[], puntos: number): Nivel {
  let actual = niveles[0];
  for (const nivel of niveles) {
    if (puntos >= nivel.min) actual = nivel;
  }
  return actual;
}

export function progresoNivel(niveles: Nivel[], puntos: number) {
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

export const puntosPorMonto = (data: RubroData, monto: number) =>
  Math.floor(monto / data.montoPorPunto);

export const formatMonto = (data: RubroData, monto: number) =>
  `${data.monedaPrefijo} ${monto.toLocaleString(data.locale)}`;

export const formatPuntos = (puntos: number) => puntos.toLocaleString('es-AR');

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
