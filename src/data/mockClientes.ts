export type Rubro = 'gastro' | 'super' | 'carniceria';

/** Coacciona un valor de rubro leído del backend (texto libre) al union type seguro. */
export function parseRubro(valor: string | null | undefined): Rubro {
  return valor === 'super' || valor === 'carniceria' ? valor : 'gastro';
}

export type NombreNivel = 'Nuevo' | 'Frecuente' | 'VIP';

export type CategoriaRecompensa = 'Bebidas' | 'Comida' | 'Descuentos' | 'Regalos';

export interface Nivel {
  nombre: NombreNivel;
  min: number;
}

export interface Recompensa {
  pts: number;
  descripcion: string;
  categoria: CategoriaRecompensa;
  /** Combo: además de los puntos, se abona esta cantidad de plata al canjear (ARS). */
  costoDinero?: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  puntos: number;
  ultimaVisitaDias: number;
  /** Cumpleaños del socio en formato 'MM-DD' (para el saludo/beneficio de cumpleaños). */
  nacimiento?: string;
}

/** Visita mock del socio en la app del cliente. `diasAtras` = días desde hoy. */
export interface Visita {
  diasAtras: number;
  monto: number;
  puntos: number;
  /** El cliente probó un producto/categoría nueva en esta visita (misión "probá algo nuevo"). */
  nuevo?: boolean;
  /** Categoría de lo consumido en la visita (para derivar "Tus favoritos"). */
  categoria?: CategoriaRecompensa;
}

/** Franja horaria de baja demanda donde el negocio ofrece puntos x2 (beneficio informativo). */
export interface HorarioValle {
  /** Hora de inicio en formato 'HH:MM'. */
  desde: string;
  /** Hora de fin en formato 'HH:MM'. */
  hasta: string;
  /** Días de la semana en que aplica (0 = domingo … 6 = sábado). */
  dias: number[];
}

/** Combo de asado de fin de semana destacado por una carnicería (feature de nicho del rubro). */
export interface ComboFinde {
  /** Qué incluye el combo (ej. "Vacío + chorizo + morcilla para 4"). */
  descripcion: string;
  /** Precio del combo en ARS (opcional). */
  precio?: number;
  /** Días en que aplica (0 = domingo … 6 = sábado), mismo formato que `HorarioValle.dias`. */
  dias: number[];
}

/** Evento/promoción con fecha que el dueño cargó: visitar dentro del rango desbloquea un extra. */
export interface EventoNegocio {
  nombre: string;
  /** Fecha ISO (yyyy-mm-dd) de inicio, inclusive. */
  fechaInicio: string;
  /** Fecha ISO (yyyy-mm-dd) de fin, inclusive. */
  fechaFin: string;
  recompensaExtra: string;
}

/** Tipo de promo permanente del local (no es canjeable con puntos: es un beneficio siempre activo). */
export type TipoPromo = '2x1' | 'horario' | 'delivery-gratis' | 'descuento';

/** Promo estructurada del negocio: se muestra como badge/banner destacado. */
export interface Promo {
  tipo: TipoPromo;
  titulo: string;
  /** Aclaración opcional (condición, horario, mínimo de compra, etc.). */
  detalle?: string;
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
  /** Cliente que representa al usuario logueado en el modo "App del cliente". */
  clienteAppId: string;
  /** Historial de visitas de ese usuario para racha, gráficos e historial. */
  historialApp: Visita[];
  /** Eventos con fecha del negocio (misiones por evento). Sólo en la vista de un local. */
  eventos?: EventoNegocio[];
  /** Franja horaria valle con puntos x2 (aviso informativo). Sólo en la vista de un local. */
  horarioValle?: HorarioValle;
  /** Promos permanentes del local (2x1, delivery gratis, etc.). Sólo en la vista de un local. */
  promos?: Promo[];
  /** Beneficios NO monetarios del nivel más alto (VIP). Sólo en la vista de un local. */
  beneficiosVip?: string[];
  /** Combo de asado de fin de semana destacado (carnicerías). Sólo en la vista de un local. */
  comboFinde?: ComboFinde;
}

export const DIAS_INACTIVO = 20;

