import { useMemo } from 'react';
import { BellRing, ChevronRight, IdCard, LogOut, UserPlus } from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { formatPuntos } from '../../lib/club';
import { esInvitado } from '../../lib/invitado';
import type { PermisoNotif } from '../../lib/notificaciones';

interface Props {
  cliente: Cliente;
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  permisoNotif: PermisoNotif;
  onPedirPermisoNotif: () => Promise<void>;
  onSalir: () => void;
  /** Ir al registro/login real para dejar de navegar como invitado. */
  onCrearCuenta: () => void;
}

/**
 * Perfil a nivel marketplace (no de un negocio puntual): cuenta + stats reales + ajustes.
 * El perfil "grande" (regalar puntos, desafíos, ranking) sigue viviendo dentro de cada
 * negocio en TabPerfil.tsx — acá no se duplica esa lógica, solo se resume.
 */
export default function TabPerfilMarketplace({
  cliente,
  negocios,
  relaciones,
  permisoNotif,
  onPedirPermisoNotif,
  onSalir,
  onCrearCuenta,
}: Props) {
  const invitado = esInvitado(cliente);

  const stats = useMemo(() => {
    const conRelacion = negocios.filter((negocio) => relaciones[negocio.id]);
    const puntosTotal = conRelacion.reduce((suma, negocio) => suma + relaciones[negocio.id].puntos, 0);
    const estaSemana = conRelacion.filter((negocio) =>
      relaciones[negocio.id].historial.some((visita) => visita.diasAtras <= 7),
    ).length;
    return { locales: conRelacion.length, puntosTotal, estaSemana };
  }, [negocios, relaciones]);

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-10">
      <h1 className="text-2xl font-bold text-texto">Perfil</h1>

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-linear-to-br from-premio to-acento text-2xl font-extrabold text-on-acento">
          {invitado ? <UserPlus size={26} /> : cliente.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-texto">{cliente.nombre}</p>
          <p className="text-xs font-semibold text-texto-muted">
            {invitado ? 'Navegando sin cuenta' : cliente.telefono}
          </p>
        </div>
      </div>

      {!invitado && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-borde bg-card px-2 py-3 text-center">
            <p className="font-titulo text-lg font-extrabold text-texto">{stats.locales}</p>
            <p className="text-[9px] font-bold tracking-wide text-texto-muted uppercase">Locales</p>
          </div>
          <div className="rounded-2xl border border-borde bg-card px-2 py-3 text-center">
            <p className="font-titulo text-lg font-extrabold text-texto">{formatPuntos(stats.puntosTotal)}</p>
            <p className="text-[9px] font-bold tracking-wide text-texto-muted uppercase">Puntos</p>
          </div>
          <div className="rounded-2xl border border-borde bg-card px-2 py-3 text-center">
            <p className="font-titulo text-lg font-extrabold text-texto">{stats.estaSemana}</p>
            <p className="text-[9px] font-bold tracking-wide text-texto-muted uppercase">Esta semana</p>
          </div>
        </div>
      )}

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

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            if (permisoNotif === 'default') void onPedirPermisoNotif();
          }}
          className="flex items-center justify-between rounded-2xl border border-borde bg-card px-4 py-3.5 text-left"
        >
          <span className="flex items-center gap-2.5 text-sm font-bold text-texto">
            <BellRing size={16} className="text-texto-muted" /> Notificaciones
          </span>
          <span
            className={`text-xs font-bold ${permisoNotif === 'granted' ? 'text-verde-ok' : 'text-texto-muted'}`}
          >
            {permisoNotif === 'granted' ? 'Activas' : permisoNotif === 'denied' ? 'Bloqueadas' : 'Activar'}
          </span>
        </button>

        <div className="flex items-center justify-between rounded-2xl border border-borde bg-card px-4 py-3.5">
          <span className="flex items-center gap-2.5 text-sm font-bold text-texto">
            <IdCard size={16} className="text-texto-muted" /> Mis datos
          </span>
          <ChevronRight size={16} className="text-texto-muted" />
        </div>

        <button
          type="button"
          onClick={onSalir}
          className="flex items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3.5 text-left text-sm font-bold text-texto-muted"
        >
          <LogOut size={16} /> Salir de la app
        </button>
      </div>
    </div>
  );
}
