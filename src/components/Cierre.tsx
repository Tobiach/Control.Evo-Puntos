import { motion } from 'motion/react';
import { BarChart3, MessageCircle, ReceiptText, RotateCcw, Sparkles, User } from 'lucide-react';
import type { RubroData } from '../data/mockClientes';
import { WHATSAPP_NUMBER } from '../config';

interface Props {
  data: RubroData;
  onReiniciar: () => void;
}

const RESUMEN = [
  { icono: User, texto: 'Tu cliente ve sus puntos y su próximo premio' },
  { icono: ReceiptText, texto: 'Tu caja suma puntos sola y sugiere el upsell' },
  { icono: BarChart3, texto: 'Vos ves quién vuelve, quién no, y quién canjea' },
] as const;

export default function Cierre({ data, onReiniciar }: Props) {
  const linkWhatsApp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(data.mensajeWhatsApp)}`;

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-10">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-acento text-on-acento"
        >
          <Sparkles size={30} strokeWidth={2.2} />
        </motion.div>
        <h2 className="text-2xl font-black tracking-tight">Eso es todo el sistema</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-texto-muted">
          Un club de puntos con tu marca, funcionando en el celular de cada cliente.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {RESUMEN.map((item, indice) => {
          const Icono = item.icono;
          return (
            <motion.div
              key={item.texto}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + indice * 0.12, duration: 0.3 }}
              className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5"
            >
              <Icono size={19} className="shrink-0 text-acento" />
              <p className="text-sm font-semibold">{item.texto}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <motion.a
          href={linkWhatsApp}
          target="_blank"
          rel="noreferrer"
          whileTap={{ scale: 0.97 }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-whatsapp py-4 text-base font-bold text-white shadow-lg"
        >
          <MessageCircle size={20} strokeWidth={2.4} />
          ¿Querés esto para tu negocio?
        </motion.a>
        <button
          type="button"
          onClick={onReiniciar}
          className="inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold text-texto-muted underline underline-offset-4"
        >
          <RotateCcw size={13} />
          Volver a ver la demo
        </button>
      </div>
    </div>
  );
}
