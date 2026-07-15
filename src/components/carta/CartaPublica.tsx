import { useEffect, useState } from 'react';
import { Loader2, StoreIcon, UtensilsCrossed } from 'lucide-react';
import { cargarCartaPublica, formatPrecio, type ResultadoCarta } from '../../lib/carta';

interface Props {
  negocioId: string;
}

type Estado = { fase: 'cargando' } | { fase: 'listo'; datos: ResultadoCarta };

/**
 * Carta digital pública de un negocio (menú QR): la ve cualquiera sin login. Se renderiza
 * desde main.tsx cuando la URL trae `?carta=<negocioId>`, antes de cualquier chequeo de
 * auth o rubro. Aplica la paleta del rubro del negocio vía `data-rubro`.
 */
export default function CartaPublica({ negocioId }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    let vivo = true;
    cargarCartaPublica(negocioId).then((datos) => {
      if (vivo) setEstado({ fase: 'listo', datos });
    });
    return () => {
      vivo = false;
    };
  }, [negocioId]);

  useEffect(() => {
    if (estado.fase !== 'listo' || estado.datos.estado !== 'ok') return;
    document.documentElement.dataset.rubro = estado.datos.negocio.rubro;
  }, [estado]);

  if (estado.fase === 'cargando') {
    return (
      <Marco>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-texto-muted">
          <Loader2 size={26} className="animate-spin" />
          <p className="text-sm font-medium">Cargando la carta…</p>
        </div>
      </Marco>
    );
  }

  const { datos } = estado;

  if (datos.estado !== 'ok') {
    return (
      <Marco>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center text-texto-muted">
          <StoreIcon size={30} className="opacity-60" />
          <p className="text-base font-bold text-texto">Esta carta ya no está disponible</p>
          <p className="max-w-xs text-sm">
            Puede que el negocio haya pausado su carta o que el link ya no sea válido.
          </p>
        </div>
      </Marco>
    );
  }

  const { negocio, grupos } = datos;

  return (
    <Marco>
      <header className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-5xl">{negocio.emoji}</span>
        <h1 className="font-titulo text-3xl font-bold tracking-tight">{negocio.nombre}</h1>
        {negocio.categoria && (
          <p className="text-sm font-medium text-texto-muted">{negocio.categoria}</p>
        )}
      </header>

      {grupos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center text-texto-muted">
          <UtensilsCrossed size={26} className="opacity-60" />
          <p className="text-sm font-medium">Todavía no hay items en esta carta.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-12">
          {grupos.map((grupo) => (
            <section key={grupo.categoria} className="flex flex-col gap-3">
              <h2 className="border-b border-borde pb-2 font-titulo text-lg font-bold text-acento">
                {grupo.categoria}
              </h2>
              <ul className="flex flex-col gap-3">
                {grupo.items.map((item) => (
                  <li key={item.id} className="flex gap-3 rounded-2xl border border-borde bg-card p-3">
                    {item.fotoUrl && (
                      <img
                        src={item.fotoUrl}
                        alt={item.nombre}
                        loading="lazy"
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 font-bold leading-tight">{item.nombre}</p>
                        <p className="shrink-0 font-titulo font-bold text-acento">
                          {formatPrecio(item.precio)}
                        </p>
                      </div>
                      {item.descripcion && (
                        <p className="text-sm leading-snug text-texto-muted">{item.descripcion}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <footer className="mt-auto border-t border-borde py-5 text-center text-xs text-texto-muted">
        Carta digital · Control.Evo
      </footer>
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5">{children}</div>;
}
