import { motion } from 'motion/react';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { calcularXpTotal, colorBarraProgreso, formatPuntos, proximaRecompensa } from '../../lib/club';
import CardNivelXp from './CardNivelXp';
import FilaMetricas from './FilaMetricas';

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  onAbrirNegocio: (negocio: Negocio) => void;
}

/** Tiene al menos una recompensa ya alcanzable en este negocio (pts >= meta). */
const tieneRecompensaDisponible = (negocio: Negocio, puntos: number) =>
  negocio.recompensas.some((recompensa) => recompensa.pts <= puntos);

/**
 * Reemplazo real de "Favoritos": no hay corazón para marcar arbitrariamente, es la lista de
 * negocios donde el cliente YA tiene una relación (puntos/historial real), sea del marketplace
 * de ejemplo o de Supabase. Ordenada primero por disponibilidad (premio ya alcanzable), y
 * reforzada con progreso real (con color semántico) a la próxima recompensa de cada local.
 */
export default function TabMisLocales({ negocios, relaciones, onAbrirNegocio }: Props) {
  const misLocales = negocios
    .filter((negocio) => relaciones[negocio.id])
    .sort(
      (a, b) =>
        Number(tieneRecompensaDisponible(b, relaciones[b.id].puntos)) -
        Number(tieneRecompensaDisponible(a, relaciones[a.id].puntos)),
    );

  const xpTotal = calcularXpTotal(relaciones);
  const listos = misLocales.filter((negocio) => tieneRecompensaDisponible(negocio, relaciones[negocio.id].puntos)).length;
  const enCurso = misLocales.length - listos;

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-verde-ok">Mis premios</h1>
        <p className="mt-0.5 text-xs text-texto-muted">
          {misLocales.length} {misLocales.length === 1 ? 'comercio' : 'comercios'}
          {listos > 0 && ` · ${listos} ${listos === 1 ? 'listo' : 'listos'} para canjear`}
        </p>
      </div>

      <CardNivelXp xpTotal={xpTotal} />

      {misLocales.length > 0 && (
        <FilaMetricas
          metricas={[
            { valor: listos, label: 'Listo', color: 'text-premio' },
            { valor: enCurso, label: 'En curso', color: 'text-texto' },
            { valor: xpTotal, label: 'XP total', color: 'text-acento' },
          ]}
        />
      )}

      {misLocales.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-card px-4 py-6 text-center text-sm text-texto-muted">
          Todavía no sumaste en ningún local. Entrá a uno desde &ldquo;Inicio&rdquo; para empezar.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {misLocales.map((negocio) => {
            const puntos = relaciones[negocio.id].puntos;
            const proxima = proximaRecompensa(negocio.recompensas, puntos);
            const pct =
              negocio.recompensas.length === 0
                ? 0
                : proxima
                  ? Math.min(100, Math.round((puntos / proxima.pts) * 100))
                  : 100;
            return (
              <button
                key={negocio.id}
                type="button"
                onClick={() => onAbrirNegocio(negocio)}
                className="flex flex-col gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3.5 text-left"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl ${
                      negocio.logoUrl ? 'bg-white' : 'bg-premio-suave'
                    }`}
                  >
                    {negocio.logoUrl ? (
                      <img src={negocio.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      negocio.emoji
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-texto">{negocio.nombre}</span>
                    <span className="block text-xs font-bold text-premio">{formatPuntos(puntos)} pts</span>
                  </span>
                </span>

                {negocio.recompensas.length > 0 && (
                  <span className="block">
                    <span className="flex items-center justify-between text-[11px] font-semibold text-texto-muted">
                      <span>
                        {proxima
                          ? `Te faltan ${formatPuntos(proxima.pts - puntos)} pts para ${proxima.descripcion}`
                          : 'Premio listo para canjear 🎉'}
                      </span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-borde">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`block h-full rounded-full ${colorBarraProgreso(pct)}`}
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
