import { motion } from 'motion/react';
import { Camera, MapPin } from 'lucide-react';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { colorBarraProgreso, formatPuntos, proximaRecompensa } from '../../lib/club';
import { formatDistancia } from '../../lib/geo';
import { estadoAperturaAhora } from '../../lib/horarios';
import { gradienteCss } from '../../lib/temaNegocio';

interface Props {
  negocio: Negocio;
  relacion: RelacionNegocio | undefined;
  distanciaKm: number;
  activo: boolean;
  onAbrir: () => void;
}

/**
 * Card editorial de Explorar: foto (o degradé por rubro si no hay `portadaUrl` real — nunca
 * un placeholder "Foto pendiente" acá, esta pantalla está pensada para ser vistosa) + estado
 * de apertura real + progreso con el mismo color semántico que el resto de la app.
 */
export default function TarjetaExplorar({ negocio, relacion, distanciaKm, activo, onAbrir }: Props) {
  const puntos = relacion?.puntos ?? 0;
  const proxima = proximaRecompensa(negocio.recompensas, puntos);
  const pct =
    negocio.recompensas.length === 0 ? 0 : proxima ? Math.min(100, Math.round((puntos / proxima.pts) * 100)) : 100;
  const apertura = estadoAperturaAhora(negocio.horarioApertura);

  return (
    <motion.button
      id={`negocio-${negocio.id}`}
      layout
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileTap={{ scale: 0.98 }}
      onClick={onAbrir}
      className={`w-full overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition-colors ${
        activo ? 'border-premio ring-2 ring-premio/40' : 'border-borde'
      }`}
    >
      <div className="relative h-[110px] w-full">
        {negocio.portadaUrl ? (
          <img src={negocio.portadaUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl"
            style={{ background: gradienteCss(negocio.rubro) }}
          >
            <span aria-hidden>{negocio.emoji}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 from-0% to-transparent to-60%" />
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-white/92 px-2 py-1 text-[10px] font-bold text-texto">
          <MapPin size={11} strokeWidth={2.5} /> {formatDistancia(distanciaKm)}
        </span>
        {!negocio.portadaUrl && (
          <span className="absolute right-2.5 bottom-2 flex items-center gap-1 text-[9px] font-semibold text-white/70">
            <Camera size={10} /> Sin foto todavía
          </span>
        )}
      </div>

      <div className="px-3 pt-2.5 pb-3">
        <p className="truncate text-sm leading-tight font-bold text-texto">{negocio.nombre}</p>
        <p className="mt-0.5 text-[11px] text-texto-muted">
          {negocio.categoria} · Palermo
          {apertura && (
            <>
              {' · '}
              <span className={apertura.abierto ? 'font-semibold text-verde-ok' : 'text-texto-disabled'}>
                {apertura.texto}
              </span>
            </>
          )}
        </p>

        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-texto-muted">
          <span>Tus puntos</span>
          <span className="font-titulo text-xs font-bold text-premio">{formatPuntos(puntos)} pts</span>
        </div>
        <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-borde">
          <div className={`h-full rounded-full ${colorBarraProgreso(pct)}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </motion.button>
  );
}
