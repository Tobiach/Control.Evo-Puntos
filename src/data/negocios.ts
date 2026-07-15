import type {
  EventoNegocio,
  HorarioValle,
  Promo,
  Recompensa,
  Rubro,
  Visita,
} from './mockClientes';

const DIA_MS = 86_400_000;

/**
 * Fecha ISO (yyyy-mm-dd) desplazada respecto de hoy. Se usa para anclar los eventos
 * mock cerca del "presente" de la demo, así las misiones por evento siempre se pueden
 * demostrar sin importar el día en que se abra la app.
 */
const fechaRelativa = (diasDesdeHoy: number): string =>
  new Date(Date.now() + diasDesdeHoy * DIA_MS).toISOString().slice(0, 10);

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
  /** Eventos con fecha cargados por el dueño (misiones por evento). */
  eventos?: EventoNegocio[];
  /** Franja horaria valle con puntos x2, informada al cliente como beneficio. */
  horarioValle?: HorarioValle;
  /** Promos permanentes del local (2x1, delivery gratis, descuento, horario). */
  promos?: Promo[];
  /** Beneficios NO monetarios reservados al nivel más alto (VIP) de ESTE local. */
  beneficiosVip?: string[];
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
      { pts: 200, descripcion: 'Brunch completo', categoria: 'Comida', costoDinero: 3500 },
      { pts: 450, descripcion: '15% off en tu mesa', categoria: 'Descuentos' },
    ],
    eventos: [
      {
        nombre: 'Semana del café de origen',
        fechaInicio: fechaRelativa(-3),
        fechaFin: fechaRelativa(3),
        recompensaExtra: 'Método de filtrado de regalo',
      },
    ],
    horarioValle: { desde: '15:00', hasta: '17:00', dias: [1, 2, 3] },
    promos: [
      { tipo: '2x1', titulo: '2x1 en café con leche', detalle: 'Todas las mañanas hasta las 11' },
      { tipo: 'delivery-gratis', titulo: 'Envío sin cargo', detalle: 'En pedidos desde $6.000' },
    ],
    beneficiosVip: ['Mesa preferencial sin espera', 'Probás el café de origen antes que nadie'],
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
    promos: [
      { tipo: 'horario', titulo: 'Happy hour', detalle: 'Todos los días de 19 a 21' },
      { tipo: '2x1', titulo: '2x1 en cerveza tirada', detalle: 'Miércoles toda la noche' },
    ],
    beneficiosVip: ['Reserva de barra los fines de semana', 'Catas de autor por invitación'],
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
      { pts: 300, descripcion: 'Tabla de picada + 2 pintas', categoria: 'Comida', costoDinero: 4000 },
      { pts: 900, descripcion: 'Growler 1L de regalo', categoria: 'Regalos' },
    ],
    eventos: [
      {
        nombre: 'Fin de semana de la cerveza',
        fechaInicio: fechaRelativa(-6),
        fechaFin: fechaRelativa(-2),
        recompensaExtra: 'Pinta de edición especial gratis',
      },
    ],
    horarioValle: { desde: '18:00', hasta: '20:00', dias: [2, 3] },
    promos: [
      { tipo: '2x1', titulo: '2x1 en pintas', detalle: 'De lunes a miércoles' },
      { tipo: 'descuento', titulo: '20% en growlers', detalle: 'Llevando tu propio envase' },
    ],
    beneficiosVip: ['Acceso al patio cervecero exclusivo', 'Primera cata de cada tirada nueva'],
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
    beneficiosVip: ['Reserva de la mejor mesa al atardecer', 'Ingreso prioritario en noches llenas'],
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
    beneficiosVip: ['Menú degustación del chef antes que nadie', 'Mesa reservada sin espera'],
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
      { pts: 250, descripcion: 'Pizza grande + vino', categoria: 'Comida', costoDinero: 3000 },
      { pts: 550, descripcion: 'Pizza de autor de regalo', categoria: 'Regalos' },
    ],
    promos: [
      { tipo: 'delivery-gratis', titulo: 'Delivery sin cargo', detalle: 'En pedidos desde $8.000' },
      { tipo: '2x1', titulo: '2x1 en fainá', detalle: 'Todos los lunes' },
    ],
    beneficiosVip: ['Elegís la pizza del mes de la carta', 'Horno a leña reservado para tu grupo'],
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
    horarioValle: { desde: '09:00', hasta: '11:00', dias: [1, 2, 3, 4] },
    beneficiosVip: ['Pedido reservado por WhatsApp', 'Probás los productos nuevos antes de la góndola'],
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
      { pts: 300, descripcion: 'Combo asado (carne + carbón)', categoria: 'Regalos', costoDinero: 5000 },
      { pts: 650, descripcion: '10% off en la compra', categoria: 'Descuentos' },
      { pts: 1000, descripcion: 'Vale de compra $10.000', categoria: 'Descuentos' },
    ],
    promos: [
      { tipo: 'delivery-gratis', titulo: 'Envío gratis', detalle: 'En compras desde $15.000' },
      { tipo: 'descuento', titulo: '15% en frescos', detalle: 'Los miércoles de feria' },
    ],
    beneficiosVip: ['Caja rápida exclusiva sin fila', 'Ofertas de la semana antes que el resto'],
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
    beneficiosVip: ['Reservás la picada del finde', 'Entrega a domicilio sin cargo en el barrio'],
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
    beneficiosVip: ['Reservás la fruta de estación fresca', 'Cajón de verdura seleccionado para vos'],
  },
  {
    id: 'gelateria-honduras',
    nombre: 'Gelatería Honduras',
    categoria: 'Heladería',
    rubro: 'gastro',
    emoji: '🍨',
    lat: -34.5869,
    lng: -58.4271,
    clientesActivos: 154,
    fechaAlta: '2026-04-02',
    recompensas: [
      { pts: 110, descripcion: 'Cucurucho de 2 gustos', categoria: 'Comida' },
      { pts: 240, descripcion: 'Kilo de helado artesanal', categoria: 'Comida', costoDinero: 4200 },
      { pts: 420, descripcion: 'Postre helado del día', categoria: 'Comida' },
    ],
    promos: [
      { tipo: '2x1', titulo: '2x1 en cuartos', detalle: 'Martes y jueves' },
      { tipo: 'delivery-gratis', titulo: 'Envío sin cargo', detalle: 'En pedidos desde $5.000' },
    ],
    beneficiosVip: ['Probás los gustos nuevos antes que nadie', 'Cucurucho extra en tu cumple'],
  },
  {
    id: 'confiteria-gorriti',
    nombre: 'Confitería Gorriti',
    categoria: 'Panadería',
    rubro: 'gastro',
    emoji: '🥐',
    lat: -34.5908,
    lng: -58.4258,
    clientesActivos: 88,
    fechaAlta: '2026-05-28',
    recompensas: [
      { pts: 90, descripcion: 'Media docena de medialunas', categoria: 'Comida' },
      { pts: 180, descripcion: 'Café + tostado de campo', categoria: 'Comida' },
      { pts: 360, descripcion: 'Torta a elección 20% off', categoria: 'Descuentos' },
    ],
    horarioValle: { desde: '16:00', hasta: '18:00', dias: [1, 2, 3, 4] },
    promos: [
      { tipo: 'horario', titulo: 'Merienda con 20% off', detalle: 'De 16 a 18, de lunes a jueves' },
    ],
    beneficiosVip: ['Reservás tu docena del finde', 'Elegís el relleno de la torta del mes'],
  },
  {
    id: 'sushi-uriarte',
    nombre: 'Sushi Uriarte',
    categoria: 'Sushi',
    rubro: 'gastro',
    emoji: '🍣',
    lat: -34.5847,
    lng: -58.4292,
    clientesActivos: 132,
    fechaAlta: '2026-04-21',
    recompensas: [
      { pts: 200, descripcion: 'Roll de la casa', categoria: 'Comida' },
      { pts: 380, descripcion: 'Combinado de 15 piezas', categoria: 'Comida', costoDinero: 5200 },
      { pts: 650, descripcion: '15% off en tu pedido', categoria: 'Descuentos' },
    ],
    promos: [
      { tipo: 'delivery-gratis', titulo: 'Delivery sin cargo', detalle: 'En pedidos desde $12.000' },
      { tipo: 'descuento', titulo: '25% take away', detalle: 'Retirando por el local, de lunes a miércoles' },
    ],
    beneficiosVip: ['Roll de autor fuera de carta', 'Reserva de barra frente al itamae'],
  },
  {
    id: 'vineria-godoy-cruz',
    nombre: 'Vinería Godoy Cruz',
    categoria: 'Wine bar',
    rubro: 'gastro',
    emoji: '🍷',
    lat: -34.5798,
    lng: -58.4283,
    clientesActivos: 67,
    fechaAlta: '2026-06-11',
    recompensas: [
      { pts: 220, descripcion: 'Copa de vino de autor', categoria: 'Bebidas' },
      { pts: 400, descripcion: 'Tabla de quesos + copa', categoria: 'Comida', costoDinero: 3800 },
      { pts: 720, descripcion: 'Botella reserva 25% off', categoria: 'Descuentos' },
    ],
    eventos: [
      {
        nombre: 'Semana del Malbec',
        fechaInicio: fechaRelativa(-1),
        fechaFin: fechaRelativa(5),
        recompensaExtra: 'Cata guiada de 3 etiquetas',
      },
    ],
    promos: [
      { tipo: 'descuento', titulo: '2da copa al 50%', detalle: 'De lunes a jueves' },
    ],
    beneficiosVip: ['Catas privadas por invitación', 'Primer acceso a las etiquetas nuevas'],
  },
  {
    id: 'verduleria-serrano',
    nombre: 'Verdulería Serrano',
    categoria: 'Verdulería',
    rubro: 'super',
    emoji: '🥬',
    lat: -34.5885,
    lng: -58.4348,
    clientesActivos: 79,
    fechaAlta: '2026-05-12',
    recompensas: [
      { pts: 120, descripcion: 'Cajón de frutas de estación', categoria: 'Regalos' },
      { pts: 260, descripcion: '10% off en verdura', categoria: 'Descuentos' },
      { pts: 460, descripcion: 'Bolsón orgánico semanal', categoria: 'Regalos' },
    ],
    horarioValle: { desde: '08:00', hasta: '10:00', dias: [1, 2, 3, 4, 5] },
    promos: [
      { tipo: 'horario', titulo: 'Feria de la mañana', detalle: 'Frescos con 15% off de 8 a 10' },
      { tipo: 'delivery-gratis', titulo: 'Envío al barrio sin cargo', detalle: 'En compras desde $8.000' },
    ],
    beneficiosVip: ['Te apartamos lo más fresco del día', 'Bolsón armado a tu gusto'],
  },
  {
    id: 'rotiseria-armenia',
    nombre: 'Rotisería Armenia',
    categoria: 'Rotisería',
    rubro: 'super',
    emoji: '🍗',
    lat: -34.5925,
    lng: -58.4267,
    clientesActivos: 173,
    fechaAlta: '2026-03-30',
    recompensas: [
      { pts: 150, descripcion: 'Porción de pollo al spiedo', categoria: 'Comida' },
      { pts: 300, descripcion: 'Combo familiar (pollo + papas)', categoria: 'Comida', costoDinero: 4500 },
      { pts: 540, descripcion: '10% off en tu pedido', categoria: 'Descuentos' },
    ],
    promos: [
      { tipo: 'delivery-gratis', titulo: 'Delivery sin cargo', detalle: 'En pedidos desde $9.000' },
      { tipo: '2x1', titulo: '2x1 en empanadas', detalle: 'Los domingos al mediodía' },
    ],
    beneficiosVip: ['Reservás la bandeja del finde', 'Guarnición extra en cada combo'],
  },
  {
    id: 'kiosco-gurruchaga',
    nombre: 'Kiosco 24 Gurruchaga',
    categoria: 'Kiosco',
    rubro: 'super',
    emoji: '🌙',
    lat: -34.5865,
    lng: -58.4291,
    clientesActivos: 96,
    fechaAlta: '2026-06-04',
    recompensas: [
      { pts: 80, descripcion: 'Gaseosa línea 500ml', categoria: 'Regalos' },
      { pts: 200, descripcion: 'Combo golosinas de regalo', categoria: 'Regalos' },
      { pts: 380, descripcion: '8% off en tu compra', categoria: 'Descuentos' },
    ],
    promos: [
      { tipo: 'descuento', titulo: '10% off de madrugada', detalle: 'Todos los días de 0 a 6' },
    ],
    beneficiosVip: ['Fiado de confianza para socios', 'Te guardamos el cigarrillo/vape de tu marca'],
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
    ultimaVisitaDias: 1,
    // 4 visitas en los últimos 7 días → racha semanal; días 1-2-3 seguidos → racha diaria de 3.
    historial: [
      { diasAtras: 1, monto: 2800, puntos: 28, nuevo: true, categoria: 'Bebidas' },
      { diasAtras: 2, monto: 4100, puntos: 41, nuevo: true, categoria: 'Bebidas' },
      { diasAtras: 3, monto: 3400, puntos: 34, categoria: 'Bebidas' },
      { diasAtras: 5, monto: 2200, puntos: 22, categoria: 'Comida' },
      { diasAtras: 13, monto: 2600, puntos: 26, categoria: 'Bebidas' },
      { diasAtras: 19, monto: 3900, puntos: 39, categoria: 'Comida' },
      { diasAtras: 26, monto: 2200, puntos: 22, categoria: 'Bebidas' },
    ],
  },
  'cerveceria-soler': {
    puntos: 720,
    ultimaVisitaDias: 4,
    // 1 visita por semana en 7 semanas consecutivas → racha larga desbloqueada.
    historial: [
      { diasAtras: 4, monto: 6200, puntos: 62, categoria: 'Bebidas' },
      { diasAtras: 8, monto: 4800, puntos: 48, nuevo: true, categoria: 'Comida' },
      { diasAtras: 16, monto: 7400, puntos: 74, categoria: 'Bebidas' },
      { diasAtras: 23, monto: 5100, puntos: 51, categoria: 'Bebidas' },
      { diasAtras: 30, monto: 8300, puntos: 83, categoria: 'Comida' },
      { diasAtras: 38, monto: 4600, puntos: 46, categoria: 'Bebidas' },
      { diasAtras: 44, monto: 5900, puntos: 59, categoria: 'Bebidas' },
    ],
  },
  'almacen-guatemala': {
    puntos: 160,
    ultimaVisitaDias: 1,
    // 2 de 4 visitas de la semana → racha en riesgo; 160 pts recién superó una recompensa.
    historial: [
      { diasAtras: 1, monto: 5200, puntos: 52, categoria: 'Regalos' },
      { diasAtras: 6, monto: 3800, puntos: 38, categoria: 'Descuentos' },
      { diasAtras: 12, monto: 6400, puntos: 64, categoria: 'Regalos' },
      { diasAtras: 18, monto: 2900, puntos: 29, categoria: 'Regalos' },
    ],
  },
  'rooftop-malabia': {
    puntos: 95,
    // Cliente lapsado: última visita hace 47 días → puntos por vencer en menos de 15 días.
    ultimaVisitaDias: 47,
    historial: [
      { diasAtras: 47, monto: 5600, puntos: 56, categoria: 'Bebidas' },
      { diasAtras: 58, monto: 3900, puntos: 39, categoria: 'Comida' },
    ],
  },
};
