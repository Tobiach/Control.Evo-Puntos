import { useMemo, useState } from 'react';
import { Clock, Coins, Crown, Loader2, Phone, Search, Users } from 'lucide-react';
import { formatPuntos } from '../../lib/club';
import { textoUltimaVisita, type ClienteDelNegocio } from '../../lib/panelDueno';

interface Props {
  clientes: ClienteDelNegocio[] | null;
  cargando: boolean;
  esPreview: boolean;
  /** Puntos desde los que un cliente es VIP acá. `null` = sin configurar (no se muestra insignia). */
  vipDesdePuntos: number | null;
}

export default function SeccionClientes({ clientes, cargando, esPreview, vipDesdePuntos }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const ahora = Date.now();

  const filtrados = useMemo(() => {
    const lista = clientes ?? [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (c) => c.nombre.toLowerCase().includes(q) || c.telefono.toLowerCase().includes(q),
    );
  }, [clientes, busqueda]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-texto-muted">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-sm font-medium">Cargando tus clientes…</p>
      </div>
    );
  }

  const hayClientes = (clientes?.length ?? 0) > 0;

  if (!hayClientes) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-borde bg-card px-6 py-12 text-center">
        <Users size={28} className="text-texto-muted" />
        <p className="max-w-xs text-sm leading-snug text-texto-muted">
          {esPreview
            ? 'En vista previa no hay clientes cargados. Cuando conectemos tu negocio vas a verlos acá apenas alguien sume sus primeros puntos.'
            : 'Todavía no tenés clientes — vas a verlos acá apenas alguien sume sus primeros puntos.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3">
        <Search size={18} className="shrink-0 text-texto-muted" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
        />
      </label>

      {filtrados.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-texto-muted">
          Ningún cliente coincide con “{busqueda.trim()}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((cliente) => (
            <li
              key={cliente.clienteId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-borde bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                  {cliente.nombre}
                  {vipDesdePuntos != null && cliente.puntos >= vipDesdePuntos && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-acento px-2 py-0.5 text-[10px] font-black text-on-acento">
                      <Crown size={10} strokeWidth={3} /> VIP
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex items-center gap-3 text-xs text-texto-muted">
                  {cliente.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="shrink-0" />
                      {cliente.telefono}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="shrink-0" />
                    {textoUltimaVisita(cliente.ultimaVisitaAt, ahora)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-xl bg-premio-suave px-2.5 py-1.5">
                <Coins size={14} className="text-premio" />
                <span className="text-sm font-black text-acento">{formatPuntos(cliente.puntos)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="px-1 text-xs text-texto-muted">
        {filtrados.length} de {clientes?.length ?? 0}{' '}
        {(clientes?.length ?? 0) === 1 ? 'cliente' : 'clientes'}, ordenados por última visita.
      </p>
    </div>
  );
}
