import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Gift, Home, Loader2, Map, User, type LucideIcon } from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import type { PermisoNotif } from '../../lib/notificaciones';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import Marketplace from './Marketplace';
import TabMisLocales from './TabMisLocales';
import TabPerfilMarketplace from './TabPerfilMarketplace';

// Leaflet/react-leaflet (mapa "Explorar") es la dependencia más pesada de todo el marketplace
// y solo la usa esta pestaña — separada así nadie que se quede en Inicio/Mis premios/Perfil
// la descarga.
const TabMapa = lazy(() => import('./TabMapa'));

type Tab = 'inicio' | 'mapa' | 'mis-locales' | 'perfil';
const TABS_VALIDAS: readonly Tab[] = ['inicio', 'mapa', 'mis-locales', 'perfil'];
function parseTab(valor: string | null): Tab {
  return TABS_VALIDAS.includes(valor as Tab) ? (valor as Tab) : 'inicio';
}

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  nombreCliente: string;
  cliente: Cliente;
  esNuevo: boolean;
  permisoNotif: PermisoNotif;
  onPedirPermisoNotif: () => Promise<void>;
  onAbrirNegocio: (negocio: Negocio) => void;
  onSalir: () => void;
  onCrearCuenta: () => void;
}

/** Los ids internos quedan igual (mapa/mis-locales); solo cambia la etiqueta visible
 *  ("Explorar"/"Mis premios") para que suene a consumidor, no a gestión de negocios. */
const TABS: { id: Tab; label: string; icono: LucideIcon }[] = [
  { id: 'inicio', label: 'Inicio', icono: Home },
  { id: 'mapa', label: 'Explorar', icono: Map },
  { id: 'mis-locales', label: 'Mis premios', icono: Gift },
  { id: 'perfil', label: 'Perfil', icono: User },
];

/**
 * Barra de navegación propia del marketplace (la lista de locales), separada de la barra de
 * 4 pestañas de CADA negocio puntual (ver AppCliente.tsx). Antes de esto el marketplace era
 * una sola pantalla larga sin pestañas — Explorar y Mis premios pasan a ser de primer nivel.
 */
export default function MarketplaceShell({
  negocios,
  relaciones,
  nombreCliente,
  cliente,
  esNuevo,
  permisoNotif,
  onPedirPermisoNotif,
  onAbrirNegocio,
  onSalir,
  onCrearCuenta,
}: Props) {
  // La pestaña vive en la URL (`?tab=`, reemplazando — no se apila en el historial, moverse
  // entre pestañas es lateral, no un "adelante" del que tenga sentido volver paso a paso).
  // Así una entrada/salida de un negocio (que sí es push) no la reinicia, y la posición de
  // scroll de cada pestaña se recuerda por separado con useScrollRestoration.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const setTab = (nuevaTab: Tab) => {
    setSearchParams(
      (previos) => {
        const siguientes = new URLSearchParams(previos);
        siguientes.set('tab', nuevaTab);
        return siguientes;
      },
      { replace: true },
    );
  };
  // A pesar de `overflow-y-auto`, este layout (min-h-dvh + flex-1 sin altura fija) hace que en
  // la práctica scrollee la PÁGINA (window), no este contenedor — verificado en el navegador,
  // no asumido. Por eso el hook va sin ref (mismo criterio que PanelDueno).
  useScrollRestoration(`marketplace:${tab}`);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-fondo">
      <main className="flex-1 overflow-y-auto pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex flex-1 flex-col"
          >
            {tab === 'inicio' && (
              <Marketplace
                negocios={negocios}
                relaciones={relaciones}
                nombreCliente={nombreCliente}
                esNuevo={esNuevo}
                onAbrirNegocio={onAbrirNegocio}
                onIrAMapa={() => setTab('mapa')}
              />
            )}
            {tab === 'mapa' && (
              <Suspense
                fallback={
                  <div className="flex flex-1 items-center justify-center py-16">
                    <Loader2 size={22} className="animate-spin text-texto-muted" />
                  </div>
                }
              >
                <TabMapa negocios={negocios} onAbrirNegocio={onAbrirNegocio} />
              </Suspense>
            )}
            {tab === 'mis-locales' && (
              <TabMisLocales negocios={negocios} relaciones={relaciones} onAbrirNegocio={onAbrirNegocio} />
            )}
            {tab === 'perfil' && (
              <TabPerfilMarketplace
                cliente={cliente}
                negocios={negocios}
                relaciones={relaciones}
                permisoNotif={permisoNotif}
                onPedirPermisoNotif={onPedirPermisoNotif}
                onSalir={onSalir}
                onCrearCuenta={onCrearCuenta}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-[72px] max-w-md items-stretch rounded-t-[24px] bg-surface-dark px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ id, label, icono: Icono }) => {
          const activo = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="relative flex flex-1 flex-col items-center justify-center gap-1"
            >
              {activo ? (
                <motion.span
                  layoutId="marketplace-tab-elevado"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="absolute -top-[18px] flex h-[46px] w-[46px] items-center justify-center rounded-full bg-acento shadow-[0_6px_14px_rgba(242,138,99,0.4)] ring-4 ring-fondo"
                >
                  <Icono size={19} strokeWidth={2.6} className="text-on-acento" />
                </motion.span>
              ) : (
                <Icono size={20} strokeWidth={2} className="text-[#8B8E96]" />
              )}
              <span
                className={`text-[11px] font-semibold ${activo ? 'mt-6 text-acento' : 'text-[#9CA3AF]'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