export const DATA_RUBROS: Record<Rubro, RubroData> = {
  gastro: {
    rubro: 'gastro',
    etiqueta: 'Gastronomía',
    nombreNegocio: 'Demo Gastronomía',
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
      { pts: 150, descripcion: 'Cocktail de bienvenida', categoria: 'Bebidas' },
      { pts: 200, descripcion: 'Entrada a elección', categoria: 'Comida' },
      { pts: 300, descripcion: 'Postre de la casa', categoria: 'Comida' },
      { pts: 450, descripcion: '10% off en tu cuenta', categoria: 'Descuentos' },
      { pts: 500, descripcion: '2x1 en tragos de autor', categoria: 'Bebidas' },
      { pts: 800, descripcion: 'Botella de vino reserva', categoria: 'Bebidas' },
      { pts: 1200, descripcion: 'Cena para dos (30% off)', categoria: 'Descuentos' },
    ],
    clientes: [
      { id: 'g1', nombre: 'Martina Gómez', telefono: '11 5320-4471', puntos: 620, ultimaVisitaDias: 2, nacimiento: '07-13' },
      { id: 'g2', nombre: 'Lucas Fernández', telefono: '11 4482-9013', puntos: 740, ultimaVisitaDias: 5 },
      { id: 'g3', nombre: 'Sofía Paredes', telefono: '11 6205-7788', puntos: 130, ultimaVisitaDias: 1 },
      { id: 'g4', nombre: 'Diego Álvarez', telefono: '11 3390-1246', puntos: 470, ultimaVisitaDias: 26 },
      { id: 'g5', nombre: 'Valentina Ríos', telefono: '11 5877-3402', puntos: 90, ultimaVisitaDias: 34 },
      { id: 'g6', nombre: 'Franco Bianchi', telefono: '11 2661-8895', puntos: 985, ultimaVisitaDias: 8 },
      { id: 'g7', nombre: 'Camila Duarte', telefono: '11 4098-5521', puntos: 310, ultimaVisitaDias: 22 },
    ],
    metricasSemana: { puntosAcreditados: 4820, subieronDeNivel: 3 },
    mensajeWhatsApp:
      'Hola! Probé la demo de SumaPuntos y quiero implementarlo en mi bar/restaurante. ¿Cómo seguimos?',
    clienteAppId: 'g1',
    historialApp: [
      { diasAtras: 2, monto: 5200, puntos: 52 },
      { diasAtras: 6, monto: 3800, puntos: 38 },
      { diasAtras: 11, monto: 6100, puntos: 61 },
      { diasAtras: 15, monto: 2400, puntos: 24 },
      { diasAtras: 20, monto: 4700, puntos: 47 },
      { diasAtras: 27, monto: 8900, puntos: 89 },
      { diasAtras: 34, monto: 3300, puntos: 33 },
    ],
  },
  super: {
    rubro: 'super',
    etiqueta: 'Supermercado',
    nombreNegocio: 'Demo Supermercado',
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
      { pts: 150, descripcion: 'Pack de yerba 1kg', categoria: 'Regalos' },
      { pts: 200, descripcion: 'Gaseosa 2L de regalo', categoria: 'Regalos' },
      { pts: 400, descripcion: '5% de descuento en la compra', categoria: 'Descuentos' },
      { pts: 550, descripcion: 'Combo desayuno', categoria: 'Comida' },
      { pts: 700, descripcion: '10% de descuento en la compra', categoria: 'Descuentos' },
      { pts: 1000, descripcion: 'Vale de compra Gs. 100.000', categoria: 'Descuentos' },
      { pts: 1500, descripcion: 'Canasta familiar de regalo', categoria: 'Regalos' },
    ],
    clientes: [
      { id: 's1', nombre: 'Ramona Villalba', telefono: '0981 456 213', puntos: 860, ultimaVisitaDias: 1, nacimiento: '07-13' },
      { id: 's2', nombre: 'Óscar Benítez', telefono: '0971 802 349', puntos: 1240, ultimaVisitaDias: 3 },
      { id: 's3', nombre: 'Nélida Cáceres', telefono: '0983 610 587', puntos: 320, ultimaVisitaDias: 6 },
      { id: 's4', nombre: 'Carlos Giménez', telefono: '0961 224 908', puntos: 540, ultimaVisitaDias: 28 },
      { id: 's5', nombre: 'Fátima Rojas', telefono: '0985 773 140', puntos: 150, ultimaVisitaDias: 2 },
      { id: 's6', nombre: 'Blas Ocampos', telefono: '0972 391 665', puntos: 960, ultimaVisitaDias: 23 },
      { id: 's7', nombre: 'Lourdes Ayala', telefono: '0982 508 431', puntos: 410, ultimaVisitaDias: 12 },
    ],
    metricasSemana: { puntosAcreditados: 6150, subieronDeNivel: 4 },
    mensajeWhatsApp:
      'Hola! Probé la demo de SumaPuntos y quiero implementarlo en mi supermercado. ¿Cómo seguimos?',
    clienteAppId: 's1',
    historialApp: [
      { diasAtras: 1, monto: 255000, puntos: 51 },
      { diasAtras: 4, monto: 180000, puntos: 36 },
      { diasAtras: 9, monto: 320000, puntos: 64 },
      { diasAtras: 13, monto: 145000, puntos: 29 },
      { diasAtras: 18, monto: 410000, puntos: 82 },
      { diasAtras: 25, monto: 95000, puntos: 19 },
      { diasAtras: 31, monto: 270000, puntos: 54 },
    ],
  },
  carniceria: {
    rubro: 'carniceria',
    etiqueta: 'Carnicería',
    nombreNegocio: 'Demo Carnicería',
    monedaPrefijo: '$',
    locale: 'es-AR',
    montoPorPunto: 100, // 1 punto cada $100 (ARS)
    montoEjemplo: 9000,
    niveles: [
      { nombre: 'Nuevo', min: 0 },
      { nombre: 'Frecuente', min: 300 },
      { nombre: 'VIP', min: 800 },
    ],
    recompensas: [
      { pts: 120, descripcion: 'Chorizos parrilleros x6', categoria: 'Regalos' },
      { pts: 200, descripcion: 'Provoleta de regalo', categoria: 'Regalos' },
      { pts: 350, descripcion: '10% off en tu compra', categoria: 'Descuentos' },
      { pts: 500, descripcion: 'Combo asado (vacío + chorizo)', categoria: 'Comida', costoDinero: 6000 },
      { pts: 700, descripcion: 'Delivery del pedido sin cargo', categoria: 'Descuentos' },
      { pts: 900, descripcion: 'Matambre de cerdo de regalo', categoria: 'Regalos' },
      { pts: 1300, descripcion: 'Media res porcionada (15% off)', categoria: 'Descuentos' },
    ],
    clientes: [
      { id: 'c1', nombre: 'Héctor Sosa', telefono: '11 5541-2093', puntos: 680, ultimaVisitaDias: 2, nacimiento: '07-13' },
      { id: 'c2', nombre: 'Marta Quiroga', telefono: '11 4471-8852', puntos: 910, ultimaVisitaDias: 4 },
      { id: 'c3', nombre: 'Rubén Ledesma', telefono: '11 6690-3317', puntos: 240, ultimaVisitaDias: 1 },
      { id: 'c4', nombre: 'Norma Villar', telefono: '11 3308-7745', puntos: 520, ultimaVisitaDias: 27 },
      { id: 'c5', nombre: 'Aldo Peralta', telefono: '11 5882-1160', puntos: 130, ultimaVisitaDias: 33 },
      { id: 'c6', nombre: 'Silvia Roldán', telefono: '11 2274-9908', puntos: 1050, ultimaVisitaDias: 6 },
      { id: 'c7', nombre: 'Jorge Maidana', telefono: '11 4013-6624', puntos: 360, ultimaVisitaDias: 19 },
    ],
    metricasSemana: { puntosAcreditados: 5240, subieronDeNivel: 3 },
    mensajeWhatsApp:
      'Hola! Probé la demo de SumaPuntos y quiero implementarlo en mi carnicería. ¿Cómo seguimos?',
    clienteAppId: 'c1',
    historialApp: [
      { diasAtras: 2, monto: 8600, puntos: 86 },
      { diasAtras: 5, monto: 5400, puntos: 54 },
      { diasAtras: 10, monto: 12800, puntos: 128 },
      { diasAtras: 14, monto: 4200, puntos: 42 },
      { diasAtras: 21, monto: 15600, puntos: 156 },
      { diasAtras: 28, monto: 6900, puntos: 69 },
      { diasAtras: 35, monto: 9300, puntos: 93 },
    ],
  },
};
