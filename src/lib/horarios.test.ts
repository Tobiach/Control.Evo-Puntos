import { describe, expect, it } from 'vitest';
import { estadoAperturaAhora } from './horarios';

// Miércoles 2026-08-26 (día 3).
const fecha = (hora: string) => new Date(`2026-08-26T${hora}:00`);

describe('estadoAperturaAhora', () => {
  it('null sin horario cargado', () => {
    expect(estadoAperturaAhora(undefined, fecha('12:00'))).toBeNull();
    expect(estadoAperturaAhora([], fecha('12:00'))).toBeNull();
  });

  it('abierto dentro de una franja simple', () => {
    const bloques = [{ desde: '08:00', hasta: '20:00', dias: [3] }];
    const r = estadoAperturaAhora(bloques, fecha('14:00'));
    expect(r?.abierto).toBe(true);
    expect(r?.texto).toBe('Abierto · Cierra 20:00');
  });

  it('cerrado fuera de la franja', () => {
    const bloques = [{ desde: '08:00', hasta: '20:00', dias: [3] }];
    expect(estadoAperturaAhora(bloques, fecha('21:00'))?.abierto).toBe(false);
  });

  it('cerrado si el día no está en `dias`', () => {
    const bloques = [{ desde: '08:00', hasta: '20:00', dias: [1, 2] }]; // lun/mar, hoy es miércoles
    expect(estadoAperturaAhora(bloques, fecha('12:00'))?.abierto).toBe(false);
  });

  it('franja que cruza medianoche: abierto antes de medianoche', () => {
    const bloques = [{ desde: '19:00', hasta: '02:00', dias: [3] }];
    const r = estadoAperturaAhora(bloques, fecha('23:30'));
    expect(r?.abierto).toBe(true);
    expect(r?.texto).toBe('Abierto · Cierra 02:00');
  });

  it('franja que cruza medianoche: sigue abierto de madrugada (día siguiente)', () => {
    const bloques = [{ desde: '19:00', hasta: '02:00', dias: [3] }]; // abrió miércoles
    // Jueves 2026-08-27 a la 1am — el bloque de "dias: [3]" sigue vigente por la madrugada.
    const r = estadoAperturaAhora(bloques, new Date('2026-08-27T01:00:00'));
    expect(r?.abierto).toBe(true);
  });

  it('franja que cruza medianoche: cerrado bien entrada la tarde', () => {
    const bloques = [{ desde: '19:00', hasta: '02:00', dias: [3] }];
    expect(estadoAperturaAhora(bloques, fecha('15:00'))?.abierto).toBe(false);
  });

  it('varios bloques: usa el que corresponda', () => {
    const bloques = [
      { desde: '12:00', hasta: '16:00', dias: [3] },
      { desde: '20:00', hasta: '00:00', dias: [3] },
    ];
    expect(estadoAperturaAhora(bloques, fecha('13:00'))?.abierto).toBe(true);
    expect(estadoAperturaAhora(bloques, fecha('18:00'))?.abierto).toBe(false);
    expect(estadoAperturaAhora(bloques, fecha('21:00'))?.abierto).toBe(true);
  });
});
