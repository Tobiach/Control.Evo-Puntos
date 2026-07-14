import { motion } from 'motion/react';
import { Coins } from 'lucide-react';
import type { Cliente, RubroData, Visita } from '../../data/mockClientes';
import {
  fechaDeVisita,
  formatMonto,
  formatPuntos,
  progresoNivel,
  ultimos7Dias,
} from '../../lib/club';
import { insigniasDeNegocio } from '../../lib/misiones';
import Insignias from './Insignias';

interface Props {
  data: RubroData;
  cliente: Cliente;
  historial: Visita[];
}

const RADIO = 52;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export default function TabActividad({ data, cliente, historial }: Props) {
  const { actual, siguiente, pct } = progresoNivel(data.niveles, cliente.puntos);
  const dias = ultimos7Dias(historial);
  const maxPuntos = Math.max(1, ...dias.map((dia) => dia.puntos));
  const offset = CIRCUNFERENCIA - (pct / 100) * CIRCUNFERENCIA;
  const insignias = insigniasDeNegocio(data, historial);

  return (
    <div className="flex flex-col gap-6 px-5 pt-6">
      <h1 className="font-titulo text-2xl font-bold">Tu actividad</h1>

      <div className="flex flex-col items-center rounded-3xl border border-borde bg-card p-6">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={RADIO} fill="none" stroke="var(--color-borde)" strokeWidth="12" />
            <motion.circle
              cx="60"
              cy="60"
              r={RADIO}
              fill="none"
              stroke="var(--color-acento)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={CIRCUNFERENCIA}
              initial={{ strokeDashoffset: CIRCUNFERENCIA }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-titulo text-3xl font-bold text-texto">{pct}%</span>
            <span className="text-[11px] font-semibold text-texto-muted">
              a {siguiente ? siguiente.nombre : 'máximo'}
            </span>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-texto-muted">
          {siguiente ? (
            <>
              Te faltan{' '}
              <span className="font-bold text-acento">
                {formatPuntos(siguiente.min - cliente.puntos)} pts
              </span>{' '}
              para <span className="font-bold text-texto">{siguiente.nombre}</span>
            </>
          ) : (
            <>
              Alcanzaste el nivel <span className="font-bold text-premio">{actual.nombre}</span>
            </>
          )}
        </p>
      </div>

      <div className="rounded-3xl border border-borde bg-card p-5">
        <p className="text-sm font-bold">Últimos 7 días 🔥</p>
        <p className="text-xs text-texto-muted">Puntos ganados por día</p>
        <div className="mt-4 flex h-28 items-end justify-between gap-2">
          {dias.map((dia, indice) => (
            <div key={indice} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(dia.puntos / maxPuntos) * 100}%` }}
                  transition={{ delay: indice * 0.05, duration: 0.5, ease: 'easeOut' }}
                  className={`w-full rounded-t-lg ${dia.puntos > 0 ? 'bg-acento' : 'bg-borde'}`}
                  style={{ minHeight: dia.puntos > 0 ? '10%' : '4px' }}
                />
              </div>
              <span
                className={`text-[10px] font-bold ${dia.esHoy ? 'text-acento' : 'text-texto-muted'}`}
              >
                {dia.etiqueta}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Insignias insignias={insignias} />

      <div>
        <p className="mb-2 text-sm font-bold">Historial de visitas</p>
        <div className="flex flex-col gap-2">
          {historial.map((visita, indice) => (
            <motion.div
              key={indice}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: indice * 0.04 }}
              className="flex items-center justify-between rounded-2xl border border-borde bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-premio-suave text-acento">
                  <Coins size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold capitalize">
                    {fechaDeVisita(visita.diasAtras, data.locale)}
                  </p>
                  <p className="text-xs text-texto-muted">{formatMonto(data, visita.monto)}</p>
                </div>
              </div>
              <span className="font-titulo text-sm font-bold text-premio">
                +{formatPuntos(visita.puntos)} pts
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
