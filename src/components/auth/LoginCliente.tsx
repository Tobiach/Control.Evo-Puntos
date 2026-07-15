import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AtSign, ChevronLeft, Loader2, Lock, Phone, Sparkles, User } from 'lucide-react';
import type { Cliente, RubroData } from '../../data/mockClientes';
import { buscarClientes, formatPuntos } from '../../lib/club';
import {
  ingresarCliente,
  registrarCliente,
  solicitarRecuperacion,
  supabaseEnabled,
  validarEmail,
  validarPassword,
  validarTelefono,
} from '../../lib/auth';

interface Props {
  data: RubroData;
  clientes: Cliente[];
  /** Entra a la app del cliente con el socio elegido (demo) o el logueado (real). */
  onEntrar: (clienteId: string) => void;
  onVolver: () => void;
}

export default function LoginCliente({ data, clientes, onEntrar, onVolver }: Props) {
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
          <h2 className="text-2xl font-black tracking-tight">Entrá a tu club</h2>
          <p className="text-sm text-texto-muted">Accedé a tus puntos en {data.nombreNegocio}.</p>
        </div>
      </header>

      {supabaseEnabled ? (
        <FormularioCliente onEntrar={onEntrar} clienteAppId={data.clienteAppId} />
      ) : (
        <SelectorDemo data={data} clientes={clientes} onEntrar={onEntrar} />
      )}
    </div>
  );
}

// ── Modo real: email + contraseña con Supabase Auth (teléfono como dato de perfil) ──

function FormularioCliente({
  onEntrar,
  clienteAppId,
}: {
  onEntrar: (clienteId: string) => void;
  clienteAppId: string;
}) {
  const [esRegistro, setEsRegistro] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
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
      setCargando(true);
      const resultado = await solicitarRecuperacion(email);
      setCargando(false);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setLinkEnviado(true);
      return;
    }

    const falloPassword = validarPassword(password);
    const falloTelefono = esRegistro ? validarTelefono(telefono) : null;
    if (falloPassword || falloTelefono) {
      setError(falloTelefono ?? falloPassword);
      return;
    }
    setError(null);
    setConfirmacionPendiente(false);
    setCargando(true);
    const resultado = esRegistro
      ? await registrarCliente(email, password, telefono, nombre)
      : await ingresarCliente(email, password);
    setCargando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    if (esRegistro && !resultado.session) {
      setConfirmacionPendiente(true);
      return;
    }
    onEntrar(clienteAppId);
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {esRegistro && (
        <label className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
          <User size={18} className="shrink-0 text-acento" />
          <input
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            placeholder="Tu nombre"
            autoComplete="name"
            className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
          />
        </label>
      )}

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

      {esRegistro && (
        <label className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
          <Phone size={18} className="shrink-0 text-acento" />
          <input
            type="tel"
            value={telefono}
            onChange={(evento) => setTelefono(evento.target.value)}
            placeholder="Tu teléfono"
            autoComplete="tel"
            className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
          />
        </label>
      )}

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
          Te enviamos un link a {email} — revisá tu bandeja y spam para restablecer tu contraseña.
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        disabled={cargando}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover disabled:opacity-60"
      >
        {cargando && <Loader2 size={18} className="animate-spin" />}
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
          setConfirmacionPendiente(false);
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
  );
}

// ── Modo demo (sin backend): elegir entre los socios mock ────────

function SelectorDemo({
  data,
  clientes,
  onEntrar,
}: {
  data: RubroData;
  clientes: Cliente[];
  onEntrar: (clienteId: string) => void;
}) {
  const [telefono, setTelefono] = useState('');
  const sugerencias = buscarClientes(clientes, telefono);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-2xl bg-premio-suave px-4 py-3 text-xs font-semibold text-acento">
        <Sparkles size={15} strokeWidth={2.5} />
        Modo demo — elegí un socio para entrar a la app.
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-borde bg-card px-4 py-3.5">
        <Phone size={18} className="shrink-0 text-acento" />
        <input
          type="tel"
          value={telefono}
          onChange={(evento) => setTelefono(evento.target.value)}
          placeholder={`Ej: ${data.clientes[0].telefono}`}
          className="w-full bg-transparent text-base font-medium outline-none placeholder:text-texto-muted/60"
        />
      </label>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {sugerencias.map((cliente) => (
            <motion.button
              key={cliente.id}
              type="button"
              layout
              whileTap={{ scale: 0.98 }}
              onClick={() => onEntrar(cliente.id)}
              className="flex items-center justify-between rounded-xl border border-borde bg-fondo-medio px-4 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-bold">{cliente.nombre}</span>
                <span className="block text-xs text-texto-muted">{cliente.telefono}</span>
              </span>
              <span className="text-xs font-bold text-premio">
                {formatPuntos(cliente.puntos)} pts
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
        {sugerencias.length === 0 && (
          <p className="rounded-xl border border-borde bg-fondo-medio px-4 py-3 text-sm text-texto-muted">
            No hay socios con ese teléfono en la demo.
          </p>
        )}
      </div>
    </div>
  );
}
