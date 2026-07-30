import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Beef,
  CalendarDays,
  Camera,
  ChevronRight,
  Coffee,
  Compass,
  History,
  LayoutGrid,
  ShoppingCart,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Recompensa, Rubro } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import { fechaDeVisita, formatPuntos, historialCruzado } from '../../lib/club';
import { horarioValleActivoAhora } from '../../lib/misiones';
import { mesesDesde } from '../../lib/geo';
import { META_PROMO } from '../../lib/promos';

type Filtro = 'todos' | Rubro;

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  nombreCliente: string;
  /** Todavía no tiene relación con ningún negocio real: recién se sumó al club. */
  esNuevo: boolean;
  onAbrirNegocio: (negocio: Negocio) => void;
  /** CTA de la card "N locales cerca tuyo" → salta a la pestaña Explorar (mapa). */
  onIrAMapa: () => void;
}

const FILTROS: { id: Filtro; label: string; icono: LucideIcon }[] = [
  { id: 'todos', label: 'Todos', icono: LayoutGrid },
  { id: 'gastro', label: 'Gastro', icono: UtensilsCrossed },
  { id: 'super', label: 'Súper', icono: ShoppingCart },
  { id: 'carniceria', label: 'Carnicería', icono: Beef },
  { id: 'cafeteria', label: 'Cafetería', icono: Coffee },
];

/**
 * Filtro por intención ("¿qué tenés ganas de hacer?"), ortogonal al rubro. Derivado 100% de
 * `categoria` real de cada negocio — no es una etiqueta de ocasión inventada (por eso no hay
 * "en pareja"/"con amigos"/"en familia": no hay ningún dato real que distinga eso hoy).
 */
const INTENCIONES: { id: string; label: string; categorias: string[] }[] = [
  { id: 'tomar-algo', label: 'Tomar algo', categorias: ['Bar de tragos', 'Cervecería', 'Wine bar', 'Rooftop'] },
  { id: 'desayunar', label: 'Desayunar', categorias: ['Café', 'Panadería'] },
  { id: 'comer-afuera', label: 'Comer afuera', categorias: ['Bistró', 'Pizzería', 'Sushi', 'Rotisería'] },
];

