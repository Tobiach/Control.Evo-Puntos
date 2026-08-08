// Checkpoint 10 del enriquecimiento del panel demo: suma 5 clientes más a Victoria Café
// para que "clientes activos" y el ranking de recompensas no dependan de 3 personas, y para
// que la recurrencia real dé un número creíble (no 100% — un negocio real siempre tiene
// gente que probó una vez y no volvió, y eso también es una historia real para mostrarle
// al prospecto: "mirá quién no volvió, ahí está tu próxima acción").
//
// Mismo patrón que sembrar-victoria-cafe.mjs: cada cliente su propia cuenta de Auth,
// visitas backdateadas por INSERT directo del dueño (bypass de cobrar_con_pin, que
// siempre pone NOW()), horas de día variadas (varias cayendo en la franja valle 15-17hs
// para reforzar esa métrica con más volumen real).
//
// Uso: node scripts/sembrar-clientes-extra-victoria-cafe.mjs

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
const clienteNuevo = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const NEGOCIO_ID = 'victoria-cafe-al-paso';
const EMAIL_DUENO = 'dueno.victoria-cafe.demo@gmail.com';
const PASSWORD_DUENO = 'cafevictoria2026!';
const PASSWORD_DEMO = 'ControlEvo2026!';

const MS_DIA = 86_400_000;
/** Timestamp de hace `dias` días, a la `hora` elegida (para que no quede todo a la misma hora). */
const haceDiasAHora = (dias, hora) => {
  const fecha = new Date(Date.now() - dias * MS_DIA);
  fecha.setHours(hora, Math.floor(Math.random() * 50), 0, 0);
  return fecha.toISOString();
};

// 5 clientes nuevos con historias distintas: 2 que probaron una vez y no volvieron (churn
// real — el copiloto y la recurrencia deben poder mostrar esto, no solo el caso ideal),
// 1 recién entrando en "recurrente" (2 visitas), y 2 frecuentes de verdad. Varias horas
// caen en la franja valle (15-17hs) configurada del negocio.
const CLIENTES_EXTRA = [
  {
    email: 'cliente.mateo.victoriacafe.demo@gmail.com',
    nombre: 'Mateo Rossi',
    telefono: '11 3322-9910',
    visitas: [{ diasAtras: 5, hora: 12, monto: 2400, categoria: 'Comida' }],
  },
  {
    email: 'cliente.sofia.victoriacafe.demo@gmail.com',
    nombre: 'Sofía Aguirre',
    telefono: '11 4455-6620',
    visitas: [{ diasAtras: 12, hora: 9, monto: 2100, categoria: 'Bebidas' }],
  },
  {
    email: 'cliente.camila.victoriacafe.demo@gmail.com',
    nombre: 'Camila Duarte',
    telefono: '11 2233-7741',
    visitas: [
      { diasAtras: 3, hora: 16, monto: 2800, categoria: 'Bebidas' },
      { diasAtras: 16, hora: 10, monto: 3100, categoria: 'Comida' },
    ],
  },
  {
    email: 'cliente.franco.victoriacafe.demo@gmail.com',
    nombre: 'Franco Medina',
    telefono: '11 5566-8832',
    visitas: [
      { diasAtras: 2, hora: 19, monto: 3300, categoria: 'Comida' },
      { diasAtras: 9, hora: 15, monto: 2600, categoria: 'Bebidas' },
      { diasAtras: 17, hora: 12, monto: 3900, categoria: 'Comida' },
      { diasAtras: 24, hora: 16, monto: 2200, categoria: 'Bebidas' },
      { diasAtras: 31, hora: 9, monto: 3400, categoria: 'Comida' },
      { diasAtras: 39, hora: 18, monto: 2700, categoria: 'Bebidas' },
    ],
  },
  {
    email: 'cliente.nicolas.victoriacafe.demo@gmail.com',
    nombre: 'Nicolás Paredes',
    telefono: '11 6677-4453',
    visitas: [
      { diasAtras: 1, hora: 8, monto: 3600, categoria: 'Comida' },
      { diasAtras: 5, hora: 16, monto: 2900, categoria: 'Bebidas' },
      { diasAtras: 10, hora: 13, monto: 3200, categoria: 'Comida' },
      { diasAtras: 15, hora: 20, monto: 2500, categoria: 'Bebidas' },
      { diasAtras: 21, hora: 15, monto: 3800, categoria: 'Comida' },
      { diasAtras: 27, hora: 11, monto: 3000, categoria: 'Bebidas' },
      { diasAtras: 33, hora: 16, monto: 2700, categoria: 'Comida' },
      { diasAtras: 40, hora: 9, monto: 3500, categoria: 'Bebidas' },
    ],
  },
];

