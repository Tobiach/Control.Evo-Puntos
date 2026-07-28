import { Phone, User, UserPlus } from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';
import { esInvitado } from '../../lib/invitado';

interface Props {
  cliente: Cliente;
  onSalir: () => void;
  /** Ir al registro/login real para dejar de navegar como invitado. */
  onCrearCuenta: () => void;
}

/**
 * Perfil a nivel marketplace (no de un negocio puntual): solo cuenta + salir. El perfil
 * "grande" (regalar puntos, desafíos, ranking) sigue viviendo dentro de cada negocio en
 * TabPerfil.tsx — acá no se duplica esa lógica.
 */
export default function TabPerfilMarketplace({ cliente, onSalir, onCrearCuenta }: Props) {
  const invitado = esInvitado(cliente);

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-10">
      <h1 className="text-2xl font-bold text-texto">Perfil</h1>

      <div className="rounded-3xl border border-borde bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-acento text-on-acento">
            <User size={22} />
          </div>
          <div>
            <p className="font-bold text-texto">{cliente.nombre}</p>
            {invitado ? (
              <p className="text-xs font-semibold text-texto-muted">Navegando sin cuenta</p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-texto-muted">
                <Phone size={12} /> {cliente.telefono}
              </p>
            )}
          </div>
        </div>
      </div>

      {invitado && (
        <div className="flex items-start gap-3 rounded-2xl bg-premio-suave px-4 py-3.5">
          <UserPlus size={18} className="mt-0.5 shrink-0 text-acento" strokeWidth={2.4} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug">
              <span className="font-bold text-acento">Como invitado no se guardan tus puntos.</span>{' '}
              <span className="text-texto-muted">Creá tu cuenta cuando quieras empezar a sumar de verdad.</span>
            </p>
            <button
              type="button"
              onClick={onCrearCuenta}
              className="mt-2.5 rounded-full bg-acento px-4 py-2 text-xs font-bold text-on-acento active:bg-acento-hover"
            >
              Crear mi cuenta
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSalir}
        className="rounded-2xl border border-borde bg-card py-3.5 text-sm font-bold text-texto-muted"
      >
        Salir de la app
      </button>
    </div>
  );
}
