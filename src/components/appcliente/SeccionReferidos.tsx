import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Gift, Share2, UserPlus, Users } from 'lucide-react';
import type { Cliente, RubroData } from '../../data/mockClientes';
import { codigoReferido } from '../../lib/club';
import { compartir } from '../../lib/compartir';
import { supabaseEnabled } from '../../lib/supabase';
import {
  PUNTOS_BONUS_REFERIDO,
  VISITAS_PARA_PREMIO,
  armarLinkInvitacion,
  obtenerCodigoReferido,
  revisarPremioReferido,
  type EstadoReferidos,
} from '../../lib/referidos';

interface Props {
  negocioId: string;
  data: RubroData;
  cliente: Cliente;
}

/**
 * Invitá a un amigo con beneficio REAL: cuando el invitado visita este negocio
 * VISITAS_PARA_PREMIO veces, ambos ganan PUNTOS_BONUS_REFERIDO pts. En modo real el código y el
 * progreso ("Tus invitados") vienen del servidor (RPC SECURITY DEFINER); sin backend (demo) cae
 * a un código determinístico informativo, sin seguimiento persistente.
 */
export default function SeccionReferidos({ negocioId, data, cliente }: Props) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoReferidos | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!supabaseEnabled) return;
    let activo = true;
    // Al abrir el negocio revisamos el premio (idempotente, server-side) y traemos el progreso.
    Promise.all([obtenerCodigoReferido(), revisarPremioReferido(negocioId)]).then(
      ([cod, est]) => {
        if (!activo) return;
        setCodigo(cod);
        setEstado(est);
      },
    );
    return () => {
      activo = false;
    };
  }, [negocioId]);

  // Código efectivo: el real del servidor, o el determinístico en demo/mientras carga.
  const codigoEfectivo = codigo ?? codigoReferido(cliente);

  const compartirInvitacion = async () => {
    const link = armarLinkInvitacion(window.location.origin, codigoEfectivo, negocioId);
    const texto =
      `¡Sumate al Club de Puntos de ${data.nombreNegocio}! Entrá con mi invitación y, cuando ` +
      `vayas ${VISITAS_PARA_PREMIO} veces, ganamos ${PUNTOS_BONUS_REFERIDO} pts cada uno. ${link}`;
    const copio = await compartir(texto, link);
    if (copio) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    }
  };

  const invitados = estado?.invitados ?? [];
  const necesarias = estado?.visitasNecesarias ?? VISITAS_PARA_PREMIO;
  const bonus = estado?.bonus ?? PUNTOS_BONUS_REFERIDO;

  return (
    <section>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-texto-muted uppercase">
        <UserPlus size={13} /> Invitá a un amigo
      </p>
      <div className="rounded-3xl border border-borde bg-card p-5">
        <p className="text-sm text-texto-muted">
          Compartí tu invitación. Cuando tu amigo visite {data.nombreNegocio}{' '}
          <span className="font-bold text-texto">{necesarias} veces</span>,{' '}
          <span className="font-bold text-texto">ganan {bonus} pts cada uno</span>.
        </p>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-premio-suave px-4 py-3">
          <span className="font-titulo text-lg font-bold tracking-wider text-acento">
            {codigoEfectivo}
          </span>
          <span className="text-2xl">🎁</span>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={compartirInvitacion}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-3 text-sm font-bold text-on-acento active:bg-acento-hover"
        >
          {copiado ? (
            <>
              <Check size={16} /> Link copiado
            </>
          ) : (
            <>
              <Share2 size={16} /> Compartir invitación
            </>
          )}
        </motion.button>

        {/* Progreso propio si a este cliente lo invitó alguien en este negocio. */}
        {estado?.comoReferido && !estado.comoReferido.premiado && (
          <div className="mt-4 rounded-2xl bg-fondo p-3.5">
            <p className="text-xs font-semibold text-texto">
              Te invitaron a este club. Visitá {necesarias} veces y ganan {bonus} pts los dos.
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-texto">
                {estado.comoReferido.visitasActuales}/{necesarias} visitas
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-borde">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(estado.comoReferido.visitasActuales / necesarias) * 100}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full rounded-full bg-acento"
              />
            </div>
          </div>
        )}
        {estado?.comoReferido?.premiado && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-verde-ok/15 p-3.5 text-xs font-bold text-verde-ok">
            <Gift size={15} /> ¡Ya ganaste tus {bonus} pts por la invitación!
          </div>
        )}
      </div>

      {/* Tus invitados: sólo con backend real y al menos un invitado. */}
      {invitados.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest text-texto-muted uppercase">
            <Users size={13} /> Tus invitados
          </p>
          <div className="flex flex-col gap-2 rounded-3xl border border-borde bg-card p-4">
            {invitados.map((inv) => (
              <div key={inv.referidoClienteId} className="rounded-2xl bg-fondo p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-texto">{inv.nombre}</span>
                  {inv.premiado ? (
                    <span className="flex items-center gap-1 rounded-full bg-verde-ok/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-verde-ok uppercase">
                      <Check size={11} /> Premiado
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-texto-muted">
                      {inv.visitasActuales}/{necesarias} visitas
                    </span>
                  )}
                </div>
                {!inv.premiado && (
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-borde">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(inv.visitasActuales / necesarias) * 100}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="h-full rounded-full bg-acento"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
