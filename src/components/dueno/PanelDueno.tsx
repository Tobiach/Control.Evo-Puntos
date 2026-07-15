import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  ChevronLeft,
  Gift,
  Loader2,
  Pause,
  PauseCircle,
  Play,
  Save,
  Store,
  Users,
} from 'lucide-react';
import type { Recompensa } from '../../data/mockClientes';
import {
  cambiarEstadoNegocio,
  cargarClientesDelNegocio,
  cargarMetricas,
  cargarNegocioDelDueno,
  guardarNegocioYRecompensas,
  type ClienteDelNegocio,
  type DatosNegocioForm,
  type MetricasNegocio,
} from '../../lib/panelDueno';
import SeccionNegocio from './SeccionNegocio';
import SeccionRecompensas from './SeccionRecompensas';
import SeccionMetricas from './SeccionMetricas';
import SeccionClientes from './SeccionClientes';

type Seccion = 'negocio' | 'recompensas' | 'clientes' | 'metricas';

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
  activo: true,
};

const SECCIONES: { clave: Seccion; etiqueta: string; icono: typeof Store }[] = [
  { clave: 'negocio', etiqueta: 'Negocio', icono: Store },
  { clave: 'recompensas', etiqueta: 'Premios', icono: Gift },
  { clave: 'clientes', etiqueta: 'Clientes', icono: Users },
  { clave: 'metricas', etiqueta: 'Métricas', icono: BarChart3 },
];

export default function PanelDueno(props: Props) {
  const esPreview = props.modo === 'preview';
  const [seccion, setSeccion] = useState<Seccion>('negocio');
  const [negocio, setNegocio] = useState<DatosNegocioForm>(NEGOCIO_VACIO);
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);
  const [metricas, setMetricas] = useState<MetricasNegocio | null>(null);
  const [clientes, setClientes] = useState<ClienteDelNegocio[] | null>(null);
  const [clientesCargados, setClientesCargados] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(!esPreview);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
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

  // Lista de clientes (mini-CRM): se carga la primera vez que el dueño abre la pestaña.
  useEffect(() => {
    if (seccion !== 'clientes' || props.modo !== 'conectado' || !negocio.id || clientesCargados) return;
    let vivo = true;
    setCargandoClientes(true);
    cargarClientesDelNegocio(negocio.id).then((resultado) => {
      if (!vivo) return;
      if (resultado.ok) setClientes(resultado.valor);
      setClientesCargados(true);
      setCargandoClientes(false);
    });
    return () => {
      vivo = false;
    };
  }, [seccion, negocio.id, clientesCargados, props.modo]);

  const cambiarPausa = async (nuevoActivo: boolean) => {
    if (props.modo !== 'conectado' || !negocio.id) return;
    setCambiandoEstado(true);
    const resultado = await cambiarEstadoNegocio(negocio.id, nuevoActivo);
    setCambiandoEstado(false);
    if (!resultado.ok) {
      setAviso({ tipo: 'error', texto: 'No pudimos cambiar el estado. Revisá tu conexión e intentá de nuevo.' });
      return;
    }
    setNegocio((previo) => ({ ...previo, activo: nuevoActivo }));
    setAviso({
      tipo: 'ok',
      texto: nuevoActivo ? 'Tu club volvió a estar activo.' : 'Tu club quedó pausado.',
    });
  };

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

      {props.modo === 'conectado' && negocio.id && !negocio.activo && (
        <div className="flex items-start gap-3 rounded-2xl border border-rojo/40 bg-rojo/10 px-4 py-3">
          <PauseCircle size={18} className="mt-0.5 shrink-0 text-rojo" />
          <p className="text-sm leading-snug text-texto">
            <span className="font-bold">Tu club está pausado.</span> No aparece en el marketplace de
            los clientes. Reactivalo cuando quieras desde la pestaña “Negocio”.
          </p>
        </div>
      )}

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
        {seccion === 'negocio' && (
          <div className="flex flex-col gap-5">
            <SeccionNegocio negocio={negocio} onCambiar={cambiarNegocio} />
            {props.modo === 'conectado' && negocio.id && (
              <ControlPausa activo={negocio.activo} cambiando={cambiandoEstado} onCambiar={cambiarPausa} />
            )}
          </div>
        )}
        {seccion === 'clientes' && (
          <SeccionClientes clientes={clientes} cargando={cargandoClientes} esPreview={esPreview} />
        )}
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

function ControlPausa({
  activo,
  cambiando,
  onCambiar,
}: {
  activo: boolean;
  cambiando: boolean;
  onCambiar: (activo: boolean) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (!activo) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-rojo/40 bg-rojo/5 p-4">
        <p className="text-sm font-medium text-texto-muted">
          Tu club está pausado: no aparece en el marketplace. Reactivalo para que tus clientes vuelvan
          a verlo y sumar puntos.
        </p>
        <button
          type="button"
          onClick={() => onCambiar(true)}
          disabled={cambiando}
          className="flex items-center justify-center gap-2 rounded-2xl bg-verde-ok py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {cambiando ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Reactivar mi club
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-borde bg-card p-4">
      {!confirmando ? (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={cambiando}
          className="flex items-center justify-center gap-2 rounded-2xl border border-rojo/40 py-3 text-sm font-bold text-rojo disabled:opacity-60"
        >
          <Pause size={16} />
          Pausar mi club
        </button>
      ) : (
        <>
          <p className="text-sm leading-snug text-texto">
            Mientras esté pausado, tu club <span className="font-bold">no aparece en el marketplace</span>{' '}
            y nadie nuevo puede encontrarte. Los puntos ya cargados no se pierden. ¿Seguro?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={cambiando}
              className="flex-1 rounded-2xl border border-borde py-3 text-sm font-bold text-texto-muted disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onCambiar(false);
                setConfirmando(false);
              }}
              disabled={cambiando}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rojo py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {cambiando ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
              Sí, pausar
            </button>
          </div>
        </>
      )}
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
