import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { RotateCw } from 'lucide-react';
import { lanzarConfetti } from '../../lib/confetti';
import { elegirPremio, estadoCooldown, PREMIOS_RULETA, type PremioRuleta } from '../../lib/ruleta';

interface Props {
  /** Timestamp de la última tirada en ESTE negocio (para el cooldown de 7 días). */
  ultimaTiradaTs?: number;
  /** Registra la tirada en el estado del padre (cliente-negocio). */
  onGirar: () => void;
}

const GRADOS_POR_PORCION = 360 / PREMIOS_RULETA.length;
const DURACION_MS = 3400;
const RADIO_EMOJI = 66;

/** Un color fijo por porción, alternados para que se distingan bien al girar. */
const COLORES = ['#C9973A', '#8B5CF6', '#EC4899', '#0EA5E9', '#F97316', '#10B981', '#E5B860', '#6366F1'];

const gradiente = `conic-gradient(${PREMIOS_RULETA.map(
  (_, i) => `${COLORES[i % COLORES.length]} ${i * GRADOS_POR_PORCION}deg ${(i + 1) * GRADOS_POR_PORCION}deg`,
).join(', ')})`;

export default function RuletaSemanal({ ultimaTiradaTs, onGirar }: Props) {
  const [rotacion, setRotacion] = useState(0);
  const [girando, setGirando] = useState(false);
  const [premio, setPremio] = useState<PremioRuleta | null>(null);
  const ruedaRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const estado = estadoCooldown(ultimaTiradaTs);
  const enCooldown = !girando && !premio && !estado.puedeGirar;

  const girar = () => {
    if (girando || premio || !estado.puedeGirar) return;
    const { premio: elegido, indice } = elegirPremio();
    setGirando(true);
    onGirar();

    // Alinea el centro de la porción ganadora bajo el puntero de arriba, + 5 vueltas enteras.
    const destino = 360 - (indice * GRADOS_POR_PORCION + GRADOS_POR_PORCION / 2);
    setRotacion((previa) => previa - (previa % 360) + 360 * 5 + destino);

    timer.current = setTimeout(() => {
      setGirando(false);
      setPremio(elegido);
      if (elegido.bueno) {
        const caja = ruedaRef.current?.getBoundingClientRect();
        if (caja) {
          lanzarConfetti({
            x: (caja.left + caja.width / 2) / window.innerWidth,
            y: (caja.top + caja.height / 2) / window.innerHeight,
          });
        }
      }
    }, DURACION_MS);
  };

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <RotateCw size={16} className="text-premio" />
        <p className="text-sm font-bold">Ruleta semanal</p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-3xl border border-borde bg-card p-6">
        <div ref={ruedaRef} className="relative h-[168px] w-[168px]">
          {/* Puntero */}
          <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2">
            <div className="h-0 w-0 border-x-8 border-t-[14px] border-x-transparent border-t-acento" />
          </div>

          <motion.div
            animate={{ rotate: rotacion }}
            transition={{ duration: DURACION_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full rounded-full border-4 border-card shadow-inner"
            style={{ background: gradiente }}
          >
            {PREMIOS_RULETA.map((p, i) => {
              const angulo = i * GRADOS_POR_PORCION + GRADOS_POR_PORCION / 2;
              return (
                <span
                  key={p.id}
                  className="absolute top-1/2 left-1/2 text-lg"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angulo}deg) translateY(-${RADIO_EMOJI}px) rotate(${-angulo}deg)`,
                  }}
                >
                  {p.emoji}
                </span>
              );
            })}
          </motion.div>

          {/* Eje central */}
          <div className="absolute top-1/2 left-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-acento" />
        </div>

        {premio ? (
          <div className="text-center">
            <span className="text-3xl">{premio.emoji}</span>
            <p className="font-titulo text-lg font-bold text-acento">{premio.label}</p>
            <p className="mt-1 text-[11px] font-semibold text-texto-muted">
              ¡Mostralo en la caja para reclamarlo! Volvé en {estado.diasRestantes}{' '}
              {estado.diasRestantes === 1 ? 'día' : 'días'} para girar de nuevo.
            </p>
          </div>
        ) : enCooldown ? (
          <p className="text-center text-sm leading-snug text-texto-muted">
            Ya giraste esta semana. Volvé en{' '}
            <span className="font-bold text-texto">
              {estado.diasRestantes} {estado.diasRestantes === 1 ? 'día' : 'días'}
            </span>{' '}
            para tu próxima tirada.
          </p>
        ) : (
          <>
            <p className="text-center text-xs text-texto-muted">
              Girás gratis una vez por semana. Hay desde puntos de regalo hasta el premio mayor.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={girar}
              disabled={girando}
              className="flex w-full items-center justify-center gap-2 rounded-3xl bg-acento py-3.5 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-70"
            >
              <RotateCw size={18} strokeWidth={2.4} className={girando ? 'animate-spin' : ''} />
              {girando ? 'Girando…' : 'Girar la ruleta'}
            </motion.button>
          </>
        )}
      </div>
    </section>
  );
}
