import { describe, expect, it } from 'vitest';
import { DATA_RUBROS, type Visita } from '../data/mockClientes';
import { RELACIONES_INICIALES } from '../data/negocios';
import {
  buscarClientes,
  calcularPuntos,
  categoriaFavorita,
  nivelDe,
  progresoNivel,
  proximaRecompensa,
  puntosPorMonto,
  rachaDias,
  sugerenciaFavorita,
} from './club';

const gastro = DATA_RUBROS.gastro;
const NIVELES = gastro.niveles; // [Nuevo 0, Frecuente 250, VIP 700]

describe('nivelDe', () => {
  it('devuelve el nivel correcto según los puntos', () => {
    expect(nivelDe(NIVELES, 0).nombre).toBe('Nuevo');
    expect(nivelDe(NIVELES, 130).nombre).toBe('Nuevo');
    expect(nivelDe(NIVELES, 250).nombre).toBe('Frecuente');
    expect(nivelDe(NIVELES, 620).nombre).toBe('Frecuente');
    expect(nivelDe(NIVELES, 700).nombre).toBe('VIP');
    expect(nivelDe(NIVELES, 985).nombre).toBe('VIP');
  });
});

describe('progresoNivel', () => {
  it('calcula el porcentaje entre el nivel actual y el siguiente', () => {
    const r = progresoNivel(NIVELES, 475); // 225 de 450 hacia VIP
    expect(r.actual.nombre).toBe('Frecuente');
    expect(r.siguiente?.nombre).toBe('VIP');
    expect(r.pct).toBe(50);
  });

  it('marca 100% y sin siguiente en el nivel máximo', () => {
    const r = progresoNivel(NIVELES, 900);
    expect(r.actual.nombre).toBe('VIP');
    expect(r.siguiente).toBeNull();
    expect(r.pct).toBe(100);
  });

  it('nunca supera 100%', () => {
    expect(progresoNivel(NIVELES, 249).pct).toBeLessThanOrEqual(100);
  });
});

describe('calcularPuntos / puntosPorMonto', () => {
  it('da 1 punto cada montoPorPunto, redondeando hacia abajo', () => {
    expect(calcularPuntos(100, 4500)).toBe(45);
    expect(calcularPuntos(100, 4599)).toBe(45); // floor
    expect(calcularPuntos(5000, 250000)).toBe(50);
    expect(calcularPuntos(100, 99)).toBe(0);
  });

  it('usa el montoPorPunto del rubro', () => {
    expect(puntosPorMonto(gastro, 4500)).toBe(45);
    expect(puntosPorMonto(DATA_RUBROS.super, 250000)).toBe(50);
  });
});

describe('proximaRecompensa', () => {
  it('devuelve la primera recompensa aún no alcanzada', () => {
    const prox = proximaRecompensa(gastro.recompensas, 180);
    expect(prox?.pts).toBe(200);
  });

  it('devuelve null cuando ya alcanza todas', () => {
    expect(proximaRecompensa(gastro.recompensas, 5000)).toBeNull();
  });
});

describe('rachaDias', () => {
  it('cuenta la tira más larga de días consecutivos con visita', () => {
    // Café Nardo: días 1,2,3 seguidos → racha diaria de 3.
    expect(rachaDias(RELACIONES_INICIALES['cafe-nardo'].historial)).toBe(3);
  });

  it('da 1 cuando no hay días consecutivos', () => {
    // Cervecería: visitas espaciadas por semana → ningún día pegado a otro.
    expect(rachaDias(RELACIONES_INICIALES['cerveceria-soler'].historial)).toBe(1);
  });

  it('toma la mejor tira aunque no incluya el día de hoy', () => {
    const historial: Visita[] = [
      { diasAtras: 0, monto: 0, puntos: 0 },
      { diasAtras: 4, monto: 0, puntos: 0 },
      { diasAtras: 5, monto: 0, puntos: 0 },
      { diasAtras: 6, monto: 0, puntos: 0 },
    ];
    expect(rachaDias(historial)).toBe(3); // días 4-5-6
  });

  it('ignora días repetidos y cuenta 0 sin historial', () => {
    expect(rachaDias([{ diasAtras: 2, monto: 0, puntos: 0 }, { diasAtras: 2, monto: 0, puntos: 0 }])).toBe(1);
    expect(rachaDias([])).toBe(0);
  });
});

describe('favoritos', () => {
  const historial: Visita[] = [
    { diasAtras: 1, monto: 0, puntos: 0, categoria: 'Bebidas' },
    { diasAtras: 3, monto: 0, puntos: 0, categoria: 'Bebidas' },
    { diasAtras: 5, monto: 0, puntos: 0, categoria: 'Comida' },
    { diasAtras: 6, monto: 0, puntos: 0, categoria: 'Bebidas' },
  ];

  it('categoriaFavorita devuelve la más consumida', () => {
    expect(categoriaFavorita(historial)).toBe('Bebidas');
  });

  it('categoriaFavorita devuelve null sin categorías', () => {
    expect(categoriaFavorita([{ diasAtras: 1, monto: 0, puntos: 0 }])).toBeNull();
  });

  it('sugerenciaFavorita apunta a la recompensa más cercana de la categoría favorita', () => {
    // Favorita = Bebidas. Con 300 pts, la Bebida más cercana no alcanzada es 500 (2x1 tragos).
    const sug = sugerenciaFavorita(gastro.recompensas, historial, 300);
    expect(sug?.categoria).toBe('Bebidas');
    expect(sug?.recompensa.pts).toBe(500);
    expect(sug?.faltan).toBe(200);
    expect(sug?.alcanzable).toBe(false);
  });
});

describe('buscarClientes', () => {
  const clientes = gastro.clientes;

  it('filtra por nombre (case-insensitive)', () => {
    const r = buscarClientes(clientes, 'martina');
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('g1');
  });

  it('filtra por dígitos del teléfono', () => {
    const r = buscarClientes(clientes, '5320');
    expect(r.map((c) => c.id)).toContain('g1');
  });

  it('devuelve todos con consulta vacía', () => {
    expect(buscarClientes(clientes, '   ')).toHaveLength(clientes.length);
  });
});
