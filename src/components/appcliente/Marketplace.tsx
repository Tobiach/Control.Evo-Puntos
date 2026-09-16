import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, ChevronRight, Compass, Flame, Gift, Share2, Star, Users } from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { calcularXpTotal, codigoReferido, formatPuntos, negocioAncla } from '../../lib/club';
import { actividadGlobal, GRUPO_SENAL, heroeDelHome, type SenalHome } from '../../lib/home';
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
  /** "Ver progreso →" en la card de nivel — sin esto, la card no es clickeable. */
  onVerProgreso?: () => void;
}

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

/**
 * Card de estado — UNA sola, no dos. Antes había un héroe adaptativo Y una card separada de
 * "próximo premio" que podían mostrar la misma idea con selección distinta (confuso). Ahora
 * `heroeDelHome` (ya prioriza correctamente entre vencimiento/recompensa-lista/x2-ahora/
 * near-win/racha-riesgo/al-dia/descubrir) alimenta una sola card con 2 tratamientos, nunca
 * mezclados: "premio listo" (algo para canjear YA, sin barra de progreso) o "tu próximo
 * premio" (en camino, con barra + "te faltan X pts"). Ver corrección del 15/9.
 *
 * La foto real del negocio (si hay) va de fondo, tenue, con un respiro lento (zoom sutil) en
 * vez de una miniatura chica en la esquina — Tobías pidió más "fondos/imagen/movimiento";
 * esto le da textura sin volver al problema original ("se siente como una card cualquiera"):
 * el degradé oscuro deja el texto/badge/CTA dominando igual. Respeta
 * `prefers-reduced-motion` (`useReducedMotion`).
 */
