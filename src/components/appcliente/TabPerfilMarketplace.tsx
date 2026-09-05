import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BellRing,
  Cake,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Gift,
  HelpCircle,
  IdCard,
  Lock,
  LogOut,
  MapPin,
  Phone,
  Settings,
  Share2,
  Shield,
  Star,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import {
  calcularXpTotal,
  codigoReferido,
  contarNegociosPorRubro,
  contarVisitasTotales,
  formatFechaCorta,
  formatPuntos,
  negocioAncla,
  NIVELES_XP_GLOBAL,
  progresoNivel,
  proximaRecompensa,
} from '../../lib/club';
import { esInvitado } from '../../lib/invitado';
import type { PermisoNotif } from '../../lib/notificaciones';
import type { CanjeConfirmado } from '../../lib/panelCliente';
import {
  armarLinkInvitacion,
  formatVisitas,
  obtenerCodigoReferido,
  PUNTOS_BONUS_REFERIDO,
  VISITAS_PARA_PREMIO,
} from '../../lib/referidos';
import { compartir } from '../../lib/compartir';
import { supabaseEnabled } from '../../lib/supabase';
import { gradienteCss } from '../../lib/temaNegocio';
import CardNivelXp from './CardNivelXp';
import FilaMetricas from './FilaMetricas';

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
  canjesConfirmados: CanjeConfirmado[];
  permisoNotif: PermisoNotif;
  onPedirPermisoNotif: () => Promise<void>;
  onSalir: () => void;
  /** Ir al registro/login real para dejar de navegar como invitado. */
  onCrearCuenta: () => void;
  /** "Ver todos →" en Mis lugares → pestaña Mis premios. */
  onIrAMisPremios: () => void;
}

/** Card horizontal de "Mis lugares": mismo lenguaje fotográfico que Explorar (foto real o
 *  degradé por rubro), con el mismo badge de puntos/premio-listo que el resto de la app. */
