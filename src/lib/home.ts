import type { Recompensa } from '../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../data/negocios';
import {
  DIAS_VENCIMIENTO,
  type DiaRacha,
  formatPuntos,
  mejorRecompensaDisponible,
  proximaRecompensa,
  rachaDias,
  ultimos7Dias,
} from './club';
import { horarioValleActivoAhora, rachaSemanal } from './misiones';

// Motor de relevancia del Home (F1 del diagnóstico). Recorre TODAS las relaciones del cliente,
// arma las señales accionables reales de cada negocio y las ordena por urgencia. El Home muestra
// SOLO la primera (el "héroe"). Puro y con `ahora` inyectable — sin estado, sin DOM.
// Ver docs/SPEC-HOME.md.

export type TipoSenal =
  | 'vencimiento'
  | 'recompensa-lista'
  | 'x2-ahora'
  | 'near-win'
  | 'racha-riesgo'
  | 'al-dia'
  | 'descubrir';

export interface SenalHome {
  tipo: TipoSenal;
  negocio: Negocio;
  /** Menor = más urgente. Define cuál es el héroe. */
  prioridad: number;
  titulo: string;
  detalle: string;
  cta: string;
  puntos: number;
  /** Puntos que faltan para el objetivo, si la señal tiene uno. */
  faltan?: number;
  recompensa?: Recompensa;
}

/** near-win: falta poco en términos absolutos o relativos a la meta. */
const NEAR_WIN_PTS = 60;
const NEAR_WIN_PCT = 0.2;

/** Días hasta que vencen los puntos de una relación (60 desde la última visita). */
function diasHastaVencer(relacion: RelacionNegocio): number {
  return DIAS_VENCIMIENTO - relacion.ultimaVisitaDias;
}

function senalesDeNegocio(
  negocio: Negocio,
  relacion: RelacionNegocio,
  ahora: Date,
): SenalHome[] {
  const puntos = relacion.puntos;
  const base = { negocio, puntos } as const;
  const senales: SenalHome[] = [];

  // 1) Puntos por vencer (solo si hay saldo real que perder).
  const dias = diasHastaVencer(relacion);
  if (puntos > 0 && dias > 0 && dias <= 30) {
    const urgente = dias <= 14;
    senales.push({
      ...base,
      tipo: 'vencimiento',
      prioridad: urgente ? dias : 55 + (dias - 15),
      titulo: `Tus puntos en ${negocio.nombre} vencen ${dias === 1 ? 'mañana' : `en ${dias} días`}`,
      detalle: `${formatPuntos(puntos)} pts sin usar. Pasá a canjear antes de perderlos.`,
      cta: `Ver ${negocio.nombre}`,
    });
  }

  // 2) Recompensa ya alcanzable.
  const lista = mejorRecompensaDisponible(negocio.recompensas, puntos);
  if (lista) {
    senales.push({
      ...base,
      tipo: 'recompensa-lista',
      prioridad: 20,
      titulo: `Tenés un premio listo en ${negocio.nombre}`,
      detalle: `Te alcanza para ${lista.descripcion}. Mostrá el código en el mostrador.`,
      cta: `Ver ${negocio.nombre}`,
      recompensa: lista,
    });
  }

  // 3) Puntos x2 vigentes ahora mismo.
  if (negocio.horarioValle && horarioValleActivoAhora(negocio.horarioValle, ahora)) {
    senales.push({
      ...base,
      tipo: 'x2-ahora',
      prioridad: 30,
      titulo: `Puntos x2 en ${negocio.nombre} ahora`,
      detalle: `Hasta las ${negocio.horarioValle.hasta}. Cada compra suma el doble.`,
      cta: `Ver ${negocio.nombre}`,
    });
  }

  // 4) Cerca de una recompensa (near-win).
  const proxima = proximaRecompensa(negocio.recompensas, puntos);
  if (proxima) {
    const faltan = proxima.pts - puntos;
    const cerca = faltan <= NEAR_WIN_PTS || faltan <= proxima.pts * NEAR_WIN_PCT;
    if (cerca) {
      senales.push({
        ...base,
        tipo: 'near-win',
        prioridad: 40 + faltan / 5,
        titulo: `Te faltan ${formatPuntos(faltan)} pts en ${negocio.nombre}`,
        detalle: `para ${proxima.descripcion}. Estás muy cerca.`,
        cta: `Ver ${negocio.nombre}`,
        faltan,
        recompensa: proxima,
      });
    }
  }

  // 5) Racha semanal en riesgo.
  const racha = rachaSemanal(relacion.historial);
  const faltanVisitas = racha.objetivo - racha.visitas;
  if (racha.visitas > 0 && !racha.conseguida && faltanVisitas <= 2) {
    senales.push({
      ...base,
      tipo: 'racha-riesgo',
      prioridad: 75,
      titulo: `Racha en riesgo en ${negocio.nombre}`,
      detalle: `Te ${faltanVisitas === 1 ? 'falta 1 visita' : `faltan ${faltanVisitas} visitas`} esta semana para no perderla.`,
      cta: `Ver ${negocio.nombre}`,
    });
  }

  return senales;
}

