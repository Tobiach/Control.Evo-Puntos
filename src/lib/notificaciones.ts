import { useEffect, useState } from 'react';
import type { Cliente, RubroData, Visita } from '../data/mockClientes';
import { formatPuntos, vencimientoPuntos } from './club';
import { rachaSemanal, VISITAS_RACHA_SEMANAL } from './misiones';

export type PermisoNotif = NotificationPermission | 'unsupported';

/** ¿El navegador soporta la Notification API? */
export function soportaNotificaciones(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function permisoActual(): PermisoNotif {
  return soportaNotificaciones() ? Notification.permission : 'unsupported';
}

/**
 * Estado del permiso de notificaciones + acción para pedirlo. A propósito NO se pide solo al
 * montar: muchos navegadores exigen que `requestPermission()` cuelgue de un gesto real del
 * usuario (un click), y pedirlo en frío sin avisar antes suele terminar en "Bloquear" reflejo.
 * `pedirPermiso` se llama desde el botón de la pantalla de aviso (ver AvisoActivarNotificaciones).
 */
export function usePermisoNotificaciones(): [PermisoNotif, () => Promise<void>] {
  const [permiso, setPermiso] = useState<PermisoNotif>(permisoActual);

  useEffect(() => {
    if (!soportaNotificaciones()) setPermiso('unsupported');
  }, []);

  const pedirPermiso = async () => {
    if (!soportaNotificaciones()) return;
    try {
      const resultado = await Notification.requestPermission();
      setPermiso(resultado);
    } catch {
      // Algunos navegadores rechazan la promesa si no es un gesto de usuario: no rompemos.
    }
  };

  return [permiso, pedirPermiso];
}

/** Dispara una notificación nativa del sistema (si hay permiso). No hace nada si no. */
export function dispararNotificacion(titulo: string, cuerpo: string): void {
  if (!soportaNotificaciones() || Notification.permission !== 'granted') return;
  try {
    new Notification(titulo, { body: cuerpo });
  } catch {
    // Ciertos navegadores exigen ServiceWorker para new Notification(): degradamos en silencio.
  }
}

// ── Avisos del cliente ──────────────────────────────────────────

export type IdAviso = 'racha-riesgo' | 'puntos-vencen' | 'recompensa-nueva' | 'cumple';

export interface Aviso {
  id: IdAviso;
  emoji: string;
  titulo: string;
  cuerpo: string;
  /** Ya tiene su propio bloque visual en Inicio: no repetirlo en el panel de fallback. */
  yaVisibleEnInicio?: boolean;
}

/** Margen (pts) para considerar que el cliente "recién" alcanzó una recompensa. */
const MARGEN_RECOMPENSA = 40;
/** Días que faltan para el cierre de la semana (mock, para el aviso de racha en riesgo). */
const DIAS_RESTANTES_SEMANA = 2;

/** ¿Hoy es el cumpleaños del cliente? (compara mes-día en formato 'MM-DD'). */
export function esCumpleHoy(cliente: Cliente): boolean {
  if (!cliente.nacimiento) return false;
  const hoy = new Date();
  const mmdd = `${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return cliente.nacimiento === mmdd;
}

/**
 * Las 4 situaciones que ameritan avisar al cliente en este negocio. Se usan tanto para las
 * notificaciones nativas como para el panel visual de fallback (cuando no hay permiso).
 */
export function avisosCliente(
  data: RubroData,
  cliente: Cliente,
  historial: Visita[],
  opciones: { cumpleForzado?: boolean } = {},
): Aviso[] {
  const avisos: Aviso[] = [];

  const semanal = rachaSemanal(historial);
  if (
    !semanal.conseguida &&
    semanal.visitas > 0 &&
    semanal.visitas >= VISITAS_RACHA_SEMANAL - 2
  ) {
    avisos.push({
      id: 'racha-riesgo',
      emoji: '🔥',
      titulo: 'Tu racha está en riesgo',
      cuerpo: `Llevás ${semanal.visitas} de ${VISITAS_RACHA_SEMANAL} visitas y quedan ${DIAS_RESTANTES_SEMANA} días. ¡No la pierdas!`,
    });
  }

  const venc = vencimientoPuntos(cliente);
  if (venc.dias < 15) {
    avisos.push({
      id: 'puntos-vencen',
      emoji: '⏳',
      titulo: 'Tus puntos están por vencer',
      cuerpo: `${formatPuntos(cliente.puntos)} pts vencen en ${venc.dias} ${venc.dias === 1 ? 'día' : 'días'}. Pasá a canjear.`,
      yaVisibleEnInicio: true,
    });
  }

  const alcanzables = data.recompensas
    .filter((recompensa) => cliente.puntos >= recompensa.pts)
    .sort((a, b) => a.pts - b.pts);
  const ultima = alcanzables[alcanzables.length - 1];
  if (ultima && cliente.puntos - ultima.pts <= MARGEN_RECOMPENSA) {
    avisos.push({
      id: 'recompensa-nueva',
      emoji: '🎁',
      titulo: '¡Nueva recompensa disponible!',
      cuerpo: `Ya te alcanza para: ${ultima.descripcion}.`,
    });
  }

  if (opciones.cumpleForzado || esCumpleHoy(cliente)) {
    avisos.push({
      id: 'cumple',
      emoji: '🎂',
      titulo: `¡Feliz cumple, ${cliente.nombre.split(' ')[0]}!`,
      cuerpo: `${data.nombreNegocio} te regala una sorpresa. Pasá a buscarla hoy.`,
    });
  }

  return avisos;
}
