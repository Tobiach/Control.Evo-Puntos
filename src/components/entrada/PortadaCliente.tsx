import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronLeft } from 'lucide-react';

interface Props {
  /** El usuario ya vio la promesa y quiere entrar/crear su cuenta real. */
  onContinuar: () => void;
  /** Volver a la pantalla anterior (desde el primer paso, sale de esta portada entera). */
  onVolver: () => void;
}

/**
 * Primer contacto de un usuario final con Premia.ar: 2 pantallas cortas (marca + promesa)
 * antes de llegar al alta real en LoginCliente. Nada de esto pega contra Supabase — es
 * puramente de presentación, así que no necesita estado de carga ni manejo de errores.
 */
export default function PortadaCliente({ onContinuar, onVolver }: Props) {
  const [paso, setPaso] = useState<0 | 1>(0);

  const volverAtras = () => {
    if (paso === 0) {
      onVolver();
      return;
    }
    setPaso(0);
  };

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        onClick={volverAtras}
        aria-label="Volver"
        className="mb-3 flex h-9 w-9 items-center justify-center self-start rounded-full border border-borde bg-card text-texto-muted"
      >
        <ChevronLeft size={18} />
      </button>

      <AnimatePresence mode="wait" initial={false}>
        {paso === 0 ? (
          <motion.div
            key="portada"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="-mx-5 flex flex-1 flex-col items-center justify-center gap-5 bg-linear-to-b from-fondo from-60% to-premio-suave px-8 py-10 text-center"
          >
            <img
              src="/premin.png"
              alt="Premín, la mascota de Premia.ar"
              className="h-32 w-32 object-contain drop-shadow-lg"
            />
            <div className="relative">
              <span className="rounded-2xl rounded-br-md bg-card px-4 py-2 font-nota text-lg text-acento shadow-md">
                ¡Dale que esto es gratis! 👋
              </span>
            </div>
            <h1 className="font-titulo text-4xl leading-[1.02] font-extrabold tracking-tight text-texto">
              En tu cuadra
              <br />
              ya <span className="text-acento">suman.</span>
            </h1>
            <p className="max-w-[26ch] text-sm leading-relaxed text-texto-muted">
              Los mismos lugares de siempre. Ahora te devuelven algo por volver.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setPaso(1)}
              className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
            >
              Ver mi barrio
              <ArrowRight size={19} strokeWidth={2.5} />
            </motion.button>
            <span className="text-xs font-medium text-texto-muted">Hecho en Argentina 🇦🇷</span>
          </motion.div>
        ) : (
          <motion.div
            key="promesa"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="-mx-5 flex flex-1 flex-col items-center justify-center gap-2 bg-surface-dark px-8 py-10 text-center text-white"
          >
            <p className="font-titulo text-3xl leading-[1.15] font-extrabold tracking-tight">Cada café.</p>
            <p className="font-titulo text-3xl leading-[1.15] font-extrabold tracking-tight">Cada compra.</p>
            <p className="font-titulo text-3xl leading-[1.15] font-extrabold tracking-tight text-premio">
              Cada visita.
            </p>
            <p className="font-titulo text-3xl leading-[1.15] font-extrabold tracking-tight text-premio">Suma.</p>
            <p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-white/55">
              Vos no hacés nada distinto. Nosotros sumamos por vos, en cada lugar que ya visitás.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onContinuar}
              className="mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
            >
              Quiero sumar puntos
              <ArrowRight size={19} strokeWidth={2.5} />
            </motion.button>
            <button
              type="button"
              onClick={onContinuar}
              className="py-1 text-xs font-semibold text-white/50 underline underline-offset-4"
            >
              Ya tengo cuenta, quiero entrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
