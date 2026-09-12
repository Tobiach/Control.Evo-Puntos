import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ChevronRight,
  Clock,
  Compass,
  Flame,
  Gift,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { formatPuntos } from '../../lib/club';
import { heroeDelHome, type SenalHome, type TipoSenal } from '../../lib/home';
import { gradienteCss } from '../../lib/temaNegocio';

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
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
export default function Marketplace({ negocios, relaciones, nombreCliente, esNuevo, onAbrirNegocio }: Props) {
  const heroe = useMemo(() => heroeDelHome(negocios, relaciones), [negocios, relaciones]);

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
          <p className="text-xs font-semibold text-texto-muted">Hola, {nombreCliente.split(' ')[0]} 👋</p>
          <h1 className="mt-1 text-[26px] leading-[1.1] font-extrabold tracking-tight text-texto">
            {esNuevo ? 'Arrancás la partida' : 'Tu barrio, hoy'}
          </h1>
        </div>
        <img src="/premin.png" alt="Premín" className="h-11 w-11 shrink-0 object-contain" />
      </header>

      {heroe && <Heroe senal={heroe} onAbrir={() => onAbrirNegocio(heroe.negocio)} />}

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
    </div>
  );
}
