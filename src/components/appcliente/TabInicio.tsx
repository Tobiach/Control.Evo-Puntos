import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  BellRing,
  CalendarCheck,
  CalendarHeart,
  ChevronLeft,
  Flame,
  Gift,
  Heart,
  PartyPopper,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { Cliente, RubroData, Visita } from '../../data/mockClientes';
import {
  formatMonto,
  formatPuntos,
  progresoNivel,
  proximaRecompensa,
  rachaDias,
  rachaSemanas,
  sugerenciaFavorita,
  vencimientoPuntos,
} from '../../lib/club';
import { META_PROMO } from '../../lib/promos';
import {
  eventoActivo,
  insigniasDeNegocio,
  nombreMesActual,
  rachaSemanal,
  temporadaMensual,
  textoComboFinde,
  textoHorarioValle,
} from '../../lib/misiones';
import type { Aviso, PermisoNotif } from '../../lib/notificaciones';
import { lanzarConfetti } from '../../lib/confetti';
import RecompensaSorpresa from './RecompensaSorpresa';
import RuletaSemanal from './RuletaSemanal';

const PTS_POR_SORPRESA = 200;

interface Props {
  data: RubroData;
  cliente: Cliente;
  historial: Visita[];
  avisos: Aviso[];
  permisoNotif: PermisoNotif;
  /** Timestamp de la última tirada de ruleta en este negocio (cooldown de 7 días). */
  ultimaRuletaTs?: number;
  onGirarRuleta: () => void;
  onVerRecompensas: () => void;
  onSalir: () => void;
}

/** Cuenta de 0 al valor con easing, para que el contador "suba" al entrar. */
function useConteoAnimado(valor: number, duracionMs = 900): number {
  const [mostrado, setMostrado] = useState(0);
  useEffect(() => {
    if (valor <= 0) {
      setMostrado(0);
      return;
    }
    let raf = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / duracionMs);
      const suavizado = 1 - Math.pow(1 - avance, 3);
      setMostrado(Math.round(valor * suavizado));
      if (avance < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracionMs]);
  return mostrado;
}

