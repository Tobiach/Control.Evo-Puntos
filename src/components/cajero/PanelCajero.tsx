import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, LogOut, Phone, ReceiptText, Sparkles } from 'lucide-react';
import type { Cliente, Recompensa, RubroData } from '../../data/mockClientes';
import { calcularPuntos, formatPuntos, soloDigitos } from '../../lib/club';
import { registrarCobro, type NegocioCajero } from '../../lib/panelCajero';
import FeedbackCobro from '../cobro/FeedbackCobro';

interface PropsConectado {
  modo: 'conectado';
  negocio: NegocioCajero;
  /** PIN validado en el login: se reenvía en cada cobro para autorizar del lado del servidor. */
  pin: string;
  onSalir: () => void;
}

interface PropsDemo {
  modo: 'demo';
  data: RubroData;
  onSalir: () => void;
}

type Props = PropsConectado | PropsDemo;

interface ConfigCobro {
  nombreNegocio: string;
  monedaPrefijo: string;
  montoPorPunto: number;
  locale: string;
  recompensas: Recompensa[];
}

interface Resultado {
  nombreCliente: string;
  puntosGanados: number;
  totalAnterior: number;
}

const clonarClientes = (data: RubroData): Cliente[] => data.clientes.map((cliente) => ({ ...cliente }));

export default function PanelCajero(props: Props) {
  const esDemo = props.modo === 'demo';
  const cfg: ConfigCobro =
    props.modo === 'conectado'
      ? {
          nombreNegocio: props.negocio.nombre,
          monedaPrefijo: props.negocio.monedaPrefijo,
          montoPorPunto: props.negocio.montoPorPunto,
          locale: props.negocio.locale,
          recompensas: props.negocio.recompensas,
        }
      : {
          nombreNegocio: props.data.nombreNegocio,
          monedaPrefijo: props.data.monedaPrefijo,
          montoPorPunto: props.data.montoPorPunto,
          locale: props.data.locale,
          recompensas: props.data.recompensas,
        };

  const [clientesDemo, setClientesDemo] = useState<Cliente[]>(() =>
    props.modo === 'demo' ? clonarClientes(props.data) : [],
  );
  const [telefono, setTelefono] = useState('');
  const [montoDigitos, setMontoDigitos] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monto = Number(montoDigitos || '0');
  const puntosEstimados = calcularPuntos(cfg.montoPorPunto, monto);
  const digitosTelefono = soloDigitos(telefono);
  const listo = monto > 0 && digitosTelefono.length >= 6;

  const cobrar = async () => {
    if (!listo || enviando) return;
    setError(null);

    if (props.modo === 'demo') {
      const existente = clientesDemo.find((cliente) => soloDigitos(cliente.telefono) === digitosTelefono);
      const totalAnterior = existente?.puntos ?? 0;
      const nombreCliente = existente?.nombre ?? `Cliente ${digitosTelefono.slice(-4)}`;
      setClientesDemo((previos) =>
        existente
          ? previos.map((cliente) =>
              cliente.id === existente.id
                ? { ...cliente, puntos: cliente.puntos + puntosEstimados, ultimaVisitaDias: 0 }
                : cliente,
            )
          : [
              ...previos,
              {
                id: `nuevo-${digitosTelefono}`,
                nombre: nombreCliente,
                telefono,
                puntos: puntosEstimados,
                ultimaVisitaDias: 0,
              },
            ],
      );
      setResultado({ nombreCliente, puntosGanados: puntosEstimados, totalAnterior });
      return;
    }

    setEnviando(true);
    const respuesta = await registrarCobro(props.negocio.id, props.pin, telefono, monto);
    setEnviando(false);
    if (!respuesta.ok) {
      setError(
        respuesta.error === 'pin-invalido'
          ? 'Tu PIN ya no autoriza este cobro. Volvé a ingresar.'
          : 'No pudimos registrar el cobro. Revisá tu conexión e intentá de nuevo.',
      );
      return;
    }
    setResultado({
      nombreCliente: respuesta.valor.clienteNombre,
      puntosGanados: respuesta.valor.puntosGanados,
      totalAnterior: respuesta.valor.puntosAnteriores,
    });
  };

  const otraVenta = () => {
    setMontoDigitos('');
    setTelefono('');
    setResultado(null);
    setError(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={props.onSalir}
          aria-label="Salir"
          className="rounded-full border border-borde bg-card p-2 text-texto-muted"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-black tracking-tight">Caja — {cfg.nombreNegocio}</h2>
          <p className="text-sm text-texto-muted">Cobrá y sumá puntos al cliente.</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-acento text-on-acento">
          <ReceiptText size={20} strokeWidth={2.2} />
        </span>
      </header>

      {esDemo && (
        <div className="flex items-center gap-2 rounded-2xl bg-premio-suave px-4 py-3 text-xs font-semibold text-acento">
          <Sparkles size={15} strokeWidth={2.5} />
          Modo demo — los cobros suman puntos solo en esta sesión, no se guardan.
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {!resultado ? (
          <motion.div
            key="formulario"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-widest text-texto-muted uppercase">
                Teléfono del cliente
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
                <Phone size={17} className="shrink-0 text-acento" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={telefono}
                  onChange={(evento) => setTelefono(evento.target.value)}
                  placeholder="Ej: 11 5320-4471"
                  className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-widest text-texto-muted uppercase">
                Monto de la compra
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-borde bg-card px-4 py-3.5">
                <span className="text-base font-bold text-acento">{cfg.monedaPrefijo}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monto > 0 ? monto.toLocaleString(cfg.locale) : ''}
                  onChange={(evento) => setMontoDigitos(soloDigitos(evento.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-texto-muted/50"
                />
              </div>
              {puntosEstimados > 0 && (
                <p className="mt-1.5 text-xs font-semibold text-premio">
                  = {formatPuntos(puntosEstimados)} puntos para el cliente
                </p>
              )}
            </div>

            {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={cobrar}
              disabled={!listo || enviando}
              className="mt-1 w-full rounded-2xl bg-acento py-4 text-base font-bold text-on-acento transition-opacity active:bg-acento-hover disabled:opacity-40"
            >
              {enviando ? 'Registrando…' : 'Confirmar cobro'}
            </motion.button>
          </motion.div>
        ) : (
          <FeedbackCobro
            key="resultado"
            nombreCliente={resultado.nombreCliente}
            puntosGanados={resultado.puntosGanados}
            totalAnterior={resultado.totalAnterior}
            recompensas={cfg.recompensas}
            onOtraVenta={otraVenta}
          />
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={props.onSalir}
        className="mt-auto inline-flex items-center justify-center gap-2 self-center py-1 text-xs font-semibold text-texto-muted underline underline-offset-4"
      >
        <LogOut size={13} />
        {esDemo ? 'Salir del modo demo' : 'Cerrar caja'}
      </button>
    </div>
  );
}
