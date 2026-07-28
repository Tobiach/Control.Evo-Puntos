import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { formatPuntos } from '../../lib/club';

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  onAbrirNegocio: (negocio: Negocio) => void;
}

/**
 * Reemplazo real de "Favoritos": no hay corazón para marcar arbitrariamente, es la lista de
 * negocios donde el cliente YA tiene una relación (puntos/historial real), sea del marketplace
 * de ejemplo o de Supabase.
 */
export default function TabMisLocales({ negocios, relaciones, onAbrirNegocio }: Props) {
  const misLocales = negocios.filter((negocio) => relaciones[negocio.id]);

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-texto">Mis locales</h1>
        <p className="mt-0.5 text-xs text-texto-muted">Donde ya sumás puntos</p>
      </div>

      {misLocales.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-card px-4 py-6 text-center text-sm text-texto-muted">
          Todavía no sumaste en ningún local. Entrá a uno desde &ldquo;Inicio&rdquo; para empezar.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {misLocales.map((negocio) => (
            <button
              key={negocio.id}
              type="button"
              onClick={() => onAbrirNegocio(negocio)}
              className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5 text-left"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-premio-suave text-xl">
                {negocio.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-texto">{negocio.nombre}</span>
                <span className="block text-xs font-bold text-premio">
                  {formatPuntos(relaciones[negocio.id].puntos)} pts
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
