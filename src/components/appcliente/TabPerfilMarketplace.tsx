import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BellRing, Cake, ChevronLeft, ChevronRight, IdCard, LogOut, Phone, User, UserPlus } from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { fechaDeVisita, formatPuntos, historialCruzado } from '../../lib/club';
import { esInvitado } from '../../lib/invitado';
import type { PermisoNotif } from '../../lib/notificaciones';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** `nacimiento` viene como 'MM-DD' (ver mockClientes.ts) — acá solo se formatea para mostrar. */
function formatNacimiento(nacimiento: string): string {
  const [mes, dia] = nacimiento.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]}`;
}

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
  const [mostrarDatos, setMostrarDatos] = useState(false);

  const stats = useMemo(() => {
    const conRelacion = negocios.filter((negocio) => relaciones[negocio.id]);
    const puntosTotal = conRelacion.reduce((suma, negocio) => suma + relaciones[negocio.id].puntos, 0);
    const estaSemana = conRelacion.filter((negocio) =>
      relaciones[negocio.id].historial.some((visita) => visita.diasAtras <= 7),
    ).length;
    return { locales: conRelacion.length, puntosTotal, estaSemana };
  }, [negocios, relaciones]);

  // Timeline única: todas las visitas de todos los negocios juntas, más reciente primero.
  // Mismo helper que usa la preview corta del Home (ver Marketplace.tsx) — una sola fuente.
  const historial = useMemo(() => historialCruzado(negocios, relaciones, 8), [negocios, relaciones]);

  if (mostrarDatos) {
    return (
      <div className="flex flex-col gap-5 px-5 pt-6 pb-10">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMostrarDatos(false)}
            aria-label="Volver"
            className="rounded-full border border-borde bg-card p-2 text-texto-muted"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-2xl font-bold text-texto">Mis datos</h1>
        </header>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
            <User size={16} className="shrink-0 text-texto-muted" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-texto-muted">Nombre</p>
              <p className="truncate text-sm font-bold text-texto">{cliente.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
            <Phone size={16} className="shrink-0 text-texto-muted" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-texto-muted">Teléfono</p>
              <p className="truncate text-sm font-bold text-texto">{cliente.telefono || 'Sin datos'}</p>
            </div>
          </div>
          {cliente.nacimiento && (
            <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
              <Cake size={16} className="shrink-0 text-texto-muted" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-texto-muted">Cumpleaños</p>
                <p className="truncate text-sm font-bold text-texto">{formatNacimiento(cliente.nacimiento)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-10">
      <h1 className="text-2xl font-bold text-texto">Perfil</h1>

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-linear-to-br from-premio to-acento text-2xl font-extrabold text-on-acento shadow-[0_6px_16px_rgba(242,138,99,0.35)] ring-4 ring-card">
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

      {!invitado && historial.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold text-texto">Tu historia en Premia.ar</p>
          <div className="flex flex-col gap-2">
            {historial.map(({ negocio, visita }, indice) => (
              <motion.div
                key={`${negocio.id}-${indice}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: indice * 0.04 }}
                className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-base ${
                    negocio.logoUrl ? 'bg-white' : 'bg-premio-suave'
                  }`}
                >
                  {negocio.logoUrl ? (
                    <img src={negocio.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                  ) : (
                    negocio.emoji
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-texto">{negocio.nombre}</p>
                  <p className="text-xs text-texto-muted capitalize">{fechaDeVisita(visita.diasAtras, 'es-AR')}</p>
                </div>
                <span className="font-titulo shrink-0 text-sm font-bold text-premio">
                  +{formatPuntos(visita.puntos)} pts
                </span>
              </motion.div>
            ))}
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
        <p className="text-xs font-semibold tracking-widest text-texto-muted uppercase">Cuenta</p>

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

        {!invitado && (
          <button
            type="button"
            onClick={() => setMostrarDatos(true)}
            className="flex items-center justify-between rounded-2xl border border-borde bg-card px-4 py-3.5 text-left"
          >
            <span className="flex items-center gap-2.5 text-sm font-bold text-texto">
              <IdCard size={16} className="text-texto-muted" /> Mis datos
            </span>
            <ChevronRight size={16} className="text-texto-muted" />
          </button>
        )}

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
