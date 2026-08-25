import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, Loader2, Lock, Wallet } from 'lucide-react';
import type {
  CategoriaRecompensa,
  Cliente,
  Recompensa,
  RubroData,
} from '../../data/mockClientes';
import {
  colorBarraProgreso,
  formatCuentaRegresiva,
  formatMonto,
  formatPuntos,
  type ResultadoCanje,
} from '../../lib/club';

interface Props {
  data: RubroData;
  cliente: Cliente;
  onCanjear: (recompensa: Recompensa) => Promise<ResultadoCanje>;
}

type Filtro = 'Todas' | CategoriaRecompensa;

interface CanjeActivo {
  descripcion: string;
  codigo: string;
  expiraAtMs: number;
}

export default function TabRecompensas({ data, cliente, onCanjear }: Props) {
  const filtros = useMemo<Filtro[]>(() => {
    const categorias = new Set<CategoriaRecompensa>();
    data.recompensas.forEach((recompensa) => categorias.add(recompensa.categoria));
    return ['Todas', ...categorias];
  }, [data]);

  const [filtro, setFiltro] = useState<Filtro>('Todas');
  const [canjeando, setCanjeando] = useState<string | null>(null);
  const [errorCanje, setErrorCanje] = useState<string | null>(null);
  const [canjeActivo, setCanjeActivo] = useState<CanjeActivo | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  // Cuenta regresiva en vivo mientras hay un canje esperando confirmación del cajero.
  useEffect(() => {
    if (!canjeActivo) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [canjeActivo]);

  const visibles = data.recompensas.filter(
    (recompensa) => filtro === 'Todas' || recompensa.categoria === filtro,
  );

  const restanteMs = canjeActivo ? Math.max(0, canjeActivo.expiraAtMs - ahora) : 0;
  const expirado = canjeActivo !== null && restanteMs <= 0;

  const canjear = async (recompensa: Recompensa) => {
    if (canjeando) return;
    setErrorCanje(null);
    setCanjeando(recompensa.descripcion);
    const resultado = await onCanjear(recompensa);
    setCanjeando(null);
    if (!resultado.ok) {
      setErrorCanje(resultado.error);
      return;
    }
    setAhora(Date.now());
    setCanjeActivo({
      descripcion: recompensa.descripcion,
      codigo: resultado.codigo,
      expiraAtMs: new Date(resultado.expiraAt).getTime(),
    });
  };

  return (
    <div className="flex flex-col gap-4 px-5 pt-6">
      <div>
        <h1 className="text-2xl font-bold">Recompensas 🎁</h1>
        <p className="mt-0.5 text-sm text-texto-muted">Canjeá tus puntos en {data.nombreNegocio}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtros.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFiltro(cat)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filtro === cat
                ? 'bg-acento text-on-acento'
                : 'border border-borde bg-card text-texto-muted'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {errorCanje && (
        <p className="rounded-2xl border border-rojo/30 bg-rojo/10 px-4 py-3 text-sm font-semibold text-rojo">
          {errorCanje}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {visibles.map((recompensa, indice) => {
          const puede = cliente.puntos >= recompensa.pts;
          const faltan = recompensa.pts - cliente.puntos;
          const enCurso = canjeando === recompensa.descripcion;
          const pct = Math.min(100, Math.round((cliente.puntos / recompensa.pts) * 100));
          return (
            <motion.div
              key={recompensa.descripcion}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: indice * 0.04 }}
              className={`flex flex-col gap-3 rounded-3xl border p-4 ${
                puede ? 'border-premio/40 bg-premio-suave/30' : 'border-borde bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span className="inline-block rounded-full bg-premio-suave px-2 py-0.5 text-[10px] font-bold tracking-wide text-acento uppercase">
                      {recompensa.categoria}
                    </span>
                    {recompensa.costoDinero !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-acento/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-acento uppercase">
                        <Wallet size={10} /> Combo
                      </span>
                    )}
                    {puede && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-premio px-2 py-0.5 text-[10px] font-bold tracking-wide text-on-acento uppercase">
                        <Check size={10} strokeWidth={3} /> ¡Disponible!
                      </span>
                    )}
                  </span>
                  <p className="mt-1.5 text-sm leading-snug font-bold">{recompensa.descripcion}</p>
                  <p className="mt-0.5 font-titulo text-lg font-bold text-premio">
                    {formatPuntos(recompensa.pts)} pts
                    {recompensa.costoDinero !== undefined && (
                      <span className="ml-1 text-sm font-bold text-acento">
                        + {formatMonto(data, recompensa.costoDinero)}
                      </span>
                    )}
                  </p>
                  {recompensa.costoDinero !== undefined && (
                    <p className="text-[11px] font-semibold text-texto-muted">
                      Canje con puntos + un poco de plata
                    </p>
                  )}
                </div>
                {!puede && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-borde text-texto-muted">
                    <Lock size={15} />
                  </div>
                )}
              </div>

              {!puede && (
                <div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-borde">
                    <div
                      className={`h-full rounded-full ${colorBarraProgreso(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold text-texto-muted">
                    Te faltan {formatPuntos(faltan)} pts{pct >= 80 ? ' · ¡Ya casi!' : ''}
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={!puede || canjeando !== null}
                onClick={() => canjear(recompensa)}
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold tracking-wide ${
                  puede
                    ? 'bg-acento text-on-acento active:bg-acento-hover'
                    : 'bg-borde text-texto-muted'
                } disabled:opacity-60`}
              >
                {enCurso ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : puede ? (
                  'CANJEAR AHORA'
                ) : (
                  <>
                    <Lock size={14} /> Bloqueado
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {canjeActivo && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => expirado && setCanjeActivo(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 20 }}
              onClick={(evento) => evento.stopPropagation()}
              className="w-full max-w-xs rounded-3xl border border-white/10 bg-surface-dark p-6 text-center shadow-2xl"
            >
              {expirado ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white/70"
                  >
                    <Clock size={30} />
                  </motion.div>
                  <h2 className="text-xl font-bold text-white">Código expirado</h2>
                  <p className="mt-1 text-sm text-white/60">
                    Pasaron los 10 minutos. Volvé a intentarlo desde la lista de premios.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCanjeActivo(null)}
                    className="mt-5 w-full rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover"
                  >
                    Entendido
                  </button>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-verde-ok text-white"
                  >
                    <Check size={32} strokeWidth={3} />
                  </motion.div>
                  <p className="text-xs text-white/60">Mostrá este código al cajero para reclamar tu premio</p>
                  <p className="font-titulo mt-3 text-[48px] leading-none font-black tracking-[0.15em] text-white">
                    {canjeActivo.codigo}
                  </p>
                  <p className="mt-3 rounded-2xl bg-premio-suave px-4 py-3 text-sm font-bold text-acento">
                    {canjeActivo.descripcion}
                  </p>
                  <p className="mt-2 text-xs text-white/60">{data.nombreNegocio}</p>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-white/80">
                    <Clock size={14} /> {formatCuentaRegresiva(restanteMs)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCanjeActivo(null)}
                    className="mt-5 w-full rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover"
                  >
                    Listo
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
