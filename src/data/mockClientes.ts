export type Rubro = 'gastro' | 'super';

export type NombreNivel = 'Nuevo' | 'Frecuente' | 'VIP';

export interface Nivel {
  nombre: NombreNivel;
  min: number;
}

export interface Recompensa {
  pts: number;
  descripcion: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  puntos: number;
  ultimaVisitaDias: number;
}

export interface MetricasSemana {
  puntosAcreditados: number;
  subieronDeNivel: number;
}

export interface RubroData {
  rubro: Rubro;
  etiqueta: string;
  nombreNegocio: string;
  monedaPrefijo: string;
  locale: string;
  montoPorPunto: number;
  montoEjemplo: number;
  niveles: Nivel[];
  recompensas: Recompensa[];
  clientes: Cliente[];
  metricasSemana: MetricasSemana;
  mensajeWhatsApp: string;
}

export const DIAS_INACTIVO = 20;

export const DATA_RUBROS: Record<Rubro, RubroData> = {
  gastro: {
    rubro: 'gastro',
    etiqueta: 'Gastronomía',
    nombreNegocio: 'Cielo Rooftop',
    monedaPrefijo: '$',
    locale: 'es-AR',
    montoPorPunto: 100, // 1 punto cada $100 (ARS)
    montoEjemplo: 4500,
    niveles: [
      { nombre: 'Nuevo', min: 0 },
      { nombre: 'Frecuente', min: 250 },
      { nombre: 'VIP', min: 700 },
    ],
    recompensas: [
      { pts: 150, descripcion: 'Cocktail de bienvenida' },
      { pts: 300, descripcion: 'Postre de la casa' },
      { pts: 500, descripcion: '2x1 en tragos de autor' },
      { pts: 800, descripcion: 'Botella de vino reserva' },
      { pts: 1200, descripcion: 'Cena para dos (30% off)' },
    ],
    clientes: [
      { id: 'g1', nombre: 'Martina Gómez', telefono: '11 5320-4471', puntos: 620, ultimaVisitaDias: 2 },
      { id: 'g2', nombre: 'Lucas Fernández', telefono: '11 4482-9013', puntos: 740, ultimaVisitaDias: 5 },
      { id: 'g3', nombre: 'Sofía Paredes', telefono: '11 6205-7788', puntos: 130, ultimaVisitaDias: 1 },
      { id: 'g4', nombre: 'Diego Álvarez', telefono: '11 3390-1246', puntos: 470, ultimaVisitaDias: 26 },
      { id: 'g5', nombre: 'Valentina Ríos', telefono: '11 5877-3402', puntos: 90, ultimaVisitaDias: 34 },
      { id: 'g6', nombre: 'Franco Bianchi', telefono: '11 2661-8895', puntos: 985, ultimaVisitaDias: 8 },
      { id: 'g7', nombre: 'Camila Duarte', telefono: '11 4098-5521', puntos: 310, ultimaVisitaDias: 22 },
    ],
    metricasSemana: { puntosAcreditados: 4820, subieronDeNivel: 3 },
    mensajeWhatsApp:
      'Hola! Probé la demo del Club de Puntos de Control.Evo y quiero implementarlo en mi bar/restaurante. ¿Cómo seguimos?',
  },
  super: {
    rubro: 'super',
    etiqueta: 'Supermercado',
    nombreNegocio: 'Almacén Don Beto',
    monedaPrefijo: 'Gs.',
    locale: 'es-PY',
    montoPorPunto: 5000, // 1 punto cada Gs. 5.000 (PYG)
    montoEjemplo: 250000,
    niveles: [
      { nombre: 'Nuevo', min: 0 },
      { nombre: 'Frecuente', min: 400 },
      { nombre: 'VIP', min: 1000 },
    ],
    recompensas: [
      { pts: 200, descripcion: 'Gaseosa 2L de regalo' },
      { pts: 400, descripcion: '5% de descuento en la compra' },
      { pts: 700, descripcion: '10% de descuento en la compra' },
      { pts: 1000, descripcion: 'Vale de compra Gs. 100.000' },
      { pts: 1500, descripcion: 'Canasta familiar de regalo' },
    ],
    clientes: [
      { id: 's1', nombre: 'Ramona Villalba', telefono: '0981 456 213', puntos: 860, ultimaVisitaDias: 1 },
      { id: 's2', nombre: 'Óscar Benítez', telefono: '0971 802 349', puntos: 1240, ultimaVisitaDias: 3 },
      { id: 's3', nombre: 'Nélida Cáceres', telefono: '0983 610 587', puntos: 320, ultimaVisitaDias: 6 },
      { id: 's4', nombre: 'Carlos Giménez', telefono: '0961 224 908', puntos: 540, ultimaVisitaDias: 28 },
      { id: 's5', nombre: 'Fátima Rojas', telefono: '0985 773 140', puntos: 150, ultimaVisitaDias: 2 },
      { id: 's6', nombre: 'Blas Ocampos', telefono: '0972 391 665', puntos: 960, ultimaVisitaDias: 23 },
      { id: 's7', nombre: 'Lourdes Ayala', telefono: '0982 508 431', puntos: 410, ultimaVisitaDias: 12 },
    ],
    metricasSemana: { puntosAcreditados: 6150, subieronDeNivel: 4 },
    mensajeWhatsApp:
      'Hola! Probé la demo del Club de Puntos de Control.Evo y quiero implementarlo en mi supermercado. ¿Cómo seguimos?',
  },
};
