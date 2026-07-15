import { describe, expect, it } from 'vitest';
import { agruparPorCategoria, formatPrecio, type ItemCarta } from './carta';

const item = (parche: Partial<ItemCarta>): ItemCarta => ({
  id: 1,
  nombre: 'Item',
  descripcion: '',
  precio: 0,
  categoria: '',
  fotoUrl: null,
  disponible: true,
  orden: 0,
  ...parche,
});

describe('formatPrecio', () => {
  it('usa separador de miles argentino y prefijo por defecto', () => {
    expect(formatPrecio(1500)).toBe('$ 1.500');
  });

  it('respeta un prefijo de moneda distinto', () => {
    expect(formatPrecio(2000, 'ARS')).toBe('ARS 2.000');
  });

  it('formatea el cero', () => {
    expect(formatPrecio(0)).toBe('$ 0');
  });
});

describe('agruparPorCategoria', () => {
  it('devuelve una lista vacía cuando no hay items', () => {
    expect(agruparPorCategoria([])).toEqual([]);
  });

  it('agrupa por categoría preservando el orden de primera aparición', () => {
    const grupos = agruparPorCategoria([
      item({ id: 1, categoria: 'Bebidas' }),
      item({ id: 2, categoria: 'Comidas' }),
      item({ id: 3, categoria: 'Bebidas' }),
    ]);
    expect(grupos.map((g) => g.categoria)).toEqual(['Bebidas', 'Comidas']);
    expect(grupos[0].items.map((i) => i.id)).toEqual([1, 3]);
    expect(grupos[1].items.map((i) => i.id)).toEqual([2]);
  });

  it('manda los items sin categoría a "Otros"', () => {
    const grupos = agruparPorCategoria([item({ id: 1, categoria: '   ' }), item({ id: 2, categoria: '' })]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].categoria).toBe('Otros');
    expect(grupos[0].items.map((i) => i.id)).toEqual([1, 2]);
  });
});
