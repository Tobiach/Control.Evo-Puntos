import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Compass,
  Gift,
  MessageCircle,
  Percent,
  QrCode,
  ShieldCheck,
  Store,
  Swords,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { WHATSAPP_NUMBER } from '../../config';
import ImagePlaceholder from './ImagePlaceholder';

// Página informativa para prospectos (dueños de comercio), en /landing — separada del demo
// interactivo que sigue viviendo en la raíz (Bienvenida → Cliente/Caja/Dueño → Cierre).
// Le habla a UNA sola audiencia (el dueño), nunca mezclada con el cliente final — mismo
// criterio que el resto del contenido de marca. Cero cifras, testimonios o tracción
// inventada: todo dato citado abajo sale de marketing/prompts/gpt-contexto-diario-premia.md.
//
// "Por qué crece solo" y "Cómo crece la red" comunican potencial de expansión sin prometer
// tracción propia inventada: se apoyan en mecánicas reales del producto (referidos, desafíos,
// efecto red) y en un dato de mercado real de un producto DISTINTO (Pasito), citado y
// diferenciado explícitamente — nunca presentado como número propio de Premia.ar.

const mensajeWhatsApp = encodeURIComponent(
  'Hola! Vi la web de Premia.ar y quiero saber más para mi comercio.',
);
const linkWhatsApp = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensajeWhatsApp}`;

const PROBLEMA = [
  {
    icono: TrendingDown,
    numero: '-30% a -40%',
    texto: 'cayó el consumo gastronómico en Argentina en los últimos dos años',
    fuente: 'FEHGRA, 2026',
  },
  {
    icono: Percent,
    numero: '27-30%',
    texto: 'de comisión cobran las apps de delivery — por clientes que ni siquiera conocés',
    fuente: 'Fudo AR, 2026',
  },
];

const RECURRENCIA = [
  { numero: '+90%', texto: 'más frecuencia de visita en clientes fieles', fuente: 'Paytronix' },
  { numero: '4.8x', texto: 'ROI promedio de un programa de fidelización bien ejecutado', fuente: 'Netguru' },
  { numero: '+25 a 95%', texto: 'más ganancias con solo +5% de retención de clientes', fuente: 'HBR' },
];

const DIA_A_DIA = [
  'Onboarding corto, armado para tu rubro',
  'Cajero con PIN propio — nadie usa tu cuenta',
  'Puntos automáticos en cada cobro, nadie calcula nada a mano',
  'Vos armás y editás las recompensas cuando quieras',
  'Carta digital por QR',
  'Pausás o reactivás el club cuando lo necesites',
];

const TU_PANEL = [
  { icono: Zap, texto: 'Qué hacer hoy: puntos por vencer, referidos a un paso de cerrar, premios sin canjear' },
  { icono: BarChart3, texto: 'Métricas reales de recurrencia — no una intuición' },
  { icono: Users, texto: 'Ficha completa de cada cliente: visitas, consumo, notas propias' },
];

const CRECE_SOLO = [
  {
    icono: UserPlus,
    titulo: 'Referidos con premio real',
    texto: 'Un cliente invita, el invitado consume, los dos ganan — verificado por el sistema, no a la palabra.',
  },
  {
    icono: Swords,
    titulo: 'Desafíos entre amigos',
    texto: 'Dentro del mismo local: una razón más concreta para volver acompañado.',
  },
  {
    icono: Trophy,
    titulo: 'Ranking del barrio',
    texto: 'Cada semana, quién más sumó. Competencia sana entre habitués.',
  },
  {
    icono: Compass,
    titulo: 'Descubrimiento por proximidad',
    texto: 'Un cliente que ya confía en un local de la red, encuentra el de al lado.',
  },
];

const LOOP_RED = [
  { icono: Store, texto: 'Un comercio se suma a la red' },
  { icono: Users, texto: 'Sus clientes habituales empiezan a sumar puntos' },
  { icono: Compass, texto: 'Esos clientes descubren otros comercios cerca' },
  { icono: TrendingUp, texto: 'Esos comercios ganan clientes nuevos — y el ciclo se repite' },
];

const DIFERENCIAL = [
  'Pagás según lo que ya factura tu negocio, no una cuota fija a ciegas',
  'Tus clientes descubren otros comercios de la red, y otros te descubren a vos',
  'Los puntos se verifican en el sistema — nadie se hackea un premio gratis',
  'Pensado para Argentina, no una plantilla genérica traducida',
];

const PRECIO = [
  { paso: '1', momento: 'Día 0', monto: 'USD 35', detalle: 'Al cerrar el acuerdo — mantenimiento del mes 1' },
  { paso: '2', momento: 'Día 30', monto: 'USD 235', detalle: 'Solo si viste resultados reales y seguís — setup + mes 2' },
  { paso: '3', momento: 'Mes 3 en adelante', monto: 'USD 35/mes', detalle: 'Mensual recurrente, nada más' },
];

function Blob({ color, className }: { color: string; className: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-3xl opacity-60 ${className}`}
      style={{ background: color }}
    />
  );
}

