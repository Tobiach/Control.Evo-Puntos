import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { BadgeCheck, Gift, ReceiptText, RotateCcw, Search, X } from 'lucide-react';
import type { Cliente, RubroData } from '../data/mockClientes';
import {
  buscarClientes,
  formatPuntos,
  proximaRecompensa,
  puntosPorMonto,
  soloDigitos,
} from '../lib/club';
import RoleBadge from './RoleBadge';

interface Props {
  data: RubroData;
  clientes: Cliente[];
  clienteActivo: Cliente | null;
  onAcreditar: (id: string, puntos: number) => void;
}

interface Resultado {
  clienteId: string;
  puntosGanados: number;
  totalAnterior: number;
}

export default function PasoCajero({ data, clientes, clienteActivo, onAcreditar }: Props) {
  const [montoDigitos, setMontoDigitos] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(clienteActivo?.id ?? null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const monto = Number(montoDigitos || '0');
  const puntosEstimados = puntosPorMonto(data, monto);
  const seleccionado = clientes.find((cliente) => cliente.id === seleccionadoId) ?? null;
  const sugerencias = buscarClientes(clientes, busqueda).slice(0, 4);
  const listo = monto > 0 && seleccionado !== null;

  const cobrar = () => {
    if (!listo || !seleccionado) return;
    onAcreditar(seleccionado.id, puntosEstimados);
    setResultado({
      clienteId: seleccionado.id,
      puntosGanados: puntosEstimados,
      totalAnterior: seleccionado.puntos,
    });
  };

  const otraVenta = () => {
    setMontoDigitos('');
    setResultado(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pb-4">
      <div>
        <RoleBadge icono={ReceiptText} texto="Paso 2 — Soy quien cobra" />
        <h2 className="mt-3 text-2xl font-black tracking-tight">Cobrás y sumás puntos</h2>
        <p className="mt-1 text-sm text-texto-muted">
          Esto ve tu {data.rubro === 'gastro' ? 'mozo' : 'cajero'} en cada cobro: los puntos suman
          solos y el sistema le sopla el próximo premio.
        </p>
      </div>

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
                Monto de la compra
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-borde bg-card px-4 py-3.5">
                <span className="text-base font-bold text-acento">{data.monedaPrefijo}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monto > 0 ? monto.toLocaleString(data.locale) : ''}
                  onChange={(evento) => setMontoDigitos(soloDigitos(evento.target.value))}
                  placeholder={data.montoEjemplo.toLocaleString(data.locale)}
                  className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-texto-muted/50"
                />
              </div>
              {puntosEstimados > 0 && (
                <p className="mt-1.5 text-xs font-semibold text-premio">
                  = {formatPuntos(puntosEstimados)} puntos para el cliente
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-widest text-texto-muted uppercase">
                Cliente
              </label>
              {seleccionado ? (
                <div className="flex items-center justify-between rounded-2xl border border-acento bg-card px-4 py-3">
                  <span>
                    <span className="block text-sm font-bold">{seleccionado.nombre}</span>
                    <span className="block text-xs text-texto-muted">
                      {seleccionado.telefono} · {formatPuntos(seleccionado.puntos)} pts
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSeleccionadoId(null);
                      setBusqueda('');
                    }}
                    aria-label="Cambiar cliente"
                    className="rounded-full bg-fondo p-1.5 text-texto-muted"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
                    <Search size={17} className="shrink-0 text-acento" />
                    <input
                      type="tel"
                      value={busqueda}
                      onChange={(evento) => setBusqueda(evento.target.value)}
                      placeholder="Teléfono o nombre"
                      className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {sugerencias.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => setSeleccionadoId(cliente.id)}
                        className="flex items-center justify-between rounded-xl border border-borde bg-fondo-medio px-4 py-2.5 text-left"
                      >
                        <span className="text-sm font-semibold">{cliente.nombre}</span>
                        <span className="text-xs text-texto-muted">{cliente.telefono}</span>
                      </button>
                    ))}
                    {sugerencias.length === 0 && (
                      <p className="px-1 text-xs text-texto-muted">
                        Sin coincidencias en la base de la demo.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={cobrar}
              disabled={!listo}
              className="mt-1 w-full rounded-2xl bg-acento py-4 text-base font-bold text-on-acento transition-opacity active:bg-acento-hover disabled:opacity-40"
            >
              Confirmar cobro
            </motion.button>
          </motion.div>
        ) : (
          <ResultadoCobro
            key="resultado"
            data={data}
            resultado={resultado}
            cliente={clientes.find((cliente) => cliente.id === resultado.clienteId) ?? null}
            onOtraVenta={otraVenta}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultadoCobro({
  data,
  resultado,
  cliente,
  onOtraVenta,
}: {
  data: RubroData;
  resultado: Resultado;
  cliente: Cliente | null;
  onOtraVenta: () => void;
}) {
  if (!cliente) return null;

  const totalNuevo = resultado.totalAnterior + resultado.puntosGanados;
  const desbloqueadas = data.recompensas.filter(
    (recompensa) => recompensa.pts > resultado.totalAnterior && recompensa.pts <= totalNuevo,
  );
  const proxima = proximaRecompensa(data.recompensas, totalNuevo);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col items-center gap-1 rounded-3xl border border-borde bg-card px-5 py-7 text-center shadow-lg">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-verde-ok/15 text-verde-ok"
        >
          <BadgeCheck size={26} />
        </motion.div>
        <p className="text-5xl font-black text-premio">
          +<ContadorPuntos hasta={resultado.puntosGanados} />
        </p>
        <p className="text-sm font-semibold text-texto-muted">puntos para {cliente.nombre}</p>
        <p className="mt-2 text-xs text-texto-muted">
          Nuevo saldo:{' '}
          <span className="font-bold text-texto">{formatPuntos(totalNuevo)} pts</span>
        </p>
      </div>

      {desbloqueadas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 260, damping: 20 }}
          className="flex items-center gap-3 rounded-2xl bg-verde-ok/15 px-4 py-3.5"
        >
          <Gift size={22} className="shrink-0 text-verde-ok" />
          <p className="text-sm leading-snug">
            ¡Desbloqueó{' '}
            <span className="font-black text-verde-ok">
              {desbloqueadas[desbloqueadas.length - 1].descripcion}
            </span>
            ! Avisale al cobrar.
          </p>
        </motion.div>
      )}

      {proxima && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
          className="flex items-center gap-3 rounded-2xl bg-premio-suave px-4 py-3.5"
        >
          <Gift size={22} className="shrink-0 text-acento" />
          <p className="text-sm leading-snug">
            Le faltan{' '}
            <span className="font-black text-acento">
              {formatPuntos(proxima.pts - totalNuevo)} pts
            </span>{' '}
            para: <span className="font-bold">{proxima.descripcion}</span>
          </p>
        </motion.div>
      )}

      <button
        type="button"
        onClick={onOtraVenta}
        className="inline-flex items-center justify-center gap-2 self-center text-xs font-semibold text-texto-muted underline underline-offset-4"
      >
        <RotateCcw size={13} />
        Cobrar otra venta
      </button>
    </motion.div>
  );
}

function ContadorPuntos({ hasta }: { hasta: number }) {
  const valor = useMotionValue(0);
  const redondeado = useTransform(valor, (actual) => formatPuntos(Math.round(actual)));

  useEffect(() => {
    const control = animate(valor, hasta, { duration: 0.9, ease: 'easeOut' });
    return () => control.stop();
  }, [hasta, valor]);

  return <motion.span>{redondeado}</motion.span>;
}
