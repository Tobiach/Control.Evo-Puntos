import { useState } from 'react';
import { Check, Copy, KeyRound, LocateFixed, Loader2, MapPin, Plus, Store, X } from 'lucide-react';
import type { Rubro } from '../../data/mockClientes';
import type { DatosNegocioForm } from '../../lib/panelDueno';
import type { Coordenadas } from '../../lib/geo';

type EstadoGeo =
  | { estado: 'inactivo' }
  | { estado: 'pidiendo' }
  | { estado: 'ok' }
  | { estado: 'error'; mensaje: string };

const RUBROS: { valor: Rubro; etiqueta: string }[] = [
  { valor: 'gastro', etiqueta: 'Gastronomía' },
  { valor: 'super', etiqueta: 'Supermercado' },
  { valor: 'carniceria', etiqueta: 'Carnicería' },
];

const DIAS_SEMANA = [
  { valor: 1, etiqueta: 'L' },
  { valor: 2, etiqueta: 'M' },
  { valor: 3, etiqueta: 'X' },
  { valor: 4, etiqueta: 'J' },
  { valor: 5, etiqueta: 'V' },
  { valor: 6, etiqueta: 'S' },
  { valor: 0, etiqueta: 'D' },
];

interface Props {
  negocio: DatosNegocioForm;
  onCambiar: (parche: Partial<DatosNegocioForm>) => void;
}

const claseInput =
  'w-full rounded-2xl border border-borde bg-card px-4 py-3.5 text-base font-medium outline-none placeholder:text-texto-muted/60 focus:border-acento';

