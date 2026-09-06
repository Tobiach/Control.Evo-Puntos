import { describe, expect, it } from 'vitest';
import { DATA_RUBROS, type Visita } from '../data/mockClientes';
import { NEGOCIOS, RELACIONES_INICIALES } from '../data/negocios';
import {
  buscarClientes,
  calcularPuntos,
  calcularXpTotal,
  categoriaFavorita,
  colorBarraProgreso,
  contarNegociosPorRubro,
  contarVisitasTotales,
  formatCuentaRegresiva,
  formatFechaCorta,
  fusionarTimeline,
  mejorRecompensaDisponible,
  negocioAncla,
  NIVELES_XP_GLOBAL,
  nivelDe,
  nivelesDeNegocio,
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

describe('nivelesDeNegocio', () => {
  it('usa el umbral genérico si el negocio no configuró vipDesdePuntos', () => {
    expect(nivelesDeNegocio(null, NIVELES)).toBe(NIVELES);
    expect(nivelesDeNegocio(undefined, NIVELES)).toBe(NIVELES);
    expect(nivelesDeNegocio(0, NIVELES)).toBe(NIVELES);
  });

  it('devuelve una curva real de 2 niveles cuando el negocio configuró su propio umbral', () => {
    const niveles = nivelesDeNegocio(500, NIVELES);
    expect(niveles).toEqual([
      { nombre: 'Nuevo', min: 0 },
      { nombre: 'VIP', min: 500 },
    ]);
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

describe('mejorRecompensaDisponible', () => {
  const recompensas = gastro.recompensas; // 150, 200, 300, 450, 500, 800, 1200

  it('devuelve la más cara entre las alcanzables', () => {
    expect(mejorRecompensaDisponible(recompensas, 350)?.descripcion).toBe('Postre de la casa');
  });

  it('null si no alcanza ninguna', () => {
    expect(mejorRecompensaDisponible(recompensas, 100)).toBeNull();
  });

  it('la más cara de todas si superó el tope', () => {
    expect(mejorRecompensaDisponible(recompensas, 5000)?.descripcion).toBe('Cena para dos (30% off)');
  });
});

describe('colorBarraProgreso', () => {
  it('coral (premio) al 100%', () => {
    expect(colorBarraProgreso(100)).toBe('bg-premio');
  });

  it('dorado (acento) desde 80% y hasta antes de 100%', () => {
    expect(colorBarraProgreso(80)).toBe('bg-acento');
    expect(colorBarraProgreso(99)).toBe('bg-acento');
  });

  it('verde por debajo de 80%', () => {
    expect(colorBarraProgreso(0)).toBe('bg-verde-ok');
    expect(colorBarraProgreso(79)).toBe('bg-verde-ok');
  });
});

describe('calcularXpTotal', () => {
  it('suma los puntos de todas las relaciones del cliente', () => {
    const relaciones = {
      'cafe-nardo': { puntos: 300, ultimaVisitaDias: 1, historial: [] },
      'bar-aguirre': { puntos: 150, ultimaVisitaDias: 5, historial: [] },
    };
    expect(calcularXpTotal(relaciones)).toBe(450);
  });

  it('0 sin relaciones', () => {
    expect(calcularXpTotal({})).toBe(0);
  });
});

describe('NIVELES_XP_GLOBAL (nivel global cross-negocio, feature nueva)', () => {
  it('progresoNivel ubica el nivel correcto por umbral con nombres propios', () => {
    expect(progresoNivel(NIVELES_XP_GLOBAL, 0).actual.nombre).toBe('Nuevo');
    expect(progresoNivel(NIVELES_XP_GLOBAL, 625).actual.nombre).toBe('Explorador ⭐');
    expect(progresoNivel(NIVELES_XP_GLOBAL, 8000).actual.nombre).toBe('VIP del Barrio 👑');
  });

  it('nivel máximo no tiene siguiente y marca 100%', () => {
    const r = progresoNivel(NIVELES_XP_GLOBAL, 9000);
    expect(r.siguiente).toBeNull();
    expect(r.pct).toBe(100);
  });
});

describe('contarVisitasTotales', () => {
  it('suma el historial de todas las relaciones', () => {
    // RELACIONES_INICIALES: cafe-nardo(7) + cerveceria-soler(7) + almacen-guatemala(4) + rooftop-malabia(2)
    expect(contarVisitasTotales(RELACIONES_INICIALES)).toBe(20);
  });

  it('0 sin relaciones', () => {
    expect(contarVisitasTotales({})).toBe(0);
  });
});

describe('contarNegociosPorRubro', () => {
  it('cuenta negocios con relación de un rubro (primario o secundario)', () => {
    expect(contarNegociosPorRubro(NEGOCIOS, RELACIONES_INICIALES, 'gastro')).toBe(3);
    expect(contarNegociosPorRubro(NEGOCIOS, RELACIONES_INICIALES, 'super')).toBe(1);
    // cafe-nardo tiene rubrosSecundarios: ['cafeteria'] y sí tiene relación.
    expect(contarNegociosPorRubro(NEGOCIOS, RELACIONES_INICIALES, 'cafeteria')).toBe(1);
  });

  it('0 sin relaciones', () => {
    expect(contarNegociosPorRubro(NEGOCIOS, {}, 'gastro')).toBe(0);
  });
});

describe('negocioAncla', () => {
  it('devuelve el negocio con más puntos entre los que tiene relación', () => {
    expect(negocioAncla(NEGOCIOS, RELACIONES_INICIALES)?.id).toBe('cerveceria-soler');
  });

  it('null sin relaciones', () => {
    expect(negocioAncla(NEGOCIOS, {})).toBeNull();
  });
});

describe('formatFechaCorta', () => {
  it('formatea DD/MM/AAAA', () => {
    expect(formatFechaCorta('2026-08-01T12:00:00Z')).toBe('01/08/2026');
  });

  it('vacío con una fecha inválida', () => {
    expect(formatFechaCorta('no-es-fecha')).toBe('');
  });
});

describe('fusionarTimeline', () => {
  const AHORA = new Date('2026-08-25T12:00:00Z').getTime();
  const visita = (diasAtras: number, puntos: number): Visita => ({ diasAtras, monto: puntos * 100, puntos });

  it('mezcla visitas y canjes ordenados por más reciente primero', () => {
    const historial = [visita(5, 30), visita(1, 20)];
    const canjes = [{ descripcion: 'Café gratis', pts: 120, confirmadoAt: '2026-08-24T12:00:00Z' }]; // hace 1 día
    const timeline = fusionarTimeline(historial, canjes, AHORA);

    expect(timeline.map((e) => e.tipo)).toEqual(['visita', 'canje', 'visita']);
    // La visita de "hace 1 día" y el canje de "hace 1 día" empatan, pero la más vieja
    // (5 días) siempre queda última.
    expect(timeline[2].tipo).toBe('visita');
    if (timeline[2].tipo === 'visita') expect(timeline[2].visita.puntos).toBe(30);
  });

  it('ignora canjes sin confirmadoAt (nunca debería pasar, pero no rompe)', () => {
    const timeline = fusionarTimeline([], [{ descripcion: 'X', pts: 10, confirmadoAt: '' }], AHORA);
    expect(timeline).toHaveLength(0);
  });

  it('vacío sin historial ni canjes', () => {
    expect(fusionarTimeline([], [], AHORA)).toHaveLength(0);
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

describe('formatCuentaRegresiva', () => {
  it('formatea minutos y segundos con segundos a 2 dígitos', () => {
    expect(formatCuentaRegresiva(9 * 60_000 + 5_000)).toBe('9:05');
    expect(formatCuentaRegresiva(59_000)).toBe('0:59');
  });

  it('redondea hacia arriba para no mostrar 0:00 con tiempo restante', () => {
    expect(formatCuentaRegresiva(400)).toBe('0:01');
  });

  it('nunca es negativo', () => {
    expect(formatCuentaRegresiva(-5_000)).toBe('0:00');
  });
});
