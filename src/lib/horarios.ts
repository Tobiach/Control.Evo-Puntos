import type { HorarioValle } from '../data/mockClientes';

export interface EstadoApertura {
  abierto: boolean;
  /** Ya formateado para mostrar: "Abierto · Cierra 21:00" o "Cerrado". */
  texto: string;
}

const minutosDelDia = (hora: string): number => {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
};

/**
 * Si el negocio está abierto ahora mismo, según sus bloques de horario. Soporta franjas que
 * cruzan la medianoche (ej. un bar de 19:00 a 02:00: `hasta` < `desde`). `null` si el negocio
 * no cargó horario — nunca se inventa "Abierto"/"Cerrado" sin el dato real.
 */
export function estadoAperturaAhora(
  bloques: HorarioValle[] | undefined,
  ahora: Date = new Date(),
): EstadoApertura | null {
  if (!bloques || bloques.length === 0) return null;

  const dia = ahora.getDay();
  const diaAnterior = (dia + 6) % 7;
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  for (const bloque of bloques) {
    const desdeMin = minutosDelDia(bloque.desde);
    const hastaMin = minutosDelDia(bloque.hasta);
    const cruzaMedianoche = hastaMin <= desdeMin;

    if (cruzaMedianoche) {
      const empezoHoy = bloque.dias.includes(dia) && minutosAhora >= desdeMin;
      const sigueDesdeAyer = bloque.dias.includes(diaAnterior) && minutosAhora < hastaMin;
      if (empezoHoy || sigueDesdeAyer) {
        return { abierto: true, texto: `Abierto · Cierra ${bloque.hasta}` };
      }
    } else if (bloque.dias.includes(dia) && minutosAhora >= desdeMin && minutosAhora < hastaMin) {
      return { abierto: true, texto: `Abierto · Cierra ${bloque.hasta}` };
    }
  }

  return { abierto: false, texto: 'Cerrado' };
}
