import type { Cliente } from '../data/mockClientes';

const ID_CLIENTE_INVITADO = '__invitado__';

/** Cliente sintético para navegar TODA la app sin cuenta: sin puntos propios ni historial —
 *  mismo tratamiento visual que un cliente recién sumado a un negocio. */
export const CLIENTE_INVITADO: Cliente = {
  id: ID_CLIENTE_INVITADO,
  nombre: 'Invitado',
  telefono: '',
  puntos: 0,
  ultimaVisitaDias: 0,
};

export function esInvitado(cliente: Pick<Cliente, 'id'>): boolean {
  return cliente.id === ID_CLIENTE_INVITADO;
}