async function autenticar(supabase, email, rol) {
  const { data: signUp, error: errSignUp } = await supabase.auth.signUp({ email, password: PASSWORD_DEMO });
  if (signUp?.session) return signUp.session.user;
  if (errSignUp && !errSignUp.message.toLowerCase().includes('already registered')) {
    console.error(`Error en signUp (${rol}):`, errSignUp.message);
  }
  const { data: signIn, error: errSignIn } = await supabase.auth.signInWithPassword({ email, password: PASSWORD_DEMO });
  if (errSignIn || !signIn.session) {
    console.error(`No se pudo autenticar a "${rol}":`, errSignIn?.message);
    process.exit(1);
  }
  return signIn.session.user;
}

async function main() {
  const supabaseDueno = clienteNuevo();
  const { data: sesionDueno, error: errDueno } = await supabaseDueno.auth.signInWithPassword({
    email: EMAIL_DUENO,
    password: PASSWORD_DUENO,
  });
  if (errDueno || !sesionDueno.session) {
    console.error('No pude loguearme como dueño:', errDueno?.message);
    process.exit(1);
  }
  console.log('Logueado como dueño de Victoria Café.\n');

  for (const c of CLIENTES_EXTRA) {
    const supabaseCliente = clienteNuevo();
    const usuario = await autenticar(supabaseCliente, c.email, c.nombre);

    const { data: filaCliente, error: errCliente } = await supabaseCliente
      .from('clientes')
      .upsert({ user_id: usuario.id, nombre: c.nombre, telefono: c.telefono }, { onConflict: 'telefono' })
      .select('id')
      .single();
    if (errCliente) {
      console.error(`Error al crear cliente "${c.nombre}":`, errCliente.message);
      process.exit(1);
    }

    // Idempotente: si se re-corre el script, reemplaza en vez de duplicar.
    await supabaseDueno.from('visitas').delete().eq('cliente_id', filaCliente.id).eq('negocio_id', NEGOCIO_ID);
    await supabaseDueno.from('relaciones_negocio').delete().eq('cliente_id', filaCliente.id).eq('negocio_id', NEGOCIO_ID);

    const totalPuntos = c.visitas.reduce((suma, v) => suma + Math.floor(v.monto / 100), 0);
    const diasUltimaVisita = Math.min(...c.visitas.map((v) => v.diasAtras));

    const { error: errRelacion } = await supabaseDueno.from('relaciones_negocio').insert({
      cliente_id: filaCliente.id,
      negocio_id: NEGOCIO_ID,
      puntos: totalPuntos,
      ultima_visita_at: haceDiasAHora(diasUltimaVisita, 12),
      puntos_vencen_at: new Date(Date.now() + 60 * MS_DIA).toISOString(),
    });
    if (errRelacion) {
      console.error(`Error al crear la relación de "${c.nombre}":`, errRelacion.message);
      process.exit(1);
    }

    const filasVisitas = c.visitas.map((v) => ({
      cliente_id: filaCliente.id,
      negocio_id: NEGOCIO_ID,
      monto: v.monto,
      puntos: Math.floor(v.monto / 100),
      categoria: v.categoria,
      created_at: haceDiasAHora(v.diasAtras, v.hora),
    }));
    const { error: errVisitas } = await supabaseDueno.from('visitas').insert(filasVisitas);
    if (errVisitas) {
      console.error(`Error al cargar visitas de "${c.nombre}":`, errVisitas.message);
      process.exit(1);
    }

    console.log(`"${c.nombre}" listo: ${totalPuntos} pts, ${c.visitas.length} ${c.visitas.length === 1 ? 'visita' : 'visitas'}.`);
  }

  console.log('\nListo — corré scripts/diagnostico-panel-victoria-cafe.mjs para ver el total actualizado.');
}

main();
