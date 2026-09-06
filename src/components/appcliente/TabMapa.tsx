import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LocateFixed, Maximize2 } from 'lucide-react';
import type { Rubro } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { distanciaKm, type Coordenadas } from '../../lib/geo';
import MapaNegocios from './MapaNegocios';
import MapaCompleto from './MapaCompleto';
import TarjetaExplorar from './TarjetaExplorar';

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

/** Nombres en plural (criterio de esta pantalla, no el resto de la app). */
const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'cafeteria', label: 'Cafeterías' },
  { id: 'gastro', label: 'Gastronomía' },
  { id: 'super', label: 'Almacenes' },
  { id: 'carniceria', label: 'Carnicerías' },
];

/** Mapa como pestaña propia del marketplace — antes vivía escondido detrás del filtro "Cerca mío". */
export default function TabMapa({ negocios, relaciones, onAbrirNegocio }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [geo, setGeo] = useState<EstadoGeo>({ estado: 'inactivo' });
  const [negocioActivoId, setNegocioActivoId] = useState<string | null>(null);
  const [mapaCompleto, setMapaCompleto] = useState(false);

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

  // Pedir la ubicación apenas se entra a Explorar, sin esperar un click: la API de
  // geolocalización no exige gesto del usuario (no es como autoplay/fullscreen), y una vez
  // que el navegador ya tiene una decisión guardada (permitido o bloqueado), esto resuelve
  // solo, sin volver a mostrar ningún permiso. El botón de abajo queda como respaldo visual
  // para el instante entre montar y que responda el navegador.
  useEffect(() => {
    pedirUbicacion();
    // Solo al montar (array vacío a propósito): entrar de nuevo a la pestaña no debe
    // relanzar el pedido en cada render.
  }, []);

  const visibles = useMemo(
    () =>
      filtro === 'todos'
        ? negocios
        : negocios.filter(
            (negocio) => negocio.rubro === filtro || negocio.rubrosSecundarios?.includes(filtro),
          ),
    [negocios, filtro],
  );

  const coords = geo.estado === 'ok' ? geo.coords : null;
  const cercanos = useMemo(
    () =>
      coords
        ? [...visibles].sort((a, b) => distanciaKm(coords, a) - distanciaKm(coords, b))
        : visibles,
    [visibles, coords],
  );

  const seleccionar = (negocio: Negocio) => {
    setNegocioActivoId(negocio.id);
    document
      .getElementById(`negocio-${negocio.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Mapa + filtros fijos arriba: bajar a ver más locales nunca los tapa. */}
      <div
        className={`sticky top-0 z-10 flex flex-col gap-4 bg-fondo pt-6 pb-3 ${
          geo.estado === 'ok' ? 'border-b border-borde' : ''
        }`}
      >
        <div className="flex flex-col gap-4 px-5">
          <h1 className="text-2xl font-bold text-texto">Explorar</h1>

          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTROS.map(({ id, label }) => {
              const activo = filtro === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFiltro(id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    activo ? 'bg-surface-dark text-white' : 'border border-borde bg-card text-texto-muted'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {geo.estado === 'inactivo' && (
          <div className="px-5">
            <button
              type="button"
              onClick={pedirUbicacion}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-borde bg-card py-3.5 text-sm font-bold text-texto"
            >
              <LocateFixed size={16} className="text-ubicacion" /> Usar mi ubicación
            </button>
          </div>
        )}

        {geo.estado === 'pidiendo' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-5 flex items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3 text-sm text-texto-muted"
          >
            <LocateFixed size={16} className="animate-pulse text-ubicacion" />
            Buscando tu ubicación…
          </motion.div>
        )}

        {geo.estado === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-5 rounded-2xl border border-borde bg-card px-4 py-3.5"
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
          <MapaNegocios
            negocios={visibles}
            relaciones={relaciones}
            coords={geo.coords}
            negocioActivoId={negocioActivoId}
            onSeleccionar={seleccionar}
          />
        )}
      </div>

      {geo.estado === 'ok' && (
        <>
          <div className="flex flex-col gap-3 px-5 pt-4 pb-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-texto">Cerca tuyo</p>
              <button
                type="button"
                onClick={() => setMapaCompleto(true)}
                className="flex items-center gap-1 text-xs font-bold text-premio"
              >
                <Maximize2 size={12} strokeWidth={2.5} /> Ver mapa completo
              </button>
            </div>

            {cercanos.length === 0 ? (
              <p className="rounded-2xl border border-borde bg-card px-4 py-6 text-center text-sm text-texto-muted">
                No encontramos locales con ese filtro.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {cercanos.map((negocio) => (
                  <TarjetaExplorar
                    key={negocio.id}
                    negocio={negocio}
                    relacion={relaciones[negocio.id]}
                    distanciaKm={distanciaKm(geo.coords, negocio)}
                    activo={negocio.id === negocioActivoId}
                    onAbrir={() => onAbrirNegocio(negocio)}
                  />
                ))}
              </div>
            )}
          </div>

          <AnimatePresence>
            {mapaCompleto && (
              <MapaCompleto
                negocios={visibles}
                relaciones={relaciones}
                coords={geo.coords}
                negocioActivoId={negocioActivoId}
                onSeleccionar={seleccionar}
                onCerrar={() => setMapaCompleto(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