export default function SeccionNegocio({ negocio, onCambiar }: Props) {
  const [geo, setGeo] = useState<EstadoGeo>({ estado: 'inactivo' });
  const [nuevoVip, setNuevoVip] = useState('');
  const [copiado, setCopiado] = useState(false);
  const valle = negocio.horarioValle;

  const copiarCodigo = async () => {
    if (!negocio.id) return;
    await navigator.clipboard.writeText(negocio.id);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const setPin = (texto: string) => {
    const digitos = texto.replace(/\D/g, '').slice(0, 4);
    onCambiar({ pinCajero: digitos || null });
  };

  const pedirUbicacion = () => {
    if (!('geolocation' in navigator)) {
      setGeo({ estado: 'error', mensaje: 'Tu navegador no soporta geolocalización. Cargala a mano.' });
      return;
    }
    setGeo({ estado: 'pidiendo' });
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const coords: Coordenadas = {
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
        };
        onCambiar({ lat: coords.lat, lng: coords.lng });
        setGeo({ estado: 'ok' });
      },
      (error) =>
        setGeo({
          estado: 'error',
          mensaje:
            error.code === error.PERMISSION_DENIED
              ? 'No nos diste permiso de ubicación. Activalo o cargala a mano.'
              : 'No pudimos obtener tu ubicación. Cargala a mano.',
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const setCoord = (campo: 'lat' | 'lng', texto: string) => {
    const numero = texto.trim() === '' ? null : Number(texto);
    onCambiar({ [campo]: numero != null && Number.isFinite(numero) ? numero : null });
  };

  const toggleValle = () => {
    onCambiar(valle ? { horarioValle: null } : { horarioValle: { desde: '15:00', hasta: '17:00', dias: [] } });
  };

  const toggleDia = (dia: number) => {
    if (!valle) return;
    const dias = valle.dias.includes(dia)
      ? valle.dias.filter((d) => d !== dia)
      : [...valle.dias, dia];
    onCambiar({ horarioValle: { ...valle, dias } });
  };

  const agregarVip = () => {
    const texto = nuevoVip.trim();
    if (!texto) return;
    onCambiar({ beneficiosVip: [...negocio.beneficiosVip, texto] });
    setNuevoVip('');
  };

  const quitarVip = (indice: number) => {
    onCambiar({ beneficiosVip: negocio.beneficiosVip.filter((_, i) => i !== indice) });
  };

  return (
    <div className="flex flex-col gap-5">
      <Campo etiqueta="Nombre del negocio">
        <input
          value={negocio.nombre}
          onChange={(e) => onCambiar({ nombre: e.target.value })}
          placeholder="Café Nardo"
          className={claseInput}
        />
      </Campo>

      <Campo etiqueta="Código de tu negocio (para el cajero)">
        {negocio.id ? (
          <button
            type="button"
            onClick={copiarCodigo}
            className="flex w-full items-center justify-between rounded-2xl border border-borde bg-card px-4 py-3.5 text-left"
          >
            <span className="font-mono text-sm font-bold">{negocio.id}</span>
            {copiado ? (
              <Check size={18} className="shrink-0 text-verde-ok" />
            ) : (
              <Copy size={18} className="shrink-0 text-texto-muted" />
            )}
          </button>
        ) : (
          <p className="rounded-2xl border border-borde bg-card px-4 py-3.5 text-sm text-texto-muted">
            Se genera al guardar el negocio por primera vez.
          </p>
        )}
      </Campo>

      <Campo etiqueta="PIN de cajero (4 dígitos)">
        <label className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
          <KeyRound size={18} className="shrink-0 text-acento" />
          <input
            inputMode="numeric"
            value={negocio.pinCajero ?? ''}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Ej: 1234"
            className="w-full bg-transparent text-base font-medium tracking-widest outline-none placeholder:text-texto-muted/60 placeholder:tracking-normal"
          />
        </label>
        {!negocio.pinCajero && (
          <p className="mt-1 px-1 text-xs font-semibold text-rojo">
            Sin PIN, tu cajero no va a poder entrar a cobrar.
          </p>
        )}
      </Campo>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Campo etiqueta="Categoría">
          <input
            value={negocio.categoria}
            onChange={(e) => onCambiar({ categoria: e.target.value })}
            placeholder="Café"
            className={claseInput}
          />
        </Campo>
        <Campo etiqueta="Emoji">
          <input
            value={negocio.emoji}
            onChange={(e) => onCambiar({ emoji: e.target.value.slice(0, 2) })}
            placeholder="☕"
            className={`${claseInput} w-16 text-center text-2xl`}
          />
        </Campo>
      </div>

      <Campo etiqueta="Rubro">
        <div className="flex gap-2">
          {RUBROS.map(({ valor, etiqueta }) => {
            const activo = negocio.rubro === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => onCambiar({ rubro: valor })}
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
                  activo
                    ? 'border-acento bg-acento text-on-acento'
                    : 'border-borde bg-card text-texto-muted'
                }`}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>
      </Campo>

      <Campo etiqueta="Ubicación">
        <button
          type="button"
          onClick={pedirUbicacion}
          disabled={geo.estado === 'pidiendo'}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-acento bg-premio-suave py-3 text-sm font-bold text-acento disabled:opacity-60"
        >
          {geo.estado === 'pidiendo' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LocateFixed size={16} />
          )}
          Usar mi ubicación actual
        </button>
        {geo.estado === 'error' && (
          <p className="mb-2 px-1 text-xs font-semibold text-rojo">{geo.mensaje}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <input
            inputMode="decimal"
            value={negocio.lat ?? ''}
            onChange={(e) => setCoord('lat', e.target.value)}
            placeholder="Latitud"
            className={claseInput}
          />
          <input
            inputMode="decimal"
            value={negocio.lng ?? ''}
            onChange={(e) => setCoord('lng', e.target.value)}
            placeholder="Longitud"
            className={claseInput}
          />
        </div>
        {negocio.lat != null && negocio.lng != null && (
          <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-medium text-texto-muted">
            <MapPin size={13} className="text-acento" />
            {negocio.lat.toFixed(5)}, {negocio.lng.toFixed(5)}
          </p>
        )}
      </Campo>

      <Campo etiqueta="Horario valle (puntos x2, opcional)">
        <button
          type="button"
          onClick={toggleValle}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
            valle ? 'border-acento bg-premio-suave text-acento' : 'border-borde bg-card text-texto-muted'
          }`}
        >
          {valle ? 'Activado' : 'Sin horario valle'}
          <span className="text-xs font-semibold">{valle ? 'Tocá para quitar' : 'Tocá para activar'}</span>
        </button>
        {valle && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-borde bg-card px-3 py-2.5">
                <span className="text-xs font-semibold text-texto-muted">Desde</span>
                <input
                  type="time"
                  value={valle.desde}
                  onChange={(e) => onCambiar({ horarioValle: { ...valle, desde: e.target.value } })}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-borde bg-card px-3 py-2.5">
                <span className="text-xs font-semibold text-texto-muted">Hasta</span>
                <input
                  type="time"
                  value={valle.hasta}
                  onChange={(e) => onCambiar({ horarioValle: { ...valle, hasta: e.target.value } })}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </label>
            </div>
            <div className="flex justify-between gap-1.5">
              {DIAS_SEMANA.map(({ valor, etiqueta }) => {
                const activo = valle.dias.includes(valor);
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => toggleDia(valor)}
                    className={`h-9 flex-1 rounded-xl text-xs font-bold transition-colors ${
                      activo ? 'bg-acento text-on-acento' : 'bg-card text-texto-muted border border-borde'
                    }`}
                  >
                    {etiqueta}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Campo>

      <Campo etiqueta="Beneficios VIP">
        <div className="flex gap-2">
          <input
            value={nuevoVip}
            onChange={(e) => setNuevoVip(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregarVip();
              }
            }}
            placeholder="Mesa preferencial sin espera"
            className={claseInput}
          />
          <button
            type="button"
            onClick={agregarVip}
            aria-label="Agregar beneficio VIP"
            className="flex shrink-0 items-center justify-center rounded-2xl bg-acento px-4 text-on-acento active:bg-acento-hover"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
        {negocio.beneficiosVip.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {negocio.beneficiosVip.map((beneficio, indice) => (
              <li
                key={`${beneficio}-${indice}`}
                className="flex items-center justify-between gap-2 rounded-xl bg-fondo px-3.5 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Store size={14} className="shrink-0 text-acento" />
                  {beneficio}
                </span>
                <button
                  type="button"
                  onClick={() => quitarVip(indice)}
                  aria-label="Quitar beneficio"
                  className="shrink-0 text-texto-muted"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Campo>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="px-1 text-xs font-bold uppercase tracking-wide text-texto-muted">{etiqueta}</span>
      {children}
    </div>
  );
}
