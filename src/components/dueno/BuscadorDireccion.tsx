import { useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { geocodificarDireccion } from '../../lib/geo';

/**
 * Buscador de dirección real (sin API key): 3 inputs + botón "Buscar en el mapa" que geocodifica
 * con Nominatim y devuelve lat/lng vía `onCambiar`. Reemplaza los inputs manuales de lat/lng.
 * Se usa tanto en "Negocio → Ubicación" como en "Perfil → Dirección" (mismo dato del negocio).
 *
 * Convive con el botón "Usar mi ubicación actual" del padre: ambos dejan lat/lng en el negocio,
 * y las coordenadas resueltas se muestran acá en modo solo lectura (ya no se tipean a mano).
 */
interface ParcheDireccion {
  calle?: string;
  altura?: string;
  codigoPostal?: string;
  lat?: number | null;
  lng?: number | null;
}

interface Props {
  calle: string;
  altura: string;
  codigoPostal: string;
  lat: number | null;
  lng: number | null;
  onCambiar: (parche: ParcheDireccion) => void;
}

type Estado = 'inactivo' | 'buscando' | 'ok' | 'sin-resultado';

const claseInput =
  'w-full rounded-2xl border border-borde bg-card px-4 py-3.5 text-base font-medium outline-none placeholder:text-texto-muted/60 focus:border-acento';

export default function BuscadorDireccion({ calle, altura, codigoPostal, lat, lng, onCambiar }: Props) {
  const [estado, setEstado] = useState<Estado>('inactivo');

  const buscar = async () => {
    const direccion = `${calle} ${altura}`.trim();
    if (!direccion) {
      setEstado('sin-resultado');
      return;
    }
    setEstado('buscando');
    const coords = await geocodificarDireccion(`${direccion}, Argentina`);
    if (coords) {
      onCambiar({ lat: coords.lat, lng: coords.lng });
      setEstado('ok');
    } else {
      setEstado('sin-resultado');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input
          value={calle}
          onChange={(e) => {
            onCambiar({ calle: e.target.value });
            setEstado('inactivo');
          }}
          placeholder="Calle (ej: Av. Corrientes)"
          className={claseInput}
        />
        <input
          value={altura}
          inputMode="numeric"
          onChange={(e) => {
            onCambiar({ altura: e.target.value });
            setEstado('inactivo');
          }}
          placeholder="Altura"
          className={`${claseInput} w-24 text-center`}
        />
      </div>
      <input
        value={codigoPostal}
        onChange={(e) => onCambiar({ codigoPostal: e.target.value })}
        placeholder="Código postal (opcional)"
        className={claseInput}
      />

      <button
        type="button"
        onClick={buscar}
        disabled={estado === 'buscando'}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-acento bg-premio-suave py-3 text-sm font-bold text-acento disabled:opacity-60"
      >
        {estado === 'buscando' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        Buscar en el mapa
      </button>

      {estado === 'sin-resultado' && (
        <p className="px-1 text-xs font-semibold text-rojo">
          No encontramos esa dirección, revisá que esté bien escrita.
        </p>
      )}
      {estado === 'ok' && (
        <p className="px-1 text-xs font-semibold text-verde-ok">✓ Ubicación encontrada.</p>
      )}

      {lat != null && lng != null && (
        <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-texto-muted">
          <MapPin size={13} className="text-acento" />
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
