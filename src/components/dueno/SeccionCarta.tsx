import { useEffect, useRef, useState } from 'react';
import { Check, Copy, EyeOff, ImageOff, Loader2, Pencil, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
import {
  borrarItemCarta,
  cargarCartaDelNegocio,
  guardarItemCarta,
} from '../../lib/panelDueno';
import { formatPrecio, type ItemCarta } from '../../lib/carta';

interface Borrador {
  nombre: string;
  descripcion: string;
  precio: string;
  categoria: string;
  fotoUrl: string;
  disponible: boolean;
}

const BORRADOR_VACIO: Borrador = {
  nombre: '',
  descripcion: '',
  precio: '',
  categoria: '',
  fotoUrl: '',
  disponible: true,
};

interface Props {
  /** Slug del negocio ya guardado. `null` mientras el dueño no guardó su negocio. */
  negocioId: string | null;
  esPreview: boolean;
}

const claseInput =
  'w-full rounded-2xl border border-borde bg-card px-4 py-3 text-base font-medium outline-none placeholder:text-texto-muted/60 focus:border-acento';

export default function SeccionCarta({ negocioId, esPreview }: Props) {
  const persistir = !esPreview && !!negocioId;
  const [items, setItems] = useState<ItemCarta[]>([]);
  const [cargando, setCargando] = useState(persistir);
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [editando, setEditando] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  // IDs negativos decrecientes para los items en memoria (modo vista previa, sin backend).
  const idPreview = useRef(-1);

  useEffect(() => {
    if (!persistir || !negocioId) return;
    let vivo = true;
    setCargando(true);
    cargarCartaDelNegocio(negocioId).then((resultado) => {
      if (!vivo) return;
      if (resultado.ok) setItems(resultado.valor);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [persistir, negocioId]);

  const linkPublico =
    negocioId && typeof window !== 'undefined'
      ? `${window.location.origin}/?carta=${negocioId}`
      : null;

  const copiarLink = async () => {
    if (!linkPublico) return;
    await navigator.clipboard.writeText(linkPublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const reset = () => {
    setBorrador(BORRADOR_VACIO);
    setEditando(null);
    setError(null);
  };

  const validar = (): Omit<ItemCarta, 'id'> | null => {
    const nombre = borrador.nombre.trim();
    if (!nombre) {
      setError('Poné el nombre del item.');
      return null;
    }
    const precio = borrador.precio.trim() === '' ? 0 : Number(borrador.precio);
    if (!Number.isFinite(precio) || precio < 0) {
      setError('El precio no es válido.');
      return null;
    }
    const ordenExistente = editando != null ? items.find((i) => i.id === editando)?.orden : undefined;
    return {
      nombre,
      descripcion: borrador.descripcion.trim(),
      precio,
      categoria: borrador.categoria.trim(),
      fotoUrl: borrador.fotoUrl.trim() || null,
      disponible: borrador.disponible,
      orden: ordenExistente ?? items.length,
    };
  };

  const confirmar = async () => {
    const datos = validar();
    if (!datos) return;

    if (persistir && negocioId) {
      setGuardando(true);
      const resultado = await guardarItemCarta(negocioId, { ...datos, id: editando });
      setGuardando(false);
      if (!resultado.ok) {
        setError('No pudimos guardar el item. Probá de nuevo.');
        return;
      }
      const guardado = resultado.valor;
      setItems((prev) =>
        editando != null ? prev.map((i) => (i.id === editando ? guardado : i)) : [...prev, guardado],
      );
    } else {
      const enMemoria: ItemCarta = { id: editando ?? idPreview.current--, ...datos };
      setItems((prev) =>
        editando != null ? prev.map((i) => (i.id === editando ? enMemoria : i)) : [...prev, enMemoria],
      );
    }
    reset();
  };

  const empezarEdicion = (item: ItemCarta) => {
    setBorrador({
      nombre: item.nombre,
      descripcion: item.descripcion,
      precio: item.precio ? String(item.precio) : '',
      categoria: item.categoria,
      fotoUrl: item.fotoUrl ?? '',
      disponible: item.disponible,
    });
    setEditando(item.id);
    setError(null);
  };

  const eliminar = async (id: number) => {
    if (persistir) {
      const resultado = await borrarItemCarta(id);
      if (!resultado.ok) {
        setError('No pudimos borrar el item. Probá de nuevo.');
        return;
      }
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editando === id) reset();
  };

  // Negocio sin guardar en modo conectado: la carta necesita un negocio persistido primero.
  if (!esPreview && !negocioId) {
    return (
      <p className="rounded-2xl border border-dashed border-borde px-4 py-6 text-center text-sm text-texto-muted">
        Guardá tu negocio en la pestaña “Negocio” para publicar tu carta y obtener el link para
        compartir.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {linkPublico && (
        <div className="flex flex-col gap-2">
          <span className="px-1 text-xs font-bold uppercase tracking-wide text-texto-muted">
            Link público de tu carta
          </span>
          <button
            type="button"
            onClick={copiarLink}
            className="flex w-full items-center justify-between gap-2 rounded-2xl border border-borde bg-card px-4 py-3.5 text-left"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-sm font-bold">{linkPublico}</span>
            {copiado ? (
              <Check size={18} className="shrink-0 text-verde-ok" />
            ) : (
              <Copy size={18} className="shrink-0 text-texto-muted" />
            )}
          </button>
          <p className="px-1 text-xs text-texto-muted">
            Cualquiera con este link ve tu carta, sin cuenta ni login. Ideal para un QR en la mesa.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-borde bg-card p-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={17} className="text-acento" />
          <p className="text-sm font-bold">{editando != null ? 'Editar item' : 'Nuevo item de la carta'}</p>
        </div>

        <input
          value={borrador.nombre}
          onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))}
          placeholder="Milanesa napolitana"
          className={claseInput}
        />

        <textarea
          value={borrador.descripcion}
          onChange={(e) => setBorrador((b) => ({ ...b, descripcion: e.target.value }))}
          placeholder="Descripción (opcional): con papas fritas y ensalada"
          rows={2}
          className={`${claseInput} resize-none`}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 rounded-2xl border border-borde bg-fondo px-3.5 py-3">
            <span className="shrink-0 text-sm font-bold text-texto-muted">$</span>
            <input
              inputMode="numeric"
              value={borrador.precio}
              onChange={(e) => setBorrador((b) => ({ ...b, precio: e.target.value }))}
              placeholder="Precio"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
            />
          </label>
          <input
            value={borrador.categoria}
            onChange={(e) => setBorrador((b) => ({ ...b, categoria: e.target.value }))}
            placeholder="Categoría"
            className={claseInput}
          />
        </div>

        <input
          value={borrador.fotoUrl}
          onChange={(e) => setBorrador((b) => ({ ...b, fotoUrl: e.target.value }))}
          placeholder="URL de la foto (opcional): https://…"
          className={claseInput}
        />

        <button
          type="button"
          onClick={() => setBorrador((b) => ({ ...b, disponible: !b.disponible }))}
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
            borrador.disponible
              ? 'border-borde bg-card text-texto-muted'
              : 'border-rojo/40 bg-rojo/5 text-rojo'
          }`}
        >
          {borrador.disponible ? 'Disponible' : 'No disponible (oculto de la carta)'}
          <span className="text-xs font-semibold">
            {borrador.disponible ? 'Tocá para ocultar' : 'Tocá para mostrar'}
          </span>
        </button>

        {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover disabled:opacity-60"
          >
            {guardando ? (
              <Loader2 size={17} className="animate-spin" />
            ) : editando != null ? (
              <Check size={17} />
            ) : (
              <Plus size={17} strokeWidth={2.5} />
            )}
            {editando != null ? 'Guardar cambios' : 'Agregar a la carta'}
          </button>
          {editando != null && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center justify-center rounded-2xl border border-borde bg-card px-4 text-texto-muted"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-8 text-texto-muted">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">Cargando tu carta…</span>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-borde px-4 py-6 text-center text-sm text-texto-muted">
          Todavía no cargaste items. Agregá el primero arriba.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl border border-borde bg-card px-3 py-3 ${
                item.disponible ? '' : 'opacity-60'
              }`}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fondo">
                {item.fotoUrl ? (
                  <img src={item.fotoUrl} alt={item.nombre} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff size={18} className="text-texto-muted/50" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                  {item.nombre}
                  {!item.disponible && <EyeOff size={13} className="shrink-0 text-rojo" />}
                </p>
                <p className="truncate text-xs text-texto-muted">
                  {formatPrecio(item.precio)}
                  {item.categoria && <span className="ml-1">· {item.categoria}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => empezarEdicion(item)}
                aria-label="Editar item"
                className="shrink-0 rounded-lg p-1.5 text-texto-muted active:bg-fondo"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => eliminar(item.id)}
                aria-label="Eliminar item"
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