function CardEstado({ senal, onAbrir }: { senal: SenalHome; onAbrir: () => void }) {
  const reducirMovimiento = useReducedMotion();
  const listo = GRUPO_SENAL[senal.tipo] === 'listo';
  const pct =
    !listo && senal.faltan != null && senal.recompensa
      ? Math.min(100, Math.round((senal.puntos / senal.recompensa.pts) * 100))
      : null;
  const titulo = senal.recompensa?.descripcion ?? senal.titulo;
  const ctaTexto = listo
    ? `Ver ${senal.negocio.nombre}`
    : senal.faltan != null
      ? `Te faltan ${formatPuntos(senal.faltan)} pts`
      : senal.cta;
  const conFoto = !!senal.negocio.portadaUrl;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAbrir}
      className="relative flex w-full flex-col gap-4 overflow-hidden rounded-3xl bg-surface-dark p-5 text-left"
    >
      {conFoto && (
        <motion.img
          src={senal.negocio.portadaUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          initial={{ scale: reducirMovimiento ? 1 : 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 14, repeat: reducirMovimiento ? 0 : Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      )}
      {conFoto && (
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-surface-dark from-10% via-surface-dark/85 via-55% to-surface-dark/40"
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase ${
            listo ? 'bg-premio text-white' : 'bg-acento text-on-acento'
          }`}
        >
          {listo ? <Gift size={12} strokeWidth={2.5} /> : <Star size={12} strokeWidth={2.5} />}
          {listo ? 'Premio listo' : 'Tu próximo premio'}
        </span>
      </div>

      <div className="relative">
        <p className="text-xl leading-tight font-extrabold text-white">{titulo}</p>
        <p className="mt-1 text-[13px] text-white/70">{senal.negocio.nombre}</p>
      </div>

      {pct != null && (
        <div className="relative h-2 overflow-hidden rounded-full bg-white/15">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full bg-acento"
          />
        </div>
      )}

      <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-surface-dark">
        {ctaTexto} <ChevronRight size={13} strokeWidth={2.8} />
      </span>
    </motion.button>
  );
}

/**
 * Racha + gráfico de puntos de los últimos 7 días, cruzando TODOS los negocios (mismo dato de
 * siempre, `actividadGlobal` en lib/home.ts). Tobías pidió de vuelta el gráfico de barras real
 * por usuario (no un resumen de puntitos) — cada barra es la actividad real de ESE día, no una
 * aproximación. Se oculta entero si no hubo ninguna actividad en la semana.
 */
function TuSemana({ relaciones }: { relaciones: Record<string, RelacionNegocio> }) {
  const { rachaDiasSeguidos, semana } = useMemo(() => actividadGlobal(relaciones), [relaciones]);
  const huboActividad = semana.some((dia) => dia.puntos > 0);
  if (!huboActividad) return null;
  const maxPuntos = Math.max(1, ...semana.map((dia) => dia.puntos));

  return (
    <div className="rounded-3xl border border-borde bg-card p-4">
      {rachaDiasSeguidos >= 2 && (
        <p className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-premio">
          <Flame size={16} className="fill-premio" strokeWidth={2} /> Racha de {rachaDiasSeguidos}{' '}
          {rachaDiasSeguidos === 1 ? 'día' : 'días'}
          <span className="font-semibold text-texto-muted">· ¡Seguís sumando!</span>
        </p>
      )}
      <div className="flex items-end justify-between gap-1.5">
        {semana.map((dia, indice) => (
          <div key={indice} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-14 w-full items-end">
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
 * Invitá a un amigo, a nivel Home: mismo bloque/lógica que ya vive en
 * `TabPerfilMarketplace.tsx` (07 — Invitá a un amigo) — elige el negocio ancla con
 * `negocioAncla`, resuelve el código de referido real en segundo plano
 * (`obtenerCodigoReferido`, con `codigoReferido(cliente)` como fallback sincrónico si el
 * click llega antes de que resuelva) y arma el link con `armarLinkInvitacion`. Se repite acá
 * en vez de importar el componente de Perfil porque ese vive mezclado con el resto de esa
 * pantalla (stats, canjes, ajustes) — la lógica de fondo es la misma, no se reescribe.
 * Microacción secundaria (nunca compite con la card de estado ni con descubrimiento).
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
 *  `TarjetaExplorar`/`TabPerfilMarketplace`, nunca un placeholder "Foto pendiente" acá.
 *  `alto` configurable: las cards de descubrimiento necesitan más protagonismo de imagen que
 *  las de "Tus lugares". */
function FotoNegocio({ negocio, alto = 'h-[72px]' }: { negocio: Negocio; alto?: string }) {
  return (
    <div className={`${alto} w-full overflow-hidden rounded-t-2xl`}>
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
 * navegan TODOS los locales — acá solo el estado del cliente, descubrimiento curado y sus
 * lugares. Ver docs/SPEC-HOME.md.
 *
 * Jerarquía fija (corrección 15/9, no cosmética): identidad → promesa fija → nivel/progreso →
 * estado (premio listo / próximo premio, una sola card) → descubrimiento → racha (gráfico real
 * de 7 días) → invitar a un amigo → tus lugares. La promesa ("Cada visita te acerca a tu
 * próximo premio") ya NO cambia según `esNuevo` — Premia no se presenta como un juego
 * ("Arrancás la partida" se eliminó del todo); lo que sí varía con `esNuevo` es qué bloques
 * tienen sentido mostrar (nivel/invitar necesitan que ya exista alguna relación real).
 */
export default function Marketplace({
  negocios,
  relaciones,
  cliente,
  nombreCliente,
  esNuevo,
  onAbrirNegocio,
  onVerProgreso,
}: Props) {
  const heroe = useMemo(() => heroeDelHome(negocios, relaciones), [negocios, relaciones]);
  const xpTotal = useMemo(() => calcularXpTotal(relaciones), [relaciones]);

  const misLugares = useMemo(
    () => negocios.filter((negocio) => relaciones[negocio.id]),
    [negocios, relaciones],
  );

  // Descubrí nuevos lugares: negocios donde el cliente todavía NO tiene relación, por calidad real.
  const nuevosParaVos = useMemo(
    () =>
      negocios
        .filter((negocio) => !relaciones[negocio.id])
        .sort((a, b) => b.clientesActivos - a.clientesActivos)
        .slice(0, 3),
    [negocios, relaciones],
  );

  const nivelCard = (
    <button
      type="button"
      onClick={onVerProgreso}
      disabled={!onVerProgreso}
      className="text-left disabled:cursor-default"
    >
      <CardNivelXp xpTotal={xpTotal} />
    </button>
  );

  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-10">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold tracking-tight text-acento">premia.ar</p>
          <p className="mt-2 text-xs font-semibold text-texto-muted">Hola, {nombreCliente.split(' ')[0]} 👋</p>
          <h1 className="mt-1 text-[26px] leading-[1.15] font-extrabold tracking-tight text-texto">
            Cada visita te acerca a tu próximo premio.
          </h1>
          <p className="mt-1.5 text-[13px] leading-snug text-texto-muted">
            Explorá, comprá, sumá puntos y viví nuevas experiencias.
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-acento-suave">
          <img src="/premin.png" alt="Premín" className="h-9 w-9 object-contain" />
        </span>
      </header>

      {!esNuevo && nivelCard}

      {heroe && <CardEstado senal={heroe} onAbrir={() => onAbrirNegocio(heroe.negocio)} />}

      {nuevosParaVos.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-bold text-texto">
              <Compass size={14} className="text-acento" /> Descubrí nuevos lugares
            </p>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nuevosParaVos.map((negocio) => {
              const masBarata = [...negocio.recompensas].sort((a, b) => a.pts - b.pts)[0];
              return (
                <button
                  key={negocio.id}
                  type="button"
                  onClick={() => onAbrirNegocio(negocio)}
                  className="flex w-[150px] shrink-0 flex-col overflow-hidden rounded-2xl border border-borde bg-card text-left"
                >
                  <div className="relative">
                    <FotoNegocio negocio={negocio} alto="h-24" />
                    <span className="absolute top-2 left-2 rounded-full bg-verde-ok px-2 py-0.5 text-[9px] font-bold text-white">
                      Nuevo
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 px-2.5 py-2.5">
                    <span className="line-clamp-2 text-xs leading-snug font-bold text-texto">{negocio.nombre}</span>
                    <span className="text-[10px] text-texto-muted">{negocio.categoria}</span>
                    {masBarata && (
                      <span className="text-[10px] font-bold text-acento">Desde {formatPuntos(masBarata.pts)} pts</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <TuSemana relaciones={relaciones} />

      {!esNuevo && <InvitarAmigo negocios={negocios} relaciones={relaciones} cliente={cliente} />}

      {misLugares.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <p className="text-sm font-bold text-texto">Tus lugares</p>
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {misLugares.map((negocio) => {
              const relacion = relaciones[negocio.id];
              const listo = negocio.recompensas.some((recompensa) => recompensa.pts <= relacion.puntos);
              return (
                <button
                  key={negocio.id}
                  type="button"
                  onClick={() => onAbrirNegocio(negocio)}
                  className="flex w-[140px] shrink-0 flex-col gap-1.5 rounded-2xl border border-borde bg-card p-2.5 text-left"
                >
                  <LogoNegocio negocio={negocio} size="h-9 w-9" />
                  <span className="line-clamp-2 text-xs leading-snug font-bold text-texto">{negocio.nombre}</span>
                  <span
                    className={`inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
    </div>
  );
}
