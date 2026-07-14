import { motion } from 'motion/react';
import { Coins, Gift, Loader2, Users } from 'lucide-react';
import { formatPuntos } from '../../lib/club';
import type { MetricasNegocio } from '../../lib/panelDueno';

interface Props {
  metricas: MetricasNegocio | null;
  cantidadRecompensas: number;
  cargando: boolean;
  esPreview: boolean;
}

const aparicion = (orden: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: orden * 0.08, duration: 0.28 },
});

export default function SeccionMetricas({ metricas, cantidadRecompensas, cargando, esPreview }: Props) {
  if (cargando) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-texto-muted">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-sm font-medium">Cargando tus métricas…</p>
      </div>
    );
  }

  const clientes = metricas?.clientesConRelacion ?? 0;
  const puntos = metricas?.puntosAcreditados ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <motion.div {...aparicion(0)} className="rounded-2xl border border-borde bg-card px-4 py-4 shadow-sm">
          <Users size={19} className="mb-2 text-verde-ok" />
          <p className="text-2xl font-black">{formatPuntos(clientes)}</p>
          <p className="mt-0.5 text-xs leading-tight text-texto-muted">clientes con puntos en tu local</p>
        </motion.div>

        <motion.div {...aparicion(1)} className="rounded-2xl border border-borde bg-card px-4 py-4 shadow-sm">
          <Coins size={19} className="mb-2 text-premio" />
          <p className="text-2xl font-black">{formatPuntos(puntos)}</p>
          <p className="mt-0.5 text-xs leading-tight text-texto-muted">puntos acreditados en total</p>
        </motion.div>
      </div>

      <motion.div {...aparicion(2)} className="flex items-center gap-3 rounded-2xl bg-premio-suave px-4 py-4">
        <Gift size={19} className="shrink-0 text-acento" />
        <p className="text-sm leading-snug">
          <span className="font-black text-acento">{cantidadRecompensas}</span>{' '}
          {cantidadRecompensas === 1 ? 'recompensa activa' : 'recompensas activas'} para que tus clientes canjeen.
        </p>
      </motion.div>

      <p className="px-1 text-xs leading-relaxed text-texto-muted">
        {esPreview
          ? 'En vista previa las métricas arrancan en cero. Cuando conectemos tu negocio vas a ver acá, en vivo, quién sumó puntos y cuánto acreditaste.'
          : 'Los números se actualizan a medida que tus clientes suman puntos en el local.'}
      </p>
    </div>
  );
}
