import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { LocateFixed } from 'lucide-react';
import type { Rubro } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import type { Coordenadas } from '../../lib/geo';
import MapaNegocios from './MapaNegocios';

type Filtro = 'todos' | Rubro;

type EstadoGeo =
  | { estado: 'inactivo' }
  | { estado: 'pidiendo' }
  | { estado: 'ok'; coords: Coordenadas }
  | { estado: 'error'; mensaje: string };

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  onAbrirNegocio: (negocio: Negocio) => void;
}

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'gastro', label: 'Gastronomía' },
  { id: 'super', label: 'Supermercado' },
  { id: 'carniceria', label: 'Carnicería' },
  { id: 'cafeteria', label: 'Cafetería' },
];

/** Mapa como pestaña propia del marketplace — antes vivía escondido detrás del filtro "Cerca mío". */
export default function TabMapa({ negocios, relaciones, onAbrirNegocio }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [geo, setGeo] = useState<EstadoGeo>({ estado: 'inactivo' });

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

  const visibles = useMemo(
    () =>
      filtro === 'todos'
        ? negocios
        : negocios.filter(
            (negocio) => negocio.rubro === filtro || negocio.rubrosSecundarios?.includes(filtro),
          ),
    [negocios, filtro],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-6">
      <h1 className="text-2xl font-bold text-texto">Mapa</h1>

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

      {geo.estado === 'inactivo' && (
        <button
          type="button"
          onClick={pedirUbicacion}
          className="flex items-center justify-center gap-2 rounded-2xl border border-borde bg-card py-3.5 text-sm font-bold text-texto"
        >
          <LocateFixed size={16} className="text-ubicacion" /> Usar mi ubicación
        </button>
      )}

      {geo.estado === 'pidiendo' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3 text-sm text-texto-muted"
        >
          <LocateFixed size={16} className="animate-pulse text-ubicacion" />
          Buscando tu ubicación…
        </motion.div>
      )}

      {geo.estado === 'error' && (
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

      {geo.estado === 'ok' && (
        <MapaNegocios negocios={visibles} relaciones={relaciones} coords={geo.coords} onAbrir={onAbrirNegocio} />
      )}
    </div>
  );
}
