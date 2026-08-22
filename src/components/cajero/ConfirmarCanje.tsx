import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, KeyRound, Loader2 } from 'lucide-react';
import { confirmarCanje } from '../../lib/panelCajero';

interface Props {
  negocioId: string;
  pin: string;
}

const LARGO_CODIGO = 6;

/**
 * Confirmación en el mostrador del código de 6 caracteres que el cliente muestra en su
 * teléfono (migración 0021). El cajero tiene un cliente esperando: foco automático, sin
 * clicks previos para poder escribir, y el input no se limpia en un error para que pueda
 * corregir y reintentar sin volver a tipear todo.
 */
export default function ConfirmarCanje({ negocioId, pin }: Props) {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ descripcion: string; clienteNombre: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!resultado) return;
    const id = setTimeout(() => {
      setResultado(null);
      setCodigo('');
      inputRef.current?.focus();
    }, 3000);
    return () => clearTimeout(id);
  }, [resultado]);

  const confirmar = async () => {
    if (enviando || codigo.length !== LARGO_CODIGO) return;
    setError(null);
    setEnviando(true);
    const respuesta = await confirmarCanje(negocioId, pin, codigo);
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return; // no limpiamos el input: el cajero corrige y reintenta
    }
    setResultado(respuesta.valor);
  };

  if (resultado) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center gap-1.5 rounded-3xl border border-borde bg-card px-5 py-8 text-center shadow-lg"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-verde-ok/15 text-verde-ok"
        >
          <BadgeCheck size={26} />
        </motion.span>
        <h3 className="text-lg font-black text-verde-ok">Premio entregado</h3>
        <p className="text-sm font-bold text-texto">{resultado.descripcion}</p>
        <p className="text-xs text-texto-muted">{resultado.clienteNombre}</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold tracking-widest text-texto-muted uppercase">
          Código del cliente
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
          <KeyRound size={17} className="shrink-0 text-acento" />
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            value={codigo}
            onChange={(evento) => {
              const limpio = evento.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, LARGO_CODIGO);
              setCodigo(limpio);
              setError(null);
            }}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') void confirmar();
            }}
            placeholder="Ej: A1B2C3"
            className="w-full bg-transparent text-2xl font-black tracking-[0.2em] outline-none placeholder:text-texto-muted/40"
          />
        </div>
      </div>

      {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={confirmar}
        disabled={enviando || codigo.length !== LARGO_CODIGO}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-40"
      >
        {enviando && <Loader2 size={18} className="animate-spin" />}
        Confirmar canje
      </motion.button>
    </div>
  );
}
