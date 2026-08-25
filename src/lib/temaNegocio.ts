import type { Rubro } from '../data/mockClientes';

/**
 * Degradé de fondo por rubro, para la card editorial de Explorar cuando el negocio no tiene
 * `portadaUrl` cargada (evita el placeholder "Foto pendiente" en una pantalla pensada para
 * ser vistosa). `super` cubre tanto almacenes como supermercados — es un solo rubro real en
 * el modelo, aunque el mockup original los mostraba como dos categorías separadas.
 */
export const GRADIENTE_RUBRO: Record<Rubro, { from: string; to: string }> = {
  cafeteria: { from: '#C8A97A', to: '#8B6A3E' }, // marrón cálido café
  carniceria: { from: '#A0503A', to: '#6B2A1A' }, // borgoña profundo
  super: { from: '#4A8C6A', to: '#2A5C42' }, // verde (almacén/súper)
  gastro: { from: '#3A6A8C', to: '#1A3C5C' }, // azul profundo (bares/restaurantes)
};

export const gradienteCss = (rubro: Rubro): string => {
  const { from, to } = GRADIENTE_RUBRO[rubro];
  return `linear-gradient(160deg, ${from}, ${to})`;
};
