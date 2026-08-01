import { useMemo, useState } from 'react';
import {
  Clock,
  Coins,
  Crown,
  Gift,
  Loader2,
  Phone,
  Search,
  StickyNote,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { formatPuntos } from '../../lib/club';
import { formatPrecio } from '../../lib/carta';
import {
  actualizarNotaCliente,
  textoUltimaVisita,
  type ClienteDelNegocio,
} from '../../lib/panelDueno';

interface Props {
  clientes: ClienteDelNegocio[] | null;
  cargando: boolean;
  esPreview: boolean;
  negocioId: string | null;
  /** Puntos desde los que un cliente es VIP acá. `null` = sin configurar (no se muestra insignia). */
  vipDesdePuntos: number | null;
  /** Avisa al panel que una nota/etiquetas se guardó, para que la lista lifted quede sincronizada. */
  onClienteActualizado: (clienteId: string, cambios: { nota: string | null; etiquetas: string[] }) => void;
}

/** "vip, cumple en agosto" -> ["vip", "cumple en agosto"], sin vacíos ni duplicados. */
function parsearEtiquetas(texto: string): string[] {
  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const cruda of texto.split(',')) {
    const limpia = cruda.trim();
    if (!limpia || vistas.has(limpia.toLowerCase())) continue;
    vistas.add(limpia.toLowerCase());
    resultado.push(limpia);
  }
  return resultado;
}

