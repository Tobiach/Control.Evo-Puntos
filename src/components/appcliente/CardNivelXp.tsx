import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { formatPuntos, NIVELES_XP_GLOBAL, progresoNivel } from '../../lib/club';

/**
 * Card de nivel global (FEATURE NUEVA): suma el XP de TODOS los negocios donde el cliente
 * tiene relación — distinto del nivel por negocio (`nivelDe`), que sigue intacto dentro de
 * cada local. Compartida entre Mis Premios y Perfil, mismo componente en las dos pantallas
 * (mismo criterio visual, no dos versiones separadas). Premín (no un trofeo genérico) es
 * quien celebra el nivel — mismo mascot que usa el resto de la app.
 *
 * `abajo` es un slot opcional (ej. stats de Perfil por negocio) que se agrega DENTRO del
 * mismo cuadro negro, separado por una línea sutil — nunca cambia el contenido por defecto,
 * así Mis Premios y Perfil marketplace (que no lo pasan) quedan intactos.
 */
export default function CardNivelXp({ xpTotal, abajo }: { xpTotal: number; abajo?: ReactNode }) {
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
      {abajo && <div className="relative mt-3 border-t border-white/10 pt-3">{abajo}</div>}
    </div>
  );
}
