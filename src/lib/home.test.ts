import { describe, expect, it } from 'vitest';
import type { Recompensa, Visita } from '../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../data/negocios';
import { actividadGlobal, heroeDelHome, senalesDelCliente } from './home';

const AHORA = new Date(2026, 8, 7, 16, 0); // 7-sep-2026 16:00 local

function negocio(over: Partial<Negocio> & Pick<Negocio, 'id' | 'nombre'>): Negocio {
  return {
    categoria: 'Café',
    rubro: 'cafeteria',
    emoji: '☕',
    lat: -34.58,
    lng: -58.42,
    clientesActivos: 50,
    fechaAlta: '2026-01-01',
    recompensas: [],
    ...over,
  };
}

function rel(puntos: number, ultimaVisitaDias = 3, historial: Visita[] = []): RelacionNegocio {
  return { puntos, ultimaVisitaDias, historial };
}

const rec = (pts: number, descripcion: string): Recompensa => ({
  pts,
  descripcion,
  categoria: 'Bebidas',
});

describe('senalesDelCliente / heroeDelHome', () => {
  it('los puntos por vencer pronto ganan sobre un premio ya disponible', () => {
    const negs = [
      negocio({ id: 'a', nombre: 'Café Vence', recompensas: [rec(100, 'Café')] }),
      negocio({ id: 'b', nombre: 'Bar Listo', recompensas: [rec(100, 'Trago')] }),
    ];
    const relaciones = {
      a: rel(120, 52), // faltan 8 días para vencer
      b: rel(300, 3), // premio listo
    };
    const hero = heroeDelHome(negs, relaciones, AHORA);
    expect(hero?.tipo).toBe('vencimiento');
    expect(hero?.negocio.id).toBe('a');
  });

  it('un premio listo gana sobre estar cerca de otro premio', () => {
    const negs = [
      negocio({ id: 'a', nombre: 'Local', recompensas: [rec(150, 'Chico'), rec(260, 'Grande')] }),
    ];
    // Con 200 pts: 'Chico' ya está disponible, y faltan 60 para 'Grande' (near-win).
    const hero = heroeDelHome(negs, { a: rel(200, 3) }, AHORA);
    expect(hero?.tipo).toBe('recompensa-lista');
    expect(hero?.recompensa?.descripcion).toBe('Chico');
  });

  it('near-win: entra si faltan pocos puntos, no si falta mucho', () => {
    const negs = [negocio({ id: 'a', nombre: 'Local', recompensas: [rec(300, 'Premio')] })];

    const cerca = senalesDelCliente(negs, { a: rel(250, 3) }, AHORA);
    expect(cerca[0].tipo).toBe('near-win');
    expect(cerca[0].faltan).toBe(50);

    const lejos = senalesDelCliente(negs, { a: rel(200, 3) }, AHORA);
    expect(lejos[0].tipo).toBe('al-dia'); // faltan 100 > umbral → no es near-win
  });

  it('detecta puntos x2 vigentes según la hora inyectada', () => {
    const negs = [
      negocio({
        id: 'a',
        nombre: 'Local',
        recompensas: [rec(500, 'Lejano')],
        horarioValle: { desde: '15:00', hasta: '17:00', dias: [0, 1, 2, 3, 4, 5, 6] },
      }),
    ];
    const dentro = heroeDelHome(negs, { a: rel(100, 3) }, new Date(2026, 8, 7, 16, 0));
    expect(dentro?.tipo).toBe('x2-ahora');

    const fuera = heroeDelHome(negs, { a: rel(100, 3) }, new Date(2026, 8, 7, 18, 0));
    expect(fuera?.tipo).not.toBe('x2-ahora');
  });

  it('no marca vencimiento si no hay saldo', () => {
    const negs = [negocio({ id: 'a', nombre: 'Local', recompensas: [rec(100, 'X')] })];
    const senales = senalesDelCliente(negs, { a: rel(0, 55) }, AHORA);
    expect(senales.some((s) => s.tipo === 'vencimiento')).toBe(false);
  });

  it('fallback "al-dia" cuando hay relación pero nada urgente', () => {
    const negs = [negocio({ id: 'a', nombre: 'Local', recompensas: [rec(1000, 'Lejano')] })];
    const hero = heroeDelHome(negs, { a: rel(120, 4) }, AHORA);
    expect(hero?.tipo).toBe('al-dia');
    expect(hero?.faltan).toBe(880);
  });

  it('fallback "descubrir" sin ninguna relación, elige el de más clientes activos', () => {
    const negs = [
      negocio({ id: 'a', nombre: 'Poco', clientesActivos: 10, recompensas: [rec(100, 'X')] }),
      negocio({ id: 'b', nombre: 'Popular', clientesActivos: 200, recompensas: [rec(80, 'Barato'), rec(300, 'Caro')] }),
    ];
    const hero = heroeDelHome(negs, {}, AHORA);
    expect(hero?.tipo).toBe('descubrir');
    expect(hero?.negocio.id).toBe('b');
    expect(hero?.recompensa?.descripcion).toBe('Barato'); // el objetivo más cercano
  });

  it('sin negocios no hay héroe', () => {
    expect(heroeDelHome([], {}, AHORA)).toBeNull();
  });

  it('a igual urgencia, gana el negocio con más puntos', () => {
    const negs = [
      negocio({ id: 'a', nombre: 'Menos', recompensas: [rec(300, 'P')] }),
      negocio({ id: 'b', nombre: 'Mas', recompensas: [rec(360, 'P')] }),
    ];
    // ambos near-win con faltan=50 (a: 250/300, b: 310/360)
    const hero = heroeDelHome(negs, { a: rel(250, 3), b: rel(310, 3) }, AHORA);
    expect(hero?.tipo).toBe('near-win');
    expect(hero?.negocio.id).toBe('b');
  });
});

describe('actividadGlobal', () => {
  it('suma la racha y los puntos del día CRUZANDO negocios, no solo el más visitado', () => {
    // Negocio A: visitó ayer y hoy. Negocio B: visitó anteayer. Racha real = 3 días seguidos,
    // aunque ningún negocio por sí solo tenga esa racha.
    const relaciones = {
      a: rel(100, 0, [
        { diasAtras: 0, monto: 1000, puntos: 10 },
        { diasAtras: 1, monto: 2000, puntos: 20 },
      ]),
      b: rel(50, 2, [{ diasAtras: 2, monto: 500, puntos: 5 }]),
    };
    const { rachaDiasSeguidos, semana } = actividadGlobal(relaciones);
    expect(rachaDiasSeguidos).toBe(3);
    const hoy = semana.find((dia) => dia.esHoy);
    expect(hoy?.puntos).toBe(10);
  });

  it('sin ninguna visita, racha 0 y los 7 días en cero', () => {
    const { rachaDiasSeguidos, semana } = actividadGlobal({ a: rel(50, 10, []) });
    expect(rachaDiasSeguidos).toBe(0);
    expect(semana.every((dia) => dia.puntos === 0)).toBe(true);
  });
});
