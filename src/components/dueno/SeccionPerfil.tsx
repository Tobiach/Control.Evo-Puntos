import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { DatosNegocioForm } from '../../lib/panelDueno';
import { guardarPerfilDueno } from '../../lib/panelDueno';
import BuscadorDireccion from './BuscadorDireccion';

type Aviso = { tipo: 'ok' | 'error'; texto: string };

interface Props {
  negocio: DatosNegocioForm;
  /** Cambios sobre el negocio (dirección, nombre): se guardan con el botón grande "Guardar mi negocio". */
  onCambiar: (parche: Partial<DatosNegocioForm>) => void;
  nombrePersona: string;
  onCambiarNombrePersona: (valor: string) => void;
  /** `null` en modo vista previa (sin conexión). */
  duenoUserId: string | null;
  esPreview: boolean;
  onAviso: (aviso: Aviso) => void;
}

const claseInput =
  'w-full rounded-2xl border border-borde bg-card px-4 py-3.5 text-base font-medium outline-none placeholder:text-texto-muted/60 focus:border-acento';

export default function SeccionPerfil({
  negocio,
  onCambiar,
  nombrePersona,
  onCambiarNombrePersona,
  duenoUserId,
  esPreview,
  onAviso,
}: Props) {
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // El perfil tiene su PROPIO botón de guardado: es una tabla distinta (`dueno_perfil`),
  // no participa del botón grande "Guardar mi negocio" de abajo.
  const guardarPerfil = async () => {
    if (esPreview || !duenoUserId) {
      onAviso({ tipo: 'ok', texto: 'Guardado en esta sesión (vista previa).' });
      return;
    }
    setGuardandoPerfil(true);
    const resultado = await guardarPerfilDueno(duenoUserId, nombrePersona.trim());
    setGuardandoPerfil(false);
    onAviso(
      resultado.ok
        ? { tipo: 'ok', texto: 'Tu perfil quedó guardado.' }
        : { tipo: 'error', texto: 'No pudimos guardar tu perfil. Revisá tu conexión e intentá de nuevo.' },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <Campo etiqueta="Tu nombre">
        <input
          value={nombrePersona}
          onChange={(e) => onCambiarNombrePersona(e.target.value)}
          placeholder="Tobías"
          className={claseInput}
        />
        <button
          type="button"
          onClick={guardarPerfil}
          disabled={guardandoPerfil}
          className="flex items-center justify-center gap-2 rounded-2xl border border-acento bg-premio-suave py-3 text-sm font-bold text-acento disabled:opacity-60"
        >
          {guardandoPerfil ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar perfil
        </button>
      </Campo>

      <Campo etiqueta="Dirección de tu negocio">
        <BuscadorDireccion
          calle={negocio.calle}
          altura={negocio.altura}
          codigoPostal={negocio.codigoPostal}
          lat={negocio.lat}
          lng={negocio.lng}
          onCambiar={onCambiar}
        />
        <p className="px-1 text-xs text-texto-muted">
          Es la misma dirección que aparece en “Negocio → Ubicación”. Se guarda cuando toques
          “Guardar mi negocio” más abajo.
        </p>
      </Campo>

      <Campo etiqueta="Cambiar el nombre del negocio">
        <input
          value={negocio.nombre}
          onChange={(e) => onCambiar({ nombre: e.target.value })}
          placeholder="Café Nardo"
          className={claseInput}
        />
        <p className="px-1 text-xs text-texto-muted">
          Este cambio se guarda cuando toques “Guardar mi negocio” más abajo.
        </p>
      </Campo>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="px-1 text-xs font-bold uppercase tracking-wide text-texto-muted">{etiqueta}</span>
      {children}
    </div>
  );
}
