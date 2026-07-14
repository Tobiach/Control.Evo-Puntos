import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import type { Insignia } from '../../lib/misiones';
import { lanzarConfetti } from '../../lib/confetti';

interface Props {
  insignias: Insignia[];
}

/** Tarjetas coleccionables del negocio: conseguidas a color, bloqueadas en gris. */
export default function Insignias({ insignias }: Props) {
  const conseguidas = insignias.filter((insignia) => insignia.conseguida).length;

  const celebrar = (insignia: Insignia, evento: React.MouseEvent<HTMLButtonElement>) => {
    if (!insignia.conseguida) return;
    const caja = evento.currentTarget.getBoundingClientRect();
    lanzarConfetti({
      x: (caja.left + caja.width / 2) / window.innerWidth,
      y: (caja.top + caja.height / 2) / window.innerHeight,
    });
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
            <motion.button
              key={insignia.id}
              type="button"
              onClick={(evento) => celebrar(insignia, evento)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: indice * 0.05 }}
              whileTap={insignia.conseguida ? { scale: 0.96 } : undefined}
              className={`flex flex-col items-start gap-2 rounded-3xl border p-4 text-left ${
                insignia.conseguida
                  ? 'border-borde bg-card'
                  : 'border-borde bg-card/40 opacity-70'
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
              <span
                className={`mt-auto rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                  insignia.conseguida
                    ? 'bg-premio-suave text-acento'
                    : 'bg-borde text-texto-muted'
                }`}
              >
                {insignia.conseguida ? 'Conseguida' : 'Bloqueada'}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
