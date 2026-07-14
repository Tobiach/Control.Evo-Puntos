import { describe, expect, it } from 'vitest';
import { RELACIONES_INICIALES } from '../data/negocios';
import { desafioSemanal, puntosSemanaCliente, rankingGrupo } from './social';

const histCafe = RELACIONES_INICIALES['cafe-nardo'].historial; // 4 visitas en 7 días, 125 pts
const histAlmacen = RELACIONES_INICIALES['almacen-guatemala'].historial; // 2 visitas en 7 días

describe('rankingGrupo', () => {
  it('incluye al cliente más los 3 amigos mock', () => {
    const ranking = rankingGrupo('cafe-nardo', histCafe, 'Martina Gómez');
    expect(ranking).toHaveLength(4);
    expect(ranking.filter((p) => p.esYo)).toHaveLength(1);
  });

  it('usa el nombre de pila del cliente y sus puntos de la semana', () => {
    const ranking = rankingGrupo('cafe-nardo', histCafe, 'Martina Gómez');
    const yo = ranking.find((p) => p.esYo)!;
    expect(yo.nombre).toBe('Martina');
    expect(yo.puntos).toBe(puntosSemanaCliente(histCafe));
    expect(yo.puntos).toBe(125); // 28 + 34 + 22 + 41
  });

  it('queda ordenado de mayor a menor por puntos', () => {
    const ranking = rankingGrupo('cafe-nardo', histCafe, 'Martina Gómez');
    for (let i = 1; i < ranking.length; i += 1) {
      expect(ranking[i - 1].puntos).toBeGreaterThanOrEqual(ranking[i].puntos);
    }
  });
});

describe('desafioSemanal', () => {
  it('se cumple cuando las visitas alcanzan el objetivo', () => {
    const d = desafioSemanal('cafe-nardo', histCafe); // 4 visitas ≥ objetivo 3
    expect(d.objetivo).toBe(3);
    expect(d.progreso).toBe(3); // topeado al objetivo
    expect(d.estado).toBe('cumplido');
  });

  it('queda en curso cuando faltan visitas', () => {
    const d = desafioSemanal('almacen-guatemala', histAlmacen); // 2 visitas < 3
    expect(d.progreso).toBe(2);
    expect(d.estado).toBe('en-curso');
  });

  it('es determinístico por negocio (mismo retador)', () => {
    const a = desafioSemanal('cafe-nardo', histCafe);
    const b = desafioSemanal('cafe-nardo', histCafe);
    expect(a.retador).toBe(b.retador);
  });
});
