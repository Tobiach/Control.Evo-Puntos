import { describe, expect, it } from 'vitest';
import {
  DATA_RUBROS,
  type EventoNegocio,
  type RubroData,
  type Visita,
} from '../data/mockClientes';
import { NEGOCIOS, RELACIONES_INICIALES } from '../data/negocios';
import {
  insigniasDeNegocio,
  rachaSemanal,
  SEMANAS_RACHA_LARGA,
  temporadaMensual,
  VISITAS_RACHA_SEMANAL,
} from './misiones';

const cafeNardo = NEGOCIOS.find((n) => n.id === 'cafe-nardo')!;
const histCafe = RELACIONES_INICIALES['cafe-nardo'].historial; // 4 visitas en 7 días
const histCerveceria = RELACIONES_INICIALES['cerveceria-soler'].historial; // 7 semanas seguidas
const histAlmacen = RELACIONES_INICIALES['almacen-guatemala'].historial; // 2 de 4 visitas

/** Arma un RubroData de un negocio del marketplace para probar insignias. */
const dataDe = (eventos: EventoNegocio[] | undefined): RubroData => ({
  ...DATA_RUBROS.gastro,
  recompensas: cafeNardo.recompensas,
  eventos,
});

describe('rachaSemanal', () => {
  it('se consigue con 4 visitas en los últimos 7 días', () => {
    const r = rachaSemanal(histCafe);
    expect(r.objetivo).toBe(VISITAS_RACHA_SEMANAL);
    expect(r.visitas).toBe(4);
    expect(r.conseguida).toBe(true);
  });

  it('queda bloqueada con menos visitas', () => {
    const r = rachaSemanal(histAlmacen);
    expect(r.visitas).toBe(2);
    expect(r.conseguida).toBe(false);
  });

  it('cuenta 0 sin historial', () => {
    expect(rachaSemanal([]).visitas).toBe(0);
  });
});

describe('insigniasDeNegocio', () => {
  it('incluye la insignia de evento sólo si el negocio tiene eventos', () => {
    const conEventos = insigniasDeNegocio(dataDe(cafeNardo.eventos), histCafe);
    expect(conEventos.some((i) => i.id === 'evento')).toBe(true);

    const sinEventos = insigniasDeNegocio(dataDe(undefined), histCafe);
    expect(sinEventos.some((i) => i.id === 'evento')).toBe(false);
  });

  it('marca conseguida/bloqueada según el historial (racha semanal)', () => {
    const insignias = insigniasDeNegocio(dataDe(cafeNardo.eventos), histCafe);
    const semanal = insignias.find((i) => i.id === 'racha-semanal')!;
    expect(semanal.conseguida).toBe(true);
    expect(semanal.progreso).toBeUndefined();
  });

  it('deja progreso cuando la insignia está bloqueada', () => {
    const insignias = insigniasDeNegocio(dataDe(cafeNardo.eventos), []);
    const semanal = insignias.find((i) => i.id === 'racha-semanal')!;
    expect(semanal.conseguida).toBe(false);
    expect(semanal.progreso).toBe(`0 de ${VISITAS_RACHA_SEMANAL} visitas`);
  });

  it('consigue la racha larga con 7 semanas consecutivas', () => {
    const insignias = insigniasDeNegocio(dataDe(cafeNardo.eventos), histCerveceria);
    const larga = insignias.find((i) => i.id === 'racha-larga')!;
    expect(larga.conseguida).toBe(true);
    expect(SEMANAS_RACHA_LARGA).toBe(7);
  });

  it('detecta "probó algo nuevo" desde el flag de la visita', () => {
    const conNuevo = insigniasDeNegocio(dataDe(cafeNardo.eventos), histCafe).find((i) => i.id === 'probo-nuevo')!;
    expect(conNuevo.conseguida).toBe(true);

    const historialSinNuevo: Visita[] = [{ diasAtras: 1, monto: 100, puntos: 1 }];
    const sinNuevo = insigniasDeNegocio(dataDe(cafeNardo.eventos), historialSinNuevo).find(
      (i) => i.id === 'probo-nuevo',
    )!;
    expect(sinNuevo.conseguida).toBe(false);
  });
});

describe('temporadaMensual', () => {
  it('resume el progreso de las insignias del mes', () => {
    const insignias = insigniasDeNegocio(dataDe(cafeNardo.eventos), histCafe);
    const t = temporadaMensual(insignias);
    expect(t.total).toBe(insignias.length);
    expect(t.completadas).toBe(insignias.filter((i) => i.conseguida).length);
    expect(t.pct).toBe(Math.round((t.completadas / t.total) * 100));
  });

  it('marca completa sólo cuando están todas conseguidas', () => {
    const todas = insigniasDeNegocio(dataDe(cafeNardo.eventos), histCafe).map((i) => ({ ...i, conseguida: true }));
    expect(temporadaMensual(todas).completa).toBe(true);

    const ninguna = insigniasDeNegocio(dataDe(cafeNardo.eventos), []).map((i) => ({ ...i, conseguida: false }));
    expect(temporadaMensual(ninguna).completa).toBe(false);
  });
});
