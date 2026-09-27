import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, RotateCw } from 'lucide-react';
import { formatCuentaRegresiva } from '../../lib/club';
import { lanzarConfetti } from '../../lib/confetti';
import { sonidoRuletaGirando } from '../../lib/sonidos';
import { estadoCooldown, PREMIOS_RULETA, type PremioRuleta } from '../../lib/ruleta';
import type { PremioGanado, ResultadoTirada } from '../../lib/panelCliente';

interface Props {
  /** Timestamp de la última tirada en ESTE negocio (para el cooldown de 7 días). */
  ultimaTiradaTs?: number;
  /**
   * Gira: el padre decide si es local (demo, sin backend) o real (RPC `girar_ruleta`, 0026) y
   * devuelve el premio que efectivamente salió + el código para el mostrador. El componente
   * nunca elige el premio, solo anima la rueda hasta la porción que ya ganó.
   */
  onGirar: () => Promise<ResultadoTirada>;
  /** Pool de premios del negocio (ver `premios_ruleta`). Vacío/undefined = pool global genérico. */
  premios?: PremioRuleta[];
}

const DURACION_MS = 3400;
const RADIO_EMOJI = 66;

/** Un color fijo por porción, alternados para que se distingan bien al girar. */
const COLORES = ['#C9973A', '#8B5CF6', '#EC4899', '#0EA5E9', '#F97316', '#10B981', '#E5B860', '#6366F1'];

export default function RuletaSemanal({ ultimaTiradaTs, onGirar, premios }: Props) {
  const [rotacion, setRotacion] = useState(0);
  const [girando, setGirando] = useState(false);
  const [premio, setPremio] = useState<PremioGanado | null>(null);
  const [codigo, setCodigo] = useState<{ valor: string; expiraAtMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const ruedaRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const pool = premios && premios.length > 0 ? premios : PREMIOS_RULETA;
  const gradosPorPorcion = 360 / pool.length;
  const gradiente = useMemo(
    () =>
      `conic-gradient(${pool
        .map((_, i) => `${COLORES[i % COLORES.length]} ${i * gradosPorPorcion}deg ${(i + 1) * gradosPorPorcion}deg`)
        .join(', ')})`,
    [pool, gradosPorPorcion],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  // Cuenta regresiva en vivo mientras el código sigue esperando al cajero.
  useEffect(() => {
    if (!codigo) return;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [codigo]);

  const estado = estadoCooldown(ultimaTiradaTs);
  const enCooldown = !girando && !premio && !estado.puedeGirar;

  const girar = async () => {
    if (girando || premio || !estado.puedeGirar) return;
    setError(null);
    setGirando(true);
    const resultado = await onGirar();
    if (!resultado.ok) {
      setGirando(false);
      setError(resultado.error);
      return;
    }

    sonidoRuletaGirando(DURACION_MS);
    // Alinea el centro de la porción ganadora (la que devolvió el server) bajo el puntero de
    // arriba, + 5 vueltas enteras. Si el id no está en el pool local (no debería pasar: el
    // server usa exactamente este mismo pool), cae en la porción 0 en vez de romper.
    const indice = Math.max(0, pool.findIndex((p) => p.id === resultado.premio.id));
    const destino = 360 - (indice * gradosPorPorcion + gradosPorPorcion / 2);
    setRotacion((previa) => previa - (previa % 360) + 360 * 5 + destino);

    timer.current = setTimeout(() => {
      setGirando(false);
      setPremio(resultado.premio);
      setCodigo({ valor: resultado.codigo, expiraAtMs: new Date(resultado.expiraAt).getTime() });
      setAhora(Date.now());
      if (resultado.premio.bueno) {
        const caja = ruedaRef.current?.getBoundingClientRect();
        if (caja) {
          lanzarConfetti({
            x: (caja.left + caja.width / 2) / window.innerWidth,
            y: (caja.top + caja.height / 2) / window.innerHeight,
          });
        }
      }
    }, DURACION_MS);
  };

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <RotateCw size={16} className="text-premio" />
        <p className="text-sm font-bold">Ruleta semanal</p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-3xl border border-borde bg-card p-6">
        <div ref={ruedaRef} className="relative h-[168px] w-[168px]">
          {/* Puntero */}
          <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2">
            <div className="h-0 w-0 border-x-8 border-t-[14px] border-x-transparent border-t-acento" />
          </div>

          <motion.div
            animate={{ rotate: rotacion }}
            transition={{ duration: DURACION_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full w-full rounded-full border-4 border-card shadow-inner"
            style={{ background: gradiente }}
          >
            {pool.map((p, i) => {
              const angulo = i * gradosPorPorcion + gradosPorPorcion / 2;
              return (
                <span
                  key={p.id}
                  className="absolute top-1/2 left-1/2 text-lg"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angulo}deg) translateY(-${RADIO_EMOJI}px) rotate(${-angulo}deg)`,
                  }}
                >
                  {p.emoji}
                </span>
              );
            })}
          </motion.div>

          {/* Eje central */}
          <div className="absolute top-1/2 left-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-acento" />
        </div>

        {premio && codigo ? (
          <div className="w-full text-center">
            <span className="text-3xl">{premio.emoji}</span>
            <p className="text-lg font-bold text-acento">{premio.label}</p>
            <p className="mt-2 text-[11px] font-semibold text-texto-muted">
              Mostrá este código en la caja
            </p>
            <p className="font-titulo mt-1 text-3xl leading-none font-black tracking-[0.15em] text-texto">
              {codigo.valor}
            </p>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-bold text-texto-muted">
              <Clock size={12} /> {formatCuentaRegresiva(Math.max(0, codigo.expiraAtMs - ahora))}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-texto-muted">
              Volvé en {estado.diasRestantes} {estado.diasRestantes === 1 ? 'día' : 'días'} para girar de nuevo.
            </p>
          </div>
        ) : enCooldown ? (
          <p className="text-center text-sm leading-snug text-texto-muted">
            Ya giraste esta semana. Volvé en{' '}
            <span className="font-bold text-texto">
              {estado.diasRestantes} {estado.diasRestantes === 1 ? 'día' : 'días'}
            </span>{' '}
            para tu próxima tirada.
          </p>
        ) : (
          <>
            {error && <p className="text-center text-xs font-semibold text-rojo">{error}</p>}
            <p className="text-center text-xs text-texto-muted">
              Girás gratis una vez por semana. Hay desde puntos de regalo hasta el premio mayor.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={girar}
              disabled={girando}
              className="flex w-full items-center justify-center gap-2 rounded-3xl bg-acento py-3.5 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-70"
            >
              <RotateCw size={18} strokeWidth={2.4} className={girando ? 'animate-spin' : ''} />
              {girando ? 'Girando…' : 'Girar la ruleta'}
            </motion.button>
          </>
        )}
      </div>
    </section>
  );
}
