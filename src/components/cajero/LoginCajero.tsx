import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Eye, KeyRound, Loader2, Store } from 'lucide-react';
import type { RubroData } from '../../data/mockClientes';
import { soloDigitos } from '../../lib/club';
import { supabaseEnabled } from '../../lib/auth';
import { verificarPinCajero, type NegocioCajero } from '../../lib/panelCajero';
import PanelCajero from './PanelCajero';

interface Props {
  data: RubroData;
  onVolver: () => void;
}

const LARGO_PIN = 4;

export default function LoginCajero({ data, onVolver }: Props) {
  // Sesión de cajero conectada (PIN validado contra el negocio real).
  const [sesion, setSesion] = useState<{ negocio: NegocioCajero; pin: string } | null>(null);
  const [demoActivo, setDemoActivo] = useState(false);

  const [negocioId, setNegocioId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  if (sesion) {
    return (
      <PanelCajero
        modo="conectado"
        negocio={sesion.negocio}
        pin={sesion.pin}
        onSalir={() => setSesion(null)}
      />
    );
  }

  if (demoActivo) {
    return <PanelCajero modo="demo" data={data} onSalir={() => setDemoActivo(false)} />;
  }

  const ingresar = async () => {
    if (verificando) return;
    if (pin.length !== LARGO_PIN) {
      setError('Ingresá el PIN de 4 dígitos.');
      return;
    }
    if (!supabaseEnabled) {
      // Sin backend conectado: cualquier PIN de 4 dígitos entra al panel demo.
      setDemoActivo(true);
      return;
    }
    if (!negocioId.trim()) {
      setError('Ingresá el código de tu negocio.');
      return;
    }
    setError(null);
    setVerificando(true);
    const resultado = await verificarPinCajero(negocioId, pin);
    setVerificando(false);
    if (!resultado.ok) {
      setError(
        resultado.error === 'pin-invalido'
          ? 'El código o el PIN no coinciden. Revisalos e intentá de nuevo.'
          : 'No pudimos verificar tu PIN. Revisá tu conexión e intentá de nuevo.',
      );
      return;
    }
    setSesion({ negocio: resultado.valor, pin });
  };

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver"
          className="rounded-full border border-borde bg-card p-2 text-texto-muted"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Caja del negocio</h2>
          <p className="text-sm text-texto-muted">Ingresá con el PIN que te dio el dueño.</p>
        </div>
      </header>

      <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-acento text-on-acento">
          <KeyRound size={22} strokeWidth={2.2} />
        </span>
        <p className="text-sm leading-snug text-texto-muted">
          El PIN identifica que cobrás en nombre del negocio. No necesitás cuenta propia.
        </p>
      </div>

      {supabaseEnabled && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-widest text-texto-muted uppercase">
            Código del negocio
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
            <Store size={17} className="shrink-0 text-acento" />
            <input
              type="text"
              value={negocioId}
              onChange={(evento) => {
                setNegocioId(evento.target.value);
                setError(null);
              }}
              placeholder="Ej: cafe-nardo-a3f9k"
              autoCapitalize="none"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold tracking-widest text-texto-muted uppercase">
          PIN de 4 dígitos
        </label>
        <PinInput
          valor={pin}
          onCambiar={(nuevo) => {
            setPin(nuevo);
            setError(null);
          }}
        />
      </div>

      {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={ingresar}
        disabled={verificando}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-60"
      >
        {verificando && <Loader2 size={18} className="animate-spin" />}
        Entrar a la caja
      </motion.button>

      {!supabaseEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-premio/40 bg-premio-suave px-4 py-3">
          <Eye size={18} className="mt-0.5 shrink-0 text-acento" />
          <p className="text-sm leading-snug text-texto">
            <span className="font-bold">Modo demo.</span> Todavía no hay backend conectado: poné
            cualquier PIN de 4 dígitos para probar la caja de {data.nombreNegocio}.
          </p>
        </div>
      )}
    </div>
  );
}

function PinInput({
  valor,
  onCambiar,
}: {
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const celdas = Array.from({ length: LARGO_PIN });

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.focus()}
      className="flex w-full gap-3"
      aria-label="Ingresar PIN"
    >
      {celdas.map((_, indice) => {
        const cargada = indice < valor.length;
        return (
          <span
            key={indice}
            className={`flex h-14 flex-1 items-center justify-center rounded-2xl border text-2xl font-black ${
              indice === valor.length
                ? 'border-acento bg-card text-acento'
                : 'border-borde bg-card text-texto'
            }`}
          >
            {cargada ? '•' : ''}
          </span>
        );
      })}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={valor}
        onChange={(evento) => {
          const digitos = soloDigitos(evento.target.value).slice(0, LARGO_PIN);
          onCambiar(digitos);
        }}
        className="sr-only"
        aria-hidden="true"
      />
    </button>
  );
}
