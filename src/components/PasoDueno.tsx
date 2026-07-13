import { motion } from 'motion/react';
import { BarChart3, Coins, Gift, TrendingUp, UserX } from 'lucide-react';
import type { Cliente, RubroData } from '../data/mockClientes';
import { esInactivo, formatPuntos, recompensaMasCercana } from '../lib/club';
import RoleBadge from './RoleBadge';

interface Props {
  data: RubroData;
  clientes: Cliente[];
  puntosSesion: number;
}

const aparicion = (orden: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.1 + orden * 0.1, duration: 0.3 },
});

export default function PasoDueno({ data, clientes, puntosSesion }: Props) {
  const inactivos = clientes.filter(esInactivo);
  const cercana = recompensaMasCercana(clientes, data.recompensas);
  const puntosSemana = data.metricasSemana.puntosAcreditados + puntosSesion;

  return (
    <div className="flex flex-1 flex-col gap-5 pb-4">
      <div>
        <RoleBadge icono={BarChart3} texto="Paso 3 — Soy el dueño" />
        <h2 className="mt-3 text-2xl font-black tracking-tight">Tu semana, de un vistazo</h2>
        <p className="mt-1 text-sm text-texto-muted">
          Sin planillas: {data.nombreNegocio} ve quién vuelve, quién no, y quién está por canjear.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          {...aparicion(0)}
          className="rounded-2xl border border-borde bg-card px-4 py-4 shadow-sm"
        >
          <Coins size={19} className="mb-2 text-premio" />
          <p className="text-2xl font-black">{formatPuntos(puntosSemana)}</p>
          <p className="mt-0.5 text-xs leading-tight text-texto-muted">
            puntos acreditados esta semana
          </p>
        </motion.div>

        <motion.div
          {...aparicion(1)}
          className="rounded-2xl border border-borde bg-card px-4 py-4 shadow-sm"
        >
          <TrendingUp size={19} className="mb-2 text-verde-ok" />
          <p className="text-2xl font-black">{data.metricasSemana.subieronDeNivel}</p>
          <p className="mt-0.5 text-xs leading-tight text-texto-muted">
            clientes subieron de nivel
          </p>
        </motion.div>
      </div>

      <motion.div
        {...aparicion(2)}
        className="rounded-2xl border border-borde bg-card px-4 py-4 shadow-sm"
      >
        <div className="mb-3 flex items-center gap-2">
          <UserX size={19} className="text-rojo" />
          <p className="text-sm font-bold">
            {inactivos.length} clientes inactivos
            <span className="ml-1.5 font-medium text-texto-muted">para recuperar</span>
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {inactivos.map((cliente) => (
            <li
              key={cliente.id}
              className="flex items-center justify-between rounded-xl bg-fondo px-3.5 py-2.5"
            >
              <span className="text-sm font-semibold">{cliente.nombre}</span>
              <span className="text-xs font-medium text-rojo">
                hace {cliente.ultimaVisitaDias} días que no viene
              </span>
            </li>
          ))}
        </ul>
      </motion.div>

      {cercana && (
        <motion.div {...aparicion(3)} className="rounded-2xl bg-premio-suave px-4 py-4">
          <div className="mb-1.5 flex items-center gap-2">
            <Gift size={19} className="text-acento" />
            <p className="text-sm font-bold">Próximo canje en puerta</p>
          </div>
          <p className="text-sm leading-snug">
            A <span className="font-bold">{cercana.cliente.nombre}</span> le faltan{' '}
            <span className="font-black text-acento">{formatPuntos(cercana.faltan)} pts</span> para:{' '}
            <span className="font-bold">{cercana.recompensa.descripcion}</span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
