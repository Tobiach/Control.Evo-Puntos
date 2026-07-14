import { useState } from 'react';
import { motion } from 'motion/react';
import { AtSign, CheckCircle2, ChevronLeft, Loader2, Lock, Store } from 'lucide-react';
import {
  cerrarSesion,
  ingresarDueno,
  registrarDueno,
  supabaseEnabled,
  validarEmail,
  validarPassword,
} from '../../lib/auth';
import { useSesion } from '../../hooks/useSesion';

interface Props {
  onVolver: () => void;
}

export default function LoginDueno({ onVolver }: Props) {
  const { sesion, cargando } = useSesion();
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!supabaseEnabled) {
      setError('El registro de dueños se activa cuando se conecta el backend. Por ahora es solo demo.');
      return;
    }
    const falloEmail = validarEmail(email);
    const falloPassword = validarPassword(password);
    if (falloEmail || falloPassword) {
      setError(falloEmail ?? falloPassword);
      return;
    }
    setError(null);
    setEnviando(true);
    const resultado = esRegistro
      ? await registrarDueno(email, password)
      : await ingresarDueno(email, password);
    setEnviando(false);
    if (!resultado.ok) setError(resultado.error);
    // En éxito, `useSesion` detecta la sesión y muestra el estado logueado.
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
          <h2 className="text-2xl font-black tracking-tight">Cuenta de dueño</h2>
          <p className="text-sm text-texto-muted">Gestioná tu negocio en Control.Evo.</p>
        </div>
      </header>

      {!cargando && sesion ? (
        <SesionActiva emailSesion={sesion.user.email ?? ''} onVolver={onVolver} />
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-acento text-on-acento">
              <Store size={22} strokeWidth={2.2} />
            </span>
            <p className="text-sm leading-snug text-texto-muted">
              Creá tu cuenta para cargar tu negocio y ver quién vuelve. El panel llega pronto.
            </p>
          </div>

          <form onSubmit={enviar} className="flex flex-col gap-3">
            <label className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
              <AtSign size={18} className="shrink-0 text-acento" />
              <input
                type="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
              <Lock size={18} className="shrink-0 text-acento" />
              <input
                type="password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="Contraseña"
                autoComplete={esRegistro ? 'new-password' : 'current-password'}
                className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
              />
            </label>

            {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={enviando}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-60"
            >
              {enviando && <Loader2 size={18} className="animate-spin" />}
              {esRegistro ? 'Crear mi cuenta' : 'Ingresar'}
            </motion.button>

            <button
              type="button"
              onClick={() => {
                setEsRegistro((previo) => !previo);
                setError(null);
              }}
              className="self-center py-1 text-xs font-semibold text-texto-muted underline underline-offset-4"
            >
              {esRegistro ? '¿Ya tenés cuenta? Ingresá' : '¿Primera vez? Creá tu cuenta'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function SesionActiva({ emailSesion, onVolver }: { emailSesion: string; onVolver: () => void }) {
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    await cerrarSesion();
    setSaliendo(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-4">
        <CheckCircle2 size={22} className="shrink-0 text-verde-ok" />
        <p className="text-sm leading-snug">
          Sesión iniciada como <span className="font-bold">{emailSesion}</span>. Tu panel de dueño
          llega en la próxima fase.
        </p>
      </div>
      <button
        type="button"
        onClick={onVolver}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
      >
        Volver al inicio
      </button>
      <button
        type="button"
        onClick={salir}
        disabled={saliendo}
        className="self-center py-1 text-xs font-semibold text-texto-muted underline underline-offset-4 disabled:opacity-60"
      >
        Cerrar sesión
      </button>
    </motion.div>
  );
}