function IconoCirculo({
  icono: Icono,
  tono = 'acento',
}: {
  icono: typeof Zap;
  tono?: 'acento' | 'premio' | 'verde';
}) {
  const clases = {
    acento: 'bg-acento-suave text-acento',
    premio: 'bg-premio-suave text-premio',
    verde: 'bg-verde-suave text-verde-ok',
  }[tono];
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${clases}`}>
      <Icono size={20} />
    </span>
  );
}

function Boton({
  href,
  variante = 'primario',
  children,
}: {
  href: string;
  variante?: 'primario' | 'whatsapp';
  children: React.ReactNode;
}) {
  const clases =
    variante === 'whatsapp'
      ? 'bg-whatsapp text-white'
      : 'bg-acento text-on-acento active:bg-acento-hover';
  return (
    <motion.a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      whileTap={{ scale: 0.97 }}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold shadow-lg sm:w-auto sm:px-8 ${clases}`}
    >
      {children}
    </motion.a>
  );
}

export default function LandingPremia() {
  const [tecnicoAbierto, setTecnicoAbierto] = useState(false);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-fondo text-texto">
      {/* HERO */}
      <section className="relative mx-auto max-w-3xl px-5 pt-14 pb-10 text-center sm:pt-20">
        <Blob color="#FFF3D7" className="-top-10 -left-16 h-56 w-56" />
        <Blob color="#FFE2D7" className="top-20 -right-20 h-64 w-64" />

        <span className="relative inline-block rounded-full bg-acento-suave px-3 py-1 text-xs font-bold tracking-wide text-acento uppercase">
          Para dueños de comercio
        </span>

        <motion.img
          src="/premin.png"
          alt="Premín, la mascota de Premia.ar"
          initial={{ scale: 0.7, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="relative mx-auto mt-6 h-32 w-32 object-contain drop-shadow-xl sm:h-40 sm:w-40"
        />

        <h1 className="font-titulo relative mt-4 text-3xl leading-[1.15] font-extrabold tracking-tight sm:text-5xl">
          El problema no es que no vengan.
          <br />
          Es que nadie les da un motivo para volver.
        </h1>
        <p className="relative mx-auto mt-5 max-w-xl text-base leading-relaxed text-texto-muted sm:text-lg">
          Premia.ar es el sistema de recurrencia para comercios argentinos: tus clientes suman
          puntos por volver, canjean premios reales, y vos ves quién vuelve y quién no — todo
          desde tu celular.
        </p>

        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Boton href="/">
            Ver cómo funciona
            <ArrowRight size={19} strokeWidth={2.5} />
          </Boton>
          <Boton href={linkWhatsApp} variante="whatsapp">
            <MessageCircle size={19} />
            Hablar con nosotros
          </Boton>
        </div>
        <p className="relative mt-3 text-xs font-medium text-texto-muted">
          Dos minutos. No hace falta instalar nada para probarlo.
        </p>

        <div className="relative mx-auto mt-6 w-fit -rotate-3 rounded-2xl rounded-bl-md bg-card px-4 py-2 shadow-md">
          <span className="font-nota text-lg text-acento">Posta funciona así de simple 👇</span>
        </div>
      </section>

      {/* IMAGEN — mockup del celular con la app real */}
      <section className="mx-auto max-w-md px-5 pb-4">
        <ImagePlaceholder
          descripcion='Mockup de celular con la pantalla real de puntos/premios del cliente. Formato 4:5, fondo #F3F8F1, Premín chico en una esquina señalando la pantalla (adjuntar PNG de referencia de Premín, no redibujar). Un solo elemento protagónico: el celular.'
        />
      </section>

      {/* EL PROBLEMA */}
      <section className="bg-surface-dark px-5 py-14 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-bold tracking-widest text-white/50 uppercase">
            La realidad del rubro hoy
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PROBLEMA.map((item) => {
              const Icono = item.icono;
              return (
                <div key={item.numero} className="rounded-2xl bg-white/5 p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-premio">
                    <Icono size={20} />
                  </span>
                  <p className="font-titulo mt-3 text-3xl font-extrabold">{item.numero}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{item.texto}</p>
                  <p className="mt-2 text-[11px] text-white/40">{item.fuente}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LA PROMESA */}
      <section className="mx-auto max-w-2xl px-5 py-14 text-center">
        <h2 className="font-titulo text-2xl font-extrabold tracking-tight sm:text-3xl">
          No prometemos venderte más.
          <br />
          <span className="text-acento">Prometemos que tus clientes tengan motivos para volver.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-texto-muted">
          Tu cliente consume, suma puntos automáticos, canjea premios reales — y de paso
          descubre otros comercios de la red cerca suyo. Vos no hacés nada distinto en el
          mostrador.
        </p>
      </section>

      {/* POR QUÉ IMPORTA LA RECURRENCIA */}
      <section className="relative bg-fondo-medio px-5 py-14">
        <Blob color="#E7F7EA" className="top-0 right-0 h-72 w-72" />
        <div className="relative mx-auto max-w-4xl">
          <p className="text-center text-xs font-bold tracking-widest text-texto-muted uppercase">
            Por qué la recurrencia importa
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {RECURRENCIA.map((item) => (
              <div key={item.numero} className="rounded-2xl bg-card p-5 text-center shadow-sm">
                <p className="font-titulo text-3xl font-extrabold text-acento">{item.numero}</p>
                <p className="mt-1 text-sm leading-relaxed">{item.texto}</p>
                <p className="mt-2 text-[11px] text-texto-muted">{item.fuente}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA EN TU COMERCIO */}
      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="font-titulo text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
          Cómo funciona en tu comercio
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-borde bg-card p-6">
            <IconoCirculo icono={QrCode} />
            <h3 className="mt-3 text-lg font-bold">El día a día</h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {DIA_A_DIA.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-texto-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acento" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-borde bg-card p-6">
            <IconoCirculo icono={Gift} tono="premio" />
            <h3 className="mt-3 text-lg font-bold">Tu panel</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {TU_PANEL.map((item) => {
                const Icono = item.icono;
                return (
                  <li key={item.texto} className="flex items-start gap-2.5 text-sm text-texto-muted">
                    <Icono size={16} className="mt-0.5 shrink-0 text-acento" />
                    {item.texto}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <ImagePlaceholder
            aspecto="aspect-[16/10]"
            descripcion="Mockup del panel del dueño real: el copiloto de acciones ('Para hacer hoy') o las métricas de recurrencia. Formato 16:9 horizontal, fondo blanco/tarjeta, un solo mockup protagónico con sombra suave."
          />
        </div>
      </section>

      {/* POR QUÉ ESTO CRECE SOLO */}
      <section className="relative bg-fondo-medio px-5 py-14">
        <Blob color="#FFE2D7" className="bottom-0 left-0 h-64 w-64" />
        <div className="relative mx-auto max-w-4xl">
          <h2 className="font-titulo text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Por qué esto crece solo
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-texto-muted">
            No es un club de puntos más. Cada mecánica está pensada para que tus clientes lo
            cuenten sin que se los pidas.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {CRECE_SOLO.map((item) => (
              <div key={item.titulo} className="flex items-start gap-3.5 rounded-2xl bg-card p-5 shadow-sm">
                <IconoCirculo icono={item.icono} tono="verde" />
                <div>
                  <p className="text-sm font-bold">{item.titulo}</p>
                  <p className="mt-1 text-sm leading-relaxed text-texto-muted">{item.texto}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-borde-fuerte bg-card p-5 text-center">
            <p className="text-sm leading-relaxed text-texto-muted">
              Esto ya pasó en Argentina: una app de recompensas sumó{' '}
              <span className="font-bold text-texto">300.000 usuarios y 600 comercios en su
              primer mes</span>, sin pauta paga.
            </p>
            <p className="mt-1 text-[11px] text-texto-muted">
              Pasito, 2026 — premia por caminar cerca de un comercio. Premia.ar premia por
              consumir adentro: el mercado ya demostró que quiere esto.
            </p>
          </div>
        </div>
      </section>

      {/* CÓMO CRECE LA RED */}
      <section className="mx-auto max-w-4xl px-5 py-14 text-center">
        <h2 className="font-titulo text-2xl font-extrabold tracking-tight sm:text-3xl">
          Cada comercio nuevo suma su propia red
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-texto-muted">
          No hacemos publicidad masiva. La red crece por diseño, no por gasto en marketing.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
          {LOOP_RED.map((paso, indice) => {
            const Icono = paso.icono;
            return (
              <div key={paso.texto} className="relative flex flex-col items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-acento-suave text-acento">
                  <Icono size={24} />
                </span>
                <p className="text-xs leading-relaxed font-medium text-texto-muted">{paso.texto}</p>
                {indice < LOOP_RED.length - 1 && (
                  <ArrowRight
                    size={16}
                    className="absolute top-5 -right-2 hidden text-borde-fuerte sm:block"
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs font-semibold text-acento">↺ y el ciclo se repite con cada comercio nuevo</p>

        <div className="mt-8">
          <ImagePlaceholder
            aspecto="aspect-[16/9]"
            descripcion="Diagrama ilustrado del loop de crecimiento de la red (comercio → clientes → descubrimiento → nuevo comercio), con Premín señalando el camino con su brújula (adjuntar PNG de referencia, no redibujar). Fondo #F3F8F1, acentos dorado #D89B2B y coral #F28A63, un solo elemento protagónico: el diagrama."
          />
        </div>
      </section>

      {/* DIFERENCIAL */}
      <section className="bg-fondo-medio px-5 py-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-titulo text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Por qué es distinto
          </h2>
          <ul className="mt-8 flex flex-col gap-3">
            {DIFERENCIAL.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-verde-suave text-[11px] font-bold text-verde-ok">
                  ✓
                </span>
                <span className="text-sm font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CONFIANZA / TÉCNICO (colapsable) */}
      <section className="mx-auto max-w-2xl px-5 py-10">
        <button
          type="button"
          onClick={() => setTecnicoAbierto((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-borde bg-card px-5 py-4 text-left"
        >
          <span className="flex items-center gap-2.5 text-sm font-bold">
            <ShieldCheck size={18} className="text-acento" />
            ¿Y tus datos están seguros?
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-texto-muted transition-transform ${tecnicoAbierto ? 'rotate-180' : ''}`}
          />
        </button>
        {tecnicoAbierto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 rounded-2xl bg-fondo-medio px-5 py-4"
          >
            <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-texto-muted">
              <li>
                Los datos viven en Supabase (Postgres administrado sobre AWS) — no un Excel, no
                un servidor casero.
              </li>
              <li>
                Cada comercio ve solo lo suyo: verificado a nivel de base de datos (Row Level
                Security en las 21 tablas), no solo confiado al código de la app.
              </li>
              <li>
                Monitoreo activo de errores (Sentry) y de caídas del sitio (UptimeRobot, cada 5
                min), con alertas automáticas por email.
              </li>
            </ul>
          </motion.div>
        )}
      </section>

      {/* PRECIO */}
      <section className="bg-surface-dark px-5 py-14 text-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-titulo text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            No pagás por una promesa
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-white/60">
            Pagás viendo los números reales de tu propio panel, no por lo que te dijimos que iba
            a pasar.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {PRECIO.map((paso) => (
              <div key={paso.momento} className="relative rounded-2xl bg-white/5 p-5 text-center">
                <span className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-premio text-xs font-bold text-white">
                  {paso.paso}
                </span>
                <p className="mt-2 text-xs font-bold tracking-wide text-white/50 uppercase">{paso.momento}</p>
                <p className="font-titulo mt-2 text-3xl font-extrabold text-premio">{paso.monto}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/60">{paso.detalle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative mx-auto max-w-xl px-5 py-16 text-center">
        <Blob color="#FFF3D7" className="top-0 right-1/2 h-56 w-56 translate-x-1/2" />
        <motion.img
          src="/premin.png"
          alt="Premín, la mascota de Premia.ar"
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative mx-auto mb-3 h-20 w-20 object-contain drop-shadow-lg"
        />
        <h2 className="font-titulo relative text-2xl font-extrabold tracking-tight sm:text-3xl">
          ¿Querés esto para tu negocio?
        </h2>
        <p className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-texto-muted">
          Estamos sumando los primeros comercios de la red. Te respondemos nosotros directo — sin
          formularios ni vendedores.
        </p>
        <div className="relative mt-6 flex justify-center">
          <Boton href={linkWhatsApp} variante="whatsapp">
            <MessageCircle size={19} />
            Hablar con nosotros
          </Boton>
        </div>
      </section>

      <footer className="px-5 py-8 text-center">
        <p className="text-sm font-bold">Premia.ar</p>
        <p className="mt-1 text-xs text-texto-muted">Hecho en Argentina 🇦🇷</p>
        <div className="mt-3 flex justify-center gap-4 text-[11px] text-texto-muted">
          <a href="/?legal=terminos" className="underline underline-offset-4">
            Términos
          </a>
          <a href="/?legal=privacidad" className="underline underline-offset-4">
            Privacidad
          </a>
        </div>
      </footer>
    </div>
  );
}
