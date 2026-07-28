// Siembra el negocio de MUESTRA "Victoria Café (Al Paso)" para el preview de venta.
//
// Requisito previo OBLIGATORIO: pegar `supabase/migrations/0014_muestra_logo_ruleta.sql`
// en el SQL Editor de Supabase antes de correr esto (no hay CLI conectado en este
// proyecto, así que esa migración no se aplica sola). Si las columnas/tabla nuevas no
// existen todavía, los inserts de abajo van a fallar con un error claro de Postgres.
//
// Qué hace:
//   1. Crea (o reutiliza si ya existe) un usuario de Auth para el "dueño" de este negocio
//      de muestra, mismo patrón que las 8 cuentas demo ya sembradas (email
//      dueno.<negocio>.demo@gmail.com, password compartida ControlEvo2026!).
//   2. Inserta el negocio con activo=true + es_muestra=true (funciona vía el link directo
//      ?carta=<id>, pero queda afuera del marketplace de clientes reales).
//   3. Inserta 3 recompensas de ejemplo con productos reales del menú — los puntos son
//      PLACEHOLDER, hay que ajustarlos con el dueño real si cierra.
//   4. Inserta el pool de premios de la ruleta semanal de este negocio, también basado
//      en productos reales del menú.
//
// Uso: node scripts/sembrar-victoria-cafe.mjs

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function leerEnvLocal() {
  const texto = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
  const env = {};
  for (const linea of texto.split('\n')) {
    const m = linea.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = leerEnvLocal();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NEGOCIO_ID = 'victoria-cafe-al-paso';
const EMAIL_DUENO = 'dueno.victoria-cafe.demo@gmail.com';
const PASSWORD_DEMO = 'ControlEvo2026!';

async function autenticarDueno() {
  const { data: signUp, error: errSignUp } = await supabase.auth.signUp({
    email: EMAIL_DUENO,
    password: PASSWORD_DEMO,
  });
  if (signUp?.session) return signUp.session.user;

  if (errSignUp && !errSignUp.message.toLowerCase().includes('already registered')) {
    console.error('Error en signUp:', errSignUp.message);
  }

  // Cuenta ya existente de una corrida anterior: entramos con la misma contraseña.
  const { data: signIn, error: errSignIn } = await supabase.auth.signInWithPassword({
    email: EMAIL_DUENO,
    password: PASSWORD_DEMO,
  });
  if (errSignIn || !signIn.session) {
    console.error(
      'No se pudo autenticar al dueño de muestra. Si el proyecto exige confirmar el email ' +
        'antes de dar sesión, hay que confirmarlo a mano una vez desde el dashboard de Supabase ' +
        '(Authentication > Users) y volver a correr este script.',
    );
    if (errSignIn) console.error(errSignIn.message);
    process.exit(1);
  }
  return signIn.session.user;
}

async function main() {
  const usuario = await autenticarDueno();
  console.log(`Autenticado como dueño de muestra: ${usuario.id}`);

  const { error: errNegocio } = await supabase.from('negocios').upsert(
    {
      id: NEGOCIO_ID,
      dueno_user_id: usuario.id,
      nombre: 'Victoria Café (Al Paso)',
      categoria: 'Cafetería · Cubanitos',
      rubro: 'gastro',
      emoji: '☕',
      lat: -34.5910391,
      lng: -58.4282373,
      activo: true,
      es_muestra: true,
    },
    { onConflict: 'id' },
  );
  if (errNegocio) {
    console.error('Error al crear el negocio:', errNegocio.message);
    process.exit(1);
  }
  console.log(`Negocio "${NEGOCIO_ID}" creado/actualizado.`);

  // Recompensas y premios no tienen una clave natural: se borra lo que hubiera de este
  // negocio y se vuelve a insertar, igual patrón que `guardarNegocioYRecompensas` en la
  // app — así el script se puede correr más de una vez sin duplicar filas.
  await supabase.from('recompensas').delete().eq('negocio_id', NEGOCIO_ID);

  // Placeholder: ajustar con el dueño real en el onboarding si cierra la venta.
  const { error: errRecompensas } = await supabase.from('recompensas').insert([
    { negocio_id: NEGOCIO_ID, pts: 80, descripcion: 'Café Filtrado', categoria: 'Bebidas' },
    { negocio_id: NEGOCIO_ID, pts: 180, descripcion: 'Cubanito Bañado', categoria: 'Comida' },
    { negocio_id: NEGOCIO_ID, pts: 600, descripcion: 'Docena Mixta Premium', categoria: 'Regalos' },
  ]);
  if (errRecompensas) {
    console.error('Error al cargar recompensas:', errRecompensas.message);
    process.exit(1);
  }
  console.log('3 recompensas de ejemplo cargadas (puntos placeholder).');

  const premios = [
    { label: '+30 pts de regalo', emoji: '⭐', peso: 22, bueno: false, orden: 0 },
    { label: 'Medialunas gratis', emoji: '🥐', peso: 18, bueno: false, orden: 1 },
    { label: '10% off en tu pedido', emoji: '🏷️', peso: 16, bueno: false, orden: 2 },
    { label: 'Cubanito Clásico gratis', emoji: '🍬', peso: 14, bueno: true, orden: 3 },
    { label: '+75 pts de regalo', emoji: '✨', peso: 12, bueno: true, orden: 4 },
    { label: 'Café Filtrado gratis', emoji: '☕', peso: 12, bueno: false, orden: 5 },
    { label: 'Docena de Cubanitos Clásicos de regalo', emoji: '🎁', peso: 4, bueno: true, orden: 6 },
    { label: 'Premio mayor: Docena Mixta Premium gratis', emoji: '👑', peso: 2, bueno: true, orden: 7 },
  ].map((p) => ({ ...p, negocio_id: NEGOCIO_ID }));

  await supabase.from('premios_ruleta').delete().eq('negocio_id', NEGOCIO_ID);
  const { error: errPremios } = await supabase.from('premios_ruleta').insert(premios);
  if (errPremios) {
    console.error('Error al cargar los premios de la ruleta:', errPremios.message);
    process.exit(1);
  }
  console.log('Pool de premios de la ruleta cargado (basado en el menú real).');

  console.log('\nListo. Link para compartir por WhatsApp:');
  console.log(`https://premia-ar.vercel.app/?carta=${NEGOCIO_ID}`);
}

main();
