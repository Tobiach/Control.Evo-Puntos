import { supabase } from './supabase';
import type { CategoriaRecompensa, Recompensa, Rubro } from '../data/mockClientes';

// Capa de datos del panel de cajero. El cajero se identifica con un PIN de 4 dígitos
// por negocio (sin cuenta de Supabase Auth). Todo pasa por funciones SECURITY DEFINER
// del servidor (`verificar_pin_cajero`, `cobrar_con_pin`), que validan el PIN antes de
// tocar ninguna fila y nunca devuelven el PIN. Null-safe: sin backend conectado
// (`supabase === null`) devuelve { ok:false, error:'sin-conexion' } y el panel corre
// en modo demo (memoria de React), igual que el resto de las pantallas del repo.

export type ResultadoCajero<T> = { ok: true; valor: T } | { ok: false; error: string };

/** Datos del negocio que necesita el cajero para cobrar (derivados del PIN validado). */
export interface NegocioCajero {
  id: string;
  nombre: string;
  rubro: Rubro;
  monedaPrefijo: string;
  montoPorPunto: number;
  /** Locale de formato, derivado del rubro (es-AR gastro / es-PY super). */
  locale: string;
  recompensas: Recompensa[];
}

/** Resultado de un cobro real: puntos ganados y saldo previo del cliente. */
export interface CobroRealizado {
  clienteNombre: string;
  telefono: string;
  puntosGanados: number;
  puntosAnteriores: number;
}

// Formas crudas que devuelven las funciones RPC (JSONB sin tipar).
interface RpcNegocio {
  id: string;
  nombre: string | null;
  rubro: string | null;
  moneda_prefijo: string | null;
  monto_por_punto: number | null;
  recompensas: RpcRecompensa[] | null;
}

interface RpcRecompensa {
  pts: number;
  descripcion: string;
  categoria: string;
  costo_dinero: number | null;
}

interface RpcCobro {
  cliente_nombre: string | null;
  telefono: string | null;
  puntos_ganados: number | null;
  puntos_anteriores: number | null;
}

const CATEGORIAS_VALIDAS: readonly CategoriaRecompensa[] = ['Bebidas', 'Comida', 'Descuentos', 'Regalos'];

function normalizarCategoria(valor: string): CategoriaRecompensa {
  return CATEGORIAS_VALIDAS.includes(valor as CategoriaRecompensa)
    ? (valor as CategoriaRecompensa)
    : 'Regalos';
}

function rpcANegocio(fila: RpcNegocio): NegocioCajero {
  const rubro: Rubro = fila.rubro === 'super' ? 'super' : 'gastro';
  const recompensas = (fila.recompensas ?? []).map((rec) => ({
    pts: rec.pts,
    descripcion: rec.descripcion,
    categoria: normalizarCategoria(rec.categoria),
    ...(rec.costo_dinero != null ? { costoDinero: rec.costo_dinero } : {}),
  }));
  return {
    id: fila.id,
    nombre: fila.nombre ?? '',
    rubro,
    monedaPrefijo: fila.moneda_prefijo ?? '$',
    montoPorPunto: fila.monto_por_punto ?? 100,
    locale: rubro === 'super' ? 'es-PY' : 'es-AR',
    recompensas,
  };
}

/**
 * Login del cajero: valida `pin` contra el negocio `negocioId` y, si coincide, devuelve
 * los datos del negocio + sus recompensas. `pin-invalido` si no autoriza.
 */
export async function verificarPinCajero(
  negocioId: string,
  pin: string,
): Promise<ResultadoCajero<NegocioCajero>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.rpc('verificar_pin_cajero', {
    p_negocio_id: negocioId.trim(),
    p_pin: pin,
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'pin-invalido' };
  return { ok: true, valor: rpcANegocio(data as RpcNegocio) };
}

/**
 * Un cobro completo del lado del servidor: valida el PIN, da de alta cliente/relación si
 * es la primera visita, inserta la visita y acredita los puntos según `monto_por_punto`.
 */
export async function registrarCobro(
  negocioId: string,
  pin: string,
  telefono: string,
  monto: number,
): Promise<ResultadoCajero<CobroRealizado>> {
  if (!supabase) return { ok: false, error: 'sin-conexion' };
  const { data, error } = await supabase.rpc('cobrar_con_pin', {
    p_negocio_id: negocioId,
    p_pin: pin,
    p_telefono: telefono,
    p_monto: monto,
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'pin-invalido' };
  const fila = data as RpcCobro;
  return {
    ok: true,
    valor: {
      clienteNombre: fila.cliente_nombre ?? telefono,
      telefono: fila.telefono ?? telefono,
      puntosGanados: fila.puntos_ganados ?? 0,
      puntosAnteriores: fila.puntos_anteriores ?? 0,
    },
  };
}
