import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, KeyRound, Loader2, Lock } from 'lucide-react';
import { actualizarPassword, cerrarSesion, validarPassword } from '../../lib/auth';
import { useSesion } from '../../hooks/useSesion';

interface Props {
  /** Sale del flujo de restablecimiento y vuelve al inicio de la app. */
  onListo: () => void;
}

/**
 * Pantalla a la que llega el usuario tras tocar el link de "olvidé mi contraseña".
 * Supabase ya dejó una sesión de recuperación activa (parseó el hash del link solo),
 * así que acá solo se pide la nueva contraseña — no el email. Ver `esModoRecuperacion`
 * y el mecanismo `?modo=restablecer` documentado en `auth.ts` / `App.tsx`.
 */
export default function RestablecerPassword({ onListo }: Props) {
  const { sesion, cargando } = useSesion();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  const salir = () => {
    // Limpiar la URL (sacar el ?modo y el hash del token) para no re-disparar el flujo.
    window.history.replaceState(null, '', window.location.pathname);
    onListo();
  };

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const fallo = validarPassword(password);
    if (fallo) {
      setError(fallo);
      return;
    }
    setError(null);
    setGuardando(true);
    const resultado = await actualizarPassword(password);
    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    // Cerramos la sesión de recuperación para forzar un ingreso limpio con la clave nueva.
    await cerrarSesion();
    setListo(true);
  };

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-acento text-on-acento">
          <KeyRound size={22} strokeWidth={2.2} />
        </span>
        <div>
          <h2 className="font-titulo text-2xl font-bold tracking-tight">Nueva contraseña</h2>
          <p className="text-sm text-texto-muted">Elegí una clave nueva para tu cuenta.</p>
        </div>
      </header>

      {listo ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-acento bg-premio-suave px-4 py-4 text-sm font-semibold text-acento">
            <CheckCircle2 size={20} className="shrink-0" />
            Listo, guardamos tu nueva contraseña. Ya podés ingresar con ella.
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={salir}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
          >
            Ir a ingresar
          </motion.button>
        </div>
      ) : cargando ? (
        <div className="flex items-center gap-2 px-1 text-sm text-texto-muted">
          <Loader2 size={18} className="animate-spin" />
          Verificando el link…
        </div>
      ) : !sesion ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-2xl border border-borde bg-card px-4 py-4 text-sm leading-snug text-texto-muted">
            El link de recuperación expiró o ya se usó. Volvé a ingresar y pedí uno nuevo desde
            “¿Olvidaste tu contraseña?”.
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={salir}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
          >
            Volver al inicio
          </motion.button>
        </div>
      ) : (
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <label className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
            <Lock size={18} className="shrink-0 text-acento" />
            <input
              type="password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              placeholder="Nueva contraseña"
              autoComplete="new-password"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
            />
          </label>

          {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={guardando}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-60"
          >
            {guardando && <Loader2 size={18} className="animate-spin" />}
            Guardar nueva contraseña
          </motion.button>
        </form>
      )}
    </div>
  );
}
