import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  Gift,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { calcularXpTotal, codigoReferido, formatPuntos, negocioAncla } from '../../lib/club';
import {
  actividadGlobal,
  heroeDelHome,
  proximoPremioDestacado,
  type SenalHome,
  type TipoSenal,
} from '../../lib/home';
import { esInvitado } from '../../lib/invitado';
import { compartir } from '../../lib/compartir';
import {
  armarLinkInvitacion,
  formatVisitas,
  obtenerCodigoReferido,
  PUNTOS_BONUS_REFERIDO,
  VISITAS_PARA_PREMIO,
} from '../../lib/referidos';
import { supabaseEnabled } from '../../lib/supabase';
import { gradienteCss } from '../../lib/temaNegocio';
import CardNivelXp from './CardNivelXp';

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  cliente: Cliente;
  nombreCliente: string;
  /** Todavía no tiene relación con ningún negocio real: recién se sumó al club. */
  esNuevo: boolean;
  onAbrirNegocio: (negocio: Negocio) => void;
}

/** Ícono + tono del héroe según el tipo de señal (ver lib/home.ts). */
const META_SENAL: Record<TipoSenal, { icono: LucideIcon; tono: 'urgente' | 'oportunidad' | 'calmo' }> = {
  vencimiento: { icono: Clock, tono: 'urgente' },
  'racha-riesgo': { icono: Flame, tono: 'urgente' },
  'recompensa-lista': { icono: Gift, tono: 'oportunidad' },
  'x2-ahora': { icono: Zap, tono: 'oportunidad' },
  'near-win': { icono: Target, tono: 'oportunidad' },
  'al-dia': { icono: TrendingUp, tono: 'calmo' },
  descubrir: { icono: Compass, tono: 'calmo' },
};

const CLASE_TONO: Record<'urgente' | 'oportunidad' | 'calmo', { card: string; icono: string; cta: string }> = {
  urgente: { card: 'border-premio/40 bg-premio-suave', icono: 'text-premio', cta: 'text-premio' },
  oportunidad: { card: 'border-acento/40 bg-acento-suave', icono: 'text-acento', cta: 'text-acento' },
  calmo: { card: 'border-borde bg-card', icono: 'text-texto-muted', cta: 'text-acento' },
};

