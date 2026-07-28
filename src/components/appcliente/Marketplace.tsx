import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Flame, MapPin, Search, Trophy, Users } from 'lucide-react';
import type { Rubro } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { formatPuntos } from '../../lib/club';
import { horarioValleActivoAhora } from '../../lib/misiones';
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
}

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'gastro', label: 'Gastronomía' },
  { id: 'super', label: 'Supermercado' },
  { id: 'carniceria', label: 'Carnicería' },
  { id: 'cafeteria', label: 'Cafetería' },
];

/** Cada tarjeta conserva el tema de SU negocio (gastro oscuro / super claro),
 *  sin depender del tema global de la página. */
const ESTILO_RUBRO: Record<
  Rubro,
  {
    fondo: string;
    banner: string;
    borde: string;
    texto: string;
    muted: string;
    acento: string;
    pillFondo: string;
  }
> = {
  gastro: {
    fondo: '#1A1A1A',
    banner: 'linear-gradient(135deg, rgba(201,151,58,0.24), rgba(201,151,58,0.05))',
    borde: 'rgba(201, 151, 58, 0.3)',
    texto: '#F5F0E8',
    muted: '#A89880',
    acento: '#E5B860',
    pillFondo: 'rgba(201, 151, 58, 0.14)',
  },
  super: {
    fondo: '#FFFFFF',
    banner: 'linear-gradient(135deg, rgba(139,0,0,0.10), rgba(139,0,0,0.02))',
    borde: '#E5E7EB',
    texto: '#111827',
    muted: '#4B5563',
    acento: '#8B0000',
    pillFondo: 'rgba(139, 0, 0, 0.08)',
  },
  carniceria: {
    fondo: '#1C1410',
    banner: 'linear-gradient(135deg, rgba(196,74,58,0.24), rgba(196,74,58,0.05))',
    borde: 'rgba(196, 74, 58, 0.3)',
    texto: '#F5EDE4',
    muted: '#A89184',
    acento: '#E0574B',
    pillFondo: 'rgba(196, 74, 58, 0.14)',
  },
  cafeteria: {
    fondo: '#2B1D14',
    banner: 'linear-gradient(135deg, rgba(217,165,82,0.24), rgba(217,165,82,0.05))',
    borde: 'rgba(217, 165, 82, 0.3)',
    texto: '#F5EBE0',
    muted: '#B8A594',
    acento: '#D9A552',
    pillFondo: 'rgba(217, 165, 82, 0.14)',
  },
};

export default function Marketplace({ negocios, relaciones, nombreCliente, esNuevo, onAbrirNegocio }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    let lista = negocios.filter(
      (negocio) =>
        !texto ||
        negocio.nombre.toLowerCase().includes(texto) ||
        negocio.categoria.toLowerCase().includes(texto),
    );
    if (filtro !== 'todos') {
      lista = lista.filter((negocio) => negocio.rubro === filtro);
    }
    return lista;
  }, [negocios, busqueda, filtro]);

  // Ofertas reales: solo negocios con horario valle configurado por el dueño Y vigente
  // ahora mismo (día + franja horaria reales) — nunca un countdown decorativo.
  const activasAhora = useMemo(
    () => negocios.filter((negocio) => negocio.horarioValle && horarioValleActivoAhora(negocio.horarioValle)).slice(0, 3),
    [negocios],
  );

  // Los más elegidos: ranking real por clientes activos del local, sin inventar estrellas.
  const masElegidos = useMemo(
    () => [...negocios].sort((a, b) => b.clientesActivos - a.clientesActivos).slice(0, 3),
    [negocios],
  );

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-10">
      <header>
        <p className="text-xs font-semibold text-texto-muted">Hola, {nombreCliente.split(' ')[0]} 👋</p>
        <h1 className="text-2xl font-bold text-texto">Locales que te premian</h1>
        <p className="mt-0.5 text-xs text-texto-muted">Sumás puntos distintos en cada local afiliado</p>
      </header>

      {esNuevo && filtro === 'todos' && !busqueda.trim() && negocios.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-surface-dark px-4 py-3.5 text-white">
          <MapPin size={18} className="mt-0.5 shrink-0 text-premio" strokeWidth={2.4} />
          <p className="text-sm leading-snug">
            <span className="font-bold">
              {negocios.length === 1
                ? 'Ya hay 1 local esperándote'
                : `Ya hay ${negocios.length} locales esperándote`}
            </span>
            <br />
            <span className="text-white/60">Empezá por el que más visitás.</span>
          </p>
        </div>
      )}

      <label className="flex items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3">
        <Search size={17} className="shrink-0 text-texto-muted" />
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar por nombre o categoría…"
          className="w-full bg-transparent text-sm font-medium text-texto outline-none placeholder:text-texto-muted"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map(({ id, label }) => {
          const activo = filtro === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activo ? 'bg-acento text-on-acento' : 'border border-borde bg-card text-texto-muted'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activasAhora.length > 0 && filtro === 'todos' && !busqueda.trim() && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-texto-muted uppercase">
            <Flame size={13} className="text-acento" /> Activo ahora
          </p>
          {activasAhora.map((negocio) => (
            <button
              key={negocio.id}
              type="button"
              onClick={() => onAbrirNegocio(negocio)}
              className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3 text-left"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-acento" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-texto">
                  {negocio.emoji} {negocio.nombre}
                </span>
                <span className="block text-xs font-semibold text-texto-muted">
                  Puntos x2 · termina a las {negocio.horarioValle?.hasta}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {masElegidos.length > 0 && filtro === 'todos' && !busqueda.trim() && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-texto-muted uppercase">
            <Trophy size={13} className="text-premio" /> Los más elegidos
          </p>
          <div className="flex flex-col gap-1.5 rounded-2xl border border-borde bg-card p-2">
            {masElegidos.map((negocio, indice) => (
              <button
                key={negocio.id}
                type="button"
                onClick={() => onAbrirNegocio(negocio)}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left"
              >
                <span className="font-titulo w-4 text-sm font-bold text-premio">{indice + 1}</span>
                <span className="flex-1 text-sm font-semibold text-texto">
                  {negocio.emoji} {negocio.nombre}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-texto-muted">
                  <Users size={11} /> {negocio.clientesActivos}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
  const estilo = ESTILO_RUBRO[negocio.rubro];
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
      className="w-full overflow-hidden rounded-3xl border text-left shadow-sm"
      style={{ background: estilo.fondo, borderColor: estilo.borde }}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3" style={{ background: estilo.banner }}>
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ background: estilo.pillFondo }}
        >
          {negocio.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base leading-tight font-bold" style={{ color: estilo.texto }}>
            {negocio.nombre}
          </p>
          <span
            className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
            style={{ background: estilo.pillFondo, color: estilo.acento }}
          >
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
            className="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
            style={{ borderColor: estilo.borde, color: estilo.muted }}
          >
            🎁 {recompensa.descripcion} · {formatPuntos(recompensa.pts)} pts
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
        {relacion ? (
          <p className="text-sm font-bold" style={{ color: estilo.acento }}>
            Tenés {formatPuntos(relacion.puntos)} pts acá
          </p>
        ) : (
          <p className="text-sm font-semibold" style={{ color: estilo.muted }}>
            Sumate — todavía no tenés puntos acá
          </p>
        )}
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold"
          style={{ color: estilo.muted }}
        >
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
