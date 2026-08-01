import { useEffect, useState } from 'react';
import { Calendar, Check, Loader2, Plus, Tag, Trash2 } from 'lucide-react';
import {
  borrarEvento,
  borrarPromo,
  cargarEventosDelNegocio,
  cargarPromosDelNegocio,
  guardarEvento,
  guardarPromo,
  type EventoInput,
  type PromoInput,
} from '../../lib/panelDueno';
import type { EventoNegocio, Promo, TipoPromo } from '../../data/mockClientes';
import { META_PROMO } from '../../lib/promos';

interface Props {
  negocioId: string | null;
  esPreview: boolean;
}

const claseInput =
  'w-full rounded-2xl border border-borde bg-card px-4 py-3 text-base font-medium outline-none placeholder:text-texto-muted/60 focus:border-acento';

const TIPOS: TipoPromo[] = ['2x1', 'horario', 'descuento'];

export default function SeccionPromos({ negocioId, esPreview }: Props) {
  const persistir = !esPreview && !!negocioId;

  const [promos, setPromos] = useState<(Promo & { id: number; activa: boolean })[]>([]);
  const [eventos, setEventos] = useState<(EventoNegocio & { id: number })[]>([]);
  const [cargando, setCargando] = useState(persistir);

  const [borradorPromo, setBorradorPromo] = useState({ tipo: '2x1' as TipoPromo, titulo: '', detalle: '' });
  const [borradorEvento, setBorradorEvento] = useState({ nombre: '', fechaInicio: '', fechaFin: '', recompensaExtra: '' });
  const [guardandoPromo, setGuardandoPromo] = useState(false);
  const [guardandoEvento, setGuardandoEvento] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!persistir || !negocioId) return;
    let vivo = true;
    setCargando(true);
    Promise.all([cargarPromosDelNegocio(negocioId), cargarEventosDelNegocio(negocioId)]).then(
      ([resPromos, resEventos]) => {
        if (!vivo) return;
        if (resPromos.ok) setPromos(resPromos.valor);
        if (resEventos.ok) setEventos(resEventos.valor);
        setCargando(false);
      },
    );
    return () => {
      vivo = false;
    };
  }, [persistir, negocioId]);

  const agregarPromo = async () => {
    if (!borradorPromo.titulo.trim()) {
      setError('Poné un título para la promo.');
      return;
    }
    setError(null);
    const input: PromoInput = { id: null, ...borradorPromo, activa: true };
    if (persistir && negocioId) {
      setGuardandoPromo(true);
      const resultado = await guardarPromo(negocioId, input);
      setGuardandoPromo(false);
      if (!resultado.ok) {
        setError('No pudimos guardar la promo.');
        return;
      }
      setPromos((prev) => [...prev, resultado.valor]);
    } else {
      setPromos((prev) => [...prev, { id: -(prev.length + 1), ...borradorPromo, activa: true }]);
    }
    setBorradorPromo({ tipo: '2x1', titulo: '', detalle: '' });
  };

  const eliminarPromo = async (id: number) => {
    if (persistir) await borrarPromo(id);
    setPromos((prev) => prev.filter((p) => p.id !== id));
  };

  const agregarEvento = async () => {
    const { nombre, fechaInicio, fechaFin, recompensaExtra } = borradorEvento;
    if (!nombre.trim() || !fechaInicio || !fechaFin || !recompensaExtra.trim()) {
      setError('Completá nombre, fechas y recompensa del evento.');
      return;
    }
    setError(null);
    const input: EventoInput = { id: null, nombre, fechaInicio, fechaFin, recompensaExtra };
    if (persistir && negocioId) {
      setGuardandoEvento(true);
      const resultado = await guardarEvento(negocioId, input);
      setGuardandoEvento(false);
      if (!resultado.ok) {
        setError('No pudimos guardar el evento.');
        return;
      }
      setEventos((prev) => [...prev, resultado.valor]);
    } else {
      setEventos((prev) => [...prev, { id: -(prev.length + 1), nombre, fechaInicio, fechaFin, recompensaExtra }]);
    }
    setBorradorEvento({ nombre: '', fechaInicio: '', fechaFin: '', recompensaExtra: '' });
  };

  const eliminarEvento = async (id: number) => {
    if (persistir) await borrarEvento(id);
    setEventos((prev) => prev.filter((e) => e.id !== id));
  };

  if (!esPreview && !negocioId) {
    return (
      <p className="rounded-2xl border border-dashed border-borde px-4 py-6 text-center text-sm text-texto-muted">
        Guardá tu negocio en la pestaña "Negocio" antes de cargar promos o eventos.
      </p>
    );
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-texto-muted">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm font-medium">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}

      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-texto-muted">
          <Tag size={13} /> Promos permanentes
        </p>
        <div className="flex flex-col gap-3 rounded-2xl border border-borde bg-card p-4">
          <div className="flex gap-2">
            {TIPOS.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setBorradorPromo((b) => ({ ...b, tipo }))}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${
                  borradorPromo.tipo === tipo
                    ? 'border-acento bg-acento text-on-acento'
                    : 'border-borde bg-fondo text-texto-muted'
                }`}
              >
                {META_PROMO[tipo].etiqueta}
              </button>
            ))}
          </div>
          <input
            value={borradorPromo.titulo}
            onChange={(e) => setBorradorPromo((b) => ({ ...b, titulo: e.target.value }))}
            placeholder="Título (ej: 2x1 en café con leche)"
            className={claseInput}
          />
          <input
            value={borradorPromo.detalle}
            onChange={(e) => setBorradorPromo((b) => ({ ...b, detalle: e.target.value }))}
            placeholder="Detalle (opcional): todas las mañanas hasta las 11"
            className={claseInput}
          />
          <button
            type="button"
            onClick={agregarPromo}
            disabled={guardandoPromo}
            className="flex items-center justify-center gap-2 rounded-2xl bg-acento py-2.5 text-sm font-bold text-on-acento disabled:opacity-60"
          >
            {guardandoPromo ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Agregar promo
          </button>
        </div>
        {promos.length > 0 && (
          <ul className="flex flex-col gap-2">
            {promos.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3">
                <span className="min-w-0 flex-1 text-sm font-bold">{p.titulo}</span>
                <span className="shrink-0 rounded-full bg-premio-suave px-2.5 py-1 text-[11px] font-bold text-acento">
                  {META_PROMO[p.tipo].etiqueta}
                </span>
                <button type="button" onClick={() => eliminarPromo(p.id)} className="shrink-0 text-rojo">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-texto-muted">
          <Calendar size={13} /> Eventos con fecha
        </p>
        <div className="flex flex-col gap-3 rounded-2xl border border-borde bg-card p-4">
          <input
            value={borradorEvento.nombre}
            onChange={(e) => setBorradorEvento((b) => ({ ...b, nombre: e.target.value }))}
            placeholder="Nombre (ej: Semana del café de origen)"
            className={claseInput}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={borradorEvento.fechaInicio}
              onChange={(e) => setBorradorEvento((b) => ({ ...b, fechaInicio: e.target.value }))}
              className={claseInput}
            />
            <input
              type="date"
              value={borradorEvento.fechaFin}
              onChange={(e) => setBorradorEvento((b) => ({ ...b, fechaFin: e.target.value }))}
              className={claseInput}
            />
          </div>
          <input
            value={borradorEvento.recompensaExtra}
            onChange={(e) => setBorradorEvento((b) => ({ ...b, recompensaExtra: e.target.value }))}
            placeholder="Recompensa extra (ej: Método de filtrado de regalo)"
            className={claseInput}
          />
          <button
            type="button"
            onClick={agregarEvento}
            disabled={guardandoEvento}
            className="flex items-center justify-center gap-2 rounded-2xl bg-acento py-2.5 text-sm font-bold text-on-acento disabled:opacity-60"
          >
            {guardandoEvento ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Crear evento
          </button>
        </div>
        {eventos.length > 0 && (
          <ul className="flex flex-col gap-2">
            {eventos.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.nombre}</p>
                  <p className="truncate text-xs text-texto-muted">
                    {e.fechaInicio} a {e.fechaFin} · {e.recompensaExtra}
                  </p>
                </div>
                <button type="button" onClick={() => eliminarEvento(e.id)} className="shrink-0 text-rojo">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
