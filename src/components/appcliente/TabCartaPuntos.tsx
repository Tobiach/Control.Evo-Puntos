import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Loader2, UtensilsCrossed } from 'lucide-react';
import type { RubroData } from '../../data/mockClientes';
import { calcularPuntos, formatMonto, formatPuntos } from '../../lib/club';
import { cargarCartaPublica, formatPrecio, type GrupoCarta } from '../../lib/carta';

interface Props {
  negocioId: string;
  data: RubroData;
  onVolver: () => void;
}

type Estado = { fase: 'cargando' } | { fase: 'listo'; grupos: GrupoCarta[] } | { fase: 'sin-carta' };

/**
 * "Sumá puntos": cuánto suma cada producto de la carta real del negocio (feature nueva,
 * pedida para incentivar el ticket promedio). Reusa `cargarCartaPublica` tal cual —
 * mismos datos que ve cualquiera sin login en `?carta=<id>`, solo se le agrega el cálculo
 * de puntos por ítem (precio ÷ montoPorPunto, la misma fórmula que ya usa el cajero al
 * cobrar). Sin carta cargada, no se inventa nada: se explica la fórmula general.
 */
export default function TabCartaPuntos({ negocioId, data, onVolver }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    let vivo = true;
    cargarCartaPublica(negocioId).then((res) => {
      if (!vivo) return;
      const hayItems = res.estado === 'ok' && res.grupos.some((grupo) => grupo.items.length > 0);
      setEstado(hayItems && res.estado === 'ok' ? { fase: 'listo', grupos: res.grupos } : { fase: 'sin-carta' });
    });
    return () => {
      vivo = false;
    };
  }, [negocioId]);

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-10">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver"
          className="rounded-full border border-borde bg-card p-2 text-texto-muted"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-texto">Sumá puntos</h1>
          <p className="text-sm text-texto-muted">Cuánto te da cada producto en {data.nombreNegocio}</p>
        </div>
      </header>

      {estado.fase === 'cargando' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-texto-muted">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {estado.fase === 'sin-carta' && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-borde bg-card px-5 py-10 text-center">
          <UtensilsCrossed size={26} className="text-texto-disabled" />
          <p className="text-sm font-bold text-texto">{data.nombreNegocio} todavía no cargó su carta acá</p>
          <p className="text-xs leading-snug text-texto-muted">
            Igual sumás puntos en cada compra: 1 pt cada {formatMonto(data, data.montoPorPunto)}.
          </p>
        </div>
      )}

      {estado.fase === 'listo' && (
        <div className="flex flex-col gap-6">
          {estado.grupos.map((grupo) => (
            <section key={grupo.categoria} className="flex flex-col gap-2.5">
              <h2 className="text-sm font-bold text-texto">{grupo.categoria}</h2>
              <div className="flex flex-col gap-2">
                {grupo.items.map((item, indice) => {
                  const pts = calcularPuntos(data.montoPorPunto, item.precio);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: indice * 0.03 }}
                      className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3"
                    >
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-premio-suave text-lg">
                          🍽️
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-texto">{item.nombre}</p>
                        {item.precio > 0 && (
                          <p className="text-xs text-texto-muted">{formatPrecio(item.precio, data.monedaPrefijo)}</p>
                        )}
                      </div>
                      {pts > 0 && (
                        <span className="shrink-0 rounded-full bg-premio-suave px-2.5 py-1 text-xs font-bold text-premio">
                          +{formatPuntos(pts)} pts
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
