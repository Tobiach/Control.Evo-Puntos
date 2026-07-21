import { useState } from 'react';
import { motion } from 'motion/react';
import { BellRing, PartyPopper } from 'lucide-react';

interface Props {
  onPedirPermiso: () => Promise<void>;
  onCerrar: () => void;
}

/**
 * Pantalla previa al permiso nativo del navegador: le explica al usuario POR QUÉ le vamos a
 * pedir notificaciones antes de que el navegador se lo pregunte. Mejora medible de tasa de
 * aceptación frente a pedirlo en frío (ver notificaciones.ts). Aparece una sola vez por
 * usuario: en cuanto responde algo, `Notification.permission` deja de ser 'default'.
 */
export default function AvisoActivarNotificaciones({ onPedirPermiso, onCerrar }: Props) {
  const [pidiendo, setPidiendo] = useState(false);

  const activar = async () => {
    setPidiendo(true);
    await onPedirPermiso();
    setPidiendo(false);
    onCerrar();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-surface-mid"
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-8 text-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-premio/15">
          <BellRing size={30} className="text-premio" strokeWidth={2.2} />
        </div>
        <h2 className="font-titulo text-2xl font-extrabold tracking-tight">No te pierdas tus puntos</h2>
        <p className="max-w-[26ch] text-sm leading-relaxed text-white/60">
          Te avisamos cuando estés por vencer, cuando subís de nivel y cuando hay puntos dobles.
        </p>
        <div className="flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-xs">
          <PartyPopper size={16} className="shrink-0 text-verde" />
          <span>
            <b className="text-white">¡Sumaste 45 puntos!</b>{' '}
            <span className="text-white/60">— así se ve el aviso.</span>
          </span>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={activar}
          disabled={pidiendo}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-60"
        >
          Activar avisos
        </motion.button>
        <button
          type="button"
          onClick={onCerrar}
          disabled={pidiendo}
          className="py-1 text-xs font-semibold text-white/50 underline underline-offset-4 disabled:opacity-60"
        >
          Ahora no
        </button>
      </div>
    </motion.div>
  );
}
