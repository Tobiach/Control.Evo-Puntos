import { motion } from 'motion/react';
import {
  ArrowRight,
  Beef,
  Coffee,
  Smartphone,
  Presentation,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react';
import { DATA_RUBROS, type Rubro } from '../data/mockClientes';

export type Modo = 'demo' | 'app';

interface Props {
  rubro: Rubro;
  modo: Modo;
  onElegirRubro: (rubro: Rubro) => void;
  onElegirModo: (modo: Modo) => void;
  onComenzar: () => void;
  onDueno: () => void;
  onCajero: () => void;
}

const MODOS: { modo: Modo; icono: typeof Smartphone; titulo: string; detalle: string }[] = [
  {
    modo: 'demo',
    icono: Presentation,
    titulo: 'Demo de venta',
    detalle: 'Recorrido cliente, caja y dueño',
  },
  {
    modo: 'app',
    icono: Smartphone,
    titulo: 'App del cliente',
    detalle: 'Marketplace de locales y tus puntos',
  },
];

// Paleta única para los 4 rubros (src/index.css: "la marca ya no cambia de colores por tipo
// de negocio, solo el emoji/ícono") — el ícono es lo único que distingue cada tarjeta.
const OPCIONES = [
  { rubro: 'gastro' as const, icono: UtensilsCrossed, detalle: 'Bares y restaurantes' },
  { rubro: 'super' as const, icono: ShoppingCart, detalle: 'Supermercados y almacenes' },
  { rubro: 'carniceria' as const, icono: Beef, detalle: 'Carnicerías y granjas' },
  { rubro: 'cafeteria' as const, icono: Coffee, detalle: 'Cafeterías y confiterías' },
];

export default function Bienvenida({
  rubro,
  modo,
  onElegirRubro,
  onElegirModo,
  onComenzar,
  onDueno,
  onCajero,
}: Props) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-10 py-10">
      <div className="text-center">
        <motion.img
          src="/premin.png"
          alt="Premín, la mascota de Premia.ar"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mx-auto mb-3 h-20 w-20 object-contain drop-shadow-lg"
        />
        <h1 className="text-3xl font-black tracking-tight">Premia.ar</h1>
        <p className="mt-1 text-lg font-semibold text-acento">Sistema de recurrencia para comercios</p>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-texto-muted">
          El problema no es que no vengan. Es que nadie les da un motivo para volver. Mirá cómo lo
          resolvemos — como lo ve tu cliente, tu caja y vos. Dos minutos, en tu celular.
        </p>
      </div>

      <div>
        <p className="mb-3 text-center text-xs font-semibold tracking-widest text-texto-muted uppercase">
          Elegí tu rubro
        </p>
        <div className="grid grid-cols-2 gap-3">
          {OPCIONES.map((opcion) => {
            const activo = rubro === opcion.rubro;
            const Icono = opcion.icono;
            return (
              <motion.button
                key={opcion.rubro}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onElegirRubro(opcion.rubro)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-card px-3 py-5 text-center transition-shadow ${
                  activo ? 'border-acento shadow-lg' : 'border-borde opacity-75'
                }`}
              >
                <Icono size={26} className={activo ? 'text-acento' : 'text-texto-muted'} />
                <span className={`text-sm font-bold ${activo ? 'text-acento' : 'text-texto'}`}>
                  {DATA_RUBROS[opcion.rubro].etiqueta}
                </span>
                <span className="text-[11px] leading-tight text-texto-muted">{opcion.detalle}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-center text-xs font-semibold tracking-widest text-texto-muted uppercase">
          ¿Qué querés ver?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MODOS.map((opcion) => {
            const activo = modo === opcion.modo;
            const Icono = opcion.icono;
            return (
              <motion.button
                key={opcion.modo}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onElegirModo(opcion.modo)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-card px-3 py-5 text-center transition-shadow ${
                  activo ? 'border-acento shadow-lg' : 'border-borde opacity-75'
                }`}
              >
                <Icono size={24} className="text-acento" />
                <span className="text-sm font-bold text-texto">{opcion.titulo}</span>
                <span className="text-[11px] leading-tight text-texto-muted">{opcion.detalle}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onComenzar}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-acento py-4 text-base font-bold text-on-acento active:bg-acento-hover"
      >
        {modo === 'app' ? 'Entrar a la app' : 'Ver cómo funciona'}
        <ArrowRight size={19} strokeWidth={2.5} />
      </motion.button>

      <div className="-mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onDueno}
          className="py-1 text-xs font-semibold text-texto-muted underline underline-offset-4"
        >
          ¿Sos dueño de un negocio?
        </button>
        <button
          type="button"
          onClick={onCajero}
          className="py-1 text-xs font-semibold text-texto-muted underline underline-offset-4"
        >
          ¿Trabajás en la caja?
        </button>
      </div>
    </div>
  );
}
