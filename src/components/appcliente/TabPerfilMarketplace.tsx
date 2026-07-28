import { Phone, User } from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';

interface Props {
  cliente: Cliente;
  onSalir: () => void;
}

/**
 * Perfil a nivel marketplace (no de un negocio puntual): solo cuenta + salir. El perfil
 * "grande" (regalar puntos, desafíos, ranking) sigue viviendo dentro de cada negocio en
 * TabPerfil.tsx — acá no se duplica esa lógica.
 */
export default function TabPerfilMarketplace({ cliente, onSalir }: Props) {
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
            <p className="flex items-center gap-1 text-xs text-texto-muted">
              <Phone size={12} /> {cliente.telefono}
            </p>
          </div>
        </div>
      </div>

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
