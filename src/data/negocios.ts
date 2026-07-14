import type { Recompensa, Rubro, Visita } from './mockClientes';

/**
 * Marketplace de locales afiliados a Control.Evo.
 * Nombres 100% ficticios (no son marcas reales); la geografía sí es real:
 * todas las coordenadas caen dentro del barrio de Palermo, Buenos Aires.
 */
export interface Negocio {
  id: string;
  nombre: string;
  categoria: string;
  rubro: Rubro;
  emoji: string;
  lat: number;
  lng: number;
  /** Clientes que ya usan el club en este local (números de local de barrio). */
  clientesActivos: number;
  /** Fecha ISO en la que el local se sumó a Control.Evo. */
  fechaAlta: string;
  recompensas: Recompensa[];
}

/** Relación de puntos del cliente con UN negocio (independiente por local). */
export interface RelacionNegocio {
  puntos: number;
  ultimaVisitaDias: number;
  historial: Visita[];
}

export const NEGOCIOS: Negocio[] = [
  {
    id: 'cafe-nardo',
    nombre: 'Café Nardo',
    categoria: 'Café',
    rubro: 'gastro',
    emoji: '☕',
    lat: -34.5862,
    lng: -58.4254,
    clientesActivos: 168,
    fechaAlta: '2026-03-18',
    recompensas: [
      { pts: 120, descripcion: 'Café de especialidad', categoria: 'Bebidas' },
      { pts: 260, descripcion: 'Tostado + café', categoria: 'Comida' },
      { pts: 450, descripcion: '15% off en tu mesa', categoria: 'Descuentos' },
    ],
  },
  {
    id: 'bar-aguirre',
    nombre: 'Bar Aguirre',
    categoria: 'Bar de tragos',
    rubro: 'gastro',
    emoji: '🍸',
    lat: -34.5895,
    lng: -58.4295,
    clientesActivos: 92,
    fechaAlta: '2026-05-06',
    recompensas: [
      { pts: 180, descripcion: 'Trago clásico', categoria: 'Bebidas' },
      { pts: 350, descripcion: '2x1 en tragos de autor', categoria: 'Bebidas' },
      { pts: 600, descripcion: 'Tabla para compartir', categoria: 'Comida' },
    ],
  },
  {
    id: 'cerveceria-soler',
    nombre: 'Cervecería Soler',
    categoria: 'Cervecería',
    rubro: 'gastro',
    emoji: '🍺',
    lat: -34.5823,
    lng: -58.4337,
    clientesActivos: 235,
    fechaAlta: '2026-03-27',
    recompensas: [
      { pts: 150, descripcion: 'Pinta IPA de la casa', categoria: 'Bebidas' },
      { pts: 280, descripcion: 'Papas con cheddar', categoria: 'Comida' },
      { pts: 500, descripcion: '2x1 en pintas', categoria: 'Bebidas' },
      { pts: 900, descripcion: 'Growler 1L de regalo', categoria: 'Regalos' },
    ],
  },
  {
    id: 'rooftop-malabia',
    nombre: 'Rooftop Malabia',
    categoria: 'Rooftop',
    rubro: 'gastro',
    emoji: '🌇',
    lat: -34.588,
    lng: -58.4315,
    clientesActivos: 121,
    fechaAlta: '2026-04-14',
    recompensas: [
      { pts: 200, descripcion: 'Spritz al atardecer', categoria: 'Bebidas' },
      { pts: 400, descripcion: 'Entrada + brindis', categoria: 'Comida' },
      { pts: 750, descripcion: '10% off en tu cuenta', categoria: 'Descuentos' },
    ],
  },
  {
    id: 'bistro-costa-rica',
    nombre: 'Bistró Costa Rica',
    categoria: 'Bistró',
    rubro: 'gastro',
    emoji: '🍽️',
    lat: -34.589,
    lng: -58.4289,
    clientesActivos: 76,
    fechaAlta: '2026-06-02',
    recompensas: [
      { pts: 220, descripcion: 'Copa de vino de la casa', categoria: 'Bebidas' },
      { pts: 380, descripcion: 'Postre del día', categoria: 'Comida' },
      { pts: 700, descripcion: 'Menú de 3 pasos (20% off)', categoria: 'Descuentos' },
    ],
  },
  {
    id: 'forneria-thames',
    nombre: 'Fornería Thames',
    categoria: 'Pizzería',
    rubro: 'gastro',
    emoji: '🍕',
    lat: -34.5874,
    lng: -58.4323,
    clientesActivos: 143,
    fechaAlta: '2026-04-30',
    recompensas: [
      { pts: 160, descripcion: 'Fainá + bebida', categoria: 'Comida' },
      { pts: 320, descripcion: 'Muzzarella grande 30% off', categoria: 'Descuentos' },
      { pts: 550, descripcion: 'Pizza de autor de regalo', categoria: 'Regalos' },
    ],
  },
  {
    id: 'almacen-guatemala',
    nombre: 'Almacén Guatemala',
    categoria: 'Almacén',
    rubro: 'super',
    emoji: '🛒',
    lat: -34.5841,
    lng: -58.4243,
    clientesActivos: 197,
    fechaAlta: '2026-03-21',
    recompensas: [
      { pts: 140, descripcion: 'Docena de huevos', categoria: 'Regalos' },
      { pts: 300, descripcion: '5% off en la compra', categoria: 'Descuentos' },
      { pts: 520, descripcion: 'Pack yerba + azúcar', categoria: 'Regalos' },
    ],
  },
  {
    id: 'super-charcas',
    nombre: 'Súper Charcas',
    categoria: 'Supermercado',
    rubro: 'super',
    emoji: '🏪',
    lat: -34.5806,
    lng: -58.4215,
    clientesActivos: 264,
    fechaAlta: '2026-04-08',
    recompensas: [
      { pts: 150, descripcion: 'Gaseosa 2L de regalo', categoria: 'Regalos' },
      { pts: 350, descripcion: '5% off en la compra', categoria: 'Descuentos' },
      { pts: 650, descripcion: '10% off en la compra', categoria: 'Descuentos' },
      { pts: 1000, descripcion: 'Vale de compra $10.000', categoria: 'Descuentos' },
    ],
  },
  {
    id: 'despensa-thames',
    nombre: 'Despensa Thames',
    categoria: 'Despensa',
    rubro: 'super',
    emoji: '🧺',
    lat: -34.586,
    lng: -58.4305,
    clientesActivos: 58,
    fechaAlta: '2026-06-09',
    recompensas: [
      { pts: 120, descripcion: 'Pan del día', categoria: 'Comida' },
      { pts: 260, descripcion: 'Fiambre 200g de regalo', categoria: 'Regalos' },
      { pts: 480, descripcion: '8% off en la compra', categoria: 'Descuentos' },
    ],
  },
  {
    id: 'mercadito-fitzroy',
    nombre: 'Mercadito Fitz Roy',
    categoria: 'Autoservicio',
    rubro: 'super',
    emoji: '🥑',
    lat: -34.5821,
    lng: -58.4369,
    clientesActivos: 110,
    fechaAlta: '2026-05-19',
    recompensas: [
      { pts: 130, descripcion: 'Bolsa de frutas de estación', categoria: 'Regalos' },
      { pts: 280, descripcion: 'Jugo exprimido 1L', categoria: 'Bebidas' },
      { pts: 500, descripcion: '10% off en verdulería', categoria: 'Descuentos' },
    ],
  },
];

