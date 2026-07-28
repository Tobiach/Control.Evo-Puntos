// Siembra el negocio de MUESTRA "Victoria Café (Al Paso)" para el preview de venta.
//
// Requisitos previos OBLIGATORIOS antes de correr esto (no hay CLI conectado en este
// proyecto, ninguna migración se aplica sola):
//   - Pegar `supabase/migrations/0014_muestra_logo_ruleta.sql` en el SQL Editor.
//   - Pegar `supabase/migrations/0015_rubro_cafeteria.sql` en el SQL Editor.
// Si falta alguna, los inserts de abajo van a fallar con un error claro de Postgres.
//
// Qué hace:
//   1. Crea (o reutiliza si ya existe) un usuario de Auth para el "dueño" de este negocio
//      de muestra, mismo patrón que las 8 cuentas demo ya sembradas (email
//      dueno.<negocio>.demo@gmail.com, password compartida ControlEvo2026!).
//   2. Inserta el negocio con activo=true + es_muestra=true + rubro='cafeteria' (funciona
//      vía el link directo ?carta=<id>, pero queda afuera del marketplace de clientes
//      reales) y un horario parado de ejemplo (media tarde, placeholder).
//   3. Inserta la carta digital completa: las 6 categorías y los 27 productos reales del
//      menú original (Café, Cafés Fríos, Cubanitos, Otras Bebidas, Dulces, Salado), sin
//      precio (el documento original no tenía precios visibles).
//   4. Inserta 15 recompensas (escalera entrada/media/alta) con productos reales del
//      menú — los puntos son PLACEHOLDER, hay que ajustarlos con el dueño real si cierra.
//   5. Inserta el pool de premios de la ruleta semanal de este negocio, también basado
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
      rubro: 'cafeteria',
      emoji: '☕',
      lat: -34.5910391,
      lng: -58.4282373,
      activo: true,
      es_muestra: true,
      // Horario parado de ejemplo (placeholder, a confirmar con el dueño real): la caída
      // típica de un café al paso es la media tarde, entre el almuerzo y la salida laboral.
      horario_valle: { desde: '15:00', hasta: '17:00', dias: [1, 2, 3, 4, 5] },
    },
    { onConflict: 'id' },
  );
  if (errNegocio) {
    console.error('Error al crear el negocio:', errNegocio.message);
    process.exit(1);
  }
  console.log(`Negocio "${NEGOCIO_ID}" creado/actualizado.`);

  // Recompensas, carta y premios no tienen una clave natural: se borra lo que hubiera de
  // este negocio y se vuelve a insertar, igual patrón que `guardarNegocioYRecompensas` en
  // la app — así el script se puede correr más de una vez sin duplicar filas.
  await supabase.from('recompensas').delete().eq('negocio_id', NEGOCIO_ID);

  // Escalera completa entrada/media/alta con productos 100% reales del menú (nunca
  // inventados). Puntos PLACEHOLDER — se ajustan con el dueño real si cierra la venta.
  const { error: errRecompensas } = await supabase.from('recompensas').insert([
    // Entrada
    { negocio_id: NEGOCIO_ID, pts: 80, descripcion: 'Café Filtrado', categoria: 'Bebidas' },
    { negocio_id: NEGOCIO_ID, pts: 120, descripcion: 'Medialunas x2', categoria: 'Comida' },
    { negocio_id: NEGOCIO_ID, pts: 140, descripcion: 'Chipa', categoria: 'Comida' },
    { negocio_id: NEGOCIO_ID, pts: 180, descripcion: 'Alfajor de Maicena (chico)', categoria: 'Comida' },
    // Media
    { negocio_id: NEGOCIO_ID, pts: 220, descripcion: 'Latte', categoria: 'Bebidas' },
    { negocio_id: NEGOCIO_ID, pts: 280, descripcion: 'Cubanito Bañado', categoria: 'Comida' },
    { negocio_id: NEGOCIO_ID, pts: 320, descripcion: 'Croissant con J y Q', categoria: 'Comida' },
    { negocio_id: NEGOCIO_ID, pts: 380, descripcion: 'Cubanito Especial', categoria: 'Comida' },
    { negocio_id: NEGOCIO_ID, pts: 450, descripcion: '10% off en tu pedido', categoria: 'Descuentos' },
    { negocio_id: NEGOCIO_ID, pts: 520, descripcion: 'Pizza Individual', categoria: 'Comida' },
    // Alta / aspiracional (familia de docenas, ordenadas por volumen real)
    { negocio_id: NEGOCIO_ID, pts: 750, descripcion: 'Docena de Cubanitos Clásico', categoria: 'Regalos' },
    { negocio_id: NEGOCIO_ID, pts: 950, descripcion: 'Docena de Cubanitos Bañados', categoria: 'Regalos' },
    { negocio_id: NEGOCIO_ID, pts: 1150, descripcion: 'Docena de Cubanitos Especiales', categoria: 'Regalos' },
    { negocio_id: NEGOCIO_ID, pts: 1400, descripcion: 'Docena Mixta Especial', categoria: 'Regalos' },
    { negocio_id: NEGOCIO_ID, pts: 1800, descripcion: 'Docena Mixta Premium', categoria: 'Regalos' },
  ]);
  if (errRecompensas) {
    console.error('Error al cargar recompensas:', errRecompensas.message);
    process.exit(1);
  }
  console.log('15 recompensas cargadas (escalera entrada/media/alta, puntos placeholder).');

  // Carta digital completa: las 6 categorías y los 27 productos reales del menú, tal
  // cual el documento original (sin inventar productos ni precios — precio 0 = "sin
  // precio visible", CartaPublica.tsx ya lo oculta en vez de mostrar "$0").
  await supabase.from('carta_items').delete().eq('negocio_id', NEGOCIO_ID);
  const item = (categoria, orden, nombre, descripcion = null) => ({
    negocio_id: NEGOCIO_ID,
    categoria,
    orden,
    nombre,
    descripcion,
    precio: 0,
    disponible: true,
  });
  const menu = [
    item('Café', 0, 'Filtrado'),

    item('Cafés Fríos', 0, 'Americano'),
    item('Cafés Fríos', 1, 'Espresso Tonic'),
    item('Cafés Fríos', 2, 'Capuchino'),
    item('Cafés Fríos', 3, 'Flat White'),
    item('Cafés Fríos', 4, 'Latte'),

    item('Cubanitos', 0, 'Cubanito Clásico', 'Relleno de dulce de leche'),
    item('Cubanitos', 1, 'Cubanito Bañado', 'Relleno de dulce de leche, bañado en chocolate negro o blanco'),
    item(
      'Cubanitos',
      2,
      'Cubanito Especial',
      'Relleno de dulce de leche, bañado con chocolate blanco o negro, con coco o maní crocante',
    ),
    item('Cubanitos', 3, 'Docena de Cubanitos Clásico'),
    item('Cubanitos', 4, 'Docena de Cubanitos Bañados'),
    item('Cubanitos', 5, 'Docena de Cubanitos Especiales'),
    item('Cubanitos', 6, 'Docena Mixta Especial', '4 clásicos + 4 bañados + 4 especiales'),
    item('Cubanitos', 7, 'Docena Mixta Premium', '6 bañados + 6 especiales'),

    item('Otras Bebidas', 0, 'Licuados', 'De banana y/o durazno, con leche o agua'),
    item('Otras Bebidas', 1, 'Limonada', 'Con menta y jengibre'),
    item('Otras Bebidas', 2, 'Jugo de Naranja Exprimido'),
    item('Otras Bebidas', 3, 'Agua Mineral'),
    item('Otras Bebidas', 4, 'Gaseosas (lata)'),
    item('Otras Bebidas', 5, 'Jugos de fruta "Estancia Los Naranjos"'),

    item('Dulces', 0, 'Medialunas'),
    item('Dulces', 1, 'Alfajor de Maicena (chico)'),

    item('Salado', 0, 'Chipa'),
    item('Salado', 1, 'Sandwich de Chipa J y Q'),
    item('Salado', 2, 'Croissant', 'Con harina orgánica y agregado de masa madre'),
    item('Salado', 3, 'Croissant con J y Q', 'Con harina orgánica y agregado de masa madre'),
    item('Salado', 4, 'Pizza Individual', 'De jamón y queso, con harina orgánica y agregado de masa madre'),
  ];
  const { error: errCarta } = await supabase.from('carta_items').insert(menu);
  if (errCarta) {
    console.error('Error al cargar la carta:', errCarta.message);
    process.exit(1);
  }
  console.log(`${menu.length} productos cargados en la carta digital (6 categorías, sin precio).`);

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
