import { useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
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
import { usePermisoNotificaciones } from '../../lib/notificaciones';
import { supabase, supabaseEnabled } from '../../lib/supabase';
import { useSesion } from '../../hooks/useSesion';
import { cargarAppCliente, canjearRecompensa, type ClienteApp } from '../../lib/panelCliente';
import { procesarReferidoPendiente } from '../../lib/referidos';
import AppCliente from './AppCliente';
import Marketplace from './Marketplace';

interface Props {
  /** Rubro elegido en la bienvenida: define el tema del marketplace y la persona logueada. */
  data: RubroData;
  cliente: Cliente;
  onSalir: () => void;
}

const COLOR_BARRA: Record<Rubro, string> = { gastro: '#0D0D0D', super: '#F5F6FA', carniceria: '#1C1410' };

/** Los locales del marketplace están en Palermo (Buenos Aires): siempre ARS. */
const dataDeNegocio = (negocio: Negocio, relacion: RelacionNegocio | undefined): RubroData => ({
  ...DATA_RUBROS[negocio.rubro],
  nombreNegocio: negocio.nombre,
  monedaPrefijo: '$',
  locale: 'es-AR',
  montoPorPunto: 100,
  recompensas: negocio.recompensas,
  historialApp: relacion?.historial ?? [],
  eventos: negocio.eventos,
  horarioValle: negocio.horarioValle,
  promos: negocio.promos,
  beneficiosVip: negocio.beneficiosVip,
  comboFinde: negocio.comboFinde,
});

export default function MarketplaceApp({ data, cliente, onSalir }: Props) {
  const { sesion } = useSesion();
  const usarReal = supabaseEnabled && !!sesion;

  const [negocioId, setNegocioId] = useState<string | null>(null);
  // Con backend real, negocios y relaciones vienen de Supabase; sin backend, del mock.
  const [negocios, setNegocios] = useState<Negocio[]>(NEGOCIOS);
  const [relaciones, setRelaciones] = useState<Record<string, RelacionNegocio>>(() => ({
    ...RELACIONES_INICIALES,
  }));
  const [clienteReal, setClienteReal] = useState<ClienteApp | null>(null);
  // Última tirada de la ruleta semanal por negocio (mismo patrón in-memory que `relaciones`).
  const [tiradasRuleta, setTiradasRuleta] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(usarReal);
  // Pide el permiso real de notificaciones al entrar a la app del cliente (una sola vez).
  const permisoNotif = usePermisoNotificaciones();

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

  const canjear = (recompensa: Recompensa) => {
    if (!negocio) return;
    const actual = relaciones[negocio.id];
    if (!actual) return;
    const puntosPrevios = actual.puntos;
    // Optimista: descontamos ya en pantalla.
    setRelaciones((previas) => ({
      ...previas,
      [negocio.id]: { ...actual, puntos: Math.max(0, puntosPrevios - recompensa.pts) },
    }));
    // Local ficticio: el descuento optimista de arriba ya es el resultado final, no hay
    // servidor real contra el cual confirmar (evita el error "recompensa_inexistente").
    if (!usarReal || idsEjemplo.has(negocio.id)) return;
    // Real: confirmamos contra el servidor y ajustamos al saldo verdadero (o revertimos).
    canjearRecompensa(negocio.id, recompensa.pts).then((res) => {
      setRelaciones((previas) => {
        const rel = previas[negocio.id];
        if (!rel) return previas;
        const puntos = res.ok ? res.valor.puntosRestantes : puntosPrevios;
        return { ...previas, [negocio.id]: { ...rel, puntos } };
      });
    });
  };

  // Regalar puntos es parte de lo social: sigue siendo demo local (no persiste en Supabase).
  const regalarPuntos = (cantidad: number) => {
    if (!negocio) return;
    setRelaciones((previas) => {
      const actual = previas[negocio.id];
      if (!actual) return previas;
      return {
        ...previas,
        [negocio.id]: { ...actual, puntos: Math.max(0, actual.puntos - cantidad) },
      };
    });
  };

  const girarRuleta = () => {
    if (!negocio) return;
    setTiradasRuleta((previas) => ({ ...previas, [negocio.id]: Date.now() }));
  };

  const volverAlMarketplace = () => setNegocioId(null);

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
        permisoNotif={permisoNotif}
        ultimaRuletaTs={tiradasRuleta[negocio.id]}
        onGirarRuleta={girarRuleta}
        onCanjear={canjear}
        onRegalar={regalarPuntos}
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
          <Marketplace
            negocios={negocios}
            relaciones={relaciones}
            nombreCliente={clienteEfectivo.nombre}
            onAbrirNegocio={(elegido) => setNegocioId(elegido.id)}
            onSalir={onSalir}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
