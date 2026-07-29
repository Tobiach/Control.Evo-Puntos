import { motion } from 'motion/react';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { formatPuntos } from '../../lib/club';

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  onAbrirNegocio: (negocio: Negocio) => void;
}

/** Recompensa alcanzable más cercana en ESTE negocio (para la barra de progreso de la card). */
function proximaRecompensaLocal(negocio: Negocio, puntos: number) {
  return negocio.recompensas
    .filter((recompensa) => recompensa.pts > puntos)
    .sort((a, b) => a.pts - b.pts)[0];
}

/**
 * Reemplazo real de "Favoritos": no hay corazón para marcar arbitrariamente, es la lista de
 * negocios donde el cliente YA tiene una relación (puntos/historial real), sea del marketplace
 * de ejemplo o de Supabase. Reforzado con progreso real a la próxima recompensa de cada local.
 */
export default function TabMisLocales({ negocios, relaciones, onAbrirNegocio }: Props) {
  const misLocales = negocios.filter((negocio) => relaciones[negocio.id]);

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-texto">Mis premios</h1>
        <p className="mt-0.5 text-xs text-texto-muted">Tu progreso en cada local donde ya sumás</p>
      </div>

      {misLocales.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-card px-4 py-6 text-center text-sm text-texto-muted">
          Todavía no sumaste en ningún local. Entrá a uno desde &ldquo;Inicio&rdquo; para empezar.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {misLocales.map((negocio) => {
            const puntos = relaciones[negocio.id].puntos;
            const recompensa = proximaRecompensaLocal(negocio, puntos);
            return (
              <button
                key={negocio.id}
                type="button"
                onClick={() => onAbrirNegocio(negocio)}
                className="flex flex-col gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3.5 text-left"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-premio-suave text-xl">
                    {negocio.logoUrl ? (
                      <img src={negocio.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      negocio.emoji
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-texto">{negocio.nombre}</span>
                    <span className="block text-xs font-bold text-premio">{formatPuntos(puntos)} pts</span>
                  </span>
                </span>

                {recompensa && (
                  <span className="block">
                    <span className="flex items-center justify-between text-[11px] font-semibold text-texto-muted">
                      <span>Te faltan {formatPuntos(recompensa.pts - puntos)} pts para {recompensa.descripcion}</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-borde">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (puntos / recompensa.pts) * 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="block h-full rounded-full bg-acento"
                      />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
