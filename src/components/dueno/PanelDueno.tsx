import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, ChevronLeft, Gift, Loader2, Save, Store } from 'lucide-react';
import type { Recompensa } from '../../data/mockClientes';
import {
  cargarMetricas,
  cargarNegocioDelDueno,
  guardarNegocioYRecompensas,
  type DatosNegocioForm,
  type MetricasNegocio,
} from '../../lib/panelDueno';
import SeccionNegocio from './SeccionNegocio';
import SeccionRecompensas from './SeccionRecompensas';
import SeccionMetricas from './SeccionMetricas';

type Seccion = 'negocio' | 'recompensas' | 'metricas';

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null;

interface PropsConectado {
  modo: 'conectado';
  duenoUserId: string;
  emailSesion: string;
  onVolver: () => void;
  onCerrarSesion: () => Promise<void>;
}

interface PropsPreview {
  modo: 'preview';
  onVolver: () => void;
}

type Props = PropsConectado | PropsPreview;

const NEGOCIO_VACIO: DatosNegocioForm = {
  id: null,
  nombre: '',
  categoria: '',
  rubro: 'gastro',
  emoji: '🏪',
  lat: null,
  lng: null,
  horarioValle: null,
  beneficiosVip: [],
  pinCajero: null,
};

const SECCIONES: { clave: Seccion; etiqueta: string; icono: typeof Store }[] = [
  { clave: 'negocio', etiqueta: 'Mi negocio', icono: Store },
  { clave: 'recompensas', etiqueta: 'Recompensas', icono: Gift },
  { clave: 'metricas', etiqueta: 'Métricas', icono: BarChart3 },
];

export default function PanelDueno(props: Props) {
  const esPreview = props.modo === 'preview';
  const [seccion, setSeccion] = useState<Seccion>('negocio');
  const [negocio, setNegocio] = useState<DatosNegocioForm>(NEGOCIO_VACIO);
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);
  const [metricas, setMetricas] = useState<MetricasNegocio | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(!esPreview);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  const duenoUserId = props.modo === 'conectado' ? props.duenoUserId : null;

  const refrescarMetricas = async (negocioId: string | null) => {
    if (!negocioId) return;
    setCargandoMetricas(true);
    const resultado = await cargarMetricas(negocioId);
    if (resultado.ok) setMetricas(resultado.valor);
    setCargandoMetricas(false);
  };

  // Carga inicial (solo modo conectado): trae el negocio ya cargado + sus recompensas + métricas.
  useEffect(() => {
    if (!duenoUserId) return;
    let activo = true;
    setCargandoInicial(true);
    cargarNegocioDelDueno(duenoUserId).then((resultado) => {
      if (!activo) return;
      if (resultado.ok && resultado.valor) {
        setNegocio(resultado.valor.negocio);
        setRecompensas(resultado.valor.recompensas);
        void refrescarMetricas(resultado.valor.negocio.id);
      }
      setCargandoInicial(false);
    });
    return () => {
      activo = false;
    };
  }, [duenoUserId]);

  const cambiarNegocio = (parche: Partial<DatosNegocioForm>) => {
    setNegocio((previo) => ({ ...previo, ...parche }));
    setAviso(null);
  };

  const guardar = async () => {
    if (!negocio.nombre.trim()) {
      setSeccion('negocio');
      setAviso({ tipo: 'error', texto: 'Poné el nombre de tu negocio antes de guardar.' });
      return;
    }
    if (!negocio.categoria.trim()) {
      setSeccion('negocio');
      setAviso({ tipo: 'error', texto: 'Poné la categoría de tu negocio antes de guardar.' });
      return;
    }

    if (props.modo === 'preview') {
      setAviso({ tipo: 'ok', texto: 'Guardado en esta sesión (vista previa).' });
      return;
    }

    setGuardando(true);
    const resultado = await guardarNegocioYRecompensas(props.duenoUserId, negocio, recompensas);
    setGuardando(false);
    if (!resultado.ok) {
      setAviso({ tipo: 'error', texto: 'No pudimos guardar. Revisá tu conexión e intentá de nuevo.' });
      return;
    }
    setNegocio((previo) => ({ ...previo, id: resultado.valor.id }));
    setAviso({ tipo: 'ok', texto: 'Tu negocio quedó guardado.' });
    void refrescarMetricas(resultado.valor.id);
  };

  if (cargandoInicial) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-texto-muted">
        <Loader2 size={24} className="animate-spin" />
        <p className="text-sm font-medium">Cargando tu panel…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-5">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={props.onVolver}
          aria-label="Volver"
          className="rounded-full border border-borde bg-card p-2 text-texto-muted"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-titulo text-2xl font-bold tracking-tight">Mi panel</h2>
          <p className="truncate text-sm text-texto-muted">
            {props.modo === 'conectado' ? props.emailSesion : 'Modo demostración'}
          </p>
        </div>
      </header>

      {esPreview && (
        <div className="flex items-start gap-3 rounded-2xl border border-premio/40 bg-premio-suave px-4 py-3">
          <Store size={18} className="mt-0.5 shrink-0 text-acento" />
          <p className="text-sm leading-snug text-texto">
            <span className="font-bold">Vista previa.</span> Cargá todo y probá cómo se ve. Se va a
            guardar de verdad cuando conectemos tu negocio.
          </p>
        </div>
      )}

      <div className="flex gap-1.5 rounded-2xl border border-borde bg-card p-1.5">
        {SECCIONES.map(({ clave, etiqueta, icono: Icono }) => {
          const activo = seccion === clave;
          return (
            <button
              key={clave}
              type="button"
              onClick={() => setSeccion(clave)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors ${
                activo ? 'bg-acento text-on-acento' : 'text-texto-muted'
              }`}
            >
              <Icono size={15} className="shrink-0" />
              <span>{etiqueta}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1">
        {seccion === 'negocio' && <SeccionNegocio negocio={negocio} onCambiar={cambiarNegocio} />}
        {seccion === 'recompensas' && (
          <SeccionRecompensas
            recompensas={recompensas}
            onCambiar={(lista) => {
              setRecompensas(lista);
              setAviso(null);
            }}
          />
        )}
        {seccion === 'metricas' && (
          <SeccionMetricas
            metricas={metricas}
            cantidadRecompensas={recompensas.length}
            cargando={cargandoMetricas}
            esPreview={esPreview}
          />
        )}
      </div>

      {aviso && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-1 text-sm font-semibold ${aviso.tipo === 'ok' ? 'text-verde-ok' : 'text-rojo'}`}
        >
          {aviso.texto}
        </motion.p>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={guardar}
        disabled={guardando}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-60"
      >
        {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {esPreview ? 'Guardar en la vista previa' : 'Guardar mi negocio'}
      </motion.button>

      {props.modo === 'conectado' && <CerrarSesion onCerrarSesion={props.onCerrarSesion} />}
    </div>
  );
}

function CerrarSesion({ onCerrarSesion }: { onCerrarSesion: () => Promise<void> }) {
  const [saliendo, setSaliendo] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setSaliendo(true);
        await onCerrarSesion();
        setSaliendo(false);
      }}
      disabled={saliendo}
      className="self-center py-1 text-xs font-semibold text-texto-muted underline underline-offset-4 disabled:opacity-60"
    >
      Cerrar sesión
    </button>
  );
}