/**
 * Negocios donde el cliente de la demo YA tiene puntos (para que el marketplace
 * no arranque vacío). El resto de los locales todavía no tiene relación:
 * ahí se muestra "Sumate" en vez de 0 puntos sin contexto.
 * Montos en ARS: 1 punto cada $100.
 */
export const RELACIONES_INICIALES: Record<string, RelacionNegocio> = {
  'cafe-nardo': {
    puntos: 320,
    ultimaVisitaDias: 2,
    historial: [
      { diasAtras: 2, monto: 2800, puntos: 28 },
      { diasAtras: 5, monto: 3400, puntos: 34 },
      { diasAtras: 9, monto: 2200, puntos: 22 },
      { diasAtras: 13, monto: 4100, puntos: 41 },
      { diasAtras: 19, monto: 2600, puntos: 26 },
      { diasAtras: 26, monto: 3900, puntos: 39 },
    ],
  },
  'cerveceria-soler': {
    puntos: 540,
    ultimaVisitaDias: 4,
    historial: [
      { diasAtras: 4, monto: 6200, puntos: 62 },
      { diasAtras: 8, monto: 4800, puntos: 48 },
      { diasAtras: 16, monto: 7400, puntos: 74 },
      { diasAtras: 23, monto: 5100, puntos: 51 },
      { diasAtras: 30, monto: 8300, puntos: 83 },
    ],
  },
  'almacen-guatemala': {
    puntos: 185,
    ultimaVisitaDias: 1,
    historial: [
      { diasAtras: 1, monto: 5200, puntos: 52 },
      { diasAtras: 6, monto: 3800, puntos: 38 },
      { diasAtras: 12, monto: 6400, puntos: 64 },
      { diasAtras: 18, monto: 2900, puntos: 29 },
    ],
  },
  'rooftop-malabia': {
    puntos: 95,
    ultimaVisitaDias: 11,
    historial: [
      { diasAtras: 11, monto: 5600, puntos: 56 },
      { diasAtras: 24, monto: 3900, puntos: 39 },
    ],
  },
};
