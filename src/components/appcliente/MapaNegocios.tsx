import { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Negocio } from '../../data/negocios';
import { distanciaKm, formatDistancia, type Coordenadas } from '../../lib/geo';

/** Centro aproximado de Palermo, para saber si el usuario está en el barrio. */
const CENTRO_PALERMO: Coordenadas = { lat: -34.5855, lng: -58.428 };

/** Tiles gratuitos de CARTO (sin API key), uno por tema de la app. */
const TILES = {
  oscuro: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  claro: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
} as const;

const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Pin de negocio: burbuja con el emoji del local y borde en el acento del tema. */
const iconoNegocio = (emoji: string) =>
  L.divIcon({
    className: 'pin-club',
    html: `<span class="pin-club-burbuja">${emoji}</span><span class="pin-club-punta"></span>`,
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

/** Estilos del mapa que no pueden vivir en Tailwind: pines (HTML de Leaflet,
 *  fuera del árbol de React) y el popup default de Leaflet, re-tematizado con
 *  las CSS vars de la app para que siga al tema activo (gastro/super). */
const ESTILOS_MAPA = `
.pin-club { background: transparent; border: none; }
.pin-club-burbuja {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 9999px; font-size: 19px;
  background: var(--color-fondo-medio);
  border: 2px solid var(--color-acento);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}
.pin-club-punta {
  display: block; margin: -1px auto 0; width: 0; height: 0;
  border-left: 6px solid transparent; border-right: 6px solid transparent;
  border-top: 8px solid var(--color-acento);
}
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
.leaflet-popup-content-wrapper {
  background: var(--color-card); color: var(--color-texto);
  border: 1px solid var(--color-borde); border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.leaflet-popup-tip { background: var(--color-card); border: 1px solid var(--color-borde); }
.leaflet-popup-content { margin: 12px 14px; font-family: var(--font-display); }
.leaflet-popup-close-button { color: var(--color-texto-muted); }
.leaflet-container { font-family: var(--font-display); }
`;

/** Encuadra el mapa para que entren todos los pines (negocios + usuario). */
function AjustarVista({ puntos }: { puntos: Coordenadas[] }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, puntos]);
  return null;
}

/**
 * Mapa real (Leaflet + tiles CARTO gratuitos) de los locales cercanos.
 * Reemplaza al viejo MiniMapa 100% CSS: mismos props, mismo contenedor,
 * pero con calles reales, popups y encuadre automático.
 */
export default function MapaNegocios({
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

  const puntos = useMemo(() => {
    const lista: Coordenadas[] = negocios.map(({ lat, lng }) => ({ lat, lng }));
    if (usuarioEnZona) lista.push(coords);
    return lista;
  }, [negocios, coords, usuarioEnZona]);

  if (puntos.length === 0) return null;

  // Tiles según el tema activo de la app: oscuro (gastro) o claro (super).
  const temaClaro = document.documentElement.dataset.rubro === 'super';
  const urlTiles = temaClaro ? TILES.claro : TILES.oscuro;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden rounded-3xl border border-borde bg-card"
    >
      <style>{ESTILOS_MAPA}</style>
      <div className="relative z-0 h-64 w-full">
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

          {negocios.map((negocio) => (
            <Marker
              key={negocio.id}
              position={[negocio.lat, negocio.lng]}
              icon={iconoNegocio(negocio.emoji)}
              alt={negocio.nombre}
            >
              <Popup>
                <div className="flex min-w-36 flex-col gap-1">
                  <p className="font-titulo text-sm leading-tight font-bold text-texto">
                    {negocio.emoji} {negocio.nombre}
                  </p>
                  <p className="text-[11px] font-semibold text-texto-muted">
                    {negocio.categoria} · {formatDistancia(distanciaKm(coords, negocio))}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAbrir(negocio)}
                    className="mt-1.5 rounded-full bg-acento px-3.5 py-1.5 text-xs font-bold text-on-acento active:bg-acento-hover"
                  >
                    Entrar al local
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {usuarioEnZona && (
            <Marker position={[coords.lat, coords.lng]} icon={ICONO_USUARIO} alt="Tu ubicación">
              <Popup>
                <p className="text-xs font-bold text-texto">Estás acá</p>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <p className="border-t border-borde px-4 py-2.5 text-[11px] font-semibold text-texto-muted">
        {usuarioEnZona
          ? 'Mapa de Palermo — tocá un pin para entrar al local'
          : `Estás ${formatDistancia(distanciaAlBarrio)} de Palermo — locales ordenados por cercanía`}
      </p>
    </motion.div>
  );
}
