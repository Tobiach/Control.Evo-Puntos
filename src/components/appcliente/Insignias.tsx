import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Lock, Share2 } from 'lucide-react';
import type { Insignia } from '../../lib/misiones';
import { lanzarConfetti } from '../../lib/confetti';
import { compartir } from '../../lib/compartir';

interface Props {
  insignias: Insignia[];
  /** Nombre del negocio, para el texto del logro compartido. */
  nombreNegocio: string;
}

/** Tarjetas coleccionables del negocio: conseguidas a color, bloqueadas en gris. */
export default function Insignias({ insignias, nombreNegocio }: Props) {
  const conseguidas = insignias.filter((insignia) => insignia.conseguida).length;
  const [copiada, setCopiada] = useState<string | null>(null);

  const celebrar = (insignia: Insignia, caja: DOMRect) => {
    if (!insignia.conseguida) return;
    lanzarConfetti({
      x: (caja.left + caja.width / 2) / window.innerWidth,
      y: (caja.top + caja.height / 2) / window.innerHeight,
    });
  };

  const compartirLogro = async (insignia: Insignia) => {
    const texto = `¡Conseguí la insignia "${insignia.nombre}" en el Club de Puntos de ${nombreNegocio}! 🏅`;
    const copiado = await compartir(texto);
    if (copiado) {
      setCopiada(insignia.id);
      window.setTimeout(() => setCopiada((actual) => (actual === insignia.id ? null : actual)), 2000);
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">Insignias 🏅</p>
        <span className="text-xs font-bold text-texto-muted">
          {conseguidas}/{insignias.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {insignias.map((insignia, indice) => {
          const Icono = insignia.icono;
          return (
            <motion.div
              key={insignia.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: indice * 0.05 }}
              onClick={(evento) => celebrar(insignia, evento.currentTarget.getBoundingClientRect())}
              className={`flex flex-col items-start gap-2 rounded-3xl border p-4 text-left ${
                insignia.conseguida ? 'border-borde bg-card' : 'border-borde bg-card/40 opacity-70'
              }`}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={
                  insignia.conseguida
                    ? { backgroundColor: `${insignia.color}22`, color: insignia.color }
                    : { backgroundColor: 'var(--color-borde)', color: 'var(--color-texto-muted)' }
                }
              >
                {insignia.conseguida ? <Icono size={22} strokeWidth={2.4} /> : <Lock size={18} />}
              </span>
              <div>
                <p className="text-sm leading-tight font-bold">{insignia.nombre}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-texto-muted">
                  {insignia.conseguida ? insignia.descripcion : insignia.progreso}
                </p>
              </div>
              {insignia.conseguida ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    void compartirLogro(insignia);
                  }}
                  className="mt-auto flex items-center gap-1.5 rounded-full bg-premio-suave px-2.5 py-1 text-[10px] font-bold tracking-wide text-acento uppercase"
                >
                  {copiada === insignia.id ? (
                    <>
                      <Check size={12} /> Copiado
                    </>
                  ) : (
                    <>
                      <Share2 size={12} /> Compartir
                    </>
                  )}
                </motion.button>
              ) : (
                <span className="mt-auto rounded-full bg-borde px-2 py-0.5 text-[10px] font-bold tracking-wide text-texto-muted uppercase">
                  Bloqueada
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
