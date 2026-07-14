// Utilidades de geolocalización del marketplace: distancia Haversine
// (sin librerías de mapas) y formato de distancias/antigüedad.

export interface Coordenadas {
  lat: number;
  lng: number;
}

const RADIO_TIERRA_KM = 6371;
const MS_MES = 30.44 * 86_400_000;

const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

/** "a 350 m" para menos de 1 km, "a 2,4 km" en adelante. */
export function formatDistancia(km: number): string {
  if (km < 1) {
    const metros = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `a ${metros} m`;
  }
  return `a ${km.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

/** Meses (enteros, mínimo 1) transcurridos desde una fecha ISO. */
export function mesesDesde(fechaIso: string): number {
  return Math.max(1, Math.floor((Date.now() - new Date(fechaIso).getTime()) / MS_MES));
}
