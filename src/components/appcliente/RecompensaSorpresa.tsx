import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, Gift, Lock, Sparkles } from 'lucide-react';
import { formatCuentaRegresiva, formatPuntos } from '../../lib/club';
import { lanzarConfetti } from '../../lib/confetti';
import { sonidoChasquido } from '../../lib/sonidos';
import type { ResultadoSorpresa } from '../../lib/panelCliente';

interface Props {
  /** El cliente ya juntó los puntos suficientes para una nueva sorpresa. */
  disponible: boolean;
  /** Puntos que le faltan para habilitar la próxima sorpresa (cuando no está disponible). */
  faltan: number;
  /**
   * Revela: el padre decide si es local (demo) o real (RPC `usar_sorpresa`, 0026) y devuelve
   * el premio que efectivamente salió + el código para el mostrador.
   */
  onUsar: () => Promise<ResultadoSorpresa>;
}

export default function RecompensaSorpresa({ disponible, faltan, onUsar }: Props) {
  const [revelando, setRevelando] = useState(false);
  const [premio, setPremio] = useState<{ label: string; emoji: string } | null>(null);
  const [codigo, setCodigo] = useState<{ valor: string; expiraAtMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const revelado = premio !== null;

  useEffect(() => {
    if (!codigo) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [codigo]);

  const revelar = async (evento: React.MouseEvent<HTMLButtonElement>) => {
    if (!disponible || revelado || revelando) return;
    setError(null);
    setRevelando(true);
    const caja = evento.currentTarget.getBoundingClientRect();
    const resultado = await onUsar();
    setRevelando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setPremio(resultado.premio);
    setCodigo({ valor: resultado.codigo, expiraAtMs: new Date(resultado.expiraAt).getTime() });
    sonidoChasquido();
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
          disabled={revelado || revelando}
          className="relative w-full overflow-hidden rounded-3xl border border-borde bg-premio-suave p-6 text-center"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl">{premio?.emoji ?? '🎁'}</span>
            <p className="text-lg font-bold text-acento">{premio?.label ?? ' '}</p>
            {revelado && codigo ? (
              <>
                <p className="mt-1 text-[11px] font-semibold text-texto-muted">
                  Mostrá este código en la caja
                </p>
                <p className="font-titulo mt-1 text-3xl leading-none font-black tracking-[0.15em] text-texto">
                  {codigo.valor}
                </p>
                <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-bold text-texto-muted">
                  <Clock size={12} /> {formatCuentaRegresiva(Math.max(0, codigo.expiraAtMs - ahora))}
                </p>
              </>
            ) : (
              <p className="text-[11px] font-semibold text-texto-muted">&nbsp;</p>
            )}
          </div>

          <AnimatePresence>
            {!revelado && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-acento text-on-acento"
              >
                <Gift size={26} strokeWidth={2.4} className={revelando ? 'animate-pulse' : ''} />
                <span className="text-sm font-bold">
                  {revelando ? 'Descubriendo tu premio…' : 'Rascá para descubrir tu premio'}
                </span>
                {!revelando && <span className="text-[11px] font-semibold opacity-80">Tocá acá 👆</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      )}

      {error && <p className="mt-2 text-center text-xs font-semibold text-rojo">{error}</p>}
    </section>
  );
}
