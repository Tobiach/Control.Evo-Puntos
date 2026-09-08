import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Beef,
  CalendarDays,
  ChevronRight,
  Clock,
  Coffee,
  Compass,
  Flame,
  Gift,
  LayoutGrid,
  ShoppingCart,
  Search,
  Target,
  TrendingUp,
  UtensilsCrossed,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Rubro } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { formatPuntos } from '../../lib/club';
import { heroeDelHome, type SenalHome, type TipoSenal } from '../../lib/home';
import { mesesDesde } from '../../lib/geo';
import { META_PROMO } from '../../lib/promos';

type Filtro = 'todos' | Rubro;

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  nombreCliente: string;
  /** Todavía no tiene relación con ningún negocio real: recién se sumó al club. */
  esNuevo: boolean;
  onAbrirNegocio: (negocio: Negocio) => void;
  /** "Ver todos" → salta a la pestaña Explorar. */
  onIrAMapa: () => void;
}

const FILTROS: { id: Filtro; label: string; icono: LucideIcon }[] = [
  { id: 'todos', label: 'Todos', icono: LayoutGrid },
  { id: 'gastro', label: 'Gastro', icono: UtensilsCrossed },
  { id: 'super', label: 'Súper', icono: ShoppingCart },
  { id: 'carniceria', label: 'Carnicería', icono: Beef },
  { id: 'cafeteria', label: 'Cafetería', icono: Coffee },
];

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

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAbrir}
      className={`flex w-full flex-col gap-3 rounded-3xl border p-5 text-left ${clase.card}`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card ${clase.icono}`}>
          <Icono size={20} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] leading-tight font-extrabold text-texto">{senal.titulo}</p>
          <p className="mt-1 text-[13px] leading-snug text-texto-muted">{senal.detalle}</p>
        </div>
      </div>

      {pct != null && (
        <div className="h-2 overflow-hidden rounded-full bg-borde">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full bg-acento"
          />
        </div>
      )}

      <span className={`flex items-center gap-1 text-sm font-bold ${clase.cta}`}>
        {senal.cta} <ChevronRight size={15} strokeWidth={2.6} />
      </span>
    </motion.button>
  );
}

export default function Marketplace({
  negocios,
  relaciones,
  nombreCliente,
  esNuevo,
  onAbrirNegocio,
  onIrAMapa,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');

  const buscando = filtro !== 'todos' || !!busqueda.trim();

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

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    let lista = negocios.filter(
      (negocio) =>
        !texto ||
        negocio.nombre.toLowerCase().includes(texto) ||
        negocio.categoria.toLowerCase().includes(texto),
    );
    if (filtro !== 'todos') {
      lista = lista.filter(
        (negocio) => negocio.rubro === filtro || negocio.rubrosSecundarios?.includes(filtro),
      );
    }
    return lista;
  }, [negocios, busqueda, filtro]);

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

      {!buscando && heroe && <Heroe senal={heroe} onAbrir={() => onAbrirNegocio(heroe.negocio)} />}

      {!buscando && misLugares.length > 0 && (
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

      {!buscando && nuevosParaVos.length > 0 && (
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
                className="flex w-[132px] shrink-0 flex-col gap-1.5 rounded-2xl border border-borde bg-card p-2.5 text-left"
              >
                <LogoNegocio negocio={negocio} size="h-9 w-9" />
                <span className="truncate text-xs font-bold text-texto">{negocio.nombre}</span>
                <span className="text-[10px] text-texto-muted">{negocio.categoria} · nunca fuiste</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-widest text-texto-muted uppercase">Todos los locales</p>
          <button
            type="button"
            onClick={onIrAMapa}
            className="flex items-center gap-0.5 text-xs font-bold text-acento"
          >
            En el mapa <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>

        <label className="flex h-[46px] items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 focus-within:border-acento">
          <Search size={16} className="shrink-0 text-texto-muted" />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre o rubro"
            className="w-full bg-transparent text-sm font-medium text-texto outline-none placeholder:text-texto-muted"
          />
        </label>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTROS.map(({ id, label }) => {
            const activo = filtro === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  activo ? 'bg-acento text-on-acento' : 'border border-borde bg-card text-texto-muted'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visibles.map((negocio) => (
              <TarjetaNegocio
                key={negocio.id}
                negocio={negocio}
                relacion={relaciones[negocio.id]}
                onAbrir={() => onAbrirNegocio(negocio)}
              />
            ))}
          </AnimatePresence>
          {visibles.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-borde bg-card px-4 py-6 text-center text-sm text-texto-muted"
            >
              No encontramos locales con esa búsqueda. Probá con otro nombre.
            </motion.p>
          )}
        </div>
      </section>
    </div>
  );
}

function TarjetaNegocio({
  negocio,
  relacion,
  onAbrir,
}: {
  negocio: Negocio;
  relacion: RelacionNegocio | undefined;
  onAbrir: () => void;
}) {
  const meses = mesesDesde(negocio.fechaAlta);

  return (
    <motion.button
      layout
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileTap={{ scale: 0.97 }}
      onClick={onAbrir}
      className="w-full overflow-hidden rounded-3xl border border-borde bg-fondo text-left shadow-sm"
    >
      <div className="flex items-center gap-3 bg-card px-4 pt-4 pb-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl ${
            negocio.logoUrl ? 'bg-white' : 'bg-premio-suave'
          }`}
        >
          {negocio.logoUrl ? (
            <img src={negocio.logoUrl} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            negocio.emoji
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base leading-tight font-bold text-texto">{negocio.nombre}</p>
          <span className="mt-1 inline-block rounded-full bg-premio-suave px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-acento uppercase">
            {negocio.categoria}
          </span>
        </div>
      </div>

      {negocio.promos && negocio.promos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {negocio.promos.slice(0, 3).map((promo) => {
            const meta = META_PROMO[promo.tipo];
            const Icono = meta.icono;
            return (
              <span
                key={promo.titulo}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ background: `${meta.color}22`, color: meta.color }}
              >
                <Icono size={11} strokeWidth={2.5} /> {promo.titulo}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {negocio.recompensas.slice(0, 3).map((recompensa) => (
          <span
            key={recompensa.descripcion}
            className="rounded-full border border-borde px-2.5 py-1 text-[10px] font-semibold text-texto-muted"
          >
            🎁 {recompensa.descripcion} · {formatPuntos(recompensa.pts)} pts
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
        {relacion ? (
          <p className="text-sm font-bold text-acento">Tenés {formatPuntos(relacion.puntos)} pts acá</p>
        ) : (
          <p className="text-sm font-semibold text-texto-muted">Sumate — todavía no tenés puntos acá</p>
        )}
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-texto-muted">
          {negocio.clientesActivos >= 100 ? (
            <>
              <Users size={12} /> Ya lo usan {negocio.clientesActivos} personas
            </>
          ) : (
            <>
              <CalendarDays size={12} /> Hace {meses} {meses === 1 ? 'mes' : 'meses'} en Premia.ar
            </>
          )}
        </span>
      </div>
    </motion.button>
  );
}
