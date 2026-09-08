import { NIVELES_XP_GLOBAL, formatPuntos, progresoNivel } from '../../lib/club';

/**
 * La "Pokédex" de Premín: las 5 formas en fila, la actual resaltada y las que faltan en
 * silueta, con cuánto XP falta para la próxima evolución. El gancho del sistema de juego —
 * ver docs/NIVELES-Y-PREMIN.md. Mientras no existan los 5 assets por nivel
 * (`NivelXp.premin`), todas usan `/premin.png` y las bloqueadas se muestran como silueta.
 */
export default function TrackEvolucion({ xpTotal }: { xpTotal: number }) {
  const { actual, siguiente } = progresoNivel(NIVELES_XP_GLOBAL, xpTotal);

  return (
    <div className="rounded-3xl border border-borde bg-card p-4">
      <p className="mb-3 text-xs font-bold tracking-widest text-texto-muted uppercase">
        La evolución de Premín
      </p>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NIVELES_XP_GLOBAL.map((nivel) => {
          const alcanzado = xpTotal >= nivel.min;
          const esActual = nivel.nombre === actual.nombre;
          return (
            <div
              key={nivel.nombre}
              aria-current={esActual ? 'step' : undefined}
              className="flex flex-1 basis-14 flex-col items-center gap-1.5 text-center"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  esActual ? 'bg-premio-suave ring-2 ring-acento' : 'bg-fondo-medio'
                }`}
              >
                <img
                  src={nivel.premin ?? '/premin.png'}
                  alt={alcanzado ? `Premín — ${nivel.nombre}` : `${nivel.nombre} (bloqueado)`}
                  className={`h-11 w-11 object-contain ${alcanzado ? '' : 'opacity-30 brightness-0'}`}
                />
              </span>
              <span
                className={`text-[9px] leading-tight font-bold ${
                  alcanzado ? 'text-texto' : 'text-texto-muted'
                }`}
              >
                {nivel.nombre}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-2.5 text-center text-[11px] font-bold text-acento">
        {siguiente
          ? `Faltan ${formatPuntos(siguiente.min - xpTotal)} XP para que Premín evolucione a ${siguiente.nombre}`
          : 'Premín llegó a su forma final 👑'}
      </p>
    </div>
  );
}
