import { useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { DATA_RUBROS, type Cliente, type Rubro } from './data/mockClientes';
import Bienvenida, { type Modo } from './components/Bienvenida';
import PasoCliente from './components/PasoCliente';
import PasoCajero from './components/PasoCajero';
import PasoDueno from './components/PasoDueno';
import Cierre from './components/Cierre';
import MarketplaceApp from './components/appcliente/MarketplaceApp';

type Pantalla = 'bienvenida' | 'cliente' | 'cajero' | 'dueno' | 'cierre' | 'app';

const ORDEN: Pantalla[] = ['bienvenida', 'cliente', 'cajero', 'dueno', 'cierre'];
const COLOR_BARRA: Record<Rubro, string> = { gastro: '#0D0D0D', super: '#F5F6FA' };

function rubroInicial(): Rubro {
  return new URLSearchParams(window.location.search).get('rubro') === 'super' ? 'super' : 'gastro';
}

const clonarClientes = (rubro: Rubro): Cliente[] =>
  DATA_RUBROS[rubro].clientes.map((cliente) => ({ ...cliente }));

const variantes = {
  entrar: (direccion: number) => ({ x: direccion * 60, opacity: 0 }),
  centro: { x: 0, opacity: 1 },
  salir: (direccion: number) => ({ x: direccion * -60, opacity: 0 }),
};

export default function App() {
  const [rubro, setRubro] = useState<Rubro>(rubroInicial);
  const [modo, setModo] = useState<Modo>('demo');
  const [pantalla, setPantalla] = useState<Pantalla>('bienvenida');
  const [direccion, setDireccion] = useState(1);
  const [clientes, setClientes] = useState<Cliente[]>(() => clonarClientes(rubro));
  const [clienteActivoId, setClienteActivoId] = useState<string | null>(null);
  const [puntosSesion, setPuntosSesion] = useState(0);

  const data = DATA_RUBROS[rubro];
  const clienteActivo = clientes.find((cliente) => cliente.id === clienteActivoId) ?? null;
  const indice = ORDEN.indexOf(pantalla);
  const esPaso = indice >= 1 && indice <= 3;

  useLayoutEffect(() => {
    document.documentElement.dataset.rubro = rubro;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[rubro]);
    const url = new URL(window.location.href);
    url.searchParams.set('rubro', rubro);
    window.history.replaceState(null, '', url);
  }, [rubro]);

  const elegirRubro = (nuevoRubro: Rubro) => {
    if (nuevoRubro === rubro) return;
    setRubro(nuevoRubro);
    setClientes(clonarClientes(nuevoRubro));
    setClienteActivoId(null);
    setPuntosSesion(0);
  };

  const navegar = (destino: Pantalla) => {
    setDireccion(ORDEN.indexOf(destino) >= indice ? 1 : -1);
    setPantalla(destino);
  };

  const comenzar = () => {
    if (modo === 'app') {
      setClienteActivoId(data.clienteAppId);
      navegar('app');
      return;
    }
    navegar('cliente');
  };

  const acreditarPuntos = (id: string, puntos: number) => {
    setClientes((previos) =>
      previos.map((cliente) =>
        cliente.id === id
          ? { ...cliente, puntos: cliente.puntos + puntos, ultimaVisitaDias: 0 }
          : cliente,
      ),
    );
    setPuntosSesion((previo) => previo + puntos);
  };

  const reiniciar = () => {
    setClientes(clonarClientes(rubro));
    setClienteActivoId(null);
    setPuntosSesion(0);
    navegar('bienvenida');
  };

  if (pantalla === 'app' && clienteActivo) {
    return <MarketplaceApp data={data} cliente={clienteActivo} onSalir={reiniciar} />;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6">
      {esPaso && (
        <header className="flex items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => navegar(ORDEN[indice - 1])}
            aria-label="Volver"
            className="rounded-full border border-borde bg-card p-2 text-texto-muted"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-1 gap-1.5">
            {[1, 2, 3].map((paso) => (
              <div
                key={paso}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  paso <= indice ? 'bg-acento' : 'bg-borde'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-texto-muted">{indice} de 3</span>
        </header>
      )}

      <AnimatePresence mode="wait" initial={false} custom={direccion}>
        <motion.main
          key={pantalla}
          custom={direccion}
          variants={variantes}
          initial="entrar"
          animate="centro"
          exit="salir"
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="flex flex-1 flex-col"
        >
          {pantalla === 'bienvenida' && (
            <Bienvenida
              rubro={rubro}
              modo={modo}
              onElegirRubro={elegirRubro}
              onElegirModo={setModo}
              onComenzar={comenzar}
            />
          )}
          {pantalla === 'cliente' && (
            <PasoCliente
              data={data}
              clientes={clientes}
              clienteActivo={clienteActivo}
              onSeleccionar={setClienteActivoId}
            />
          )}
          {pantalla === 'cajero' && (
            <PasoCajero
              data={data}
              clientes={clientes}
              clienteActivo={clienteActivo}
              onAcreditar={acreditarPuntos}
            />
          )}
          {pantalla === 'dueno' && (
            <PasoDueno data={data} clientes={clientes} puntosSesion={puntosSesion} />
          )}
          {pantalla === 'cierre' && <Cierre data={data} onReiniciar={reiniciar} />}
        </motion.main>
      </AnimatePresence>

      {esPaso && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => navegar(ORDEN[indice + 1])}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
        >
          {pantalla === 'dueno' ? 'Terminar recorrido' : 'Siguiente'}
          <ArrowRight size={19} strokeWidth={2.5} />
        </motion.button>
      )}
    </div>
  );
}
