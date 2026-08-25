import { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { LocateFixed, Minus, Plus, Users } from 'lucide-react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { distanciaKm, type Coordenadas } from '../../lib/geo';
import { horarioValleActivoAhora } from '../../lib/misiones';

/** Centro aproximado de Palermo, para saber si el usuario está en el barrio. */
const CENTRO_PALERMO: Coordenadas = { lat: -34.5855, lng: -58.428 };
const RADIO_BUSQUEDA_M = 900;

/** Tiles gratuitos de CARTO (sin API key), uno por tema de la app. */
const TILES = {
  oscuro: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  claro: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
} as const;

const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Pin de negocio: burbuja con el emoji del local.
 *  - `seleccionado` (el último tocado): burbuja sólida coral, sin importar promo.
 *  - si no, `conPromoActiva` (horario valle vigente ahora) marca el borde en verde real. */
const iconoNegocio = (emoji: string, seleccionado: boolean, conPromoActiva: boolean) =>
  L.divIcon({
    className: 'pin-club',
    html: `<span class="pin-club-burbuja${seleccionado ? ' pin-club-burbuja--activo' : conPromoActiva ? ' pin-club-burbuja--promo' : ''}">${emoji}</span><span class="pin-club-punta${seleccionado ? ' pin-club-punta--activo' : conPromoActiva ? ' pin-club-punta--promo' : ''}"></span>`,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -42],
  });

