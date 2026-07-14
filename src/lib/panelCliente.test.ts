import { describe, expect, it } from 'vitest';
import {
  construirNegocios,
  construirRelaciones,
  diasDesde,
  filaANegocioMarket,
  filaARecompensaMarket,
  filaAVisita,
} from './panelCliente';

const MS_DIA = 86_400_000;
const AHORA = new Date('2026-07-14T12:00:00Z').getTime();
const haceDias = (dias: number) => new Date(AHORA - dias * MS_DIA).toISOString();

describe('diasDesde', () => {
  it('cuenta días enteros hacia atrás', () => {
    expect(diasDesde(haceDias(3), AHORA)).toBe(3);
    expect(diasDesde(haceDias(0), AHORA)).toBe(0);
  });

  it('null o fecha inválida → 0', () => {
    expect(diasDesde(null, AHORA)).toBe(0);
    expect(diasDesde('no-es-fecha', AHORA)).toBe(0);
  });

  it('fecha futura no da negativos', () => {
    expect(diasDesde(haceDias(-5), AHORA)).toBe(0);
  });
});

describe('filaAVisita', () => {
  it('mapea monto/puntos y deriva diasAtras', () => {
    const v = filaAVisita(
      { negocio_id: 'x', monto: 2800, puntos: 28, categoria: 'Bebidas', es_nuevo: true, created_at: haceDias(2) },
      AHORA,
    );
    expect(v).toEqual({ diasAtras: 2, monto: 2800, puntos: 28, nuevo: true, categoria: 'Bebidas' });
  });

  it('omite nuevo/categoria cuando no aplican y tolera nulls', () => {
    const v = filaAVisita(
      { negocio_id: 'x', monto: null, puntos: null, categoria: null, es_nuevo: false, created_at: haceDias(1) },
      AHORA,
    );
    expect(v).toEqual({ diasAtras: 1, monto: 0, puntos: 0 });
    expect('nuevo' in v).toBe(false);
    expect('categoria' in v).toBe(false);
  });

  it('descarta una categoría inválida', () => {
    const v = filaAVisita(
      { negocio_id: 'x', monto: 100, puntos: 1, categoria: 'Rara', es_nuevo: null, created_at: haceDias(0) },
      AHORA,
    );
    expect('categoria' in v).toBe(false);
  });
});

describe('filaARecompensaMarket', () => {
  it('mapea combo (costo_dinero) y normaliza categoría', () => {
    expect(
      filaARecompensaMarket({ negocio_id: 'x', pts: 200, descripcion: 'Brunch', categoria: 'Comida', costo_dinero: 3500 }),
    ).toEqual({ pts: 200, descripcion: 'Brunch', categoria: 'Comida', costoDinero: 3500 });
  });

  it('categoría inválida cae a Regalos y sin costo no agrega costoDinero', () => {
    const r = filaARecompensaMarket({ negocio_id: 'x', pts: 100, descripcion: 'Algo', categoria: 'Zzz', costo_dinero: null });
    expect(r.categoria).toBe('Regalos');
    expect('costoDinero' in r).toBe(false);
  });
});

describe('construirRelaciones', () => {
  it('agrupa visitas por negocio y ordena por cercanía', () => {
    const rel = construirRelaciones(
      [
        { negocio_id: 'cafe', puntos: 320, ultima_visita_at: haceDias(1) },
        { negocio_id: 'bar', puntos: 0, ultima_visita_at: null },
      ],
      [
        { negocio_id: 'cafe', monto: 2200, puntos: 22, categoria: 'Comida', es_nuevo: null, created_at: haceDias(5) },
        { negocio_id: 'cafe', monto: 2800, puntos: 28, categoria: 'Bebidas', es_nuevo: true, created_at: haceDias(1) },
      ],
      AHORA,
    );
    expect(rel.cafe.puntos).toBe(320);
    expect(rel.cafe.ultimaVisitaDias).toBe(1);
    expect(rel.cafe.historial.map((v) => v.diasAtras)).toEqual([1, 5]);
    // Sin ultima_visita_at ni visitas, cae a 0.
    expect(rel.bar.ultimaVisitaDias).toBe(0);
    expect(rel.bar.historial).toEqual([]);
  });

  it('sin ultima_visita_at usa la visita más reciente', () => {
    const rel = construirRelaciones(
      [{ negocio_id: 'cafe', puntos: 50, ultima_visita_at: null }],
      [{ negocio_id: 'cafe', monto: 100, puntos: 1, categoria: null, es_nuevo: null, created_at: haceDias(4) }],
      AHORA,
    );
    expect(rel.cafe.ultimaVisitaDias).toBe(4);
  });
});

describe('construirNegocios / filaANegocioMarket', () => {
  it('arma el negocio con recompensas ordenadas por pts y datos por defecto', () => {
    const negocios = construirNegocios(
      [
        {
          id: 'cafe',
          nombre: 'Café Real',
          categoria: 'Café',
          rubro: 'gastro',
          emoji: '☕',
          lat: null,
          lng: null,
          clientes_activos: null,
          horario_valle: null,
          beneficios_vip: null,
          created_at: '2026-03-18T00:00:00Z',
        },
      ],
      [
        { negocio_id: 'cafe', pts: 260, descripcion: 'Tostado', categoria: 'Comida', costo_dinero: null },
        { negocio_id: 'cafe', pts: 120, descripcion: 'Café', categoria: 'Bebidas', costo_dinero: null },
      ],
      [{ negocio_id: 'cafe', nombre: 'Semana', fecha_inicio: '2026-07-01', fecha_fin: '2026-07-31', recompensa_extra: 'Regalo' }],
    );
    const n = negocios[0];
    expect(n.recompensas.map((r) => r.pts)).toEqual([120, 260]);
    expect(n.fechaAlta).toBe('2026-03-18');
    expect(n.clientesActivos).toBe(0);
    expect(n.eventos?.[0].nombre).toBe('Semana');
    // lat/lng por defecto (centro de Palermo) cuando faltan.
    expect(n.lat).toBeCloseTo(-34.5855);
    expect(n.lng).toBeCloseTo(-58.428);
  });

  it('rubro desconocido cae a gastro y sin recompensas queda lista vacía', () => {
    const n = filaANegocioMarket(
      {
        id: 'x',
        nombre: 'X',
        categoria: 'C',
        rubro: 'otro',
        emoji: null,
        lat: -34.6,
        lng: -58.4,
        clientes_activos: 10,
        horario_valle: null,
        beneficios_vip: [],
        created_at: null,
      },
      [],
      [],
    );
    expect(n.rubro).toBe('gastro');
    expect(n.emoji).toBe('🏪');
    expect(n.recompensas).toEqual([]);
    expect('eventos' in n).toBe(false);
    expect('beneficiosVip' in n).toBe(false);
  });
});
