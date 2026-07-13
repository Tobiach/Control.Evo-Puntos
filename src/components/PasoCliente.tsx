import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Gift, Phone, Sparkles, Star, User } from 'lucide-react';
import type { Cliente, NombreNivel, RubroData } from '../data/mockClientes';
import { buscarClientes, formatPuntos, progresoNivel, proximaRecompensa } from '../lib/club';
import RoleBadge from './RoleBadge';

interface Props {
  data: RubroData;
  clientes: Cliente[];
  clienteActivo: Cliente | null;
  onSeleccionar: (id: string | null) => void;
}

const ICONO_NIVEL: Record<NombreNivel, typeof Star> = {
  Nuevo: Sparkles,
  Frecuente: Star,
  VIP: Crown,
};

export default function PasoCliente({ data, clientes, clienteActivo, onSeleccionar }: Props) {
  const [telefono, setTelefono] = useState('');
  const sugerencias = buscarClientes(clientes, telefono);

  return (
    <div className="flex flex-1 flex-col gap-5 pb-4">
      <div>
        <RoleBadge icono={User} texto="Paso 1 — Soy el cliente" />
        <h2 className="mt-3 text-2xl font-black tracking-tight">
          {clienteActivo ? 'Tu tarjeta de socio' : `Entrá al club de ${data.nombreNegocio}`}
        </h2>
        <p className="mt-1 text-sm text-texto-muted">
          {clienteActivo
            ? 'Esto ve tu cliente cada vez que abre la app.'
            : 'Tu cliente entra solo con su teléfono. Sin contraseñas, sin fricción.'}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!clienteActivo ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3"
          >
            <label className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
              <Phone size={18} className="shrink-0 text-acento" />
              <input
                type="tel"
                value={telefono}
                onChange={(evento) => setTelefono(evento.target.value)}
                placeholder={`Ej: ${data.clientes[0].telefono}`}
                className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
              />
            </label>

            <p className="text-xs font-semibold tracking-widest text-texto-muted uppercase">
              Clientes de la demo — tocá uno
            </p>
            <div className="flex flex-col gap-2">
              {sugerencias.map((cliente) => (
                <motion.button
                  key={cliente.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSeleccionar(cliente.id)}
                  className="flex items-center justify-between rounded-xl border border-borde bg-fondo-medio px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-bold">{cliente.nombre}</span>
                    <span className="block text-xs text-texto-muted">{cliente.telefono}</span>
                  </span>
                  <span className="text-xs font-bold text-premio">
                    {formatPuntos(cliente.puntos)} pts
                  </span>
                </motion.button>
              ))}
              {sugerencias.length === 0 && (
                <p className="rounded-xl border border-borde bg-fondo-medio px-4 py-3 text-sm text-texto-muted">
                  No hay socios con ese teléfono en la demo.
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <TarjetaSocio
            key="tarjeta"
            data={data}
            cliente={clienteActivo}
            onCambiar={() => onSeleccionar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TarjetaSocio({
  data,
  cliente,
  onCambiar,
}: {
  data: RubroData;
  cliente: Cliente;
  onCambiar: () => void;
}) {
  const { actual, siguiente, pct } = progresoNivel(data.niveles, cliente.puntos);
  const recompensa = proximaRecompensa(data.recompensas, cliente.puntos);
  const IconoNivel = ICONO_NIVEL[actual.nombre];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="flex flex-col gap-4"
    >
      <div className="overflow-hidden rounded-3xl border border-borde bg-card shadow-lg">
        <div className="flex items-center justify-between bg-acento px-5 py-3 text-on-acento">
          <span className="text-xs font-black tracking-widest uppercase">{data.nombreNegocio}</span>
          <span className="text-[11px] font-semibold opacity-80">Club de Puntos</span>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black">{cliente.nombre}</p>
              <p className="text-xs text-texto-muted">{cliente.telefono}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-premio-suave px-3 py-1.5 text-xs font-bold text-premio">
              <IconoNivel size={13} strokeWidth={2.5} />
              {actual.nombre}
            </span>
          </div>

          <div>
            <p className="text-4xl font-black text-premio">
              {formatPuntos(cliente.puntos)}
              <span className="ml-2 text-base font-semibold text-texto-muted">puntos</span>
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-texto-muted">
                {siguiente ? `Camino a ${siguiente.nombre}` : 'Nivel máximo alcanzado'}
              </span>
              {siguiente && (
                <span className="font-bold text-acento">
                  {formatPuntos(siguiente.min - cliente.puntos)} pts más
                </span>
              )}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-borde">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-acento"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-premio-suave px-4 py-3.5">
            <Gift size={22} className="shrink-0 text-acento" />
            {recompensa ? (
              <p className="text-sm leading-snug">
                Te faltan{' '}
                <span className="font-black text-acento">
                  {formatPuntos(recompensa.pts - cliente.puntos)} pts
                </span>{' '}
                para: <span className="font-bold">{recompensa.descripcion}</span>
              </p>
            ) : (
              <p className="text-sm leading-snug font-bold">
                ¡Ya podés canjear todas las recompensas del club!
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCambiar}
        className="self-center text-xs font-semibold text-texto-muted underline underline-offset-4"
      >
        Probar con otro cliente
      </button>
    </motion.div>
  );
}
