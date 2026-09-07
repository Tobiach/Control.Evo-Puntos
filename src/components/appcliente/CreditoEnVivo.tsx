import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { formatPuntos } from '../../lib/club';
import { lanzarConfetti } from '../../lib/confetti';
import { sonidoPuntos } from '../../lib/sonidos';
import { useConteoAnimado } from '../../hooks/useConteoAnimado';

/** Un crédito de puntos recién acreditado por el cajero, para celebrarlo en el momento. */
export interface CreditoReciente {
  negocioNombre: string;
  /** Puntos que acaban de entrar (delta positivo). */
  delta: number;
  /** Saldo del cliente en ese negocio DESPUÉS del crédito. */
  puntosTotales: number;
  /** Próxima recompensa por alcanzar en ese negocio (null si ya alcanza todas). */
  proxima: { descripcion: string; pts: number } | null;
}

interface Props {
  credito: CreditoReciente | null;
  onCerrar: () => void;
  /** Cuánto queda visible antes de cerrarse solo. Override para tests. */
  msVisible?: number;
}

const MS_VISIBLE = 4800;

/**
 * F3 — el momento del mostrador. Cuando el cajero cobra y el saldo sube por realtime, esto
 * lo hace SENTIR: overlay abajo (zona del pulgar, no tapa la pantalla), confetti, sonido,
 * vibración, y el progreso hacia la próxima recompensa nombrada. Se va solo a los ~5 s o al
 * tocarlo. Sonido/vibración degradan en silencio donde el navegador no los permite.
 */
export default function CreditoEnVivo({ credito, onCerrar, msVisible = MS_VISIBLE }: Props) {
  useEffect(() => {
    if (!credito) return;
    lanzarConfetti({ x: 0.5, y: 0.7 });
    sonidoPuntos();
    navigator.vibrate?.([0, 40, 30, 70]);
    const id = window.setTimeout(onCerrar, msVisible);
    return () => window.clearTimeout(id);
  }, [credito, onCerrar, msVisible]);

  return (
    <AnimatePresence>
      {credito && (
        <motion.div
          key={`${credito.negocioNombre}-${credito.puntosTotales}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={onCerrar}
          className="fixed inset-x-0 bottom-[104px] z-50 mx-auto w-full max-w-md px-5"
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-dark p-5 shadow-2xl">
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="absolute top-3 right-3 rounded-full p-1 text-white/40"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-premio/20 text-premio">
                <Sparkles size={20} strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <p className="font-titulo text-2xl leading-none font-extrabold text-premio-claro">
                  +{formatPuntos(credito.delta)} pts
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-white/60">
                  en {credito.negocioNombre}
                </p>
              </div>
              <TotalAnimado total={credito.puntosTotales} />
            </div>

            <BarraProxima puntos={credito.puntosTotales} proxima={credito.proxima} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TotalAnimado({ total }: { total: number }) {
  const mostrado = useConteoAnimado(total, 700);
  return (
    <span className="ml-auto shrink-0 text-right">
      <span className="block font-titulo text-lg font-extrabold text-white">
        {formatPuntos(mostrado)}
      </span>
      <span className="block text-[9px] font-bold tracking-wide text-white/40 uppercase">
        total acá
      </span>
    </span>
  );
}

function BarraProxima({
  puntos,
  proxima,
}: {
  puntos: number;
  proxima: CreditoReciente['proxima'];
}) {
  if (!proxima) {
    return (
      <p className="mt-3 rounded-2xl bg-white/5 px-3.5 py-2.5 text-xs font-bold text-premio-claro">
        🎁 Ya te alcanza para tus recompensas. Pasá a canjear.
      </p>
    );
  }
  const faltan = Math.max(0, proxima.pts - puntos);
  const pct = Math.min(100, Math.round((puntos / proxima.pts) * 100));
  return (
    <div className="mt-3">
      <p className="text-xs text-white/70">
        {faltan === 0 ? (
          <>Ya podés canjear <span className="font-bold text-white">{proxima.descripcion}</span></>
        ) : (
          <>
            Te faltan <span className="font-bold text-white">{formatPuntos(faltan)} pts</span> para{' '}
            <span className="font-bold text-white">{proxima.descripcion}</span>
          </>
        )}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full bg-premio"
        />
      </div>
    </div>
  );
}
