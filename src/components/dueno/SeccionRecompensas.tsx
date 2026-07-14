import { useState } from 'react';
import { Check, Coins, DollarSign, Gift, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { CategoriaRecompensa, Recompensa } from '../../data/mockClientes';

const CATEGORIAS: CategoriaRecompensa[] = ['Bebidas', 'Comida', 'Descuentos', 'Regalos'];

interface Borrador {
  pts: string;
  descripcion: string;
  categoria: CategoriaRecompensa;
  costoDinero: string;
}

const BORRADOR_VACIO: Borrador = { pts: '', descripcion: '', categoria: 'Bebidas', costoDinero: '' };

interface Props {
  recompensas: Recompensa[];
  onCambiar: (lista: Recompensa[]) => void;
}

const claseInput =
  'w-full rounded-2xl border border-borde bg-card px-4 py-3 text-base font-medium outline-none placeholder:text-texto-muted/60 focus:border-acento';

export default function SeccionRecompensas({ recompensas, onCambiar }: Props) {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [editando, setEditando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aRecompensa = (): Recompensa | null => {
    const pts = Number(borrador.pts);
    const descripcion = borrador.descripcion.trim();
    if (!descripcion) {
      setError('Poné una descripción.');
      return null;
    }
    if (!Number.isFinite(pts) || pts <= 0) {
      setError('Los puntos tienen que ser un número mayor a 0.');
      return null;
    }
    const costo = borrador.costoDinero.trim() === '' ? undefined : Number(borrador.costoDinero);
    if (costo != null && (!Number.isFinite(costo) || costo < 0)) {
      setError('El costo en dinero no es válido.');
      return null;
    }
    return {
      pts,
      descripcion,
      categoria: borrador.categoria,
      ...(costo != null ? { costoDinero: costo } : {}),
    };
  };

  const confirmar = () => {
    const recompensa = aRecompensa();
    if (!recompensa) return;
    if (editando != null) {
      onCambiar(recompensas.map((r, i) => (i === editando ? recompensa : r)));
    } else {
      onCambiar([...recompensas, recompensa]);
    }
    setBorrador(BORRADOR_VACIO);
    setEditando(null);
    setError(null);
  };

  const empezarEdicion = (indice: number) => {
    const r = recompensas[indice];
    setBorrador({
      pts: String(r.pts),
      descripcion: r.descripcion,
      categoria: r.categoria,
      costoDinero: r.costoDinero != null ? String(r.costoDinero) : '',
    });
    setEditando(indice);
    setError(null);
  };

  const cancelar = () => {
    setBorrador(BORRADOR_VACIO);
    setEditando(null);
    setError(null);
  };

  const eliminar = (indice: number) => {
    onCambiar(recompensas.filter((_, i) => i !== indice));
    if (editando === indice) cancelar();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-borde bg-card p-4">
        <div className="flex items-center gap-2">
          <Gift size={17} className="text-acento" />
          <p className="text-sm font-bold">{editando != null ? 'Editar recompensa' : 'Nueva recompensa'}</p>
        </div>

        <input
          value={borrador.descripcion}
          onChange={(e) => setBorrador((b) => ({ ...b, descripcion: e.target.value }))}
          placeholder="Café de especialidad"
          className={claseInput}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 rounded-2xl border border-borde bg-fondo px-3.5 py-3">
            <Coins size={16} className="shrink-0 text-premio" />
            <input
              inputMode="numeric"
              value={borrador.pts}
              onChange={(e) => setBorrador((b) => ({ ...b, pts: e.target.value }))}
              placeholder="Puntos"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
            />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-borde bg-fondo px-3.5 py-3">
            <DollarSign size={16} className="shrink-0 text-texto-muted" />
            <input
              inputMode="numeric"
              value={borrador.costoDinero}
              onChange={(e) => setBorrador((b) => ({ ...b, costoDinero: e.target.value }))}
              placeholder="Costo $ (opc.)"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((categoria) => {
            const activo = borrador.categoria === categoria;
            return (
              <button
                key={categoria}
                type="button"
                onClick={() => setBorrador((b) => ({ ...b, categoria }))}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  activo ? 'bg-acento text-on-acento' : 'bg-fondo text-texto-muted border border-borde'
                }`}
              >
                {categoria}
              </button>
            );
          })}
        </div>

        {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmar}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover"
          >
            {editando != null ? <Check size={17} /> : <Plus size={17} strokeWidth={2.5} />}
            {editando != null ? 'Guardar cambios' : 'Agregar recompensa'}
          </button>
          {editando != null && (
            <button
              type="button"
              onClick={cancelar}
              className="flex items-center justify-center rounded-2xl border border-borde bg-card px-4 text-texto-muted"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {recompensas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-borde px-4 py-6 text-center text-sm text-texto-muted">
          Todavía no cargaste recompensas. Agregá la primera arriba.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recompensas.map((recompensa, indice) => (
            <li
              key={indice}
              className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3"
            >
              <span className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-premio-suave">
                <span className="text-sm font-black leading-none text-acento">{recompensa.pts}</span>
                <span className="text-[10px] font-semibold text-acento/80">pts</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{recompensa.descripcion}</p>
                <p className="text-xs text-texto-muted">
                  {recompensa.categoria}
                  {recompensa.costoDinero != null && (
                    <span className="ml-1 font-semibold">+ ${recompensa.costoDinero.toLocaleString('es-AR')}</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => empezarEdicion(indice)}
                aria-label="Editar recompensa"
                className="shrink-0 rounded-lg p-1.5 text-texto-muted active:bg-fondo"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => eliminar(indice)}
                aria-label="Eliminar recompensa"
                className="shrink-0 rounded-lg p-1.5 text-rojo active:bg-fondo"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
