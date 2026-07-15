import { Bike, Clock, Layers, Percent, type LucideIcon } from 'lucide-react';
import type { TipoPromo } from '../data/mockClientes';

interface MetaPromo {
  /** Etiqueta corta para el badge (ej. "2x1", "Envío gratis"). */
  etiqueta: string;
  icono: LucideIcon;
  /** Color de acento del badge (fijo, legible en tema claro y oscuro). */
  color: string;
}

/** Ícono, color y etiqueta corta de cada tipo de promo, para distinguirlas de un vistazo. */
export const META_PROMO: Record<TipoPromo, MetaPromo> = {
  '2x1': { etiqueta: '2x1', icono: Layers, color: '#8B5CF6' },
  horario: { etiqueta: 'Horario', icono: Clock, color: '#0EA5E9' },
  'delivery-gratis': { etiqueta: 'Envío gratis', icono: Bike, color: '#10B981' },
  descuento: { etiqueta: 'Descuento', icono: Percent, color: '#F97316' },
};
