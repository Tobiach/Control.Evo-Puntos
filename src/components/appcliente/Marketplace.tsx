import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronLeft, LocateFixed, MapPin, Search, Users } from 'lucide-react';
import type { Rubro } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { formatPuntos } from '../../lib/club';
import { distanciaKm, formatDistancia, mesesDesde, type Coordenadas } from '../../lib/geo';

type Filtro = 'todos' | Rubro | 'cerca';

type EstadoGeo =
  | { estado: 'inactivo' }
  | { estado: 'pidiendo' }
  | { estado: 'ok'; coords: Coordenadas }
  | { estado: 'error'; mensaje: string };

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  nombreCliente: string;
  onAbrirNegocio: (negocio: Negocio) => void;
  onSalir: () => void;
}

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'gastro', label: 'Gastronomía' },
  { id: 'super', label: 'Supermercado' },
  { id: 'cerca', label: 'Cerca tuyo' },
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
};

/** Centro aproximado de Palermo, para saber si el usuario está en el barrio. */
const CENTRO_PALERMO: Coordenadas = { lat: -34.5855, lng: -58.428 };

export default function Marketplace({
  negocios,
  relaciones,
  nombreCliente,
  onAbrirNegocio,
  onSalir,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [geo, setGeo] = useState<EstadoGeo>({ estado: 'inactivo' });

  const coords = geo.estado === 'ok' ? geo.coords : null;

  const pedirUbicacion = () => {
    if (!('geolocation' in navigator)) {
      setGeo({
        estado: 'error',
        mensaje: 'Tu navegador no soporta geolocalización. Te mostramos todos los locales igual.',
      });
      return;
    }
    setGeo({ estado: 'pidiendo' });
    navigator.geolocation.getCurrentPosition(
      (posicion) =>
        setGeo({
          estado: 'ok',
          coords: { lat: posicion.coords.latitude, lng: posicion.coords.longitude },
        }),
      (error) =>
        setGeo({
          estado: 'error',
          mensaje:
            error.code === error.PERMISSION_DENIED
              ? 'No nos diste permiso de ubicación. Podés activarlo en tu navegador y reintentar.'
              : 'No pudimos obtener tu ubicación. Revisá el GPS y reintentá.',
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const elegirFiltro = (nuevo: Filtro) => {
    setFiltro(nuevo);
    if (nuevo === 'cerca' && geo.estado !== 'ok' && geo.estado !== 'pidiendo') {
      pedirUbicacion();
    }
  };

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    let lista = negocios.filter(
      (negocio) =>
        !texto ||
        negocio.nombre.toLowerCase().includes(texto) ||
        negocio.categoria.toLowerCase().includes(texto),
    );
    if (filtro === 'gastro' || filtro === 'super') {
      lista = lista.filter((negocio) => negocio.rubro === filtro);
    }
    if (filtro === 'cerca' && coords) {
      lista = [...lista].sort(
        (a, b) => distanciaKm(coords, a) - distanciaKm(coords, b),
      );
    }
    return lista;
  }, [negocios, busqueda, filtro, coords]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-6 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-texto-muted">
            Hola, {nombreCliente.split(' ')[0]} 👋
          </p>
          <h1 className="font-titulo text-2xl font-bold text-texto">Locales que te premian</h1>
          <p className="mt-0.5 text-xs text-texto-muted">
            Sumás puntos distintos en cada local afiliado
          </p>
        </div>
        <button
          type="button"
          onClick={onSalir}
          aria-label="Salir de la app"
          className="rounded-full border border-borde bg-card p-2 text-texto-muted"
        >
          <ChevronLeft size={18} />
        </button>
      </header>

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
              onClick={() => elegirFiltro(id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activo
                  ? 'bg-acento text-on-acento'
                  : 'border border-borde bg-card text-texto-muted'
              }`}
            >
              {id === 'cerca' && <LocateFixed size={13} strokeWidth={2.5} />}
              {label}
            </button>
          );
        })}
      </div>

      {filtro === 'cerca' && geo.estado === 'pidiendo' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3 text-sm text-texto-muted"
        >
          <LocateFixed size={16} className="animate-pulse text-acento" />
          Buscando tu ubicación…
        </motion.div>
      )}

      {filtro === 'cerca' && geo.estado === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-borde bg-card px-4 py-3.5"
        >
          <p className="text-sm leading-snug text-texto-muted">{geo.mensaje}</p>
          <button
            type="button"
            onClick={pedirUbicacion}
            className="mt-2.5 rounded-full bg-acento px-4 py-2 text-xs font-bold text-on-acento active:bg-acento-hover"
          >
            Reintentar
          </button>
        </motion.div>
      )}

      {filtro === 'cerca' && coords && <MiniMapa negocios={visibles} coords={coords} onAbrir={onAbrirNegocio} />}

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {visibles.map((negocio) => (
            <TarjetaNegocio
              key={negocio.id}
              negocio={negocio}
              relacion={relaciones[negocio.id]}
              distancia={coords ? distanciaKm(coords, negocio) : null}
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
  distancia,
  onAbrir,
}: {
  negocio: Negocio;
  relacion: RelacionNegocio | undefined;
  distancia: number | null;
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
          <p className="font-titulo text-base leading-tight font-bold" style={{ color: estilo.texto }}>
            {negocio.nombre}
          </p>
          <span
            className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
            style={{ background: estilo.pillFondo, color: estilo.acento }}
          >
            {negocio.categoria}
          </span>
        </div>
        {distancia !== null && (
          <span
            className="flex shrink-0 items-center gap-1 text-xs font-bold"
            style={{ color: estilo.acento }}
          >
            <MapPin size={13} strokeWidth={2.5} />
            {formatDistancia(distancia)}
          </span>
        )}
      </div>

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
              <CalendarDays size={12} /> Hace {meses} {meses === 1 ? 'mes' : 'meses'} en Control.Evo
            </>
          )}
        </span>
      </div>
    </motion.button>
  );
}

/**
 * Mini-mapa aproximado (sin librería de mapas): posiciona los pines según la
 * distancia relativa real entre coordenadas, normalizadas al contenedor.
 */
function MiniMapa({
  negocios,
  coords,
  onAbrir,
}: {
  negocios: Negocio[];
  coords: Coordenadas;
  onAbrir: (negocio: Negocio) => void;
}) {
  const distanciaAlBarrio = distanciaKm(coords, CENTRO_PALERMO);
  const usuarioEnZona = distanciaAlBarrio <= 8;

  const puntos: Coordenadas[] = negocios.map(({ lat, lng }) => ({ lat, lng }));
  if (usuarioEnZona) puntos.push(coords);
  if (puntos.length === 0) return null;

  const minLat = Math.min(...puntos.map((p) => p.lat));
  const maxLat = Math.max(...puntos.map((p) => p.lat));
  const minLng = Math.min(...puntos.map((p) => p.lng));
  const maxLng = Math.max(...puntos.map((p) => p.lng));
  const spanLat = Math.max(maxLat - minLat, 0.0015);
  const spanLng = Math.max(maxLng - minLng, 0.0015);

  const posicion = (p: Coordenadas) => ({
    left: `${10 + ((p.lng - minLng) / spanLng) * 80}%`,
    top: `${12 + (1 - (p.lat - minLat) / spanLat) * 72}%`,
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden rounded-3xl border border-borde bg-card"
    >
      <div
        className="relative h-64 w-full"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-borde) 1px, transparent 1px), linear-gradient(90deg, var(--color-borde) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        {negocios.map((negocio) => (
          <button
            key={negocio.id}
            type="button"
            onClick={() => onAbrir(negocio)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={posicion(negocio)}
            aria-label={`Abrir ${negocio.nombre}`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-borde bg-fondo-medio text-lg shadow-md">
              {negocio.emoji}
            </span>
            <span className="mt-0.5 max-w-20 truncate rounded-full bg-fondo-medio/90 px-1.5 text-[9px] font-bold text-texto">
              {negocio.nombre}
            </span>
            <span className="text-[9px] font-semibold text-acento">
              {formatDistancia(distanciaKm(coords, negocio))}
            </span>
          </button>
        ))}

        {usuarioEnZona && (
          <div
            className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={posicion(coords)}
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-acento text-sm text-on-acento shadow-lg"
            >
              📍
            </motion.span>
            <span className="mt-0.5 rounded-full bg-acento px-1.5 text-[9px] font-bold text-on-acento">
              Vos
            </span>
          </div>
        )}
      </div>

      <p className="border-t border-borde px-4 py-2.5 text-[11px] font-semibold text-texto-muted">
        {usuarioEnZona
          ? 'Mapa aproximado de Palermo — tocá un pin para entrar al local'
          : `Estás ${formatDistancia(distanciaAlBarrio)} de Palermo — locales ordenados por cercanía`}
      </p>
    </motion.div>
  );
}
