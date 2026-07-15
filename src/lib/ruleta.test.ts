import { describe, expect, it } from 'vitest';
import {
  COOLDOWN_RULETA_DIAS,
  elegirPremio,
  estadoCooldown,
  PREMIOS_RULETA,
} from './ruleta';

const DIA_MS = 86_400_000;
const AHORA = 1_700_000_000_000;

describe('estadoCooldown', () => {
  it('permite girar si nunca se tiró', () => {
    expect(estadoCooldown(undefined, AHORA)).toEqual({ puedeGirar: true, diasRestantes: 0 });
    expect(estadoCooldown(null, AHORA)).toEqual({ puedeGirar: true, diasRestantes: 0 });
  });

  it('bloquea con 7 días restantes justo después de girar', () => {
    const r = estadoCooldown(AHORA, AHORA);
    expect(r.puedeGirar).toBe(false);
    expect(r.diasRestantes).toBe(COOLDOWN_RULETA_DIAS);
  });

  it('redondea hacia arriba los días que faltan', () => {
    // Giró hace 3 días → faltan 4 para volver a girar.
    const r = estadoCooldown(AHORA - 3 * DIA_MS, AHORA);
    expect(r.puedeGirar).toBe(false);
    expect(r.diasRestantes).toBe(4);
  });

  it('vuelve a habilitar pasados los 7 días', () => {
    expect(estadoCooldown(AHORA - 7 * DIA_MS, AHORA).puedeGirar).toBe(true);
    expect(estadoCooldown(AHORA - 10 * DIA_MS, AHORA).puedeGirar).toBe(true);
  });
});

describe('elegirPremio', () => {
  it('con aleatorio 0 cae en la primera porción', () => {
    const { premio, indice } = elegirPremio(PREMIOS_RULETA, 0);
    expect(indice).toBe(0);
    expect(premio.id).toBe(PREMIOS_RULETA[0].id);
  });

  it('con aleatorio cercano a 1 cae en la última porción (premio mayor)', () => {
    const { premio, indice } = elegirPremio(PREMIOS_RULETA, 0.999);
    expect(indice).toBe(PREMIOS_RULETA.length - 1);
    expect(premio.id).toBe('mayor');
  });

  it('respeta los tramos de peso acumulado', () => {
    // Pesos: 22,20,15,13,12,10,6,2 (total 100). objetivo = aleatorio*100 = 30 → 2da porción.
    expect(elegirPremio(PREMIOS_RULETA, 0.3).premio.id).toBe('off-5');
  });

  it('el premio mayor es el menos probable de todos', () => {
    const mayor = PREMIOS_RULETA.find((p) => p.id === 'mayor')!;
    for (const otro of PREMIOS_RULETA) {
      if (otro.id !== 'mayor') expect(otro.peso).toBeGreaterThan(mayor.peso);
    }
  });
});