function LogoNegocio({ negocio, size }: { negocio: Negocio; size: string }) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl ${
        negocio.logoUrl ? 'bg-white' : 'bg-premio-suave'
      }`}
    >
      {negocio.logoUrl ? (
        <img src={negocio.logoUrl} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        negocio.emoji
      )}
    </span>
  );
}

function Heroe({ senal, onAbrir }: { senal: SenalHome; onAbrir: () => void }) {
  const { icono: Icono, tono } = META_SENAL[senal.tipo];
  const clase = CLASE_TONO[tono];
  const pct =
    senal.faltan != null && senal.recompensa
      ? Math.min(100, Math.round((senal.puntos / senal.recompensa.pts) * 100))
      : null;
  // Tono "calmo" (al-dia / descubrir) son los estados más frecuentes —usuario satisfecho sin
  // urgencias, o usuario nuevo— y los que menos necesitan gritar una alerta. Ahí usamos la
  // foto real del negocio de fondo (mismo lenguaje que TarjetaExplorar/TabInicio) para que el
  // Home no pierda la sensación de "red viva" que tenía el banner ilustrado retirado en 2.2,
  // sin agregar una sección nueva ni copy genérico (ver AUDITORIA-REFERENCIAS-PASITO.md, G8).
  const conFoto = tono === 'calmo' && !!senal.negocio.portadaUrl;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAbrir}
      className={`relative flex w-full flex-col gap-3 overflow-hidden rounded-3xl text-left ${
        conFoto ? 'min-h-[180px] justify-end p-5 pt-16' : `border p-5 ${clase.card}`
      }`}
    >
      {conFoto && (
        <>
          <img
            src={senal.negocio.portadaUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-surface-dark/90 from-0% via-surface-dark/25 via-60% to-transparent to-100%"
          />
        </>
      )}

      <div className="relative flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            conFoto ? 'bg-white/15 text-white backdrop-blur-sm' : `bg-card ${clase.icono}`
          }`}
        >
          <Icono size={20} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className={`text-[15px] leading-tight font-extrabold ${conFoto ? 'text-white' : 'text-texto'}`}>
            {senal.titulo}
          </p>
          <p className={`mt-1 text-[13px] leading-snug ${conFoto ? 'text-white/75' : 'text-texto-muted'}`}>
            {senal.detalle}
          </p>
        </div>
      </div>

      {pct != null && (
        <div className={`relative h-2 overflow-hidden rounded-full ${conFoto ? 'bg-white/20' : 'bg-borde'}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`h-full rounded-full ${conFoto ? 'bg-white' : 'bg-acento'}`}
          />
        </div>
      )}

      <span className={`relative flex items-center gap-1 text-sm font-bold ${conFoto ? 'text-white' : clase.cta}`}>
        {senal.cta} <ChevronRight size={15} strokeWidth={2.6} />
      </span>
    </motion.button>
  );
}

/**
 * Racha (días seguidos con actividad, en CUALQUIER negocio) + mini-gráfico de los últimos 7
 * días. Mismos datos y mismo lenguaje visual que ya usa `TabActividad` (barras `bg-acento`),
 * cruzando todos los negocios en vez de uno solo — es la pieza de "esto está vivo" que hoy
 * solo existe adentro de cada negocio, nunca en el Home (ver AUDITORIA-REFERENCIAS-PASITO.md,
 * sección "Home vs. Pasito"). Se oculta entero si no hay ninguna actividad en los últimos 7
 * días — no tiene sentido mostrar un gráfico en cero.
 */
function TuSemana({ relaciones }: { relaciones: Record<string, RelacionNegocio> }) {
  const { rachaDiasSeguidos, semana } = useMemo(() => actividadGlobal(relaciones), [relaciones]);
  const huboActividad = semana.some((dia) => dia.puntos > 0);
  if (!huboActividad) return null;

  const maxPuntos = Math.max(1, ...semana.map((dia) => dia.puntos));

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-borde bg-card p-4">
      {rachaDiasSeguidos >= 2 && (
        <div className="flex shrink-0 flex-col items-center gap-0.5 border-r border-borde pr-4">
          <span className="flex items-center gap-1 text-lg font-extrabold text-premio">
            <Flame size={17} className="fill-premio" /> {rachaDiasSeguidos}
          </span>
          <span className="text-[9px] font-bold tracking-wide text-texto-muted uppercase">
            {rachaDiasSeguidos === 1 ? 'día' : 'días'}
          </span>
        </div>
      )}
      <div className="flex flex-1 items-end justify-between gap-1.5">
        {semana.map((dia, indice) => (
          <div key={indice} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-9 w-full items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(dia.puntos / maxPuntos) * 100}%` }}
                transition={{ delay: indice * 0.04, duration: 0.4, ease: 'easeOut' }}
                className={`w-full rounded-t-md ${dia.puntos > 0 ? 'bg-acento' : 'bg-borde'}`}
                style={{ minHeight: dia.puntos > 0 ? '15%' : '3px' }}
              />
            </div>
            <span className={`text-[9px] font-bold ${dia.esHoy ? 'text-acento' : 'text-texto-disabled'}`}>
              {dia.etiqueta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * "Tu próximo premio": a diferencia del héroe (la señal más URGENTE, puede ser una alerta de
 * vencimiento), esta card siempre muestra el mejor premio real al alcance del cliente —
 * cruzando todos los negocios, mismo criterio de prioridad que ya usa `TabMisLocales`
 * (canjeable > casi > acumulando, ver `proximoPremioDestacado` en lib/home.ts). Se oculta si
 * el cliente todavía no tiene ninguna relación real (nada que priorizar).
 */
function ProximoPremio({
  premio,
  onAbrir,
}: {
  premio: NonNullable<ReturnType<typeof proximoPremioDestacado>>;
  onAbrir: () => void;
}) {
  const { negocio, recompensa, puntos, pct, estado } = premio;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAbrir}
      className="relative flex min-h-[168px] w-full flex-col justify-end overflow-hidden rounded-3xl p-5 pt-16 text-left"
    >
      {negocio.portadaUrl ? (
        <img src={negocio.portadaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: gradienteCss(negocio.rubro) }} />
      )}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-surface-dark/90 from-0% via-surface-dark/30 via-55% to-transparent to-100%"
      />
      <span className="relative mb-1 text-[10px] font-bold tracking-widest text-white/70 uppercase">
        Tu próximo premio
      </span>
      <p className="relative text-xl leading-tight font-extrabold text-white">{recompensa.descripcion}</p>
      <p className="relative mt-1 text-[13px] text-white/75">{negocio.nombre}</p>
      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/20">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full bg-white"
        />
      </div>
      <span className="relative mt-2 flex items-center gap-1 text-sm font-bold text-white">
        {estado === 'canjeable'
          ? 'Ya te alcanza — mostralo en el mostrador'
          : `Te faltan ${formatPuntos(recompensa.pts - puntos)} pts`}
        <ChevronRight size={15} strokeWidth={2.6} />
      </span>
    </motion.button>
  );
}

