import { Award, CalendarHeart, Flame, Sparkles, type LucideIcon } from 'lucide-react';
import type { EventoNegocio, HorarioValle, RubroData, Visita } from '../data/mockClientes';
import { rachaSemanas } from './club';

const DIA_MS = 86_400_000;

/** Visitas en los últimos 7 días para desbloquear la racha semanal. */
export const VISITAS_RACHA_SEMANAL = 4;
/** Semanas consecutivas con visita para desbloquear la racha larga. */
export const SEMANAS_RACHA_LARGA = 7;

const fechaVisitaISO = (diasAtras: number): string =>
  new Date(Date.now() - diasAtras * DIA_MS).toISOString().slice(0, 10);

const hoyISO = (): string => new Date().toISOString().slice(0, 10);

// ── Racha semanal ───────────────────────────────────────────────

export interface EstadoRachaSemanal {
  visitas: number;
  objetivo: number;
  conseguida: boolean;
  /** Recompensa especial que se desbloquea, además del catálogo normal. */
  recompensa: string;
}

export function rachaSemanal(historial: Visita[]): EstadoRachaSemanal {
  const visitas = historial.filter((visita) => visita.diasAtras <= 7).length;
  return {
    visitas,
    objetivo: VISITAS_RACHA_SEMANAL,
    conseguida: visitas >= VISITAS_RACHA_SEMANAL,
    recompensa: 'Consumición de la casa gratis',
  };
}

// ── Eventos ─────────────────────────────────────────────────────

/** ¿El cliente tiene alguna visita dentro del rango de fechas del evento? */
export function visitaEnEvento(evento: EventoNegocio, historial: Visita[]): boolean {
  return historial.some((visita) => {
    const fecha = fechaVisitaISO(visita.diasAtras);
    return fecha >= evento.fechaInicio && fecha <= evento.fechaFin;
  });
}

/** Primer evento del negocio ya completado por el cliente (o null). */
export function eventoCompletado(data: RubroData, historial: Visita[]): EventoNegocio | null {
  return (data.eventos ?? []).find((evento) => visitaEnEvento(evento, historial)) ?? null;
}

/** Evento del negocio cuyo rango incluye hoy: se muestra como promoción activa. */
export function eventoActivo(data: RubroData): EventoNegocio | null {
  const hoy = hoyISO();
  return (
    (data.eventos ?? []).find((evento) => hoy >= evento.fechaInicio && hoy <= evento.fechaFin) ??
    null
  );
}

// ── Insignias ───────────────────────────────────────────────────

export type IdInsignia = 'racha-semanal' | 'racha-larga' | 'probo-nuevo' | 'evento';

export interface Insignia {
  id: IdInsignia;
  nombre: string;
  descripcion: string;
  icono: LucideIcon;
  /** Color de acento/fondo del ícono (fijo, legible en tema claro y oscuro). */
  color: string;
  conseguida: boolean;
  /** Texto de progreso cuando todavía está bloqueada (ej. "3 de 4 visitas"). */
  progreso?: string;
}

/**
 * Todas las insignias posibles de ESE negocio con su estado conseguida/bloqueada.
 * La insignia de evento sólo aparece si el negocio tiene eventos cargados.
 */
export function insigniasDeNegocio(data: RubroData, historial: Visita[]): Insignia[] {
  const semanal = rachaSemanal(historial);
  const semanas = rachaSemanas(historial);
  const proboNuevo = historial.some((visita) => visita.nuevo);
  const evento = eventoCompletado(data, historial);

  const insignias: Insignia[] = [
    {
      id: 'racha-semanal',
      nombre: 'Racha semanal',
      descripcion: `${VISITAS_RACHA_SEMANAL} visitas en 7 días`,
      icono: Flame,
      color: '#F97316',
      conseguida: semanal.conseguida,
      progreso: semanal.conseguida
        ? undefined
        : `${semanal.visitas} de ${VISITAS_RACHA_SEMANAL} visitas`,
    },
    {
      id: 'racha-larga',
      nombre: 'Racha larga',
      descripcion: `${SEMANAS_RACHA_LARGA} semanas seguidas`,
      icono: Award,
      color: '#8B5CF6',
      conseguida: semanas >= SEMANAS_RACHA_LARGA,
      progreso:
        semanas >= SEMANAS_RACHA_LARGA
          ? undefined
          : `${semanas} de ${SEMANAS_RACHA_LARGA} semanas`,
    },
    {
      id: 'probo-nuevo',
      nombre: 'Probá algo nuevo',
      descripcion: 'Probaste una novedad',
      icono: Sparkles,
      color: '#0EA5E9',
      conseguida: proboNuevo,
      progreso: proboNuevo ? undefined : 'Todavía no la conseguiste',
    },
  ];

  if ((data.eventos ?? []).length > 0) {
    insignias.push({
      id: 'evento',
      nombre: 'Evento especial',
      descripcion: evento ? evento.nombre : 'Sumate a un evento',
      icono: CalendarHeart,
      color: '#EC4899',
      conseguida: evento !== null,
      progreso: evento ? undefined : 'Visitá durante un evento',
    });
  }

  return insignias;
}

// ── Temporada mensual ───────────────────────────────────────────

export interface Temporada {
  completadas: number;
  total: number;
  pct: number;
  completa: boolean;
  recompensa: string;
}

export function temporadaMensual(insignias: Insignia[]): Temporada {
  const total = insignias.length;
  const completadas = insignias.filter((insignia) => insignia.conseguida).length;
  const pct = total ? Math.round((completadas / total) * 100) : 0;
  return {
    completadas,
    total,
    pct,
    completa: total > 0 && completadas === total,
    recompensa: 'Recompensa grande del mes',
  };
}

/** Nombre del mes en curso, capitalizado (para el título de la temporada). */
export function nombreMesActual(): string {
  const mes = new Date().toLocaleDateString('es-AR', { month: 'long' });
  return mes.charAt(0).toUpperCase() + mes.slice(1);
}

// ── Horario valle ───────────────────────────────────────────────

const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Texto informativo del beneficio de puntos x2 en la franja valle. */
export function textoHorarioValle(horario: HorarioValle): string {
  const dias = horario.dias.map((dia) => DIAS_LARGOS[dia] ?? '').filter(Boolean);
  const listado =
    dias.length <= 1
      ? dias.join('')
      : `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}`;
  return `Puntos x2 los ${listado} de ${horario.desde} a ${horario.hasta}`;
}
