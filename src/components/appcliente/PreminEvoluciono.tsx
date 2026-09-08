import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { lanzarConfetti } from '../../lib/confetti';
import { sonidoEvolucion } from '../../lib/sonidos';

/** Premín cruzó un umbral de XP global y cambió de forma. */
export interface Evolucion {
  nivelNombre: string;
  /** Ruta de la forma nueva de Premín (o `/premin.png` hasta que existan los assets por nivel). */
  premin: string;
}

interface Props {
  evolucion: Evolucion | null;
  onCerrar: () => void;
}

/**
 * 2.6b — el momento "Premín evolucionó". Evento raro y grande (subir de nivel de XP global):
 * hoja centrada, la forma nueva entra con rebote, confetti + fanfarria + vibración. No se cierra
 * solo: pide un toque (es un hito, que lo disfrute). Ver docs/NIVELES-Y-PREMIN.md §4.
 */
export default function PreminEvoluciono({ evolucion, onCerrar }: Props) {
  useEffect(() => {
    if (!evolucion) return;
    lanzarConfetti({ x: 0.5, y: 0.4 });
    sonidoEvolucion();
    navigator.vibrate?.([0, 60, 40, 90, 40, 120]);
  }, [evolucion]);

  return (
    <AnimatePresence>
      {evolucion && (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[60] mx-auto flex max-w-md items-center justify-center bg-black/70 px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCerrar}
        >
          <motion.div
            onClick={(evento) => evento.stopPropagation()}
            initial={{ scale: 0.85, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            className="w-full max-w-xs rounded-3xl border border-white/10 bg-surface-dark p-7 text-center shadow-2xl"
          >
            <p className="text-xs font-bold tracking-[0.14em] text-premio-claro uppercase">
              ¡Premín evolucionó!
            </p>
            <motion.img
              src={evolucion.premin}
              alt={`Premín — ${evolucion.nivelNombre}`}
              initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
              className="mx-auto my-4 h-32 w-32 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
            />
            <p className="text-sm text-white/60">Llegaste a</p>
            <p className="font-titulo mt-1 text-2xl font-extrabold text-white">{evolucion.nivelNombre}</p>
            <button
              type="button"
              onClick={onCerrar}
              className="mt-6 w-full rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover"
            >
              Seguir
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