export default function Marketplace({
  negocios,
  relaciones,
  nombreCliente,
  esNuevo,
  onAbrirNegocio,
  onIrAMapa,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [intencion, setIntencion] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    let lista = negocios.filter(
      (negocio) =>
        !texto ||
        negocio.nombre.toLowerCase().includes(texto) ||
        negocio.categoria.toLowerCase().includes(texto),
    );
    if (filtro !== 'todos') {
      lista = lista.filter(
        (negocio) => negocio.rubro === filtro || negocio.rubrosSecundarios?.includes(filtro),
      );
    }
    if (intencion) {
      const categorias = INTENCIONES.find((item) => item.id === intencion)?.categorias ?? [];
      lista = lista.filter((negocio) => categorias.includes(negocio.categoria));
    }
    return lista;
  }, [negocios, busqueda, filtro, intencion]);

  const sinCuraduria = filtro !== 'todos' || !!intencion || !!busqueda.trim();

  // Resumen personal: suma real de puntos donde el cliente ya tiene relación, más la
  // recompensa real más cercana entre TODOS sus negocios. Nunca implica que los puntos
  // se puedan mezclar entre locales — cada uno sigue siendo su propio saldo.
  const resumen = useMemo(() => {
    const conRelacion = negocios.filter((negocio) => relaciones[negocio.id]);
    if (conRelacion.length === 0) return null;
    const totalPuntos = conRelacion.reduce((suma, negocio) => suma + relaciones[negocio.id].puntos, 0);
    let mejor: { negocio: Negocio; recompensa: Recompensa; faltan: number } | null = null;
    for (const negocio of conRelacion) {
      const puntos = relaciones[negocio.id].puntos;
      for (const recompensa of negocio.recompensas) {
        const faltan = recompensa.pts - puntos;
        if (faltan <= 0 || (mejor && faltan >= mejor.faltan)) continue;
        mejor = { negocio, recompensa, faltan };
      }
    }
    return { totalPuntos, cantidadLocales: conRelacion.length, mejor };
  }, [negocios, relaciones]);

  // Ofertas reales: solo negocios con horario valle configurado por el dueño Y vigente
  // ahora mismo (día + franja horaria reales) — nunca un countdown decorativo.
  const activasAhora = useMemo(
    () => negocios.filter((negocio) => negocio.horarioValle && horarioValleActivoAhora(negocio.horarioValle)).slice(0, 3),
    [negocios],
  );

  // Los más elegidos: ranking real por clientes activos del local, sin inventar estrellas.
  const masElegidos = useMemo(
    () => [...negocios].sort((a, b) => b.clientesActivos - a.clientesActivos).slice(0, 3),
    [negocios],
  );

  // "Hoy pasa esto": SOLO negocios con puntos dobles vigentes ahora mismo. Sin fallback de
  // descubrimiento — si no hay ninguno activo en este momento, la sección no aparece
  // (mejor no mostrar nada que fingir una oferta que no existe).
  const hoyPasaEsto = activasAhora[0] ?? null;

  // Nuevos para vos: negocios donde el cliente todavía NO tiene relación (nunca fue), no
  // necesariamente nuevos en Premia.ar. Ordenados por clientes activos para priorizar calidad.
  const nuevosParaVos = useMemo(
    () =>
      negocios
        .filter((negocio) => !relaciones[negocio.id])
        .sort((a, b) => b.clientesActivos - a.clientesActivos)
        .slice(0, 3),
    [negocios, relaciones],
  );

  // Premia recomienda: solo negocios con historiaCorta cargada (ver negocios.ts) — nunca se
  // fuerza copy genérico para completar la sección.
  const premiaRecomienda = useMemo(() => negocios.filter((negocio) => negocio.historiaCorta).slice(0, 4), [negocios]);

  // Tu historia reciente: preview corta del mismo cruce que se ve completo en Perfil.
  const historiaReciente = useMemo(() => historialCruzado(negocios, relaciones, 3), [negocios, relaciones]);

  return (
    <div className="flex flex-col gap-4 px-5 pt-6 pb-10">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-texto-muted">Hola, {nombreCliente.split(' ')[0]} 👋</p>
          <h1 className="mt-1 text-[28px] leading-[1.1] font-extrabold tracking-tight text-texto">
            Descubrí dónde te premian hoy
          </h1>
          <p className="mt-1.5 text-sm text-texto-muted">Sumá puntos, desbloqueá beneficios y volvé por más.</p>
        </div>
        <img src="/premin.png" alt="Premín" className="h-11 w-11 shrink-0 object-contain" />
      </header>

      {!sinCuraduria && (
        <div className="overflow-hidden rounded-[28px] border border-borde bg-linear-to-b from-fondo-medio to-fondo">
          <div className="px-5 pt-5 pb-4">
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-verde-ok uppercase">
              Comunidad Premia
            </p>
            <h2 className="mt-2 max-w-[18ch] text-[26px] leading-[1.15] font-extrabold text-texto">
              Cada compra puede conectarte con algo nuevo.
            </h2>
            <p className="mt-2.5 max-w-[32ch] text-sm leading-relaxed text-texto-muted">
              Descubrí comercios, compartí beneficios y formá parte de una comunidad que te premia
              por volver.
            </p>
            <button
              type="button"
              onClick={onIrAMapa}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-dark px-5 py-3 text-sm font-bold text-white active:opacity-90"
            >
              Explorar comunidad
              <ChevronRight size={16} strokeWidth={2.8} className="text-acento" />
            </button>
          </div>
          <img
            src="/banner-comunidad.png"
            alt="Premín conectando gente con cafés, restaurantes, almacenes, bares y carnicerías del barrio"
            className="aspect-square w-full object-cover object-right"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-texto-muted">¿Qué tenés ganas de hacer?</p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {INTENCIONES.map(({ id, label }) => {
            const activo = intencion === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setIntencion(activo ? null : id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  activo ? 'bg-acento text-on-acento' : 'border border-borde bg-card text-texto-muted'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {resumen && (
        <div className="rounded-3xl border border-borde bg-card p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-texto-muted">Puntos sumados</p>
              <p className="font-titulo text-4xl leading-none font-extrabold tracking-tight text-premio">
                {formatPuntos(resumen.totalPuntos)}
              </p>
              <p className="mt-1.5 text-[11px] text-texto-muted">
                En {resumen.cantidadLocales} {resumen.cantidadLocales === 1 ? 'local' : 'locales'} — no se
                mezclan entre sí, cada uno es su propio saldo
              </p>
            </div>
            <TrendingUp size={20} className="shrink-0 text-verde-ok" strokeWidth={2.4} />
          </div>

          {resumen.mejor && (
            <div className="mt-4 rounded-2xl bg-premio-suave px-4 py-3">
              <p className="text-xs font-bold text-premio">
                Te faltan {formatPuntos(resumen.mejor.faltan)} pts en {resumen.mejor.negocio.nombre}
              </p>
              <p className="mt-0.5 text-[11px] text-texto-muted">para {resumen.mejor.recompensa.descripcion}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-borde">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      100,
                      (relaciones[resumen.mejor.negocio.id].puntos / resumen.mejor.recompensa.pts) * 100,
                    )}%`,
                  }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-full bg-acento"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {esNuevo && !sinCuraduria && negocios.length > 0 && (
        <button
          type="button"
          onClick={onIrAMapa}
          className="flex items-center justify-between gap-3 rounded-[20px] bg-surface-dark px-[18px] py-[18px] text-left"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">
              📍 {negocios.length === 1 ? '1 local cerca tuyo' : `${negocios.length} locales cerca tuyo`}
            </p>
            <p className="mt-0.5 text-xs text-white/65">Empezá por uno de los más elegidos.</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-premio-claro">
            Ver mapa <ChevronRight size={14} strokeWidth={2.5} />
          </span>
        </button>
      )}

      <label className="flex h-[50px] items-center gap-2.5 rounded-2xl border border-borde bg-card px-4 shadow-[0_4px_14px_rgba(30,36,48,0.05)] focus-within:border-acento">
        <Search size={17} className="shrink-0 text-texto-muted" />
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar cafés, restaurantes o comercios"
          className="w-full bg-transparent text-sm font-medium text-texto outline-none placeholder:text-texto-muted"
        />
      </label>

      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTROS.map(({ id, label, icono: Icono }) => {
          const activo = filtro === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              className="flex w-14 shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-[46px] w-[46px] items-center justify-center rounded-full shadow-[0_4px_10px_rgba(30,36,48,0.10)] ${
                  activo ? 'bg-acento' : 'bg-card'
                }`}
              >
                <Icono size={19} className={activo ? 'text-on-acento' : 'text-texto-muted'} strokeWidth={2.2} />
              </span>
              <span className={`text-center text-[10px] font-bold ${activo ? 'text-acento' : 'text-texto'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {nuevosParaVos.length > 0 && !sinCuraduria && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-texto-muted uppercase">
            <Compass size={13} className="text-acento" /> Nuevos para vos
          </p>
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nuevosParaVos.map((negocio) => (
              <button
                key={negocio.id}
                type="button"
                onClick={() => onAbrirNegocio(negocio)}
                className="flex w-[132px] shrink-0 flex-col gap-1.5 rounded-2xl border border-borde bg-card p-2.5 text-left"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl text-base ${
                    negocio.logoUrl ? 'bg-white' : 'bg-premio-suave'
                  }`}
                >
                  {negocio.logoUrl ? (
                    <img src={negocio.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    negocio.emoji
                  )}
                </span>
                <span className="truncate text-xs font-bold text-texto">{negocio.nombre}</span>
                <span className="text-[10px] text-texto-muted">{negocio.categoria} · nunca fuiste</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {masElegidos.length > 0 && !sinCuraduria && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-texto-muted uppercase">
            <Trophy size={13} className="text-premio" /> Los más elegidos
          </p>
          <div className="flex flex-col gap-2">
            {masElegidos.map((negocio, indice) => {
              const activo = negocio.horarioValle && horarioValleActivoAhora(negocio.horarioValle);
              const colorNumero = indice === 0 ? 'text-premio' : indice === 1 ? 'text-texto' : 'text-acento';
              return (
                <button
                  key={negocio.id}
                  type="button"
                  onClick={() => onAbrirNegocio(negocio)}
                  className="flex items-center gap-3 rounded-2xl border border-borde bg-card p-3 text-left"
                >
                  <span className={`font-titulo w-5 shrink-0 text-center text-lg font-extrabold ${colorNumero}`}>
                    {indice + 1}
                  </span>
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl ${
                      negocio.logoUrl ? 'bg-white' : 'bg-fondo-medio'
                    }`}
                  >
                    {negocio.logoUrl ? (
                      <img src={negocio.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      negocio.emoji
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-texto">{negocio.nombre}</span>
                      {activo && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-verde-ok" />}
                    </span>
                    <span className="block text-[11px] text-texto-muted">{negocio.categoria}</span>
                    <span className="block text-[11px] font-semibold text-texto-muted">
                      {negocio.clientesActivos} personas lo eligieron esta semana
                    </span>
                    {activo && (
                      <span className="mt-0.5 block text-[11px] font-bold text-acento">
                        🔥 Puntos x2 hasta las {negocio.horarioValle?.hasta}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hoyPasaEsto && !sinCuraduria && (
        <button
          type="button"
          onClick={() => onAbrirNegocio(hoyPasaEsto)}
          className="rounded-2xl bg-surface-dark px-4 py-3.5 text-left"
        >
          <p className="text-[10px] font-extrabold tracking-widest text-premio-claro uppercase">🔥 Hoy pasa esto</p>
          <p className="mt-1.5 text-sm font-bold text-white">
            {hoyPasaEsto.nombre}
            {hoyPasaEsto.promos?.[0] ? ` — ${hoyPasaEsto.promos[0].titulo}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-white/60">
            Puntos dobles hasta las {hoyPasaEsto.horarioValle?.hasta}
          </p>
        </button>
      )}

      {premiaRecomienda.length > 0 && !sinCuraduria && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-texto-muted uppercase">
            <Sparkles size={13} className="text-premio" /> Premia recomienda
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {premiaRecomienda.map((negocio) => (
              <button
                key={negocio.id}
                type="button"
                onClick={() => onAbrirNegocio(negocio)}
                className="overflow-hidden rounded-2xl border border-borde bg-card text-left"
              >
                {negocio.portadaUrl ? (
                  <img src={negocio.portadaUrl} alt="" className="h-24 w-full object-cover" />
                ) : (
                  <div className="flex h-24 w-full flex-col items-center justify-center gap-1 border-b border-dashed border-borde-fuerte bg-fondo-medio">
                    <Camera size={18} className="text-texto-disabled" />
                    <span className="text-[9px] font-bold text-texto-disabled">Foto pendiente</span>
                  </div>
                )}
                <div className="px-2.5 py-2">
                  <p className="text-[9px] font-bold tracking-wide text-texto-muted uppercase">{negocio.categoria}</p>
                  <p className="mt-0.5 text-xs leading-tight font-bold text-texto">{negocio.historiaCorta}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {historiaReciente.length > 0 && !sinCuraduria && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-texto-muted uppercase">
            <History size={13} className="text-texto-muted" /> Tu historia reciente
          </p>
          <div className="flex flex-col gap-2">
            {historiaReciente.map(({ negocio, visita }, indice) => (
              <button
                key={`${negocio.id}-${indice}`}
                type="button"
                onClick={() => onAbrirNegocio(negocio)}
                className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3 text-left"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-base ${
                    negocio.logoUrl ? 'bg-white' : 'bg-premio-suave'
                  }`}
                >
                  {negocio.logoUrl ? (
                    <img src={negocio.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                  ) : (
                    negocio.emoji
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-texto">{negocio.nombre}</p>
                  <p className="text-xs text-texto-muted capitalize">{fechaDeVisita(visita.diasAtras, 'es-AR')}</p>
                </div>
                <span className="font-titulo shrink-0 text-sm font-bold text-premio">
                  +{formatPuntos(visita.puntos)} pts
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {visibles.map((negocio) => (
            <TarjetaNegocio
              key={negocio.id}
              negocio={negocio}
              relacion={relaciones[negocio.id]}
              onAbrir={() => onAbrirNegocio(negocio)}
            />
          ))}
        </AnimatePresence>
        {visibles.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-borde bg-card px-4 py-6 text-center text-sm text-texto-muted"
          >
            No encontramos locales con esa búsqueda. Probá con otro nombre.
          </motion.p>
        )}
      </div>
    </div>
  );
}

function TarjetaNegocio({
  negocio,
  relacion,
  onAbrir,
}: {
  negocio: Negocio;
  relacion: RelacionNegocio | undefined;
  onAbrir: () => void;
}) {
  const meses = mesesDesde(negocio.fechaAlta);

  return (
    <motion.button
      layout
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileTap={{ scale: 0.97 }}
      onClick={onAbrir}
      className="w-full overflow-hidden rounded-3xl border border-borde bg-fondo text-left shadow-sm"
    >
      <div className="flex items-center gap-3 bg-card px-4 pt-4 pb-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl ${
            negocio.logoUrl ? 'bg-white' : 'bg-premio-suave'
          }`}
        >
          {negocio.logoUrl ? (
            <img src={negocio.logoUrl} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            negocio.emoji
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base leading-tight font-bold text-texto">{negocio.nombre}</p>
          <span className="mt-1 inline-block rounded-full bg-premio-suave px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-acento uppercase">
            {negocio.categoria}
          </span>
        </div>
      </div>

      {negocio.promos && negocio.promos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {negocio.promos.slice(0, 3).map((promo) => {
            const meta = META_PROMO[promo.tipo];
            const Icono = meta.icono;
            return (
              <span
                key={promo.titulo}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ background: `${meta.color}22`, color: meta.color }}
              >
                <Icono size={11} strokeWidth={2.5} /> {promo.titulo}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {negocio.recompensas.slice(0, 3).map((recompensa) => (
          <span
            key={recompensa.descripcion}
            className="rounded-full border border-borde px-2.5 py-1 text-[10px] font-semibold text-texto-muted"
          >
            🎁 {recompensa.descripcion} · {formatPuntos(recompensa.pts)} pts
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
        {relacion ? (
          <p className="text-sm font-bold text-acento">
            Tenés {formatPuntos(relacion.puntos)} pts acá
          </p>
        ) : (
          <p className="text-sm font-semibold text-texto-muted">
            Sumate — todavía no tenés puntos acá
          </p>
        )}
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-texto-muted">
          {negocio.clientesActivos >= 100 ? (
            <>
              <Users size={12} /> Ya lo usan {negocio.clientesActivos} personas
            </>
          ) : (
            <>
              <CalendarDays size={12} /> Hace {meses} {meses === 1 ? 'mes' : 'meses'} en Premia.ar
            </>
          )}
        </span>
      </div>
    </motion.button>
  );
}
