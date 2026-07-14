import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { BadgeCheck, Gift, RotateCcw } from 'lucide-react';
import type { Recompensa } from '../../data/mockClientes';
import { formatPuntos, proximaRecompensa } from '../../lib/club';

interface Props {
  /** Nombre (o teléfono) que se muestra en el "puntos para …". */
  nombreCliente: string;
  puntosGanados: number;
  totalAnterior: number;
  recompensas: Recompensa[];
  onOtraVenta: () => void;
}

/**
 * Feedback en vivo de un cobro: animación de puntos sumando + aviso de recompensa
 * desbloqueada y próxima. Compartido entre la demo de venta (`PasoCajero`) y el
 * panel de cajero real (`PanelCajero`) — misma pieza visual, no se duplica.
 */
export default function FeedbackCobro({
  nombreCliente,
  puntosGanados,
  totalAnterior,
  recompensas,
  onOtraVenta,
}: Props) {
  const totalNuevo = totalAnterior + puntosGanados;
  const desbloqueadas = recompensas.filter(
    (recompensa) => recompensa.pts > totalAnterior && recompensa.pts <= totalNuevo,
  );
  const proxima = proximaRecompensa(recompensas, totalNuevo);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col items-center gap-1 rounded-3xl border border-borde bg-card px-5 py-7 text-center shadow-lg">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-verde-ok/15 text-verde-ok"
        >
          <BadgeCheck size={26} />
        </motion.div>
        <p className="text-5xl font-black text-premio">
          +<ContadorPuntos hasta={puntosGanados} />
        </p>
        <p className="text-sm font-semibold text-texto-muted">puntos para {nombreCliente}</p>
        <p className="mt-2 text-xs text-texto-muted">
          Nuevo saldo:{' '}
          <span className="font-bold text-texto">{formatPuntos(totalNuevo)} pts</span>
        </p>
      </div>

      {desbloqueadas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 260, damping: 20 }}
          className="flex items-center gap-3 rounded-2xl bg-verde-ok/15 px-4 py-3.5"
        >
          <Gift size={22} className="shrink-0 text-verde-ok" />
          <p className="text-sm leading-snug">
            ¡Desbloqueó{' '}
            <span className="font-black text-verde-ok">
              {desbloqueadas[desbloqueadas.length - 1].descripcion}
            </span>
            ! Avisale al cobrar.
          </p>
        </motion.div>
      )}

      {proxima && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
          className="flex items-center gap-3 rounded-2xl bg-premio-suave px-4 py-3.5"
        >
          <Gift size={22} className="shrink-0 text-acento" />
          <p className="text-sm leading-snug">
            Le faltan{' '}
            <span className="font-black text-acento">
              {formatPuntos(proxima.pts - totalNuevo)} pts
            </span>{' '}
            para: <span className="font-bold">{proxima.descripcion}</span>
          </p>
        </motion.div>
      )}

      <button
        type="button"
        onClick={onOtraVenta}
        className="inline-flex items-center justify-center gap-2 self-center text-xs font-semibold text-texto-muted underline underline-offset-4"
      >
        <RotateCcw size={13} />
        Cobrar otra venta
      </button>
    </motion.div>
  );
}

function ContadorPuntos({ hasta }: { hasta: number }) {
  const valor = useMotionValue(0);
  const redondeado = useTransform(valor, (actual) => formatPuntos(Math.round(actual)));

  useEffect(() => {
    const control = animate(valor, hasta, { duration: 0.9, ease: 'easeOut' });
    return () => control.stop();
  }, [hasta, valor]);

  return <motion.span>{redondeado}</motion.span>;
}
