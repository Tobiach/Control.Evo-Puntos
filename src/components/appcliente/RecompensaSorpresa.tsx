import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Gift, Lock, Sparkles } from 'lucide-react';
import { formatPuntos } from '../../lib/club';
import { lanzarConfetti } from '../../lib/confetti';

interface Props {
  /** El cliente ya juntó los puntos suficientes para una nueva sorpresa. */
  disponible: boolean;
  /** Puntos que le faltan para habilitar la próxima sorpresa (cuando no está disponible). */
  faltan: number;
  /** Se llama al revelar el premio, para descontar una sorpresa del presupuesto. */
  onUsar: () => void;
}

interface Premio {
  label: string;
  emoji: string;
}

const PREMIOS: Premio[] = [
  { label: '+50 pts de regalo', emoji: '⭐' },
  { label: 'Postre gratis', emoji: '🍰' },
  { label: '2x1 en tu próxima visita', emoji: '🍹' },
  { label: '+20 pts de regalo', emoji: '✨' },
  { label: '10% off hoy', emoji: '🏷️' },
  { label: 'Café de la casa', emoji: '☕' },
];

export default function RecompensaSorpresa({ disponible, faltan, onUsar }: Props) {
  const premio = useMemo(() => PREMIOS[Math.floor(Math.random() * PREMIOS.length)], []);
  const [revelado, setRevelado] = useState(false);

  const revelar = (evento: React.MouseEvent<HTMLButtonElement>) => {
    if (!disponible || revelado) return;
    setRevelado(true);
    onUsar();
    const caja = evento.currentTarget.getBoundingClientRect();
    lanzarConfetti({
      x: (caja.left + caja.width / 2) / window.innerWidth,
      y: (caja.top + caja.height / 2) / window.innerHeight,
    });
  };

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={16} className="text-premio" />
        <p className="text-sm font-bold">Recompensa sorpresa</p>
      </div>

      {!disponible && !revelado ? (
        <div className="flex items-center gap-3 rounded-3xl border border-dashed border-borde bg-card/60 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-borde text-texto-muted">
            <Lock size={18} />
          </span>
          <p className="text-sm leading-snug text-texto-muted">
            Sumá{' '}
            <span className="font-bold text-texto">{formatPuntos(faltan)} pts</span> más y
            desbloqueás una sorpresa para rascar.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={revelar}
          disabled={revelado}
          className="relative w-full overflow-hidden rounded-3xl border border-borde bg-premio-suave p-6 text-center"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl">{premio.emoji}</span>
            <p className="text-lg font-bold text-acento">{premio.label}</p>
            <p className="text-[11px] font-semibold text-texto-muted">
              {revelado ? '¡Mostralo en la caja para reclamarlo!' : 'Tu premio te espera'}
            </p>
          </div>

          <AnimatePresence>
            {!revelado && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-acento text-on-acento"
              >
                <Gift size={26} strokeWidth={2.4} />
                <span className="text-sm font-bold">Rascá para descubrir tu premio</span>
                <span className="text-[11px] font-semibold opacity-80">Tocá acá 👆</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      )}
    </section>
  );
}
