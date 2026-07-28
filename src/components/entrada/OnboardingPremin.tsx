import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface Props {
  /** Cantidad real de locales en el marketplace (mismo dato que usa Marketplace.tsx). */
  cantidadLocales: number;
  /** El usuario terminó las 3 pantallas (o las saltó con "Ya tengo cuenta"). */
  onTerminar: () => void;
}

const PASOS = [
  {
    titulo: 'Tu barrio ya te devuelve algo',
    subtitulo: 'Sumás puntos reales cada vez que volvés a los locales de siempre.',
  },
  {
    titulo: 'Cada compra suma de verdad',
    subtitulo: 'Vos elegís cuándo canjear. Los puntos son tuyos, no vencen de la nada.',
  },
  {
    titulo: 'Encontrá tu próximo lugar',
    subtitulo: 'Cada local tiene sus propios premios. Vos elegís por dónde empezar.',
  },
] as const;

/**
 * Onboarding "primera vez" con Premín como protagonista: se ve UNA sola vez por dispositivo,
 * antes de la portada de marca (PortadaCliente.tsx), que sigue mostrándose siempre después.
 * Gateado por src/lib/onboarding.ts (localStorage) desde App.tsx.
 */
export default function OnboardingPremin({ cantidadLocales, onTerminar }: Props) {
  const [paso, setPaso] = useState(0);
  const esUltimo = paso === PASOS.length - 1;
  const actual = PASOS[paso];

  const siguiente = () => {
    if (esUltimo) {
      onTerminar();
      return;
    }
    setPaso((p) => p + 1);
  };

  return (
    <div className="-mx-5 flex flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={paso}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-1 flex-col items-center justify-center gap-4 bg-linear-to-b from-fondo from-60% to-premio-suave px-8 py-10 text-center"
        >
          <div className="mb-1 flex gap-1.5">
            {PASOS.map((_, indice) => (
              <span
                key={indice}
                className={`h-1 w-4 rounded-full transition-colors ${
                  indice === paso ? 'bg-acento' : 'bg-borde'
                }`}
              />
            ))}
          </div>

          <div className="relative flex h-32 items-center justify-center">
            <img
              src="/premin.png"
              alt="Premín, la mascota de Premia.ar"
              className="h-32 w-32 object-contain drop-shadow-lg"
            />
            {paso === 1 && (
              <span className="absolute -right-2 -bottom-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-bold text-acento shadow-md">
                +40 pts
              </span>
            )}
          </div>

          <h1 className="font-titulo max-w-[20ch] text-2xl leading-[1.15] font-extrabold tracking-tight text-texto">
            {actual.titulo}
          </h1>
          <p className="max-w-[25ch] text-sm leading-relaxed text-texto-muted">{actual.subtitulo}</p>

          {esUltimo && cantidadLocales > 0 && (
            <span className="rounded-full bg-surface-dark px-4 py-2 text-xs font-bold text-white">
              📍 {cantidadLocales === 1 ? 'Ya hay 1 local esperándote' : `Ya hay ${cantidadLocales} locales esperándote`}
            </span>
          )}

          <div className="mt-2 flex w-full max-w-xs flex-col items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={siguiente}
              className="flex w-full items-center justify-center rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
            >
              {esUltimo ? 'Empezar' : 'Seguir'}
            </motion.button>
            {!esUltimo && (
              <button
                type="button"
                onClick={onTerminar}
                className="py-1 text-xs font-semibold text-texto-muted underline underline-offset-4"
              >
                Ya tengo cuenta
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