/** Pin del usuario: punto teal con pulso, bien distinto de los locales. */
const ICONO_USUARIO = L.divIcon({
  className: 'pin-club',
  html: '<span class="pin-club-usuario"><span class="pin-club-pulso"></span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

const ESTILOS_MAPA = `
.pin-club { background: transparent; border: none; }
.pin-club-burbuja {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 9999px; font-size: 19px;
  background: var(--color-fondo-medio);
  border: 2px solid var(--color-ubicacion);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  transition: background-color 150ms ease, border-color 150ms ease;
}
.pin-club-punta {
  display: block; margin: -1px auto 0; width: 0; height: 0;
  border-left: 6px solid transparent; border-right: 6px solid transparent;
  border-top: 8px solid var(--color-ubicacion);
}
.pin-club-burbuja--promo { border-color: var(--color-verde-ok); }
.pin-club-punta--promo { border-top-color: var(--color-verde-ok); }
.pin-club-burbuja--activo {
  background: var(--color-premio); border-color: var(--color-premio);
  box-shadow: 0 6px 14px rgba(242, 138, 99, 0.5);
}
.pin-club-punta--activo { border-top-color: var(--color-premio); }
.pin-club-usuario {
  position: relative; display: block; width: 22px; height: 22px;
  border-radius: 9999px; background: #0EA5A4; border: 3px solid #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.pin-club-pulso {
  position: absolute; inset: -8px; border-radius: 9999px;
  background: rgba(14, 165, 164, 0.35);
  animation: pin-club-pulso 1.8s ease-in-out infinite;
}
@keyframes pin-club-pulso {
  0%, 100% { transform: scale(0.7); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 0.3; }
}
.leaflet-container { font-family: var(--font-display); }
`;

/** Encuadra el mapa para que entren todos los pines (negocios + usuario), una sola vez. */
function AjustarVista({ puntos }: { puntos: Coordenadas[] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    // Solo al montar: si el usuario mueve el mapa después, no lo queremos re-encuadrar solo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

/** Controles propios de zoom + centrar en mi ubicación (reemplazan los nativos de Leaflet). */
function Controles({ coords }: { coords: Coordenadas }) {
  const map = useMap();
  return (
    <div className="absolute top-2.5 right-2.5 left-2.5 z-[1000] flex items-start justify-between">
      <button
        type="button"
        onClick={() => map.flyTo([coords.lat, coords.lng], 16, { duration: 0.6 })}
        aria-label="Centrar en mi ubicación"
        className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-ubicacion shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
      >
        <LocateFixed size={14} strokeWidth={2.5} />
      </button>
      <div className="flex flex-col gap-0.5 overflow-hidden rounded-md bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          aria-label="Acercar"
          className="flex h-7 w-7 items-center justify-center text-texto"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
        <div className="h-px bg-borde" />
        <button
          type="button"
          onClick={() => map.zoomOut()}
          aria-label="Alejar"
          className="flex h-7 w-7 items-center justify-center text-texto"
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/**
 * Mapa real (Leaflet + tiles CARTO gratuitos) de los locales cercanos. Tocar un pin selecciona
 * ese negocio (`onSeleccionar`) — no abre popup, la ficha vive en la lista de cards debajo,
 * que hace scroll hasta la card correspondiente (ver TabMapa.tsx).
 */
export default function MapaNegocios({
  negocios,
  relaciones,
  coords,
  negocioActivoId,
  onSeleccionar,
  alturaClase = 'h-[42vh] min-h-[260px] max-h-[340px]',
}: {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  coords: Coordenadas;
  negocioActivoId: string | null;
  onSeleccionar: (negocio: Negocio) => void;
  alturaClase?: string;
}) {
  const distanciaAlBarrio = distanciaKm(coords, CENTRO_PALERMO);
  const usuarioEnZona = distanciaAlBarrio <= 8;

  const puntos = useMemo(() => {
    const lista: Coordenadas[] = negocios.map(({ lat, lng }) => ({ lat, lng }));
    if (usuarioEnZona) lista.push(coords);
    return lista;
  }, [negocios, coords, usuarioEnZona]);

  if (puntos.length === 0) return null;

  const temaClaro = document.documentElement.dataset.rubro === 'super';
  const urlTiles = temaClaro ? TILES.claro : TILES.oscuro;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative z-0 w-full ${alturaClase}`}
    >
      <style>{ESTILOS_MAPA}</style>
      <MapContainer
        center={[CENTRO_PALERMO.lat, CENTRO_PALERMO.lng]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl
        className="h-full w-full"
      >
        <TileLayer key={urlTiles} url={urlTiles} attribution={ATRIBUCION} />
        <AjustarVista puntos={puntos} />
        <Controles coords={coords} />

        {usuarioEnZona && (
          <Circle
            center={[coords.lat, coords.lng]}
            radius={RADIO_BUSQUEDA_M}
            pathOptions={{
              // Leaflet dibuja esto como atributo SVG crudo: no resuelve custom properties de
              // CSS (a diferencia de los pines de arriba, que sí son HTML). Mismo hex real que
              // --color-premio en index.css.
              color: '#F28A63',
              opacity: 0.35,
              weight: 1.5,
              dashArray: '4 5',
              fillOpacity: 0.04,
            }}
          />
        )}

        {negocios.map((negocio) => {
          const conPromoActiva = Boolean(negocio.horarioValle && horarioValleActivoAhora(negocio.horarioValle));
          const seleccionado = negocio.id === negocioActivoId;
          return (
            <Marker
              key={negocio.id}
              position={[negocio.lat, negocio.lng]}
              icon={iconoNegocio(negocio.emoji, seleccionado, conPromoActiva)}
              alt={negocio.nombre}
              eventHandlers={{ click: () => onSeleccionar(negocio) }}
            />
          );
        })}

        {usuarioEnZona && <Marker position={[coords.lat, coords.lng]} icon={ICONO_USUARIO} alt="Tu ubicación" />}
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-[1000] flex justify-center">
        <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-texto shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verde-ok opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-verde-ok" />
          </span>
          {usuarioEnZona ? (
            <>
              {negocios.length} {negocios.length === 1 ? 'negocio' : 'negocios'} cerca tuyo
            </>
          ) : (
            <>
              <Users size={12} /> Locales de Palermo
            </>
          )}
        </span>
      </div>
    </motion.div>
  );
}
