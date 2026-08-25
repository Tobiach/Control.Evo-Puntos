import { useEffect, useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useVolverSeguro } from '../../hooks/useVolverSeguro';
import {
  DATA_RUBROS,
  type Cliente,
  type Recompensa,
  type Rubro,
  type RubroData,
} from '../../data/mockClientes';
import {
  NEGOCIOS,
  RELACIONES_INICIALES,
  type Negocio,
  type RelacionNegocio,
} from '../../data/negocios';
import { nivelesDeNegocio, type ResultadoCanje } from '../../lib/club';
import { usePermisoNotificaciones } from '../../lib/notificaciones';
import { supabase, supabaseEnabled } from '../../lib/supabase';
import { useSesion } from '../../hooks/useSesion';
import {
  cargarAppCliente,
  iniciarCanje,
  type CanjeConfirmado,
  type ClienteApp,
} from '../../lib/panelCliente';
import { procesarReferidoPendiente } from '../../lib/referidos';
import AppCliente from './AppCliente';
import MarketplaceShell from './MarketplaceShell';

interface Props {
  /** Rubro elegido en la bienvenida: define el tema del marketplace y la persona logueada. */
  data: RubroData;
  cliente: Cliente;
  onSalir: () => void;
  /** Invitado navegando sin cuenta: ir al registro real para empezar a sumar puntos de verdad. */
  onCrearCuenta: () => void;
}

// Paleta unificada Premia.ar: los 3 rubros comparten el mismo fondo, ya no varía por tema.
const COLOR_BARRA: Record<Rubro, string> = {
  gastro: '#F3F8F1',
  super: '#F3F8F1',
  carniceria: '#F3F8F1',
  cafeteria: '#F3F8F1',
};

/** Los locales del marketplace están en Palermo (Buenos Aires): siempre ARS. */
const dataDeNegocio = (negocio: Negocio, relacion: RelacionNegocio | undefined): RubroData => ({
  ...DATA_RUBROS[negocio.rubro],
  nombreNegocio: negocio.nombre,
  emoji: negocio.emoji,
  categoria: negocio.categoria,
  portadaUrl: negocio.portadaUrl,
  monedaPrefijo: '$',
  locale: 'es-AR',
  montoPorPunto: 100,
  niveles: nivelesDeNegocio(negocio.vipDesdePuntos, DATA_RUBROS[negocio.rubro].niveles),
  recompensas: negocio.recompensas,
  historialApp: relacion?.historial ?? [],
  eventos: negocio.eventos,
  horarioValle: negocio.horarioValle,
  promos: negocio.promos,
  beneficiosVip: negocio.beneficiosVip,
  comboFinde: negocio.comboFinde,
  premiosRuleta: negocio.premiosRuleta,
});

