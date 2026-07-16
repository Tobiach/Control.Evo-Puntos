import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Send, Swords, Target } from 'lucide-react';
import type { RubroData } from '../../data/mockClientes';
import { lanzarConfetti } from '../../lib/confetti';
import { supabaseEnabled } from '../../lib/supabase';
import {
  OPCIONES_META,
  PUNTOS_BONUS_DESAFIO,
  crearDesafio,
  describirMeta,
  diasRestantes,
  mensajeMotivo,
  pctProgreso,
  revisarDesafios,
  unidadProgreso,
  type DesafioItem,
  type EstadoDesafios,
  type OpcionMeta,
} from '../../lib/desafios';

interface Props {
  negocioId: string;
  data: RubroData;
}

const BADGE_ESTADO: Record<string, { texto: string; clase: string }> = {
  'en-curso': { texto: 'En curso', clase: 'bg-premio-suave text-acento' },
  cumplido: { texto: 'Cumplido', clase: 'bg-verde-ok/15 text-verde-ok' },
  vencido: { texto: 'Vencido', clase: 'bg-rojo/15 text-rojo' },
};

function FilaDesafio({ item, rol }: { item: DesafioItem; rol: 'retador' | 'retado' }) {
  const badge = BADGE_ESTADO[item.estado] ?? BADGE_ESTADO['en-curso'];
  const encabezado =
    rol === 'retador'
      ? `Retaste a ${item.otroNombre}`
      : `${item.otroNombre} te desafió`;
  return (
    <div className="rounded-2xl bg-fondo p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-snug font-semibold text-texto">
          {encabezado} a {describirMeta(item.tipo, item.meta)}
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${badge.clase}`}
        >
          {badge.texto}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-bold text-texto">
          {item.progreso}/{item.meta} {unidadProgreso(item.tipo)}
        </span>
        {item.estado === 'en-curso' && (
          <span className="text-texto-muted">Quedan {diasRestantes(item.venceAt)} días</span>
        )}
      </div>
      {!item.premiado && (
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-borde">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctProgreso(item.progreso, item.meta)}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full bg-acento"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Desafiá a un amigo con beneficio REAL: retás a otro cliente del local (por su código) a cumplir
 * una meta contable (visitas / probar el producto nuevo). Cuando la cumple, ambos ganan
 * PUNTOS_BONUS_DESAFIO pts — verificado server-side (RPC SECURITY DEFINER, migración 0009).
 * Sólo se muestra con backend conectado: sin servidor no hay forma de verificar ni premiar de
 * verdad (la sección mock "Desafío entre amigos" de TabPerfil cubre la narrativa en demo).
 */
export default function SeccionDesafios({ negocioId, data }: Props) {
  const [estado, setEstado] = useState<EstadoDesafios | null>(null);
  const [codigo, setCodigo] = useState('');
  const [opcion, setOpcion] = useState<OpcionMeta>(OPCIONES_META[0]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const yaAvisado = useRef<Set<number>>(new Set());

  const recargar = async () => {
    const est = await revisarDesafios(negocioId);
    if (!est) return;
    setEstado(est);
    // Confetti la primera vez que se detecta un desafío recién premiado.
    const gano = [...est.enviados, ...est.recibidos].some(
      (d) => d.premiadoAhora && !yaAvisado.current.has(d.id),
    );
    for (const d of [...est.enviados, ...est.recibidos]) {
      if (d.premiadoAhora) yaAvisado.current.add(d.id);
    }
    if (gano) lanzarConfetti();
  };

  useEffect(() => {
    if (!supabaseEnabled) return;
    let activo = true;
    revisarDesafios(negocioId).then((est) => {
      if (!activo || !est) return;
      setEstado(est);
      if ([...est.enviados, ...est.recibidos].some((d) => d.premiadoAhora)) lanzarConfetti();
    });
    return () => {
      activo = false;
    };
  }, [negocioId]);

  // Sin backend no hay verificación real posible: la narrativa demo la cubre TabPerfil.
  if (!supabaseEnabled) return null;

  const enviar = async () => {
    if (!codigo.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    const res = await crearDesafio(codigo, negocioId, opcion);
    setEnviando(false);
    if (res && res.ok) {
      setCodigo('');
      setExito(true);
      window.setTimeout(() => setExito(false), 2500);
      await recargar();
    } else if (res) {
      setError(mensajeMotivo(res.motivo));
    }
  };

  const enviados = estado?.enviados ?? [];
  const recibidos = estado?.recibidos ?? [];
  const bonus = estado?.bonus ?? PUNTOS_BONUS_DESAFIO;
  const hayDesafios = enviados.length > 0 || recibidos.length > 0;

  return (
    <section>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-texto-muted uppercase">
        <Swords size={13} /> Desafiá a un amigo
      </p>
      <div className="rounded-3xl border border-borde bg-card p-5">
        <p className="text-sm text-texto-muted">
          Retá a un amigo de {data.nombreNegocio} con su código. Si cumple,{' '}
          <span className="font-bold text-texto">ganan {bonus} pts cada uno</span>.
        </p>

        <input
          type="text"
          value={codigo}
          onChange={(evento) => {
            setCodigo(evento.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Código de tu amigo"
          className="mt-3 w-full rounded-2xl border border-borde bg-fondo px-4 py-3 text-sm font-bold tracking-wider text-texto uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-texto-muted focus:border-acento focus:outline-none"
        />

        <div className="mt-3 flex flex-col gap-2">
          {OPCIONES_META.map((op) => {
            const activa = op.etiqueta === opcion.etiqueta;
            return (
              <button
                key={op.etiqueta}
                type="button"
                onClick={() => setOpcion(op)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                  activa
                    ? 'bg-acento text-on-acento'
                    : 'border border-borde bg-fondo text-texto'
                }`}
              >
                <Target size={15} className="shrink-0" />
                {op.etiqueta}
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-xs font-semibold text-rojo">{error}</p>}

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={!codigo.trim() || enviando}
          onClick={enviar}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover disabled:opacity-50"
        >
          {exito ? (
            <>
              <Check size={16} /> ¡Desafío enviado!
            </>
          ) : (
            <>
              <Send size={16} /> {enviando ? 'Enviando…' : 'Lanzar desafío'}
            </>
          )}
        </motion.button>
      </div>

      {hayDesafios && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-texto-muted uppercase">
            <Swords size={13} /> Tus desafíos
          </p>
          <div className="flex flex-col gap-2 rounded-3xl border border-borde bg-card p-4">
            <AnimatePresence initial={false}>
              {recibidos.map((item) => (
                <motion.div
                  key={`r-${item.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FilaDesafio item={item} rol="retado" />
                </motion.div>
              ))}
              {enviados.map((item) => (
                <motion.div
                  key={`e-${item.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FilaDesafio item={item} rol="retador" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}