export default function SeccionClientes({
  clientes,
  cargando,
  esPreview,
  negocioId,
  vipDesdePuntos,
  onClienteActualizado,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borradorNota, setBorradorNota] = useState('');
  const [borradorEtiquetas, setBorradorEtiquetas] = useState('');
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const persistir = !esPreview && !!negocioId;
  const ahora = Date.now();

  const abrirEdicion = (cliente: ClienteDelNegocio) => {
    setEditandoId(cliente.clienteId);
    setBorradorNota(cliente.nota ?? '');
    setBorradorEtiquetas(cliente.etiquetas.join(', '));
    setErrorGuardado(null);
  };

  const cerrarEdicion = () => {
    setEditandoId(null);
    setErrorGuardado(null);
  };

  const guardarEdicion = async (clienteId: string) => {
    const etiquetas = parsearEtiquetas(borradorEtiquetas);
    const nota = borradorNota.trim();

    if (persistir && negocioId) {
      setGuardandoId(clienteId);
      const resultado = await actualizarNotaCliente(negocioId, clienteId, nota, etiquetas);
      setGuardandoId(null);
      if (!resultado.ok) {
        setErrorGuardado('No pudimos guardar. Probá de nuevo.');
        return;
      }
    }

    onClienteActualizado(clienteId, { nota: nota || null, etiquetas });
    setEditandoId(null);
  };

  const filtrados = useMemo(() => {
    const lista = clientes ?? [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (c) => c.nombre.toLowerCase().includes(q) || c.telefono.toLowerCase().includes(q),
    );
  }, [clientes, busqueda]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-texto-muted">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-sm font-medium">Cargando tus clientes…</p>
      </div>
    );
  }

  const hayClientes = (clientes?.length ?? 0) > 0;

  if (!hayClientes) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-borde bg-card px-6 py-12 text-center">
        <Users size={28} className="text-texto-muted" />
        <p className="max-w-xs text-sm leading-snug text-texto-muted">
          {esPreview
            ? 'En vista previa no hay clientes cargados. Cuando conectemos tu negocio vas a verlos acá apenas alguien sume sus primeros puntos.'
            : 'Todavía no tenés clientes — vas a verlos acá apenas alguien sume sus primeros puntos.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3">
        <Search size={18} className="shrink-0 text-texto-muted" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
        />
      </label>

      {filtrados.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-texto-muted">
          Ningún cliente coincide con “{busqueda.trim()}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((cliente) => {
            const editando = editandoId === cliente.clienteId;
            const guardando = guardandoId === cliente.clienteId;
            return (
              <li
                key={cliente.clienteId}
                className="flex flex-col gap-2.5 rounded-2xl border border-borde bg-card px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                      {cliente.nombre}
                      {vipDesdePuntos != null && cliente.puntos >= vipDesdePuntos && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-acento px-2 py-0.5 text-[10px] font-black text-on-acento">
                          <Crown size={10} strokeWidth={3} /> VIP
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-texto-muted">
                      {cliente.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="shrink-0" />
                          {cliente.telefono}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="shrink-0" />
                        {textoUltimaVisita(cliente.ultimaVisitaAt, ahora)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} className="shrink-0" />
                        {cliente.cantidadVisitas} {cliente.cantidadVisitas === 1 ? 'visita' : 'visitas'} ·{' '}
                        {formatPrecio(cliente.valorTotal)}
                      </span>
                      {cliente.recompensasUsadas > 0 && (
                        <span className="flex items-center gap-1">
                          <Gift size={12} className="shrink-0" />
                          {cliente.recompensasUsadas} {cliente.recompensasUsadas === 1 ? 'canje' : 'canjes'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-xl bg-premio-suave px-2.5 py-1.5">
                    <Coins size={14} className="text-premio" />
                    <span className="text-sm font-black text-acento">{formatPuntos(cliente.puntos)}</span>
                  </div>
                </div>

                {!editando && (cliente.etiquetas.length > 0 || cliente.nota) && (
                  <div className="flex flex-col gap-1.5">
                    {cliente.etiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cliente.etiquetas.map((etiqueta) => (
                          <span
                            key={etiqueta}
                            className="rounded-full bg-fondo px-2.5 py-1 text-[11px] font-semibold text-texto-muted"
                          >
                            {etiqueta}
                          </span>
                        ))}
                      </div>
                    )}
                    {cliente.nota && (
                      <p className="flex items-start gap-1.5 text-xs text-texto-muted">
                        <StickyNote size={12} className="mt-0.5 shrink-0" />
                        <span className="leading-snug">{cliente.nota}</span>
                      </p>
                    )}
                  </div>
                )}

                {editando ? (
                  <div className="flex flex-col gap-2 rounded-xl bg-fondo p-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-texto-muted">Nota</span>
                      <textarea
                        value={borradorNota}
                        onChange={(e) => setBorradorNota(e.target.value)}
                        rows={2}
                        placeholder="Ej: pide la mesa de la ventana, cumple años en agosto…"
                        className="w-full resize-none rounded-lg border border-borde bg-card px-3 py-2 text-sm outline-none placeholder:text-texto-muted/60 focus:border-acento"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-texto-muted">Etiquetas (separadas por coma)</span>
                      <input
                        value={borradorEtiquetas}
                        onChange={(e) => setBorradorEtiquetas(e.target.value)}
                        placeholder="Ej: VIP, cumpleañero, sin gluten"
                        className="w-full rounded-lg border border-borde bg-card px-3 py-2 text-sm outline-none placeholder:text-texto-muted/60 focus:border-acento"
                      />
                    </label>
                    {errorGuardado && <p className="text-xs font-semibold text-rojo">{errorGuardado}</p>}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cerrarEdicion}
                        disabled={guardando}
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-texto-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => guardarEdicion(cliente.clienteId)}
                        disabled={guardando}
                        className="flex items-center gap-1.5 rounded-lg bg-acento px-3 py-1.5 text-xs font-bold text-on-acento disabled:opacity-60"
                      >
                        {guardando && <Loader2 size={12} className="animate-spin" />}
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirEdicion(cliente)}
                    className="flex w-fit items-center gap-1.5 text-xs font-bold text-acento"
                  >
                    <Tag size={12} />
                    {cliente.etiquetas.length > 0 || cliente.nota ? 'Editar nota y etiquetas' : 'Agregar nota o etiqueta'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="px-1 text-xs text-texto-muted">
        {filtrados.length} de {clientes?.length ?? 0}{' '}
        {(clientes?.length ?? 0) === 1 ? 'cliente' : 'clientes'}, ordenados por última visita.
      </p>
    </div>
  );
}
