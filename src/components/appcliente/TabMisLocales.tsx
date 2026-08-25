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

type EstadoTarjeta = 'canjeable' | 'casi' | 'acumulando' | 'nuevo';

/** Tiene al menos una recompensa ya alcanzable en este negocio (pts >= meta). */
const tieneRecompensaDisponible = (negocio: Negocio, puntos: number) =>
  negocio.recompensas.some((recompensa) => recompensa.pts <= puntos);

function estadoDe(negocio: Negocio, relacion: RelacionNegocio | undefined): EstadoTarjeta {
  if (!relacion) return 'nuevo';
  if (negocio.recompensas.length === 0) return 'acumulando';
  const puntos = relacion.puntos;
  if (tieneRecompensaDisponible(negocio, puntos)) return 'canjeable';
  const proxima = proximaRecompensa(negocio.recompensas, puntos);
  const pct = proxima ? (puntos / proxima.pts) * 100 : 100;
  return pct >= 80 ? 'casi' : 'acumulando';
}

/** Orden de urgencia: canjeable → casi → acumulando → nuevo (mismo criterio que la imagen de
 *  referencia del Estudio de Diseño). */
const PRIORIDAD: Record<EstadoTarjeta, number> = { canjeable: 0, casi: 1, acumulando: 2, nuevo: 3 };

/**
 * Reemplazo real de "Favoritos": mezcla los negocios donde el cliente YA tiene puntos (del
 * marketplace de ejemplo o de Supabase) con los que todavía no visitó — 4 estados con su
 * propio color y CTA, ordenados por urgencia real, no por orden de alta.
 */
export default function TabMisLocales({ negocios, relaciones, onAbrirNegocio }: Props) {
  const conRelacion = negocios.filter((negocio) => relaciones[negocio.id]);
  const listos = conRelacion.filter((negocio) => tieneRecompensaDisponible(negocio, relaciones[negocio.id].puntos)).length;
  const enCurso = conRelacion.length - listos;
  const xpTotal = calcularXpTotal(relaciones);

  const tarjetas = [...negocios].sort(
    (a, b) => PRIORIDAD[estadoDe(a, relaciones[a.id])] - PRIORIDAD[estadoDe(b, relaciones[b.id])],
  );

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-verde-ok">Mis premios</h1>
        <p className="mt-0.5 text-xs text-texto-muted">
          {conRelacion.length} {conRelacion.length === 1 ? 'comercio' : 'comercios'}
          {listos > 0 && ` · ${listos} ${listos === 1 ? 'listo' : 'listos'} para canjear`}
        </p>
      </div>

      <CardNivelXp xpTotal={xpTotal} />

      {conRelacion.length > 0 && (
        <FilaMetricas
          metricas={[
            { valor: listos, label: 'Listo', color: 'text-premio' },
            { valor: enCurso, label: 'En curso', color: 'text-texto' },
            { valor: xpTotal, label: 'XP total', color: 'text-acento' },
          ]}
        />
      )}

      {tarjetas.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-card px-4 py-6 text-center text-sm text-texto-muted">
          Todavía no hay locales para mostrar.
        </p>
      ) : (
        <div>
          <p className="mb-2.5 text-sm font-bold text-texto">Tus tarjetas</p>
          <div className="flex flex-col gap-2.5">
            {tarjetas.map((negocio) => {
              const relacion = relaciones[negocio.id];
              const puntos = relacion?.puntos ?? 0;
              const sinRecompensas = negocio.recompensas.length === 0;
              const proxima = sinRecompensas ? null : proximaRecompensa(negocio.recompensas, puntos);
              const pct = sinRecompensas ? 0 : proxima ? Math.min(100, Math.round((puntos / proxima.pts) * 100)) : 100;
              const estado = estadoDe(negocio, relacion);

              const estiloCard =
                estado === 'canjeable'
                  ? 'border-premio bg-premio-suave/40 shadow-[0_4px_16px_rgba(242,138,99,0.18)]'
                  : estado === 'nuevo'
                    ? 'border-dashed border-borde-fuerte bg-fondo-medio'
                    : 'border-borde bg-card';
              const colorTexto =
                estado === 'canjeable'
                  ? 'text-premio'
                  : estado === 'casi'
                    ? 'text-acento'
                    : estado === 'acumulando'
                      ? 'text-verde-ok'
                      : 'text-texto-disabled';

              return (
                <button
                  key={negocio.id}
                  type="button"
                  onClick={() => onAbrirNegocio(negocio)}
                  className={`flex flex-col gap-2.5 rounded-2xl border px-4 py-3.5 text-left ${estiloCard}`}
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
                      <span className={`block text-xs font-bold ${estado === 'nuevo' ? 'text-texto-muted' : 'text-premio'}`}>
                        {estado === 'nuevo' ? 'Sin puntos todavía' : `${formatPuntos(puntos)} pts`}
                      </span>
                    </span>
                  </span>

                  {!sinRecompensas && estado !== 'nuevo' && (
                    <>
                      <span className={`text-[11px] font-semibold ${colorTexto}`}>
                        {estado === 'canjeable'
                          ? '✓ Meta alcanzada'
                          : proxima
                            ? `Te faltan ${formatPuntos(proxima.pts - puntos)} pts para ${proxima.descripcion}`
                            : ''}
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-borde">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`block h-full rounded-full ${colorBarraProgreso(pct)}`}
                        />
                      </span>
                    </>
                  )}

                  <span className="flex items-center justify-between border-t border-borde/60 pt-2">
                    <span className={`text-[11px] font-bold ${colorTexto}`}>
                      {estado === 'canjeable'
                        ? 'Premio disponible ahora'
                        : estado === 'casi'
                          ? 'Casi llegás'
                          : estado === 'acumulando'
                            ? 'Seguí visitando'
                            : 'Nuevo negocio'}
                    </span>
                    {estado === 'canjeable' ? (
                      <span className="rounded-full bg-premio px-3 py-1 text-[10px] font-bold text-white">
                        Ver PIN →
                      </span>
                    ) : estado === 'nuevo' ? (
                      <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-texto-muted">
                        Explorar →
                      </span>
                    ) : (
                      <span className="rounded-full bg-fondo-medio px-2.5 py-1 text-[10px] font-bold text-texto-muted">
                        {formatPuntos((proxima?.pts ?? 0) - puntos)} pts más
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
