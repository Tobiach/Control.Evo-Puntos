import { Sparkles } from 'lucide-react';

interface Props {
  onIrAExplorar: () => void;
}

/**
 * Placeholder honesto para la pestaña "Misiones" del nav (corrección de arquitectura del
 * 15/9 — Premia.ar pasa a 5 destinos: Inicio/Explorar/Premios/Misiones/Perfil). Todavía no
 * existe ningún sistema de misiones real (sin tabla, sin RPC, sin pantalla) — en vez de
 * inventar una feature falsa para llenar el espacio, esto deja clara la intención del nav sin
 * fingir que la funcionalidad ya está. El día que Misiones sea un feature real, este archivo
 * se reemplaza sin tocar el resto del nav.
 */
export default function TabMisionesProximamente({ onIrAExplorar }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pt-6 pb-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-acento-suave text-acento">
        <Sparkles size={28} strokeWidth={2} />
      </span>
      <div>
        <h1 className="text-xl font-extrabold text-texto">Misiones</h1>
        <p className="mt-1.5 text-sm leading-snug text-texto-muted">
          Estamos construyendo esto. Mientras tanto, seguí sumando puntos y descubriendo lugares.
        </p>
      </div>
      <button
        type="button"
        onClick={onIrAExplorar}
        className="mt-2 rounded-full bg-acento px-5 py-2.5 text-sm font-bold text-on-acento active:bg-acento-hover"
      >
        Explorar lugares
      </button>
    </div>
  );
}
