import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Cake,
  Check,
  Crown,
  Gift,
  Loader2,
  Phone,
  Swords,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import type { Cliente, RubroData, Visita } from '../../data/mockClientes';
import { formatPuntos, nivelDe } from '../../lib/club';
import { lanzarConfetti } from '../../lib/confetti';
import { desafioSemanal, rankingGrupo } from '../../lib/social';
import SeccionReferidos from './SeccionReferidos';
import SeccionDesafios from './SeccionDesafios';

interface Props {
  data: RubroData;
  negocioId: string;
  cliente: Cliente;
  clientes: Cliente[];
  historial: Visita[];
  cumpleForzado: boolean;
  onToggleCumple: () => void;
  /** Real: pega contra el servidor y solo funciona con alguien del MISMO negocio. */
  onRegalar: (telefonoDestino: string, cantidad: number) => Promise<{ ok: boolean; error?: string }>;
}

interface Puesto {
  cliente: Cliente;
  posicion: number;
}

const MONTOS_REGALO = [50, 100, 200];

const ESTADO_DESAFIO: Record<string, { texto: string; clase: string }> = {
  'en-curso': { texto: 'En curso', clase: 'bg-premio-suave text-acento' },
  cumplido: { texto: 'Cumplido', clase: 'bg-verde-ok/15 text-verde-ok' },
  fallado: { texto: 'Fallado', clase: 'bg-rojo/15 text-rojo' },
};

