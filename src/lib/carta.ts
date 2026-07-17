import { supabase } from './supabase';
import type { Rubro } from '../data/mockClientes';
import { parseRubro } from '../data/mockClientes';

// Carta digital: lo que el negocio vende normalmente, en pesos (distinto de las
// recompensas, que se canjean con puntos). Este módulo tiene la lógica pura (formato
// de precio, agrupado por categoría) + el loader de la vista pública sin login.
// El CRUD del panel del dueño vive en panelDueno.ts (usa estos mismos tipos).

/** Un item de la carta ya normalizado para la UI. */
export interface ItemCarta {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  fotoUrl: string | null;
  disponible: boolean;
  orden: number;
}

/** Datos mínimos del negocio para encabezar su carta pública. */
export interface NegocioCarta {
  id: string;
  nombre: string;
  emoji: string;
  categoria: string;
  rubro: Rubro;
}

/** Items de una misma sección del menú, en el orden en que se cargaron. */
export interface GrupoCarta {
  categoria: string;
  items: ItemCarta[];
}

/** Columnas de `carta_items` que consumen tanto el panel como la vista pública. */
export const COLUMNAS_CARTA = 'id, nombre, descripcion, precio, categoria, foto_url, disponible, orden';

/** Fila cruda de `carta_items` (el cliente Supabase no está tipado con el schema). */
export interface FilaItemCarta {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  precio: number | string | null;
  categoria: string | null;
  foto_url: string | null;
  disponible: boolean | null;
  orden: number | null;
}

export function mapearItemCarta(fila: FilaItemCarta): ItemCarta {
  return {
    id: fila.id,
    nombre: fila.nombre ?? '',
    descripcion: fila.descripcion ?? '',
    precio: Number(fila.precio ?? 0),
    categoria: fila.categoria ?? '',
    fotoUrl: fila.foto_url,
    disponible: fila.disponible ?? true,
    orden: fila.orden ?? 0,
  };
}

/** Precio formateado en pesos argentinos, con prefijo de moneda ('$ 1.500'). */
export function formatPrecio(precio: number, prefijo = '$'): string {
  return `${prefijo} ${precio.toLocaleString('es-AR')}`;
}

/**
 * Agrupa los items por categoría preservando el orden de primera aparición (tanto de las
 * categorías como de los items dentro de cada una). Los items sin categoría caen en 'Otros'.
 * Lógica pura y testeable.
 */
export function agruparPorCategoria(items: ItemCarta[]): GrupoCarta[] {
  const grupos: GrupoCarta[] = [];
  const indice = new Map<string, GrupoCarta>();
  for (const item of items) {
    const clave = item.categoria.trim() || 'Otros';
    let grupo = indice.get(clave);
    if (!grupo) {
      grupo = { categoria: clave, items: [] };
      indice.set(clave, grupo);
      grupos.push(grupo);
    }
    grupo.items.push(item);
  }
  return grupos;
}

export type ResultadoCarta =
  | { estado: 'ok'; negocio: NegocioCarta; grupos: GrupoCarta[] }
  | { estado: 'no-disponible' }
  | { estado: 'error' };

/**
 * Carga la carta pública de un negocio: datos básicos + items disponibles agrupados por
 * categoría. Sin auth (la policy pública lo permite). Devuelve 'no-disponible' si el
 * negocio no existe o está pausado, y 'error' si no hay backend o falla la consulta.
 */
export async function cargarCartaPublica(negocioId: string): Promise<ResultadoCarta> {
  if (!supabase) return { estado: 'error' };

  const { data: neg, error } = await supabase
    .from('negocios')
    .select('id, nombre, emoji, categoria, rubro')
    .eq('id', negocioId)
    .eq('activo', true)
    .maybeSingle();
  if (error) return { estado: 'error' };
  if (!neg) return { estado: 'no-disponible' };

  const { data: items, error: errItems } = await supabase
    .from('carta_items')
    .select(COLUMNAS_CARTA)
    .eq('negocio_id', negocioId)
    .eq('disponible', true)
    .order('orden', { ascending: true })
    .order('id', { ascending: true });
  if (errItems) return { estado: 'error' };

  const fila = neg as { id: string; nombre: string | null; emoji: string | null; categoria: string | null; rubro: string | null };
  const lista = (items ?? []).map((f) => mapearItemCarta(f as FilaItemCarta));
  return {
    estado: 'ok',
    negocio: {
      id: fila.id,
      nombre: fila.nombre ?? '',
      emoji: fila.emoji ?? '🏪',
      categoria: fila.categoria ?? '',
      rubro: parseRubro(fila.rubro),
    },
    grupos: agruparPorCategoria(lista),
  };
}
