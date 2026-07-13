import {
  DIAS_INACTIVO,
  type Cliente,
  type Nivel,
  type Recompensa,
  type RubroData,
} from '../data/mockClientes';

export const soloDigitos = (valor: string) => valor.replace(/\D/g, '');

export function nivelDe(niveles: Nivel[], puntos: number): Nivel {
  let actual = niveles[0];
  for (const nivel of niveles) {
    if (puntos >= nivel.min) actual = nivel;
  }
  return actual;
}

export function progresoNivel(niveles: Nivel[], puntos: number) {
  const actual = nivelDe(niveles, puntos);
  const siguiente = niveles.find((nivel) => nivel.min > puntos) ?? null;
  const pct = siguiente
    ? Math.min(100, Math.round(((puntos - actual.min) / (siguiente.min - actual.min)) * 100))
    : 100;
  return { actual, siguiente, pct };
}

export function proximaRecompensa(recompensas: Recompensa[], puntos: number): Recompensa | null {
  return recompensas.find((recompensa) => recompensa.pts > puntos) ?? null;
}

export interface RecompensaCercana {
  cliente: Cliente;
  recompensa: Recompensa;
  faltan: number;
}

export function recompensaMasCercana(
  clientes: Cliente[],
  recompensas: Recompensa[],
): RecompensaCercana | null {
  let mejor: RecompensaCercana | null = null;
  for (const cliente of clientes) {
    const recompensa = proximaRecompensa(recompensas, cliente.puntos);
    if (!recompensa) continue;
    const faltan = recompensa.pts - cliente.puntos;
    if (!mejor || faltan < mejor.faltan) mejor = { cliente, recompensa, faltan };
  }
  return mejor;
}

export const esInactivo = (cliente: Cliente) => cliente.ultimaVisitaDias >= DIAS_INACTIVO;

export const puntosPorMonto = (data: RubroData, monto: number) =>
  Math.floor(monto / data.montoPorPunto);

export const formatMonto = (data: RubroData, monto: number) =>
  `${data.monedaPrefijo} ${monto.toLocaleString(data.locale)}`;

export const formatPuntos = (puntos: number) => puntos.toLocaleString('es-AR');

export function buscarClientes(clientes: Cliente[], consulta: string): Cliente[] {
  const texto = consulta.trim().toLowerCase();
  const digitos = soloDigitos(consulta);
  if (!texto) return clientes;
  return clientes.filter((cliente) => {
    const porNombre = cliente.nombre.toLowerCase().includes(texto);
    const porTelefono = digitos.length > 0 && soloDigitos(cliente.telefono).includes(digitos);
    return porNombre || porTelefono;
  });
}