function TarjetaMiLugar({
  negocio,
  relacion,
  onAbrir,
}: {
  negocio: Negocio;
  relacion: RelacionNegocio;
  onAbrir: () => void;
}) {
  const proxima = proximaRecompensa(negocio.recompensas, relacion.puntos);
  const disponible = !proxima && negocio.recompensas.length > 0;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="w-[148px] shrink-0 overflow-hidden rounded-2xl border border-borde bg-card text-left"
    >
      <div className="h-[88px] w-full">
        {negocio.portadaUrl ? (
          <img src={negocio.portadaUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-3xl"
            style={{ background: gradienteCss(negocio.rubro) }}
          >
            <span aria-hidden>{negocio.emoji}</span>
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-bold text-texto">{negocio.nombre}</p>
        <p className="truncate text-[10px] text-texto-muted">{negocio.categoria} · Palermo</p>
        <span
          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
            disponible ? 'bg-premio-suave text-premio' : 'bg-fondo-medio text-texto-muted'
          }`}
        >
          {disponible ? 'Premio listo' : `${formatPuntos(relacion.puntos)} pts`}
        </span>
      </div>
    </button>
  );
}

/**
 * Perfil a nivel marketplace: "este es mi lugar dentro de Premia" — identidad, progreso,
 * lugares, logros y recorrido, no una pantalla de configuración. El perfil "grande" de UN
 * negocio (regalar puntos, desafíos, ranking) sigue viviendo en TabPerfil.tsx.
 */
export default function TabPerfilMarketplace({
  cliente,
  negocios,
  relaciones,
  canjesConfirmados,
  permisoNotif,
  onPedirPermisoNotif,
  onSalir,
  onCrearCuenta,
  onIrAMisPremios,
}: Props) {
  const invitado = esInvitado(cliente);
  const [mostrarDatos, setMostrarDatos] = useState(false);
  const [mostrarTodosCanjes, setMostrarTodosCanjes] = useState(false);
  const [codigoRef, setCodigoRef] = useState<string | null>(null);
  const [invitacionCopiada, setInvitacionCopiada] = useState(false);

  useEffect(() => {
    if (!supabaseEnabled || invitado) return;
    let activo = true;
    obtenerCodigoReferido().then((cod) => {
      if (activo) setCodigoRef(cod);
    });
    return () => {
      activo = false;
    };
  }, [invitado]);

  const xpTotal = useMemo(() => calcularXpTotal(relaciones), [relaciones]);
  const nivel = useMemo(() => progresoNivel(NIVELES_XP_GLOBAL, xpTotal), [xpTotal]);
  const nivelIndice = NIVELES_XP_GLOBAL.findIndex((n) => n.nombre === nivel.actual.nombre) + 1;

  const misLugares = useMemo(
    () => negocios.filter((negocio) => relaciones[negocio.id]),
    [negocios, relaciones],
  );

  const stats = useMemo(
    () => ({
      visitas: contarVisitasTotales(relaciones),
      lugares: misLugares.length,
      premios: canjesConfirmados.length,
    }),
    [relaciones, misLugares, canjesConfirmados],
  );

  const cafeterias = useMemo(() => contarNegociosPorRubro(negocios, relaciones, 'cafeteria'), [negocios, relaciones]);

  const anclaInvitar = useMemo(() => negocioAncla(negocios, relaciones), [negocios, relaciones]);

  const invitar = async () => {
    if (!anclaInvitar) return;
    const codigo = codigoRef ?? codigoReferido(cliente);
    const link = armarLinkInvitacion(window.location.origin, codigo, anclaInvitar.id);
    const texto =
      `¡Sumate a Premia.ar! Con mi invitación, cuando vayas ${formatVisitas(VISITAS_PARA_PREMIO)} a ` +
      `${anclaInvitar.nombre}, ganamos ${PUNTOS_BONUS_REFERIDO} pts cada uno. ${link}`;
    const copio = await compartir(texto, link);
    if (copio) {
      setInvitacionCopiada(true);
      window.setTimeout(() => setInvitacionCopiada(false), 2000);
    }
  };

  const irACuentaYPreferencias = () => {
    document.getElementById('cuenta-preferencias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const badges = [
    {
      icono: Star,
      label: 'Explorador',
      sub: `Nivel ${nivelIndice}`,
      desbloqueada: true, // siempre hay un nivel, aunque sea "Nuevo"
      color: '#D89B2B',
    },
    {
      icono: Coffee,
      label: 'Cafetero',
      sub: `${cafeterias} ${cafeterias === 1 ? 'cafetería' : 'cafeterías'}`,
      desbloqueada: cafeterias > 0,
      color: '#8B6A3E',
    },
    {
      icono: MapPin,
      label: 'Descubridor',
      sub: `${stats.lugares} ${stats.lugares === 1 ? 'lugar' : 'lugares'}`,
      desbloqueada: stats.lugares > 0,
      color: '#1D9E75',
    },
    {
      icono: Gift,
      label: 'Primer premio',
      sub: `${stats.premios} ${stats.premios === 1 ? 'canjeado' : 'canjeados'}`,
      desbloqueada: stats.premios > 0,
      color: '#F28A63',
    },
  ];

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
          <h1 className="text-2xl font-bold text-texto">Datos personales</h1>
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
    <div className="flex flex-col gap-6 px-5 pt-6 pb-10">
      {/* 01 — Header / identidad */}
      <div className="flex items-center gap-3">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-linear-to-br from-premio to-acento text-lg font-extrabold text-on-acento shadow-[0_4px_12px_rgba(242,138,99,0.35)]">
          {invitado ? <UserPlus size={22} /> : cliente.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-extrabold tracking-tight text-texto">
            Hola, {cliente.nombre.split(' ')[0]} 👋
          </p>
          <p className="text-xs font-semibold text-texto-muted">
            {invitado ? 'Navegando sin cuenta' : `${nivel.actual.nombre} · Nivel ${nivelIndice}`}
          </p>
        </div>
        {!invitado && (
          <button
            type="button"
            onClick={irACuentaYPreferencias}
            aria-label="Ir a cuenta y preferencias"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-borde bg-card text-texto-muted"
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      {invitado ? (
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
      ) : (
        <>
          {/* 02 — Tu progreso */}
          <CardNivelXp xpTotal={xpTotal} />

          {/* 03 — Tu recorrido */}
          <div>
            <p className="mb-2 text-sm font-bold text-texto">Tu recorrido</p>
            <FilaMetricas
              metricas={[
                { valor: stats.visitas, label: 'Visitas', color: 'text-acento' },
                { valor: stats.lugares, label: 'Lugares', color: 'text-texto' },
                { valor: stats.premios, label: 'Premios', color: 'text-premio' },
              ]}
            />
          </div>

          {/* 04 — Mis lugares */}
          {misLugares.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-texto">Mis lugares</p>
                <button
                  type="button"
                  onClick={onIrAMisPremios}
                  className="flex items-center gap-0.5 text-xs font-bold text-premio"
                >
                  Ver todos <ChevronRight size={13} strokeWidth={2.5} />
                </button>
              </div>
              <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {misLugares.map((negocio) => (
                  <TarjetaMiLugar
                    key={negocio.id}
                    negocio={negocio}
                    relacion={relaciones[negocio.id]}
                    onAbrir={onIrAMisPremios}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 05 — Badges y logros */}
          <div>
            <p className="mb-2 text-sm font-bold text-texto">Badges y logros</p>
            <div className="grid grid-cols-4 gap-2">
              {badges.map(({ icono: Icono, label, sub, desbloqueada, color }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={
                      desbloqueada
                        ? { backgroundColor: `${color}22`, color }
                        : { backgroundColor: 'var(--color-borde)', color: 'var(--color-texto-muted)' }
                    }
                  >
                    {desbloqueada ? <Icono size={22} strokeWidth={2.2} /> : <Lock size={17} />}
                  </span>
                  <span className="text-[11px] leading-tight font-bold text-texto">{label}</span>
                  <span className="text-[9px] leading-tight text-texto-muted">{sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 06 — Premios que ya conseguiste */}
          <div>
            <p className="mb-2 text-sm font-bold text-texto">Premios que ya conseguiste</p>
            {canjesConfirmados.length === 0 ? (
              <p className="rounded-2xl border border-borde bg-card px-4 py-5 text-center text-sm text-texto-muted">
                Todavía no canjeaste ningún premio.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {(mostrarTodosCanjes ? canjesConfirmados : canjesConfirmados.slice(0, 3)).map((canje, indice) => {
                  const negocioDelCanje = negocios.find((n) => n.id === canje.negocioId);
                  return (
                    <motion.div
                      key={`${canje.negocioId}-${canje.confirmadoAt}-${indice}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: indice * 0.04 }}
                      className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-verde-ok/15 text-verde-ok">
                        <Check size={15} strokeWidth={2.6} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-texto">{canje.descripcion}</p>
                        <p className="truncate text-xs text-texto-muted">
                          {negocioDelCanje?.nombre ?? 'Negocio'}
                          {canje.confirmadoAt && ` · Canjeado el ${formatFechaCorta(canje.confirmadoAt)}`}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
                {canjesConfirmados.length > 3 && !mostrarTodosCanjes && (
                  <button
                    type="button"
                    onClick={() => setMostrarTodosCanjes(true)}
                    className="self-center py-1 text-xs font-bold text-premio"
                  >
                    Ver más
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 07 — Invitá a un amigo */}
          {anclaInvitar && (
            <div className="flex items-center gap-3 rounded-3xl bg-premio-suave px-4 py-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-acento">
                <Users size={20} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-texto">Invitá a un amigo</p>
                <p className="mt-0.5 text-xs leading-snug text-texto-muted">
                  Cuando vaya {formatVisitas(VISITAS_PARA_PREMIO)} a {anclaInvitar.nombre}, ganan{' '}
                  {PUNTOS_BONUS_REFERIDO} pts los dos.
                </p>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={invitar}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-acento px-4 py-2.5 text-xs font-bold text-on-acento active:bg-acento-hover"
              >
                {invitacionCopiada ? (
                  <>
                    <Check size={14} /> Copiado
                  </>
                ) : (
                  <>
                    Invitar <Share2 size={13} />
                  </>
                )}
              </motion.button>
            </div>
          )}
        </>
      )}

      {/* 08 — Cuenta y preferencias */}
      <div id="cuenta-preferencias" className="flex flex-col gap-2 scroll-mt-4">
        <p className="text-xs font-semibold tracking-widest text-texto-muted uppercase">Cuenta y preferencias</p>

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

        <a
          href="?legal=privacidad"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-2xl border border-borde bg-card px-4 py-3.5"
        >
          <span className="flex items-center gap-2.5 text-sm font-bold text-texto">
            <Shield size={16} className="text-texto-muted" /> Privacidad
          </span>
          <ChevronRight size={16} className="text-texto-muted" />
        </a>

        {!invitado && (
          <button
            type="button"
            onClick={() => setMostrarDatos(true)}
            className="flex items-center justify-between rounded-2xl border border-borde bg-card px-4 py-3.5 text-left"
          >
            <span className="flex items-center gap-2.5 text-sm font-bold text-texto">
              <IdCard size={16} className="text-texto-muted" /> Datos personales
            </span>
            <ChevronRight size={16} className="text-texto-muted" />
          </button>
        )}

        <a
          href="mailto:premia.latam@gmail.com"
          className="flex items-center justify-between rounded-2xl border border-borde bg-card px-4 py-3.5"
        >
          <span className="flex items-center gap-2.5 text-sm font-bold text-texto">
            <HelpCircle size={16} className="text-texto-muted" /> Ayuda
          </span>
          <ChevronRight size={16} className="text-texto-muted" />
        </a>

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
