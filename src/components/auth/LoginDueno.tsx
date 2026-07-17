import { useState } from 'react';
import { motion } from 'motion/react';
import { AtSign, ChevronLeft, Eye, Loader2, Lock, Store } from 'lucide-react';
import {
  cerrarSesion,
  ingresarDueno,
  registrarDueno,
  solicitarRecuperacion,
  supabaseEnabled,
  validarEmail,
  validarPassword,
} from '../../lib/auth';
import { useSesion } from '../../hooks/useSesion';
import PanelDueno from '../dueno/PanelDueno';

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
  const [previsualizando, setPrevisualizando] = useState(false);
  const [confirmacionPendiente, setConfirmacionPendiente] = useState(false);
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const falloEmail = validarEmail(email);
    if (falloEmail) {
      setError(falloEmail);
      return;
    }

    if (modoRecuperar) {
      setError(null);
      setEnviando(true);
      const resultado = await solicitarRecuperacion(email);
      setEnviando(false);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setLinkEnviado(true);
      return;
    }

    const falloPassword = validarPassword(password);
    if (falloPassword) {
      setError(falloPassword);
      return;
    }
    setError(null);
    setConfirmacionPendiente(false);
    setEnviando(true);
    const resultado = esRegistro
      ? await registrarDueno(email, password)
      : await ingresarDueno(email, password);
    setEnviando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    if (esRegistro && !resultado.session) {
      // Cuenta creada, pero Supabase exige confirmar el email antes de dar sesión.
      setConfirmacionPendiente(true);
      return;
    }
    // En éxito con sesión inmediata, `useSesion` la detecta y se muestra el panel.
  };

  // Dueño logueado de verdad → panel real, con persistencia en Supabase.
  if (!cargando && sesion) {
    return (
      <PanelDueno
        modo="conectado"
        duenoUserId={sesion.user.id}
        emailSesion={sesion.user.email ?? ''}
        onVolver={onVolver}
        onCerrarSesion={cerrarSesion}
      />
    );
  }

  // Vista previa (sin backend conectado): panel en memoria, sin persistir.
  if (previsualizando) {
    return <PanelDueno modo="preview" onVolver={() => setPrevisualizando(false)} />;
  }

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
          <h2 className="font-titulo text-2xl font-bold tracking-tight">Cuenta de dueño</h2>
          <p className="text-sm text-texto-muted">Gestioná tu negocio en SumaPuntos.</p>
        </div>
      </header>

      <div className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-acento text-on-acento">
          <Store size={22} strokeWidth={2.2} />
        </span>
        <p className="text-sm leading-snug text-texto-muted">
          Creá tu cuenta para cargar tu negocio, tus recompensas y ver quién vuelve.
        </p>
      </div>

      {supabaseEnabled ? (
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

          {!modoRecuperar && (
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
          )}

          {error && <p className="px-1 text-sm font-semibold text-rojo">{error}</p>}
          {confirmacionPendiente && (
            <p className="rounded-2xl border border-acento bg-premio-suave px-4 py-3 text-sm font-semibold text-acento">
              Creamos tu cuenta. Te enviamos un email a {email} — abrilo y confirmá antes de
              ingresar (revisá spam si no lo ves).
            </p>
          )}
          {linkEnviado && (
            <p className="rounded-2xl border border-acento bg-premio-suave px-4 py-3 text-sm font-semibold text-acento">
              Te enviamos un link a {email} — revisá tu bandeja y spam para restablecer tu
              contraseña.
            </p>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={enviando}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-60"
          >
            {enviando && <Loader2 size={18} className="animate-spin" />}
            {modoRecuperar ? 'Enviar link de recuperación' : esRegistro ? 'Crear mi cuenta' : 'Ingresar'}
          </motion.button>

          {!esRegistro && !modoRecuperar && (
            <button
              type="button"
              onClick={() => {
                setModoRecuperar(true);
                setError(null);
                setConfirmacionPendiente(false);
              }}
              className="self-center py-1 text-xs font-semibold text-texto-muted underline underline-offset-4"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (modoRecuperar) {
                setModoRecuperar(false);
                setLinkEnviado(false);
                setError(null);
                return;
              }
              setEsRegistro((previo) => !previo);
              setError(null);
            }}
            className="self-center py-1 text-xs font-semibold text-texto-muted underline underline-offset-4"
          >
            {modoRecuperar
              ? 'Volver a ingresar'
              : esRegistro
                ? '¿Ya tenés cuenta? Ingresá'
                : '¿Primera vez? Creá tu cuenta'}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="px-1 text-sm leading-snug text-texto-muted">
            El registro real se activa cuando conectamos tu backend. Mientras tanto podés recorrer
            el panel completo en vista previa: cargá tu negocio y tus recompensas para ver cómo queda.
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setPrevisualizando(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
          >
            <Eye size={18} />
            Ver el panel (vista previa)
          </motion.button>
        </div>
      )}
    </div>
  );
}
