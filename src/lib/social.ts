import type { Visita } from '../data/mockClientes';

/** Hash determinístico simple para generar datos mock estables por negocio/amigo. */
function hash(texto: string): number {
  let acumulado = 0;
  for (const caracter of texto) {
    acumulado = (acumulado * 31 + caracter.charCodeAt(0)) >>> 0;
  }
  return acumulado;
}

// ── Amigos mock ─────────────────────────────────────────────────

export interface AmigoMock {
  id: string;
  nombre: string;
  emoji: string;
}

/** Grupo de amigos ficticios con los que el cliente comparte el club en cada local. */
export const AMIGOS_MOCK: AmigoMock[] = [
  { id: 'am-juan', nombre: 'Juan P.', emoji: '🧉' },
  { id: 'am-sofi', nombre: 'Sofi R.', emoji: '🎧' },
  { id: 'am-nico', nombre: 'Nico D.', emoji: '⚽' },
];

/** Puntos que un amigo sumó esta semana en ESTE negocio (mock estable por negocio+amigo). */
export function puntosSemanaAmigo(amigo: AmigoMock, negocioId: string): number {
  return 30 + (hash(`${negocioId}:${amigo.id}`) % 170);
}

export interface PuestoGrupo {
  id: string;
  nombre: string;
  emoji: string;
  puntos: number;
  esYo: boolean;
}

/** Visitas del cliente dentro de la semana (para su posición en el grupo). */
export function puntosSemanaCliente(historial: Visita[]): number {
  return historial
    .filter((visita) => visita.diasAtras <= 7)
    .reduce((suma, visita) => suma + visita.puntos, 0);
}

/**
 * Ranking del grupo de amigos en la semana dentro de ESE negocio: el cliente + sus amigos
 * mock, ordenados por puntos ganados en los últimos 7 días.
 */
export function rankingGrupo(
  negocioId: string,
  historial: Visita[],
  miNombre: string,
): PuestoGrupo[] {
  const yo: PuestoGrupo = {
    id: 'yo',
    nombre: miNombre.split(' ')[0],
    emoji: '⭐',
    puntos: puntosSemanaCliente(historial),
    esYo: true,
  };
  const amigos: PuestoGrupo[] = AMIGOS_MOCK.map((amigo) => ({
    id: amigo.id,
    nombre: amigo.nombre,
    emoji: amigo.emoji,
    puntos: puntosSemanaAmigo(amigo, negocioId),
    esYo: false,
  }));
  return [yo, ...amigos].sort((a, b) => b.puntos - a.puntos);
}

// ── Desafío entre amigos ────────────────────────────────────────

export type EstadoDesafio = 'en-curso' | 'cumplido' | 'fallado';

export interface Desafio {
  retador: string;
  emoji: string;
  descripcion: string;
  objetivo: number;
  progreso: number;
  diasRestantes: number;
  estado: EstadoDesafio;
}

/**
 * Desafío mock que un amigo le lanzó al cliente en este negocio: visitar N veces esta semana.
 * El progreso sale de las visitas reales de los últimos 7 días.
 */
export function desafioSemanal(negocioId: string, historial: Visita[]): Desafio {
  const retador = AMIGOS_MOCK[hash(negocioId) % AMIGOS_MOCK.length];
  const objetivo = 3;
  const visitas = historial.filter((visita) => visita.diasAtras <= 7).length;
  const progreso = Math.min(objetivo, visitas);
  const diasRestantes = 2;
  const estado: EstadoDesafio =
    progreso >= objetivo ? 'cumplido' : diasRestantes <= 0 ? 'fallado' : 'en-curso';
  return {
    retador: retador.nombre,
    emoji: retador.emoji,
    descripcion: `${retador.nombre} te desafió a visitar ${objetivo} veces esta semana`,
    objetivo,
    progreso,
    diasRestantes,
    estado,
  };
}
