import { motion } from 'motion/react';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import {
  calcularXpTotal,
  colorBarraProgreso,
  formatPuntos,
  NIVELES_XP_GLOBAL,
  progresoNivel,
  proximaRecompensa,
} from '../../lib/club';

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  onAbrirNegocio: (negocio: Negocio) => void;
}

/** Tiene al menos una recompensa ya alcanzable en este negocio (pts >= meta). */
const tieneRecompensaDisponible = (negocio: Negocio, puntos: number) =>
  negocio.recompensas.some((recompensa) => recompensa.pts <= puntos);

/**
 * Card de nivel global (FEATURE NUEVA, Paso 5): suma el XP de TODOS los negocios donde el
 * cliente tiene relación — distinto del nivel por negocio (`nivelDe`), que sigue intacto
 * dentro de cada local. Ancla emocionalmente la pantalla, es lo primero que se ve. Premín
 * (no un trofeo genérico) es quien celebra el nivel — mismo mascot que usa el resto de la app.
 */
function CardNivel({ xpTotal }: { xpTotal: number }) {
  const { actual, siguiente, pct } = progresoNivel(NIVELES_XP_GLOBAL, xpTotal);

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-surface-dark px-4 py-3.5">
      <span aria-hidden className="absolute -top-6 -right-6 h-[90px] w-[90px] rounded-full bg-white/[0.04]" />
      <span aria-hidden className="absolute top-3 right-14 h-[50px] w-[50px] rounded-full bg-white/[0.03]" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">Tu nivel</p>
          <p className="mt-0.5 text-base font-extrabold tracking-tight text-white">{actual.nombre}</p>
          <p className="mt-0.5 text-xs text-white/55">
            {siguiente
              ? `${formatPuntos(xpTotal)} / ${formatPuntos(siguiente.min)} XP para ${siguiente.nombre}`
              : 'Nivel máximo alcanzado'}
          </p>
        </div>
        <img
          src="/premin.png"
          alt="Premín"
          className="-mt-3 -mr-1 h-[72px] w-[72px] shrink-0 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]"
        />
      </div>
      <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-full rounded-full bg-premio-claro"
        />
      </div>
      {siguiente && (
        <p className="relative mt-1.5 text-[10px] text-white/40">
          Faltan {formatPuntos(siguiente.min - xpTotal)} XP para el próximo nivel
        </p>
      )}
    </div>
  );
}

/** Strip de 3 métricas clave, debajo de la card de nivel. */
function StripMetricas({ listos, enCurso, xpTotal }: { listos: number; enCurso: number; xpTotal: number }) {
  const metricas = [
    { valor: listos, label: 'Listo', color: 'text-premio' },
    { valor: enCurso, label: 'En curso', color: 'text-texto' },
    { valor: xpTotal, label: 'XP total', color: 'text-acento' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {metricas.map(({ valor, label, color }) => (
        <div key={label} className="rounded-2xl bg-fondo-medio px-2 py-2.5 text-center">
          <p className={`font-titulo text-lg font-extrabold ${color}`}>{formatPuntos(valor)}</p>
          <p className="text-[9px] font-bold tracking-[0.06em] text-texto-muted uppercase">{label}</p>
        </div>
      ))}
    </div>
  );
}

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

      <CardNivel xpTotal={xpTotal} />

      {misLocales.length > 0 && <StripMetricas listos={listos} enCurso={enCurso} xpTotal={xpTotal} />}

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
