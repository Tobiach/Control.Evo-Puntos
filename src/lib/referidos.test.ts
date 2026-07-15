import { describe, expect, it } from 'vitest';
import {
  PUNTOS_BONUS_REFERIDO,
  VISITAS_PARA_PREMIO,
  armarLinkInvitacion,
  leerReferidoDeQuery,
} from './referidos';

describe('leerReferidoDeQuery', () => {
  it('extrae código (en mayúsculas) y negocio de un query válido', () => {
    expect(leerReferidoDeQuery('?ref=ab3k9m&negocio=cafe-nardo')).toEqual({
      codigo: 'AB3K9M',
      negocioId: 'cafe-nardo',
    });
  });

  it('recorta espacios del código y el negocio', () => {
    expect(leerReferidoDeQuery('?ref=%20ab3k9m%20&negocio=%20cafe-nardo%20')).toEqual({
      codigo: 'AB3K9M',
      negocioId: 'cafe-nardo',
    });
  });

  it('devuelve null si falta el código o el negocio', () => {
    expect(leerReferidoDeQuery('?negocio=cafe-nardo')).toBeNull();
    expect(leerReferidoDeQuery('?ref=AB3K9M')).toBeNull();
    expect(leerReferidoDeQuery('')).toBeNull();
    expect(leerReferidoDeQuery('?ref=&negocio=')).toBeNull();
  });

  it('convive con otros query params (ej. rubro)', () => {
    expect(leerReferidoDeQuery('?rubro=super&ref=AB3K9M&negocio=super-ezefran')).toEqual({
      codigo: 'AB3K9M',
      negocioId: 'super-ezefran',
    });
  });
});

describe('armarLinkInvitacion', () => {
  it('arma el link con ref (en mayúsculas) y negocio', () => {
    const link = armarLinkInvitacion('https://club.controlevo.com', 'ab3k9m', 'cafe-nardo');
    const url = new URL(link);
    expect(url.searchParams.get('ref')).toBe('AB3K9M');
    expect(url.searchParams.get('negocio')).toBe('cafe-nardo');
  });

  it('el link generado es reversible con leerReferidoDeQuery', () => {
    const link = armarLinkInvitacion('https://club.controlevo.com', 'XY7QRS', 'super-ezefran');
    const search = new URL(link).search;
    expect(leerReferidoDeQuery(search)).toEqual({ codigo: 'XY7QRS', negocioId: 'super-ezefran' });
  });
});

describe('constantes del premio', () => {
  it('coinciden con la migración 0008 (4 visitas, 100 pts a cada uno)', () => {
    expect(VISITAS_PARA_PREMIO).toBe(4);
    expect(PUNTOS_BONUS_REFERIDO).toBe(100);
  });
});