export default function TabPerfil({
  data,
  negocioId,
  cliente,
  clientes,
  historial,
  cumpleForzado,
  onToggleCumple,
  onRegalar,
}: Props) {
  const [enRanking, setEnRanking] = useState(false);

  const grupo = rankingGrupo(negocioId, historial, cliente.nombre);
  const desafio = desafioSemanal(negocioId, historial);
  const nivelActual = nivelDe(data.niveles, cliente.puntos);
  const nivelMax = data.niveles[data.niveles.length - 1];
  const esVip = nivelActual.nombre === nivelMax.nombre;

  // Regalar puntos — real, solo a alguien que también es cliente de ESTE negocio.
  const [telefonoRegalo, setTelefonoRegalo] = useState('');
  const [montoRegalo, setMontoRegalo] = useState(MONTOS_REGALO[0]);
  const [regalado, setRegalado] = useState<{ monto: number } | null>(null);
  const [enviandoRegalo, setEnviandoRegalo] = useState(false);
  const [errorRegalo, setErrorRegalo] = useState<string | null>(null);

  const confirmarRegalo = async () => {
    if (montoRegalo > cliente.puntos || !telefonoRegalo.trim()) return;
    setEnviandoRegalo(true);
    setErrorRegalo(null);
    const resultado = await onRegalar(telefonoRegalo.trim(), montoRegalo);
    setEnviandoRegalo(false);
    if (!resultado.ok) {
      setErrorRegalo(resultado.error ?? 'No pudimos regalar los puntos.');
      return;
    }
    setRegalado({ monto: montoRegalo });
    setTelefonoRegalo('');
    lanzarConfetti();
  };

  const ranking = [...clientes].sort((a, b) => b.puntos - a.puntos);
  const miPosicion = ranking.findIndex((c) => c.id === cliente.id) + 1;
  const top: Puesto[] = ranking
    .slice(0, 4)
    .map((c, indice) => ({ cliente: c, posicion: indice + 1 }));
  const lista: Puesto[] = top.some((puesto) => puesto.cliente.id === cliente.id)
    ? top
    : [...top.slice(0, 3), { cliente, posicion: miPosicion }];

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <section>
        <p className="mb-2 text-xs font-bold tracking-widest text-texto-muted uppercase">Cuenta</p>
        <div className="rounded-3xl border border-borde bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-acento text-on-acento">
              <User size={22} />
            </div>
            <div>
              <p className="font-bold">{cliente.nombre}</p>
              <p className="flex items-center gap-1 text-xs text-texto-muted">
                <Phone size={12} /> {cliente.telefono}
              </p>
            </div>
          </div>
        </div>
      </section>

      {esVip && data.beneficiosVip && data.beneficiosVip.length > 0 && (
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-premio uppercase">
            <Crown size={13} /> Beneficios {nivelMax.nombre}
          </p>
          <div className="flex flex-col gap-2 rounded-3xl border border-borde bg-premio-suave p-4">
            <p className="text-sm font-bold text-acento">
              Sos nivel {nivelMax.nombre} en {data.nombreNegocio}
            </p>
            {data.beneficiosVip.map((beneficio) => (
              <div key={beneficio} className="flex items-start gap-2 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-acento" />
                <span className="leading-snug">{beneficio}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-texto-muted uppercase">
          <Users size={13} /> Tu grupo esta semana
        </p>
        <div className="flex flex-col gap-2 rounded-3xl border border-borde bg-card p-4">
          {grupo.map((puesto, indice) => (
            <div
              key={puesto.id}
              className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 ${
                puesto.esYo ? 'bg-premio-suave' : 'bg-fondo'
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`font-titulo text-sm font-bold ${
                    indice === 0 ? 'text-premio' : 'text-texto-muted'
                  }`}
                >
                  #{indice + 1}
                </span>
                <span className={`text-sm font-semibold ${puesto.esYo ? 'text-acento' : ''}`}>
                  {puesto.emoji} {puesto.nombre}
                  {puesto.esYo && ' · vos'}
                </span>
              </span>
              <span className="text-xs font-bold text-texto-muted">
                {formatPuntos(puesto.puntos)} pts
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-texto-muted uppercase">
          <Swords size={13} /> Desafío entre amigos
        </p>
        <div className="rounded-3xl border border-borde bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-snug font-semibold">
              {desafio.emoji} {desafio.descripcion}
            </p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
                ESTADO_DESAFIO[desafio.estado].clase
              }`}
            >
              {ESTADO_DESAFIO[desafio.estado].texto}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-bold text-texto">
              {desafio.progreso}/{desafio.objetivo} visitas
            </span>
            {desafio.estado === 'en-curso' && (
              <span className="text-texto-muted">Quedan {desafio.diasRestantes} días</span>
            )}
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-borde">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(desafio.progreso / desafio.objetivo) * 100}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full bg-acento"
            />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-texto-muted uppercase">
          <Gift size={13} /> Regalar puntos
        </p>
        <div className="rounded-3xl border border-borde bg-card p-4">
          <p className="text-sm text-texto-muted">
            Regalale puntos a alguien que también sea cliente de este negocio. Tenés{' '}
            <span className="font-bold text-texto">{formatPuntos(cliente.puntos)} pts</span>.
          </p>
          <label className="mt-3 flex items-center gap-3 rounded-2xl border border-borde bg-fondo px-4 py-3">
            <Phone size={16} className="shrink-0 text-texto-muted" />
            <input
              type="tel"
              value={telefonoRegalo}
              onChange={(e) => setTelefonoRegalo(e.target.value)}
              placeholder="Teléfono de tu amigo/a"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-texto-muted/60"
            />
          </label>
          <div className="mt-3 flex gap-2">
            {MONTOS_REGALO.map((monto) => {
              const alcanza = monto <= cliente.puntos;
              return (
                <button
                  key={monto}
                  type="button"
                  disabled={!alcanza}
                  onClick={() => setMontoRegalo(monto)}
                  className={`flex-1 rounded-2xl py-2 text-sm font-bold transition-colors ${
                    montoRegalo === monto && alcanza
                      ? 'bg-acento text-on-acento'
                      : alcanza
                        ? 'border border-borde bg-fondo text-texto'
                        : 'bg-borde text-texto-muted opacity-50'
                  }`}
                >
                  {monto} pts
                </button>
              );
            })}
          </div>
          {errorRegalo && <p className="mt-2 px-1 text-xs font-semibold text-rojo">{errorRegalo}</p>}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={montoRegalo > cliente.puntos || !telefonoRegalo.trim() || enviandoRegalo}
            onClick={confirmarRegalo}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover disabled:opacity-50"
          >
            {enviandoRegalo ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
            Regalar {montoRegalo} pts
          </motion.button>
        </div>
      </section>

      <SeccionReferidos negocioId={negocioId} data={data} cliente={cliente} />

      <SeccionDesafios negocioId={negocioId} data={data} />

      <section>
        <p className="mb-2 text-xs font-bold tracking-widest text-texto-muted uppercase">
          Permisos
        </p>
        <div className="rounded-3xl border border-borde bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="shrink-0 text-premio" />
              <p className="text-sm leading-snug font-semibold">
                Aparecer en el ranking de clientes frecuentes de este local
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enRanking}
              aria-label="Aparecer en el ranking"
              onClick={() => setEnRanking((valor) => !valor)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                enRanking ? 'bg-acento' : 'bg-borde'
              }`}
            >
              <motion.span
                animate={{ x: enRanking ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow"
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {enRanking && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-col gap-2 overflow-hidden"
              >
                {lista.map(({ cliente: c, posicion }) => {
                  const yo = c.id === cliente.id;
                  return (
                    <li
                      key={c.id}
                      className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 ${
                        yo ? 'bg-premio-suave' : 'bg-fondo'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`font-titulo text-sm font-bold ${
                            posicion <= 3 ? 'text-premio' : 'text-texto-muted'
                          }`}
                        >
                          #{posicion}
                        </span>
                        <span className={`text-sm font-semibold ${yo ? 'text-acento' : ''}`}>
                          {c.nombre}
                          {yo && ' · vos'}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-texto-muted">
                        {formatPuntos(c.puntos)} pts
                      </span>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </section>

      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={onToggleCumple}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-borde bg-card py-2.5 text-xs font-bold text-texto-muted"
        >
          <Cake size={14} /> {cumpleForzado ? 'Desactivar' : 'Simular'} “hoy es mi cumpleaños” (debug)
        </button>
      )}

      <AnimatePresence>
        {regalado && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRegalado(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 20 }}
              onClick={(evento) => evento.stopPropagation()}
              className="w-full max-w-xs rounded-3xl border border-white/10 bg-surface-dark p-6 text-center shadow-2xl"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-acento text-on-acento">
                <Gift size={30} strokeWidth={2.4} />
              </div>
              <h2 className="text-xl font-bold text-white">¡Regalo enviado!</h2>
              <p className="mt-1 text-sm text-white/60">
                Le regalaste <span className="font-bold text-acento">{regalado.monto} pts</span> a
                tu amigo/a en {data.nombreNegocio}.
              </p>
              <button
                type="button"
                onClick={() => setRegalado(null)}
                className="mt-5 w-full rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover"
              >
                Listo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