export default function MarketplaceApp({ data, cliente, onSalir, onCrearCuenta }: Props) {
  const { sesion } = useSesion();
  const usarReal = supabaseEnabled && !!sesion;

  // Qué negocio está abierto vive en la URL (`?local=`), no en useState: entrar es un drill-down
  // real (push, historial de verdad) y volver imita el atrás del navegador (useVolverSeguro) —
  // así el botón "Volver al marketplace" de la UI y el atrás real del navegador hacen lo mismo,
  // y la lista de atrás (scroll incluido) queda tal cual se dejó en vez de reiniciarse.
  const [searchParams, setSearchParams] = useSearchParams();
  const negocioId = searchParams.get('local');
  const volverAlMarketplace = useVolverSeguro('/');
  // Con backend real, negocios y relaciones vienen de Supabase; sin backend, del mock.
  const [negocios, setNegocios] = useState<Negocio[]>(NEGOCIOS);
  const [relaciones, setRelaciones] = useState<Record<string, RelacionNegocio>>(() => ({
    ...RELACIONES_INICIALES,
  }));
  const [clienteReal, setClienteReal] = useState<ClienteApp | null>(null);
  const [canjesConfirmados, setCanjesConfirmados] = useState<CanjeConfirmado[]>([]);
  // Última tirada de la ruleta semanal por negocio (mismo patrón in-memory que `relaciones`).
  const [tiradasRuleta, setTiradasRuleta] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(usarReal);
  // El permiso se pide recién cuando el usuario confirma en AvisoActivarNotificaciones,
  // nunca en frío al montar (ver notificaciones.ts).
  const [permisoNotif, pedirPermisoNotif] = usePermisoNotificaciones();

  // IDs de los locales de ejemplo (ficticios): el canje de estos nunca toca Supabase,
  // así nunca puede romperse con un error de servidor por un negocio que no existe ahí.
  const idsEjemplo = useState(() => new Set(NEGOCIOS.map((n) => n.id)))[0];

  const userId = sesion?.user.id;
  useEffect(() => {
    if (!usarReal || !userId) return;
    let activo = true;
    setCargando(true);
    cargarAppCliente(userId).then((res) => {
      if (!activo) return;
      if (res.ok) {
        // El marketplace real se completa con los locales de ejemplo mientras se suman
        // negocios reales — sin duplicar si algún día colisiona un id real con uno de ejemplo.
        const reales = res.valor.negocios.filter((n) => !idsEjemplo.has(n.id));
        setNegocios([...reales, ...NEGOCIOS]);
        setRelaciones({ ...RELACIONES_INICIALES, ...res.valor.relaciones });
        setClienteReal(res.valor.cliente);
        setCanjesConfirmados(res.valor.canjesConfirmados);
        // Ya hay sesión + cliente vinculado: registramos el referido pendiente (si vino de un
        // link de invitación). Idempotente y server-side; no bloquea la carga de la app.
        void procesarReferidoPendiente();
      }
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [usarReal, userId, idsEjemplo]);

  // Sincronización en tiempo real: si el cajero cobra mientras el cliente tiene la app
  // abierta, el saldo de puntos se actualiza solo (sin refrescar). RLS ya filtra esto a
  // "solo mis propias relaciones", Realtime respeta esa misma policy de lectura.
  const clienteRealId = clienteReal?.id;
  useEffect(() => {
    if (!usarReal || !supabase || !clienteRealId) return;
    const cliente = supabase;
    const canal = cliente
      .channel(`relaciones-cliente-${clienteRealId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relaciones_negocio',
          filter: `cliente_id=eq.${clienteRealId}`,
        },
        (payload) => {
          const fila = payload.new as { negocio_id: string; puntos: number; ultima_visita_at: string | null } | null;
          if (!fila) return;
          setRelaciones((previas) => {
            const actual = previas[fila.negocio_id];
            const dias = fila.ultima_visita_at
              ? Math.max(0, Math.floor((Date.now() - new Date(fila.ultima_visita_at).getTime()) / 86_400_000))
              : (actual?.ultimaVisitaDias ?? 0);
            return {
              ...previas,
              [fila.negocio_id]: {
                puntos: fila.puntos,
                ultimaVisitaDias: dias,
                historial: actual?.historial ?? [],
              },
            };
          });
        },
      )
      .subscribe();
    return () => {
      cliente.removeChannel(canal);
    };
  }, [usarReal, clienteRealId]);

  // En modo real usamos el nombre/teléfono/id reales del cliente logueado.
  const clienteEfectivo: Cliente =
    usarReal && clienteReal
      ? { id: clienteReal.id, nombre: clienteReal.nombre, telefono: clienteReal.telefono, puntos: 0, ultimaVisitaDias: 0 }
      : cliente;

  const negocio = negocios.find((n) => n.id === negocioId) ?? null;
  const relacion = negocio ? relaciones[negocio.id] : undefined;

  // Dentro de un negocio manda el tema de ESE negocio; en el marketplace, el del rubro base.
  useLayoutEffect(() => {
    const rubroVista = negocio ? negocio.rubro : data.rubro;
    document.documentElement.dataset.rubro = rubroVista;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', COLOR_BARRA[rubroVista]);
    return () => {
      document.documentElement.dataset.rubro = data.rubro;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', COLOR_BARRA[data.rubro]);
    };
  }, [negocio, data.rubro]);

  /** Código de 6 caracteres al estilo real (`iniciar_canje`), para que la demo se vea igual. */
  const generarCodigoDemo = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  const canjear = async (recompensa: Recompensa): Promise<ResultadoCanje> => {
    if (!negocio) return { ok: false, error: 'Elegí un negocio primero.' };
    const actual = relaciones[negocio.id];
    if (!actual) return { ok: false, error: 'Todavía no tenés puntos en este negocio.' };
    if (actual.puntos < recompensa.pts) {
      return { ok: false, error: 'No tenés puntos suficientes para este premio.' };
    }

    if (!usarReal || idsEjemplo.has(negocio.id)) {
      // Local ficticio: no hay servidor real contra el que confirmar un código, generamos
      // uno con la misma pinta (6 caracteres) para que la demo se vea completa. Si el código
      // vence sin usarse en esta sesión, el saldo demo queda descontado hasta reiniciar la
      // demo — límite aceptado, no hay persistencia real que "recargar" acá.
      setRelaciones((previas) => ({
        ...previas,
        [negocio.id]: { ...actual, puntos: actual.puntos - recompensa.pts },
      }));
      return {
        ok: true,
        codigo: generarCodigoDemo(),
        expiraAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      };
    }

    const resultado = await iniciarCanje(negocio.id, recompensa.pts);
    if (!resultado.ok) return resultado;
    // El servidor ya descontó los puntos (RPC `iniciar_canje`): reflejamos el mismo saldo
    // acá; la suscripción realtime de arriba lo corrige sola si llegara a diferir.
    setRelaciones((previas) => {
      const rel = previas[negocio.id];
      if (!rel) return previas;
      return { ...previas, [negocio.id]: { ...rel, puntos: rel.puntos - recompensa.pts } };
    });
    return resultado;
  };

  const girarRuleta = () => {
    if (!negocio) return;
    setTiradasRuleta((previas) => ({ ...previas, [negocio.id]: Date.now() }));
  };

  if (cargando) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 bg-fondo text-texto-muted">
        <Loader2 size={28} className="animate-spin text-acento" />
        <p className="text-sm font-semibold">Cargando tus puntos…</p>
      </div>
    );
  }

  let vistaNegocio = null;
  if (negocio) {
    const dataNegocio = dataDeNegocio(negocio, relacion);
    const clienteNegocio: Cliente = {
      ...clienteEfectivo,
      puntos: relacion?.puntos ?? 0,
      ultimaVisitaDias: relacion?.ultimaVisitaDias ?? 0,
    };
    // Ranking del local: la persona logueada con SUS puntos de este negocio + socios mock.
    const clientesNegocio: Cliente[] = [
      clienteNegocio,
      ...dataNegocio.clientes.filter((c) => c.id !== clienteEfectivo.id),
    ];
    vistaNegocio = (
      <AppCliente
        data={dataNegocio}
        negocioId={negocio.id}
        cliente={clienteNegocio}
        clientes={clientesNegocio}
        canjesConfirmados={canjesConfirmados}
        permisoNotif={permisoNotif}
        onPedirPermisoNotif={pedirPermisoNotif}
        ultimaRuletaTs={tiradasRuleta[negocio.id]}
        onGirarRuleta={girarRuleta}
        onCanjear={canjear}
        onSalir={volverAlMarketplace}
        onVolverMarketplace={volverAlMarketplace}
      />
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={negocio ? negocio.id : 'marketplace'}
        initial={{ opacity: 0, x: negocio ? 60 : -60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: negocio ? -60 : 60 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        {vistaNegocio ?? (
          <MarketplaceShell
            negocios={negocios}
            relaciones={relaciones}
            canjesConfirmados={canjesConfirmados}
            nombreCliente={clienteEfectivo.nombre}
            cliente={clienteEfectivo}
            esNuevo={usarReal && !Object.keys(relaciones).some((id) => !idsEjemplo.has(id))}
            permisoNotif={permisoNotif}
            onPedirPermisoNotif={pedirPermisoNotif}
            onAbrirNegocio={(elegido) =>
              setSearchParams((previos) => {
                const siguientes = new URLSearchParams(previos);
                siguientes.set('local', elegido.id);
                // Nunca heredar la pestaña de otro negocio que se haya visto antes.
                siguientes.delete('vista');
                return siguientes;
              })
            }
            onSalir={onSalir}
            onCrearCuenta={onCrearCuenta}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
