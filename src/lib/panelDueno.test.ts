import { describe, expect, it } from 'vitest';
import { textoUltimaVisita } from './panelDueno';

const MS_DIA = 86_400_000;
const AHORA = new Date('2026-07-14T12:00:00Z').getTime();
const haceDias = (dias: number) => new Date(AHORA - dias * MS_DIA).toISOString();

describe('textoUltimaVisita', () => {
  it('mismo día → "hoy"', () => {
    expect(textoUltimaVisita(haceDias(0), AHORA)).toBe('hoy');
  });

  it('un día → singular', () => {
    expect(textoUltimaVisita(haceDias(1), AHORA)).toBe('hace 1 día');
  });

  it('varios días → plural', () => {
    expect(textoUltimaVisita(haceDias(5), AHORA)).toBe('hace 5 días');
    expect(textoUltimaVisita(haceDias(60), AHORA)).toBe('hace 60 días');
  });

  it('sin visita (null) o fecha inválida → "sin visitas"', () => {
    expect(textoUltimaVisita(null, AHORA)).toBe('sin visitas');
    expect(textoUltimaVisita('no-es-fecha', AHORA)).toBe('sin visitas');
  });

  it('fecha futura no da días negativos → "hoy"', () => {
    expect(textoUltimaVisita(haceDias(-3), AHORA)).toBe('hoy');
  });
});
