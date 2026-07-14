import { useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
import AppCliente from './AppCliente';
import Marketplace from './Marketplace';

interface Props {
  /** Rubro elegido en la bienvenida: define el tema del marketplace y la persona logueada. */
  data: RubroData;
  cliente: Cliente;
  onSalir: () => void;
}

const COLOR_BARRA: Record<Rubro, string> = { gastro: '#0D0D0D', super: '#F5F6FA' };

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
  beneficiosVip: negocio.beneficiosVip,
});

export default function MarketplaceApp({ data, cliente, onSalir }: Props) {
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [relaciones, setRelaciones] = useState<Record<string, RelacionNegocio>>(() => ({
    ...RELACIONES_INICIALES,
  }));
  // Pide el permiso real de notificaciones al entrar a la app del cliente (una sola vez).
  const permisoNotif = usePermisoNotificaciones();

  const negocio = NEGOCIOS.find((n) => n.id === negocioId) ?? null;
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
    setRelaciones((previas) => {
      const actual = previas[negocio.id];
      if (!actual) return previas;
      return {
        ...previas,
        [negocio.id]: { ...actual, puntos: Math.max(0, actual.puntos - recompensa.pts) },
      };
    });
  };

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

  const volverAlMarketplace = () => setNegocioId(null);

  let vistaNegocio = null;
  if (negocio) {
    const dataNegocio = dataDeNegocio(negocio, relacion);
    const clienteNegocio: Cliente = {
      ...cliente,
      puntos: relacion?.puntos ?? 0,
      ultimaVisitaDias: relacion?.ultimaVisitaDias ?? 0,
    };
    // Ranking del local: la persona logueada con SUS puntos de este negocio + socios mock.
    const clientesNegocio: Cliente[] = [
      clienteNegocio,
      ...dataNegocio.clientes.filter((c) => c.id !== cliente.id),
    ];
    vistaNegocio = (
      <AppCliente
        data={dataNegocio}
        negocioId={negocio.id}
        cliente={clienteNegocio}
        clientes={clientesNegocio}
        permisoNotif={permisoNotif}
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
            negocios={NEGOCIOS}
            relaciones={relaciones}
            nombreCliente={cliente.nombre}
            onAbrirNegocio={(elegido) => setNegocioId(elegido.id)}
            onSalir={onSalir}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
