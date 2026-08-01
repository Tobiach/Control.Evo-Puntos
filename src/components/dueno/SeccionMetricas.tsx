import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Gift,
  Link2,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import type { HorarioValle } from '../../data/mockClientes';
import { formatPuntos } from '../../lib/club';
import { formatPrecio } from '../../lib/carta';
import {
  cargarAccionesReales,
  cargarActividadEventoReciente,
  cargarDesafiosPorEstado,
  cargarEfectoHorarioValle,
  cargarPuntosSemanales,
  cargarRankingRecompensas,
  cargarReferidosFunnel,
  cargarResumenSemanal,
  type AccionReal,
  type ActividadEvento,
  type DesafiosPorEstado,
  type EfectoHorarioValle,
  type PuntosSemana,
  type RankingRecompensa,
  type ReferidosFunnel,
  type ResumenSemanal,
} from '../../lib/panelDueno';

interface Props {
  negocioId: string | null;
  horarioValle: HorarioValle | null;
  esPreview: boolean;
}

export default function SeccionMetricas({ negocioId, horarioValle, esPreview }: Props) {
  const persistir = !esPreview && !!negocioId;
  const [cargando, setCargando] = useState(persistir);
  const [resumen, setResumen] = useState<ResumenSemanal | null>(null);
  const [acciones, setAcciones] = useState<AccionReal[]>([]);
  const [puntosSemanales, setPuntosSemanales] = useState<PuntosSemana[]>([]);
  const [ranking, setRanking] = useState<RankingRecompensa[]>([]);
  const [valle, setValle] = useState<EfectoHorarioValle | null>(null);
  const [referidos, setReferidos] = useState<ReferidosFunnel | null>(null);
  const [evento, setEvento] = useState<ActividadEvento | null>(null);
  const [desafios, setDesafios] = useState<DesafiosPorEstado | null>(null);

  useEffect(() => {
    if (!persistir || !negocioId) return;
    let vivo = true;
    setCargando(true);
    Promise.all([
      cargarResumenSemanal(negocioId),
      cargarAccionesReales(negocioId),
      cargarPuntosSemanales(negocioId),
      cargarRankingRecompensas(negocioId),
      horarioValle ? cargarEfectoHorarioValle(negocioId, horarioValle) : Promise.resolve(null),
      cargarReferidosFunnel(negocioId),
      cargarActividadEventoReciente(negocioId),
      cargarDesafiosPorEstado(negocioId),
    ]).then(([res, acc, pts, rank, val, ref, ev, des]) => {
      if (!vivo) return;
      if (res?.ok) setResumen(res.valor);
      if (acc.ok) setAcciones(acc.valor);
      if (pts.ok) setPuntosSemanales(pts.valor);
      if (rank.ok) setRanking(rank.valor);
      if (val?.ok) setValle(val.valor);
      if (ref.ok) setReferidos(ref.valor);
      if (ev.ok) setEvento(ev.valor);
      if (des.ok) setDesafios(des.valor);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [persistir, negocioId, horarioValle]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-texto-muted">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-sm font-medium">Cargando tu panel…</p>
      </div>
    );
  }

  if (esPreview || !negocioId) {
    return (
      <p className="rounded-2xl border border-dashed border-borde bg-card px-6 py-10 text-center text-sm leading-relaxed text-texto-muted">
        En vista previa este panel arranca vacío. Cuando conectemos tu negocio vas a ver acá, en
        vivo, quién vuelve, qué recompensas funcionan y qué necesita tu atención hoy.
      </p>
    );
  }

  const maxCanjes = Math.max(1, ...ranking.map((r) => r.canjes));
  const maxPts = Math.max(1, ...puntosSemanales.flatMap((s) => [s.acreditados, s.redimidos]));

  return (
    <div className="flex flex-col gap-6">
      {/* Copiloto: lo primero, lo más grande */}
      <div>
        <p className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <Sparkles size={15} className="text-acento" /> Para hacer hoy
          </span>
          {acciones.length > 0 && (
            <span className="text-xs font-semibold text-texto-muted">
              {acciones.length} {acciones.length === 1 ? 'acción real' : 'acciones reales'}
            </span>
          )}
        </p>
        {acciones.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-card px-4 py-6 text-center text-sm text-texto-muted">
            Nada urgente por ahora — ningún cliente pierde puntos esta semana ni hay recompensas
            muertas.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {acciones.slice(0, 6).map((accion, indice) => (
              <AccionRow key={indice} accion={accion} />
            ))}
          </div>
        )}
      </div>

      {/* Resumen: secundario, chico */}
      {resumen && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-borde bg-card px-4 py-3.5">
            <p className="text-[11px] font-semibold text-texto-muted">Clientes activos</p>
            <p className="mt-1 text-xl font-black">{formatPuntos(resumen.clientesActivos)}</p>
            {resumen.nuevosEstaSemana > 0 && (
              <p className="mt-0.5 text-[11px] font-bold text-verde-ok">
                +{resumen.nuevosEstaSemana} esta semana
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-borde bg-card px-4 py-3.5">
            <p className="text-[11px] font-semibold text-texto-muted">Recurrencia real</p>
            <p className="mt-1 text-xl font-black">{resumen.recurrenciaPct}%</p>
            <p className="mt-0.5 text-[11px] text-texto-muted">volvió más de una vez</p>
          </div>
          <div className="rounded-2xl border border-borde bg-card px-4 py-3.5">
            <p className="text-[11px] font-semibold text-texto-muted">Puntos acreditados</p>
            <p className="mt-1 text-xl font-black">{formatPuntos(resumen.puntosAcreditadosSemana)}</p>
            {resumen.variacionPuntosPct !== null && (
              <p
                className={`mt-0.5 flex items-center gap-1 text-[11px] font-bold ${
                  resumen.variacionPuntosPct >= 0 ? 'text-verde-ok' : 'text-rojo'
                }`}
              >
                {resumen.variacionPuntosPct >= 0 ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
                {Math.abs(resumen.variacionPuntosPct)}% vs. semana pasada
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-borde bg-card px-4 py-3.5">
            <p className="text-[11px] font-semibold text-texto-muted">Consumo registrado</p>
            <p className="mt-1 text-xl font-black">{formatPrecio(resumen.consumoRegistradoSemana)}</p>
            <p className="mt-0.5 text-[11px] text-texto-muted">últimos 7 días</p>
          </div>
        </div>
      )}

      {/* Puntos acreditados vs redimidos */}
      {puntosSemanales.some((s) => s.acreditados > 0 || s.redimidos > 0) && (
        <div className="rounded-2xl border border-borde bg-card p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <BarChart3 size={15} className="text-acento" /> Puntos: acreditados vs. redimidos
          </p>
          <p className="mt-0.5 text-xs text-texto-muted">Últimas 6 semanas</p>
          <div className="mt-4 flex h-28 justify-between gap-2">
            {puntosSemanales.map((s, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <div
                    className="w-2.5 rounded-t-sm bg-acento"
                    style={{ height: `${Math.max(3, (s.acreditados / maxPts) * 100)}%` }}
                  />
                  <div
                    className="w-2.5 rounded-t-sm bg-premio"
                    style={{ height: `${Math.max(3, (s.redimidos / maxPts) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-texto-muted">{s.etiqueta}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] font-semibold text-texto-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-acento" /> Acreditados
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-premio" /> Redimidos
            </span>
          </div>
        </div>
      )}

      {/* Recompensas más/menos elegidas */}
      {ranking.length > 0 && (
        <div className="rounded-2xl border border-borde bg-card p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Gift size={15} className="text-premio" /> Recompensas más y menos elegidas
          </p>
          <div className="mt-3 flex flex-col">
            {ranking.map((r) => (
              <div key={r.descripcion} className="flex items-center gap-3 border-t border-borde py-2.5 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{r.descripcion}</p>
                  <p className="text-[11px] text-texto-muted">{formatPuntos(r.pts)} pts</p>
                </div>
                <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-fondo-medio">
                  <div
                    className={`h-full rounded-full ${r.canjes === 0 ? 'bg-rojo' : 'bg-verde-ok'}`}
                    style={{ width: `${Math.max(4, (r.canjes / maxCanjes) * 100)}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-black">{r.canjes}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Horario valle */}
        {valle && (
          <div className="rounded-2xl border border-borde bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Clock size={15} className="text-acento" /> Efecto del horario valle
            </p>
            <p className="mt-0.5 text-xs text-texto-muted">
              {valle.desde} a {valle.hasta}hs
            </p>
            <div className="mt-3 flex gap-6">
              <div>
                <p className="text-[11px] font-semibold text-texto-muted">Dentro del valle</p>
                <p className="mt-1 text-2xl font-black text-verde-ok">{valle.promedioDentro}</p>
                <p className="text-[10px] text-texto-muted">visitas promedio por franja</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-texto-muted">Resto del día</p>
                <p className="mt-1 text-2xl font-black text-texto-muted">{valle.promedioFueraPorDia}</p>
                <p className="text-[10px] text-texto-muted">visitas promedio por día</p>
              </div>
            </div>
          </div>
        )}

        {/* Referidos */}
        {referidos && referidos.registrados > 0 && (
          <div className="rounded-2xl border border-borde bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Link2 size={15} className="text-acento" /> Referidos reales
            </p>
            <p className="mt-0.5 text-xs text-texto-muted">Registrados → convertidos en clientes reales</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-center">
                <p className="text-2xl font-black">{referidos.registrados}</p>
                <p className="text-[10px] text-texto-muted">se registraron</p>
              </div>
              <span className="text-texto-disabled">→</span>
              <div className="text-center">
                <p className="text-2xl font-black text-verde-ok">{referidos.convertidos}</p>
                <p className="text-[10px] text-texto-muted">clientes reales</p>
              </div>
            </div>
          </div>
        )}

        {/* Eventos */}
        {evento && (
          <div className="rounded-2xl border border-borde bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Calendar size={15} className="text-acento" /> {evento.nombre}
            </p>
            <p className="mt-0.5 text-xs text-texto-muted">Visitas durante el evento vs. lo normal</p>
            <div className="mt-3 flex gap-6">
              <div>
                <p className="text-2xl font-black text-acento">{evento.visitasDurante}</p>
                <p className="text-[10px] text-texto-muted">durante el evento</p>
              </div>
              <div>
                <p className="text-2xl font-black text-texto-muted">{evento.promedioNormalPorDia}</p>
                <p className="text-[10px] text-texto-muted">lo esperable sin evento</p>
              </div>
            </div>
          </div>
        )}

        {/* Desafíos */}
        {desafios && (desafios.cumplidos + desafios.enCurso + desafios.fallados > 0) && (
          <div className="rounded-2xl border border-borde bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Trophy size={15} className="text-premio" /> Desafíos entre amigos
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <BarraEstado label="Cumplidos" valor={desafios.cumplidos} total={desafios.cumplidos + desafios.enCurso + desafios.fallados} color="bg-verde-ok" />
              <BarraEstado label="En curso" valor={desafios.enCurso} total={desafios.cumplidos + desafios.enCurso + desafios.fallados} color="bg-acento" />
              <BarraEstado label="Fallados" valor={desafios.fallados} total={desafios.cumplidos + desafios.enCurso + desafios.fallados} color="bg-texto-disabled" />
            </div>
          </div>
        )}
      </div>

      <p className="flex items-center gap-2 px-1 text-[11px] text-texto-muted">
        <Users size={12} className="shrink-0" />
        Todos los números de este panel salen de datos reales de tu negocio — nada acá está
        inventado ni proyectado.
      </p>
    </div>
  );
}

function AccionRow({ accion }: { accion: AccionReal }) {
  if (accion.tipo === 'puntos_por_vencer') {
    const urgente = accion.diasRestantes <= 3;
    return (
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${urgente ? 'border-rojo/30 bg-rojo/5' : 'border-borde bg-card'}`}>
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${urgente ? 'bg-rojo/15 text-rojo' : 'bg-acento-suave text-acento'}`}>
          <AlertTriangle size={15} />
        </span>
        <p className="text-sm leading-snug">
          <span className="font-bold">{accion.clienteNombre}</span> pierde {formatPuntos(accion.puntos)} pts
          en {accion.diasRestantes} {accion.diasRestantes === 1 ? 'día' : 'días'}
        </p>
      </div>
    );
  }
  if (accion.tipo === 'referido_a_un_paso') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-borde bg-card px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-verde-suave text-verde-ok">
          <Link2 size={15} />
        </span>
        <p className="text-sm leading-snug">
          <span className="font-bold">{accion.clienteNombre}</span> está a {accion.visitasFaltantes}{' '}
          {accion.visitasFaltantes === 1 ? 'visita' : 'visitas'} de convertir un referido
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-borde bg-card px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-acento-suave text-acento">
        <Gift size={15} />
      </span>
      <p className="text-sm leading-snug">
        <span className="font-bold">"{accion.descripcion}"</span> lleva {accion.diasSinCanjes} días activa
        sin ningún canje
      </p>
    </div>
  );
}

function BarraEstado({ label, valor, total, color }: { label: string; valor: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max(valor > 0 ? 6 : 0, (valor / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-16 shrink-0 text-[11px] font-semibold text-texto-muted">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-md bg-fondo-medio">
        <div className={`h-full rounded-md ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-5 shrink-0 text-right text-xs font-black">{valor}</span>
    </div>
  );
}
