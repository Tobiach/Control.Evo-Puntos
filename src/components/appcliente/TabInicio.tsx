import { motion } from 'motion/react';
import { ChevronLeft, Flame, Gift } from 'lucide-react';
import type { Cliente, RubroData, Visita } from '../../data/mockClientes';
import {
  formatPuntos,
  progresoNivel,
  proximaRecompensa,
  rachaSemanas,
  vencimientoPuntos,
} from '../../lib/club';

interface Props {
  data: RubroData;
  cliente: Cliente;
  historial: Visita[];
  onVerRecompensas: () => void;
  onSalir: () => void;
}

export default function TabInicio({ data, cliente, historial, onVerRecompensas, onSalir }: Props) {
  const { actual, siguiente, pct } = progresoNivel(data.niveles, cliente.puntos);
  const racha = rachaSemanas(historial);
  const venc = vencimientoPuntos(cliente);
  const recompensa = proximaRecompensa(data.recompensas, cliente.puntos);
  const primerNombre = cliente.nombre.split(' ')[0];

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-texto-muted">Hola, {primerNombre} 👋</p>
          <h1 className="font-titulo text-2xl font-bold text-texto">{data.nombreNegocio}</h1>
        </div>
        <button
          type="button"
          onClick={onSalir}
          aria-label="Salir de la app"
          className="rounded-full border border-borde bg-card p-2 text-texto-muted"
        >
          <ChevronLeft size={18} />
        </button>
      </header>

      <div className="rounded-3xl border border-borde bg-card p-5 shadow-lg">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-texto-muted">Tus puntos</p>
            <p className="font-titulo text-5xl leading-none font-bold text-premio">
              {formatPuntos(cliente.puntos)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-premio-suave px-3 py-1.5 text-sm font-bold text-acento">
            <Flame size={15} strokeWidth={2.5} /> {racha} {racha === 1 ? 'sem' : 'sems'}
          </span>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-texto-muted">Nivel {actual.nombre}</span>
            {siguiente ? (
              <span className="font-bold text-acento">
                {formatPuntos(siguiente.min - cliente.puntos)} pts para {siguiente.nombre}
              </span>
            ) : (
              <span className="font-bold text-premio">Nivel máximo</span>
            )}
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-borde">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full bg-acento"
            />
          </div>
        </div>
      </div>

      {venc.dias < 15 && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-premio-suave px-4 py-3 text-sm">
          <span className="text-base">⏳</span>
          <p className="leading-snug">
            <span className="font-bold text-acento">{formatPuntos(cliente.puntos)} pts</span> vencen
            en {venc.dias} {venc.dias === 1 ? 'día' : 'días'}. Pasá a canjear.
          </p>
        </div>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onVerRecompensas}
        className="flex w-full items-center justify-center gap-2 rounded-3xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
      >
        <Gift size={20} strokeWidth={2.4} /> Ver mis recompensas
      </motion.button>

      {recompensa && (
        <div className="rounded-3xl border border-borde bg-card p-4">
          <p className="text-xs font-semibold tracking-widest text-texto-muted uppercase">
            Tu próxima recompensa
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm font-bold">{recompensa.descripcion}</p>
            <span className="shrink-0 font-titulo text-sm font-bold text-premio">
              {formatPuntos(recompensa.pts)} pts
            </span>
          </div>
          <p className="mt-1 text-xs text-texto-muted">
            Te faltan {formatPuntos(recompensa.pts - cliente.puntos)} pts
          </p>
        </div>
      )}
    </div>
  );
}
