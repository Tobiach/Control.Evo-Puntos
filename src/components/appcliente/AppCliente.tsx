import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, ArrowLeft, Gift, Home, User, type LucideIcon } from 'lucide-react';
import type { Cliente, Recompensa, RubroData } from '../../data/mockClientes';
import {
  avisosCliente,
  dispararNotificacion,
  type Aviso,
  type PermisoNotif,
} from '../../lib/notificaciones';
import type { ResultadoCanje } from '../../lib/club';
import type { CanjeConfirmado } from '../../lib/panelCliente';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import TabInicio from './TabInicio';
import TabRecompensas from './TabRecompensas';
import TabActividad from './TabActividad';
import TabPerfil from './TabPerfil';
import TabCartaPuntos from './TabCartaPuntos';
import AvisoActivarNotificaciones from './AvisoActivarNotificaciones';

// 'carta' es un destino válido pero NO aparece en la tab bar (TABS más abajo) — se llega
// solo desde el botón "Sumá puntos" de Inicio, mismo criterio que "Mis datos" en Perfil
// marketplace: drill-in con su propio botón Volver, no una 5ta pestaña.
type Tab = 'inicio' | 'recompensas' | 'actividad' | 'perfil' | 'carta';
const TABS_VALIDAS: readonly Tab[] = ['inicio', 'recompensas', 'actividad', 'perfil', 'carta'];
function parseTab(valor: string | null): Tab {
  return TABS_VALIDAS.includes(valor as Tab) ? (valor as Tab) : 'inicio';
}

interface Props {
  data: RubroData;
  negocioId: string;
  cliente: Cliente;
  clientes: Cliente[];
  /** Canjes confirmados de TODOS los negocios — se filtran por este negocio adentro. */
  canjesConfirmados: CanjeConfirmado[];
  /** XP global (cross-negocio), mismo cálculo que Perfil marketplace — se muestra en Perfil. */
  xpTotal: number;
  permisoNotif: PermisoNotif;
  onPedirPermisoNotif: () => Promise<void>;
  /** Timestamp de la última tirada de ruleta en este negocio (cooldown de 7 días). */
  ultimaRuletaTs?: number;
  onGirarRuleta: () => void;
  onCanjear: (recompensa: Recompensa) => Promise<ResultadoCanje>;
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

/** De noche (20 a 6 hs) atenuamos apenas la pantalla con un overlay sutil. */
function esDeNoche(): boolean {
  const hora = new Date().getHours();
  return hora >= 20 || hora < 6;
}

export default function AppCliente({
  data,
  negocioId,
  cliente,
  clientes,
  canjesConfirmados,
  xpTotal,
  permisoNotif,
  onPedirPermisoNotif,
  ultimaRuletaTs,
  onGirarRuleta,
  onCanjear,
  onSalir,
  onVolverMarketplace,
}: Props) {
  // Misma lógica que MarketplaceShell: la pestaña vive en la URL (`?vista=`, reemplazando),
  // así el scroll de cada pestaña se recuerda por separado y sobrevive a que AppCliente se
  // desmonte al volver al marketplace y se vuelva a montar si se reabre el mismo negocio.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('vista'));
  const setTab = (nuevaTab: Tab) => {
    setSearchParams(
      (previos) => {
        const siguientes = new URLSearchParams(previos);
        siguientes.set('vista', nuevaTab);
        return siguientes;
      },
      { replace: true },
    );
  };
  // Mismo criterio que MarketplaceShell: acá también scrollea la página (window), no el
  // contenedor `overflow-y-auto` — verificado en el navegador, no asumido. Sin ref.
  useScrollRestoration(`negocio:${negocioId}:${tab}`);
  const [cumpleForzado, setCumpleForzado] = useState(false);
  const [avisoNotifCerrado, setAvisoNotifCerrado] = useState(false);
  const mostrarAvisoNotif = permisoNotif === 'default' && !avisoNotifCerrado;
  const historial = data.historialApp;
  const canjesNegocio = useMemo(
    () => canjesConfirmados.filter((canje) => canje.negocioId === negocioId),
    [canjesConfirmados, negocioId],
  );

  const avisos = useMemo<Aviso[]>(
    () => avisosCliente(data, cliente, historial, { cumpleForzado }),
    [data, cliente, historial, cumpleForzado],
  );

  // Cuando hay permiso, cada aviso se dispara una vez como notificación nativa del SO.
  const disparados = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (permisoNotif !== 'granted') return;
    for (const aviso of avisos) {
      const clave = `${negocioId}:${aviso.id}`;
      if (disparados.current.has(clave)) continue;
      disparados.current.add(clave);
      dispararNotificacion(aviso.titulo, aviso.cuerpo);
    }
  }, [avisos, permisoNotif, negocioId]);

  const noche = useMemo(esDeNoche, []);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-fondo">
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
                negocioId={negocioId}
                cliente={cliente}
                historial={historial}
                avisos={avisos}
                permisoNotif={permisoNotif}
                ultimaRuletaTs={ultimaRuletaTs}
                onGirarRuleta={onGirarRuleta}
                onVerRecompensas={() => setTab('recompensas')}
                onVerCarta={() => setTab('carta')}
                onSalir={onSalir}
              />
            )}
            {tab === 'carta' && (
              <TabCartaPuntos negocioId={negocioId} data={data} onVolver={() => setTab('inicio')} />
            )}
            {tab === 'recompensas' && (
              <TabRecompensas data={data} cliente={cliente} onCanjear={onCanjear} />
            )}
            {tab === 'actividad' && (
              <TabActividad data={data} cliente={cliente} historial={historial} canjes={canjesNegocio} />
            )}
            {tab === 'perfil' && (
              <TabPerfil
                data={data}
                negocioId={negocioId}
                cliente={cliente}
                clientes={clientes}
                historial={historial}
                canjes={canjesNegocio}
                xpTotal={xpTotal}
                cumpleForzado={cumpleForzado}
                onToggleCumple={() => setCumpleForzado((valor) => !valor)}
                onVerCarta={() => setTab('carta')}
                onVerRecompensas={() => setTab('recompensas')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        className={`fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-stretch border-t border-white/10 bg-surface-dark px-2 pb-[env(safe-area-inset-bottom)] ${
          tab === 'carta' ? 'hidden' : ''
        }`}
      >
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
                className={activo ? 'text-acento' : 'text-white/50'}
              />
              <span
                className={`text-[11px] font-semibold ${activo ? 'text-acento' : 'text-white/50'}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {noche && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-10 mx-auto max-w-md bg-[#070a16]/12"
        />
      )}

      <AnimatePresence>
        {mostrarAvisoNotif && (
          <AvisoActivarNotificaciones
            onPedirPermiso={onPedirPermisoNotif}
            onCerrar={() => setAvisoNotifCerrado(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