export default function TabInicio({
  data,
  cliente,
  historial,
  avisos,
  permisoNotif,
  ultimaRuletaTs,
  onGirarRuleta,
  onVerRecompensas,
  onSalir,
}: Props) {
  const { actual, siguiente, pct } = progresoNivel(data.niveles, cliente.puntos);
  const racha = rachaSemanas(historial);
  const rachaDia = rachaDias(historial);
  const venc = vencimientoPuntos(cliente);
  const recompensa = proximaRecompensa(data.recompensas, cliente.puntos);
  const primerNombre = cliente.nombre.split(' ')[0];

  const insignias = insigniasDeNegocio(data, historial);
  const temporada = temporadaMensual(insignias);
  const semanal = rachaSemanal(historial);
  const evento = eventoActivo(data);
  const puntosMostrados = useConteoAnimado(cliente.puntos);
  const favorito = sugerenciaFavorita(data.recompensas, historial, cliente.puntos);

  // Recompensa sorpresa: se habilita cada 200 pts acumulados desde la última usada.
  const [sorpresasUsadas, setSorpresasUsadas] = useState(0);
  const sorpresasDisponibles = Math.floor(cliente.puntos / PTS_POR_SORPRESA);
  const sorpresaDisponible = sorpresasUsadas < sorpresasDisponibles;
  const faltanSorpresa = Math.max(
    0,
    (sorpresasUsadas + 1) * PTS_POR_SORPRESA - cliente.puntos,
  );

  // Avisos que no tienen ya su propio bloque visual en esta pantalla (fallback sin permiso).
  const avisosFallback = avisos.filter((aviso) => !aviso.yaVisibleEnInicio);
  const mostrarPanelAvisos = permisoNotif !== 'granted' && avisosFallback.length > 0;

  useEffect(() => {
    if (temporada.completa) lanzarConfetti();
  }, [temporada.completa]);

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-texto-muted">Hola, {primerNombre} 👋</p>
          <h1 className="font-titulo text-2xl font-bold text-texto">{data.nombreNegocio}</h1>
        </div>
        <button
          type="button"
          onClick={onSalir}
          aria-label="Salir de la app"
          className="rounded-full border border-borde bg-card p-2 text-texto-muted"
        >
          <ChevronLeft size={18} />
        </button>
      </header>

      <div className="rounded-3xl border border-borde bg-card p-5 shadow-lg">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-texto-muted">Tus puntos</p>
            <p className="font-titulo text-5xl leading-none font-bold text-premio">
              {formatPuntos(puntosMostrados)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-premio-suave px-3 py-1.5 text-sm font-bold text-acento">
              <Flame size={15} strokeWidth={2.5} /> {racha} {racha === 1 ? 'sem' : 'sems'}
            </span>
            {rachaDia >= 2 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-card px-3 py-1 text-xs font-bold text-premio">
                <CalendarCheck size={14} strokeWidth={2.5} /> {rachaDia} días seguidos
              </span>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-texto-muted">Nivel {actual.nombre}</span>
            {siguiente ? (
              <span className="font-bold text-acento">
                {formatPuntos(siguiente.min - cliente.puntos)} pts para {siguiente.nombre}
              </span>
            ) : (
              <span className="font-bold text-premio">Nivel máximo</span>
            )}
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-borde">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full bg-acento"
            />
          </div>
        </div>
      </div>

      {mostrarPanelAvisos && (
        <div className="flex flex-col gap-2">
          {avisosFallback.map((aviso) => (
            <motion.div
              key={aviso.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-2xl border border-borde bg-card px-4 py-3"
            >
              <span className="mt-0.5 text-lg">{aviso.emoji}</span>
              <div>
                <p className="text-sm font-bold text-texto">{aviso.titulo}</p>
                <p className="text-xs leading-snug text-texto-muted">{aviso.cuerpo}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {permisoNotif === 'granted' && (
        <div className="flex items-center gap-2 rounded-2xl border border-borde bg-card px-4 py-2.5 text-xs">
          <BellRing size={15} className="shrink-0 text-acento" />
          <span className="font-semibold text-texto-muted">
            Notificaciones activadas — te avisamos por vencimientos, rachas y sorpresas.
          </span>
        </div>
      )}

      {evento && (
        <div className="flex items-start gap-3 rounded-2xl border border-borde bg-premio-suave px-4 py-3">
          <span className="mt-0.5 text-acento">
            <CalendarHeart size={18} strokeWidth={2.4} />
          </span>
          <p className="text-sm leading-snug">
            <span className="font-bold text-acento">{evento.nombre}</span> — visitá durante el
            evento y ganás <span className="font-bold text-texto">{evento.recompensaExtra}</span>.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-borde bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-texto-muted uppercase">
              Temporada de {nombreMesActual()}
            </p>
            <p className="mt-1 text-sm font-bold">
              {temporada.completa
                ? '¡Completaste todas las misiones!'
                : `${temporada.completadas} de ${temporada.total} misiones completadas`}
            </p>
          </div>
          <span className="font-titulo text-2xl font-bold text-premio">{temporada.pct}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-borde">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${temporada.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-premio"
          />
        </div>
        {temporada.completa ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-premio-suave px-3.5 py-2.5 text-sm">
            <PartyPopper size={16} className="shrink-0 text-acento" />
            <span className="font-bold text-acento">{temporada.recompensa} desbloqueada</span>
          </div>
        ) : (
          <p className="mt-2.5 text-xs text-texto-muted">
            Completá todas y ganás una <span className="font-bold text-texto">recompensa grande</span>.
          </p>
        )}
      </div>

      {semanal.conseguida && (
        <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-premio-suave text-acento">
            <Sparkles size={17} strokeWidth={2.4} />
          </span>
          <p className="text-sm leading-snug">
            <span className="font-bold text-acento">¡Racha semanal!</span> Desbloqueaste{' '}
            <span className="font-bold text-texto">{semanal.recompensa}</span>.
          </p>
        </div>
      )}

      {data.horarioValle && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-premio-suave px-4 py-3 text-sm">
          <Zap size={17} className="shrink-0 text-acento" strokeWidth={2.4} />
          <p className="leading-snug">
            <span className="font-bold text-acento">
              {textoHorarioValle(data.horarioValle)}
            </span>{' '}
            acá.
          </p>
        </div>
      )}

      {data.comboFinde && (
        <div className="rounded-3xl border border-borde bg-premio-suave p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-acento uppercase">
            <Flame size={13} strokeWidth={2.5} /> Combo de asado del finde
          </p>
          <p className="mt-2 text-sm font-bold leading-snug text-texto">{data.comboFinde.descripcion}</p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-texto-muted">
              {textoComboFinde(data.comboFinde)}
            </span>
            {data.comboFinde.precio != null && (
              <span className="shrink-0 font-titulo text-sm font-bold text-premio">
                {formatMonto(data, data.comboFinde.precio)}
              </span>
            )}
          </div>
        </div>
      )}

      {data.promos && data.promos.length > 0 && (
        <div className="rounded-3xl border border-borde bg-card p-4">
          <p className="text-xs font-semibold tracking-widest text-texto-muted uppercase">
            Promos del local
          </p>
          <div className="mt-2.5 flex flex-col gap-2.5">
            {data.promos.map((promo) => {
              const meta = META_PROMO[promo.tipo];
              const Icono = meta.icono;
              return (
                <div key={promo.titulo} className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${meta.color}1A`, color: meta.color }}
                  >
                    <Icono size={15} strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight text-texto">{promo.titulo}</p>
                    {promo.detalle && (
                      <p className="mt-0.5 text-xs text-texto-muted">{promo.detalle}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {venc.dias < 15 && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-premio-suave px-4 py-3 text-sm">
          <span className="text-base">⏳</span>
          <p className="leading-snug">
            <span className="font-bold text-acento">{formatPuntos(cliente.puntos)} pts</span> vencen
            en {venc.dias} {venc.dias === 1 ? 'día' : 'días'}. Pasá a canjear.
          </p>
        </div>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onVerRecompensas}
        className="flex w-full items-center justify-center gap-2 rounded-3xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
      >
        <Gift size={20} strokeWidth={2.4} /> Ver mis recompensas
      </motion.button>

      {recompensa && (
        <div className="rounded-3xl border border-borde bg-card p-4">
          <p className="text-xs font-semibold tracking-widest text-texto-muted uppercase">
            Tu próxima recompensa
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm font-bold">{recompensa.descripcion}</p>
            <span className="shrink-0 font-titulo text-sm font-bold text-premio">
              {formatPuntos(recompensa.pts)} pts
            </span>
          </div>
          <p className="mt-1 text-xs text-texto-muted">
            Te faltan {formatPuntos(recompensa.pts - cliente.puntos)} pts
          </p>
        </div>
      )}

      {favorito && (
        <div className="rounded-3xl border border-borde bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-texto-muted uppercase">
            <Heart size={13} className="text-acento" /> Tus favoritos
          </p>
          <p className="mt-2 text-sm leading-snug">
            Lo tuyo es <span className="font-bold text-acento">{favorito.categoria}</span>. Te
            sugerimos: <span className="font-bold text-texto">{favorito.recompensa.descripcion}</span>
          </p>
          <p className="mt-1 text-xs text-texto-muted">
            {favorito.alcanzable
              ? '¡Ya lo podés canjear!'
              : `Te faltan ${formatPuntos(favorito.faltan)} pts`}
          </p>
        </div>
      )}

      <RuletaSemanal ultimaTiradaTs={ultimaRuletaTs} onGirar={onGirarRuleta} />

      <RecompensaSorpresa
        key={sorpresasUsadas}
        disponible={sorpresaDisponible}
        faltan={faltanSorpresa}
        onUsar={() => setSorpresasUsadas((valor) => valor + 1)}
      />
    </div>
  );
}
