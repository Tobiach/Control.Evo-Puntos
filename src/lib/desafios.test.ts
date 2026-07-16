import { describe, expect, it } from 'vitest';
import {
  describirMeta,
  diasRestantes,
  estadoDesafio,
  mensajeMotivo,
  pctProgreso,
  unidadProgreso,
} from './desafios';

const DIA = 86_400_000;
const ahora = Date.UTC(2026, 6, 15, 12, 0, 0);

describe('describirMeta', () => {
  it('describe visitas en singular y plural', () => {
    expect(describirMeta('visitas', 1)).toBe('1 visita');
    expect(describirMeta('visitas', 3)).toBe('3 visitas');
  });

  it('describe probar_nuevo según la cantidad', () => {
    expect(describirMeta('probar_nuevo', 1)).toBe('probar el producto nuevo');
    expect(describirMeta('probar_nuevo', 2)).toBe('probar 2 productos nuevos');
  });
});

describe('unidadProgreso', () => {
  it('devuelve la unidad según el tipo', () => {
    expect(unidadProgreso('visitas')).toBe('visitas');
    expect(unidadProgreso('probar_nuevo')).toBe('nuevo');
  });
});

describe('estadoDesafio', () => {
  it('premiado siempre es cumplido, aunque haya vencido', () => {
    const vencido = new Date(ahora - DIA).toISOString();
    expect(estadoDesafio(true, vencido, ahora)).toBe('cumplido');
  });

  it('sin premiar y con plazo vigente queda en-curso', () => {
    const futuro = new Date(ahora + 2 * DIA).toISOString();
    expect(estadoDesafio(false, futuro, ahora)).toBe('en-curso');
  });

  it('sin premiar y pasado el plazo queda vencido', () => {
    const pasado = new Date(ahora - DIA).toISOString();
    expect(estadoDesafio(false, pasado, ahora)).toBe('vencido');
  });
});

describe('pctProgreso', () => {
  it('calcula el porcentaje y lo topea a 100', () => {
    expect(pctProgreso(0, 3)).toBe(0);
    expect(pctProgreso(2, 3)).toBe(67);
    expect(pctProgreso(5, 3)).toBe(100);
  });

  it('es seguro con meta 0', () => {
    expect(pctProgreso(1, 0)).toBe(0);
  });
});

describe('diasRestantes', () => {
  it('redondea hacia arriba los días que faltan', () => {
    const en2dias = new Date(ahora + 2 * DIA - 1000).toISOString();
    expect(diasRestantes(en2dias, ahora)).toBe(2);
  });

  it('es 0 cuando ya venció', () => {
    const ayer = new Date(ahora - DIA).toISOString();
    expect(diasRestantes(ayer, ahora)).toBe(0);
  });
});

describe('mensajeMotivo', () => {
  it('traduce los motivos conocidos a español', () => {
    expect(mensajeMotivo('auto_desafio')).toMatch(/vos mismo/i);
    expect(mensajeMotivo('ya_existe')).toMatch(/en curso/i);
    expect(mensajeMotivo('no_es_cliente_del_negocio')).toMatch(/local/i);
  });

  it('tiene un mensaje por defecto para motivos desconocidos', () => {
    expect(mensajeMotivo('cualquier_cosa')).toMatch(/intentá de nuevo/i);
  });
});
