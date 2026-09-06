import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import type { Coordenadas } from '../../lib/geo';
import MapaNegocios from './MapaNegocios';

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  coords: Coordenadas;
  negocioActivoId: string | null;
  onSeleccionar: (negocio: Negocio) => void;
  onCerrar: () => void;
}

/** Mapa a pantalla completa — mismo componente de mapa, solo cambia el contenedor. */
export default function MapaCompleto({
  negocios,
  relaciones,
  coords,
  negocioActivoId,
  onSeleccionar,
  onCerrar,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-fondo"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-sm font-bold text-texto">Mapa completo</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-borde bg-card text-texto-muted"
        >
          <X size={16} />
        </button>
      </div>
      <div className="relative flex-1">
        <MapaNegocios
          negocios={negocios}
          relaciones={relaciones}
          coords={coords}
          negocioActivoId={negocioActivoId}
          onSeleccionar={onSeleccionar}
          alturaClase="h-full"
        />
      </div>
    </motion.div>
  );
}
