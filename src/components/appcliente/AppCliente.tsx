import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, ArrowLeft, Gift, Home, User, type LucideIcon } from 'lucide-react';
import type { Cliente, Recompensa, RubroData } from '../../data/mockClientes';
import TabInicio from './TabInicio';
import TabRecompensas from './TabRecompensas';
import TabActividad from './TabActividad';
import TabPerfil from './TabPerfil';

type Tab = 'inicio' | 'recompensas' | 'actividad' | 'perfil';

interface Props {
  data: RubroData;
  cliente: Cliente;
  clientes: Cliente[];
  onCanjear: (recompensa: Recompensa) => void;
  onSalir: () => void;
  /** Si está presente, muestra el botón "← Volver al marketplace" arriba de todo. */
  onVolverMarketplace?: () => void;
}

const TABS: { id: Tab; label: string; icono: LucideIcon }[] = [
  { id: 'inicio', label: 'Inicio', icono: Home },
  { id: 'recompensas', label: 'Recompensas', icono: Gift },
  { id: 'actividad', label: 'Actividad', icono: Activity },
  { id: 'perfil', label: 'Perfil', icono: User },
];

export default function AppCliente({
  data,
  cliente,
  clientes,
  onCanjear,
  onSalir,
  onVolverMarketplace,
}: Props) {
  const [tab, setTab] = useState<Tab>('inicio');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-fondo">
      {onVolverMarketplace && (
        <div className="sticky top-0 z-30 bg-fondo/95 px-5 pt-4 pb-2 backdrop-blur">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onVolverMarketplace}
            className="flex items-center gap-1.5 rounded-full border border-borde bg-card px-4 py-2 text-xs font-bold text-texto"
          >
            <ArrowLeft size={14} strokeWidth={2.5} /> Volver al marketplace
          </motion.button>
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {tab === 'inicio' && (
              <TabInicio
                data={data}
                cliente={cliente}
                historial={data.historialApp}
                onVerRecompensas={() => setTab('recompensas')}
                onSalir={onSalir}
              />
            )}
            {tab === 'recompensas' && (
              <TabRecompensas data={data} cliente={cliente} onCanjear={onCanjear} />
            )}
            {tab === 'actividad' && (
              <TabActividad data={data} cliente={cliente} historial={data.historialApp} />
            )}
            {tab === 'perfil' && <TabPerfil data={data} cliente={cliente} clientes={clientes} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-stretch border-t border-borde bg-fondo-medio px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ id, label, icono: Icono }) => {
          const activo = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              {activo && (
                <motion.span
                  layoutId="tab-activo"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-acento"
                />
              )}
              <Icono
                size={22}
                strokeWidth={activo ? 2.6 : 2}
                className={activo ? 'text-acento' : 'text-texto-muted'}
              />
              <span
                className={`text-[11px] font-semibold ${activo ? 'text-acento' : 'text-texto-muted'}`}
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