/**
 * Invitá a un amigo, a nivel Home: mismo bloque/lógica que ya vive en
 * `TabPerfilMarketplace.tsx` (07 — Invitá a un amigo) — elige el negocio ancla con
 * `negocioAncla`, resuelve el código de referido real en segundo plano
 * (`obtenerCodigoReferido`, con `codigoReferido(cliente)` como fallback sincrónico si el
 * click llega antes de que resuelva) y arma el link con `armarLinkInvitacion`. Se repite acá
 * en vez de importar el componente de Perfil porque ese vive mezclado con el resto de esa
 * pantalla (stats, canjes, ajustes) — la lógica de fondo es la misma, no se reescribe.
 */
function InvitarAmigo({
  negocios,
  relaciones,
  cliente,
}: {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  cliente: Cliente;
}) {
  const invitado = esInvitado(cliente);
  const [codigoRef, setCodigoRef] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

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

  const ancla = useMemo(() => negocioAncla(negocios, relaciones), [negocios, relaciones]);
  if (!ancla || invitado) return null;

  const invitar = async () => {
    const codigo = codigoRef ?? codigoReferido(cliente);
    const link = armarLinkInvitacion(window.location.origin, codigo, ancla.id);
    const texto =
      `¡Sumate a Premia.ar! Con mi invitación, cuando vayas ${formatVisitas(VISITAS_PARA_PREMIO)} a ` +
      `${ancla.nombre}, ganamos ${PUNTOS_BONUS_REFERIDO} pts cada uno. ${link}`;
    const copio = await compartir(texto, link);
    if (copio) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-premio-suave px-4 py-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-acento">
        <Users size={20} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-texto">Invitá a un amigo</p>
        <p className="mt-0.5 text-xs leading-snug text-texto-muted">
          Cuando vaya {formatVisitas(VISITAS_PARA_PREMIO)} a {ancla.nombre}, ganan {PUNTOS_BONUS_REFERIDO} pts
          los dos.
        </p>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={invitar}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-acento px-4 py-2.5 text-xs font-bold text-on-acento active:bg-acento-hover"
      >
        {copiado ? (
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
  );
}

/** Foto real del negocio (o degradé por rubro + emoji si no cargó una) — mismo criterio que
 *  `TarjetaExplorar`/`TabPerfilMarketplace`, nunca un placeholder "Foto pendiente" acá. */
function FotoNegocio({ negocio }: { negocio: Negocio }) {
  return (
    <div className="h-[72px] w-full overflow-hidden rounded-t-2xl">
      {negocio.portadaUrl ? (
        <img src={negocio.portadaUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-2xl"
          style={{ background: gradienteCss(negocio.rubro) }}
        >
          <span aria-hidden>{negocio.emoji}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Home del marketplace: motor de relevancia (F1), no un listado. Explorar (mapa) es donde se
 * navegan TODOS los locales — acá solo el héroe (la señal más urgente), tus lugares y un
 * descubrimiento curado. Ver docs/SPEC-HOME.md.
 */
export default function Marketplace({
  negocios,
  relaciones,
  cliente,
  nombreCliente,
  esNuevo,
  onAbrirNegocio,
}: Props) {
  const heroe = useMemo(() => heroeDelHome(negocios, relaciones), [negocios, relaciones]);
  const xpTotal = useMemo(() => calcularXpTotal(relaciones), [relaciones]);
  const premioDestacado = useMemo(
    () => proximoPremioDestacado(negocios, relaciones),
    [negocios, relaciones],
  );

  const misLugares = useMemo(
    () => negocios.filter((negocio) => relaciones[negocio.id]),
    [negocios, relaciones],
  );

  // Nuevos para vos: negocios donde el cliente todavía NO tiene relación, por calidad real.
  const nuevosParaVos = useMemo(
    () =>
      negocios
        .filter((negocio) => !relaciones[negocio.id])
        .sort((a, b) => b.clientesActivos - a.clientesActivos)
        .slice(0, 3),
    [negocios, relaciones],
  );

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-10">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-acento uppercase">
            <Sparkles size={11} strokeWidth={2.5} /> premia.ar
          </p>
          <p className="mt-1.5 text-xs font-semibold text-texto-muted">Hola, {nombreCliente.split(' ')[0]} 👋</p>
          <h1 className="mt-1 text-[26px] leading-[1.1] font-extrabold tracking-tight text-texto">
            {esNuevo ? 'Arrancás la partida' : 'Tu barrio, hoy'}
          </h1>
        </div>
        <img src="/premin.png" alt="Premín" className="h-11 w-11 shrink-0 object-contain" />
      </header>

      {heroe && <Heroe senal={heroe} onAbrir={() => onAbrirNegocio(heroe.negocio)} />}

      {!esNuevo && <CardNivelXp xpTotal={xpTotal} />}

      {premioDestacado && (
        <ProximoPremio premio={premioDestacado} onAbrir={() => onAbrirNegocio(premioDestacado.negocio)} />
      )}

      <TuSemana relaciones={relaciones} />

      {misLugares.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold tracking-widest text-texto-muted uppercase">Tus lugares</p>
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {misLugares.map((negocio) => {
              const relacion = relaciones[negocio.id];
              const listo = negocio.recompensas.some((recompensa) => recompensa.pts <= relacion.puntos);
              return (
                <button
                  key={negocio.id}
                  type="button"
                  onClick={() => onAbrirNegocio(negocio)}
                  className="flex w-[132px] shrink-0 flex-col gap-1.5 rounded-2xl border border-borde bg-card p-2.5 text-left"
                >
                  <LogoNegocio negocio={negocio} size="h-9 w-9" />
                  <span className="truncate text-xs font-bold text-texto">{negocio.nombre}</span>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      listo ? 'bg-premio-suave text-premio' : 'bg-fondo-medio text-texto-muted'
                    }`}
                  >
                    {listo ? 'Premio listo' : `${formatPuntos(relacion.puntos)} pts`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {nuevosParaVos.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-texto-muted uppercase">
            <Compass size={13} className="text-acento" /> Nuevos para vos
          </p>
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nuevosParaVos.map((negocio) => (
              <button
                key={negocio.id}
                type="button"
                onClick={() => onAbrirNegocio(negocio)}
                className="flex w-[132px] shrink-0 flex-col overflow-hidden rounded-2xl border border-borde bg-card text-left"
              >
                <FotoNegocio negocio={negocio} />
                <div className="flex flex-col gap-0.5 px-2.5 py-2">
                  <span className="truncate text-xs font-bold text-texto">{negocio.nombre}</span>
                  <span className="text-[10px] text-texto-muted">{negocio.categoria} · nunca fuiste</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!esNuevo && <InvitarAmigo negocios={negocios} relaciones={relaciones} cliente={cliente} />}
    </div>
  );
}
