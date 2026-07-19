import { afterEach, describe, expect, it, vi } from 'vitest';
import { distanciaKm, formatDistancia, geocodificarDireccion, type Coordenadas } from './geo';

describe('distanciaKm (Haversine)', () => {
  it('es 0 entre el mismo punto', () => {
    const p: Coordenadas = { lat: -34.5855, lng: -58.428 };
    expect(distanciaKm(p, p)).toBe(0);
  });

  it('un grado de latitud ≈ 111,19 km', () => {
    expect(distanciaKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1);
  });

  it('un grado de longitud en el ecuador ≈ 111,19 km', () => {
    expect(distanciaKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 1);
  });

  it('es simétrica', () => {
    const a: Coordenadas = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires
    const b: Coordenadas = { lat: -34.9011, lng: -56.1645 }; // Montevideo
    expect(distanciaKm(a, b)).toBeCloseTo(distanciaKm(b, a), 6);
  });

  it('mide la distancia Buenos Aires–Montevideo (~205 km) con tolerancia', () => {
    const ba: Coordenadas = { lat: -34.6037, lng: -58.3816 };
    const mvd: Coordenadas = { lat: -34.9011, lng: -56.1645 };
    const km = distanciaKm(ba, mvd);
    expect(km).toBeGreaterThan(195);
    expect(km).toBeLessThan(215);
  });
});

describe('formatDistancia', () => {
  it('usa metros por debajo de 1 km', () => {
    expect(formatDistancia(0.35)).toBe('a 350 m');
  });

  it('usa km con una decimal por encima de 1 km', () => {
    expect(formatDistancia(2.43)).toBe('a 2,4 km');
  });
});

describe('geocodificarDireccion (Nominatim)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve lat/lng del primer resultado cuando la búsqueda tiene éxito', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-34.6037', lon: '-58.3816' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const coords = await geocodificarDireccion('Av. Corrientes 1234');
    expect(coords).toEqual({ lat: -34.6037, lng: -58.3816 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('nominatim.openstreetmap.org/search');
    expect(fetchMock.mock.calls[0][0]).toContain('countrycodes=ar');
  });

  it('devuelve null cuando no hay resultados', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
    );
    expect(await geocodificarDireccion('dirección inexistente zzz')).toBeNull();
  });

  it('devuelve null (sin tirar) ante un error de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    expect(await geocodificarDireccion('Av. Corrientes 1234')).toBeNull();
  });

  it('no llama a fetch con query vacía', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await geocodificarDireccion('   ')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
