import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Phone, Share2, Trophy, User } from 'lucide-react';
import type { Cliente, RubroData } from '../../data/mockClientes';
import { codigoReferido, formatPuntos } from '../../lib/club';

interface Props {
  data: RubroData;
  cliente: Cliente;
  clientes: Cliente[];
}

interface Puesto {
  cliente: Cliente;
  posicion: number;
}

export default function TabPerfil({ data, cliente, clientes }: Props) {
  const codigo = codigoReferido(cliente);
  const [copiado, setCopiado] = useState(false);
  const [enRanking, setEnRanking] = useState(false);

  const compartir = async () => {
    const texto = `¡Sumate al Club de Puntos de ${data.nombreNegocio}! Usá mi código ${codigo} y ganamos 50 pts cada uno.`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: texto });
        return;
      } catch {
        // El usuario canceló o el navegador no completó la acción: caemos al portapapeles.
      }
    }
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin acceso al portapapeles: no hacemos nada para no romper la demo.
    }
  };

  const ranking = [...clientes].sort((a, b) => b.puntos - a.puntos);
  const miPosicion = ranking.findIndex((c) => c.id === cliente.id) + 1;
  const top: Puesto[] = ranking
    .slice(0, 4)
    .map((c, indice) => ({ cliente: c, posicion: indice + 1 }));
  const lista: Puesto[] = top.some((puesto) => puesto.cliente.id === cliente.id)
    ? top
    : [...top.slice(0, 3), { cliente, posicion: miPosicion }];

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <h1 className="font-titulo text-2xl font-bold">Perfil</h1>

      <section>
        <p className="mb-2 text-xs font-bold tracking-widest text-texto-muted uppercase">Cuenta</p>
        <div className="rounded-3xl border border-borde bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-acento text-on-acento">
              <User size={22} />
            </div>
            <div>
              <p className="font-bold">{cliente.nombre}</p>
              <p className="flex items-center gap-1 text-xs text-texto-muted">
                <Phone size={12} /> {cliente.telefono}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-bold tracking-widest text-texto-muted uppercase">
          Invitá un amigo
        </p>
        <div className="rounded-3xl border border-borde bg-card p-5">
          <p className="text-sm text-texto-muted">
            Compartí tu código.{' '}
            <span className="font-bold text-texto">Vos y tu amigo ganan 50 pts cada uno.</span>
          </p>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-premio-suave px-4 py-3">
            <span className="font-titulo text-lg font-bold tracking-wider text-acento">
              {codigo}
            </span>
            <span className="text-2xl">🎁</span>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={compartir}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover"
          >
            {copiado ? (
              <>
                <Check size={16} /> Código copiado
              </>
            ) : (
              <>
                <Share2 size={16} /> Compartir invitación
              </>
            )}
          </motion.button>
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-bold tracking-widest text-texto-muted uppercase">
          Permisos
        </p>
        <div className="rounded-3xl border border-borde bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="shrink-0 text-premio" />
              <p className="text-sm leading-snug font-semibold">
                Aparecer en el ranking de clientes frecuentes de este local
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enRanking}
              aria-label="Aparecer en el ranking"
              onClick={() => setEnRanking((valor) => !valor)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                enRanking ? 'bg-acento' : 'bg-borde'
              }`}
            >
              <motion.span
                animate={{ x: enRanking ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow"
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {enRanking && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-col gap-2 overflow-hidden"
              >
                {lista.map(({ cliente: c, posicion }) => {
                  const yo = c.id === cliente.id;
                  return (
                    <li
                      key={c.id}
                      className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 ${
                        yo ? 'bg-premio-suave' : 'bg-fondo'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`font-titulo text-sm font-bold ${
                            posicion <= 3 ? 'text-premio' : 'text-texto-muted'
                          }`}
                        >
                          #{posicion}
                        </span>
                        <span className={`text-sm font-semibold ${yo ? 'text-acento' : ''}`}>
                          {c.nombre}
                          {yo && ' · vos'}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-texto-muted">
                        {formatPuntos(c.puntos)} pts
                      </span>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