/** Negocio con más puntos entre las relaciones (para el fallback "al día" y desempates). */
function negocioConMasPuntos(
  negocios: Negocio[],
  relaciones: Record<string, RelacionNegocio>,
): Negocio | null {
  const conRelacion = negocios.filter((n) => relaciones[n.id]);
  if (conRelacion.length === 0) return null;
  return conRelacion.reduce((mejor, actual) =>
    relaciones[actual.id].puntos > relaciones[mejor.id].puntos ? actual : mejor,
  );
}

/**
 * Todas las señales del cliente, ordenadas por urgencia. La primera es el héroe del Home.
 * Incluye siempre al menos una: "al-dia" si tiene relaciones sin nada urgente, "descubrir" si
 * no tiene ninguna relación, o `[]` solo si no hay negocios para mostrar.
 */
export function senalesDelCliente(
  negocios: Negocio[],
  relaciones: Record<string, RelacionNegocio>,
  ahora: Date = new Date(),
): SenalHome[] {
  const conRelacion = negocios.filter((n) => relaciones[n.id]);

  const senales = conRelacion
    .flatMap((negocio) => senalesDeNegocio(negocio, relaciones[negocio.id], ahora))
    .sort((a, b) => a.prioridad - b.prioridad || b.puntos - a.puntos);

  if (senales.length > 0) return senales;

  // Fallback 1: tiene relaciones pero nada urgente → su próximo objetivo.
  const ancla = negocioConMasPuntos(negocios, relaciones);
  if (ancla) {
    const puntos = relaciones[ancla.id].puntos;
    const proxima = proximaRecompensa(ancla.recompensas, puntos);
    return [
      {
        tipo: 'al-dia',
        negocio: ancla,
        prioridad: 85,
        puntos,
        titulo: proxima ? `Vas bien en ${ancla.nombre}` : `Seguí sumando en ${ancla.nombre}`,
        detalle: proxima
          ? `Te faltan ${formatPuntos(proxima.pts - puntos)} pts para ${proxima.descripcion}.`
          : `Ya tenés ${formatPuntos(puntos)} pts acá.`,
        cta: `Ver ${ancla.nombre}`,
        ...(proxima ? { faltan: proxima.pts - puntos, recompensa: proxima } : {}),
      },
    ];
  }

  // Fallback 2: sin ninguna relación (usuario nuevo real) → por dónde empezar.
  const paraDescubrir = [...negocios].sort((a, b) => b.clientesActivos - a.clientesActivos)[0];
  if (!paraDescubrir) return [];
  const primerObjetivo = [...paraDescubrir.recompensas].sort((a, b) => a.pts - b.pts)[0];
  return [
    {
      tipo: 'descubrir',
      negocio: paraDescubrir,
      prioridad: 95,
      puntos: 0,
      titulo: `Empezá por ${paraDescubrir.nombre}`,
      detalle: primerObjetivo
        ? `${paraDescubrir.categoria} · tu primer objetivo: ${primerObjetivo.descripcion} (${formatPuntos(primerObjetivo.pts)} pts).`
        : `${paraDescubrir.categoria} · sumás puntos desde tu primera visita.`,
      cta: `Conocer ${paraDescubrir.nombre}`,
      ...(primerObjetivo ? { recompensa: primerObjetivo } : {}),
    },
  ];
}

/** El héroe del Home: la señal de mayor urgencia, o null si no hay nada para mostrar. */
export function heroeDelHome(
  negocios: Negocio[],
  relaciones: Record<string, RelacionNegocio>,
  ahora: Date = new Date(),
): SenalHome | null {
  return senalesDelCliente(negocios, relaciones, ahora)[0] ?? null;
}

/**
 * Actividad reciente CRUZANDO todos los negocios (a diferencia de `rachaDias`/`ultimos7Dias`
 * de club.ts, que son por-negocio para TabInicio/TabActividad). El "momento hábito" de Premia
 * es abrir la app en CUALQUIER mostrador — la racha y el gráfico del Home tienen que sumar
 * across negocios, no mostrar solo el más visitado. Mismo dato ya cargado (`historial` de
 * cada relación), sin queries nuevas.
 */
export function actividadGlobal(relaciones: Record<string, RelacionNegocio>): {
  rachaDiasSeguidos: number;
  semana: DiaRacha[];
} {
  const visitas = Object.values(relaciones).flatMap((relacion) => relacion.historial);
  return { rachaDiasSeguidos: rachaDias(visitas), semana: ultimos7Dias(visitas) };
}

/** Los 7 tipos de señal se agrupan en 2 tratamientos visuales del Home — nunca se mezclan
 *  (ver docs/AUDITORIA-... corrección 13/9): un premio LISTO/urgente no es lo mismo que un
 *  premio en el que todavía falta progresar. */
export type GrupoSenal = 'listo' | 'proximo';

export const GRUPO_SENAL: Record<TipoSenal, GrupoSenal> = {
  vencimiento: 'listo',
  'racha-riesgo': 'listo',
  'recompensa-lista': 'listo',
  'x2-ahora': 'listo',
  'near-win': 'proximo',
  'al-dia': 'proximo',
  descubrir: 'proximo',
};
