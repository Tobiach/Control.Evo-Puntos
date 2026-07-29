import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Gift, Home, Map, User, type LucideIcon } from 'lucide-react';
import type { Cliente } from '../../data/mockClientes';
import type { Negocio, RelacionNegocio } from '../../data/negocios';
import Marketplace from './Marketplace';
import TabMapa from './TabMapa';
import TabMisLocales from './TabMisLocales';
import TabPerfilMarketplace from './TabPerfilMarketplace';

type Tab = 'inicio' | 'mapa' | 'mis-locales' | 'perfil';

interface Props {
  negocios: Negocio[];
  relaciones: Record<string, RelacionNegocio>;
  nombreCliente: string;
  cliente: Cliente;
  esNuevo: boolean;
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
  onAbrirNegocio,
  onSalir,
  onCrearCuenta,
}: Props) {
  const [tab, setTab] = useState<Tab>('inicio');

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
            {tab === 'mapa' && <TabMapa negocios={negocios} onAbrirNegocio={onAbrirNegocio} />}
            {tab === 'mis-locales' && (
              <TabMisLocales negocios={negocios} relaciones={relaciones} onAbrirNegocio={onAbrirNegocio} />
            )}
            {tab === 'perfil' && (
              <TabPerfilMarketplace cliente={cliente} onSalir={onSalir} onCrearCuenta={onCrearCuenta} />
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
              {activo && (
                <motion.span
                  layoutId="marketplace-tab-activo"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-acento"
                />
              )}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  activo ? 'bg-acento/15' : ''
                }`}
              >
                <Icono
                  size={20}
                  strokeWidth={activo ? 2.6 : 2}
                  className={activo ? 'text-acento' : 'text-[#8B8E96]'}
                />
              </span>
              <span className={`text-[11px] font-semibold ${activo ? 'text-acento' : 'text-[#9CA3AF]'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
