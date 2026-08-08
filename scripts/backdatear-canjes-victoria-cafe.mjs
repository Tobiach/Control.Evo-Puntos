// Checkpoint 9 del enriquecimiento del panel demo: reparte canjes en varias semanas para
// que "Puntos: acreditados vs. redimidos" (últimas 6 semanas) no tenga los redimidos
// apilados en una sola barra.
//
// REQUIERE haber pegado antes supabase/migrations/0020_canjes_backdateables.sql en el SQL
// Editor de Supabase — el dueño no tiene permiso de INSERT directo en `canjes` (a diferencia
// de `visitas`/`relaciones_negocio`), solo la RPC `canjear_recompensa()`, que siempre pone
// `created_at = NOW()`. Sin esa migración este script falla con un error de RLS claro.
//
// Usa clientes NUEVOS (Franco, Nicolás — sumados en sembrar-clientes-extra-victoria-cafe.mjs)
// para no tocar el saldo de Bruno/Valentina/Julieta, cuya narrativa (VIP, puntos por vencer)
// ya quedó afinada en checkpoints anteriores.
//
// Uso: node scripts/backdatear-canjes-victoria-cafe.mjs

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
const supabaseDueno = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const NEGOCIO_ID = 'victoria-cafe-al-paso';
const EMAIL_DUENO = 'dueno.victoria-cafe.demo@gmail.com';
const PASSWORD_DUENO = 'cafevictoria2026!';
const MS_DIA = 86_400_000;
const haceDias = (d) => new Date(Date.now() - d * MS_DIA).toISOString();

// [nombre del cliente, descripción+pts de la recompensa (debe existir en `recompensas`),
//  hace cuántos días se canjeó]
const CANJES_A_REPARTIR = [
  { nombre: 'Franco Medina', descripcion: 'Medialunas x2', pts: 120, diasAtras: 12 },
  { nombre: 'Nicolás Paredes', descripcion: 'Café Filtrado', pts: 80, diasAtras: 26 },
  { nombre: 'Nicolás Paredes', descripcion: 'Chipa', pts: 140, diasAtras: 33 },
];

async function main() {
  const { data: sesion, error: errSesion } = await supabaseDueno.auth.signInWithPassword({
    email: EMAIL_DUENO,
    password: PASSWORD_DUENO,
  });
  if (errSesion || !sesion.session) {
    console.error('No pude loguearme como dueño:', errSesion?.message);
    process.exit(1);
  }

  const { data: crm, error: errCrm } = await supabaseDueno.rpc('clientes_del_negocio', { p_negocio_id: NEGOCIO_ID });
  if (errCrm) {
    console.error('No pude leer el CRM:', errCrm.message);
    process.exit(1);
  }
  const porNombre = Object.fromEntries((crm ?? []).map((f) => [f.nombre, f]));

  for (const c of CANJES_A_REPARTIR) {
    const cliente = porNombre[c.nombre];
    if (!cliente) {
      console.error(`No encontré a "${c.nombre}" en el CRM — ¿corriste sembrar-clientes-extra-victoria-cafe.mjs?`);
      continue;
    }
    if (cliente.puntos < c.pts) {
      console.error(`${c.nombre} no tiene suficientes puntos para "${c.descripcion}" (${cliente.puntos} < ${c.pts}).`);
      continue;
    }

    const { error: errInsert } = await supabaseDueno.from('canjes').insert({
      cliente_id: cliente.cliente_id,
      negocio_id: NEGOCIO_ID,
      pts: c.pts,
      descripcion: c.descripcion,
      created_at: haceDias(c.diasAtras),
    });
    if (errInsert) {
      console.error(
        `No pude insertar el canje de ${c.nombre} — ¿pegaste 0020_canjes_backdateables.sql en Supabase?`,
        errInsert.message,
      );
      process.exit(1);
    }

    const nuevoSaldo = cliente.puntos - c.pts;
    const { error: errUpd } = await supabaseDueno
      .from('relaciones_negocio')
      .update({ puntos: nuevoSaldo })
      .eq('negocio_id', NEGOCIO_ID)
      .eq('cliente_id', cliente.cliente_id);
    if (errUpd) {
      console.error(`No pude descontar los puntos de ${c.nombre}:`, errUpd.message);
      process.exit(1);
    }
    // Evita descontar dos veces el mismo canje si se re-corre el script.
    porNombre[c.nombre].puntos = nuevoSaldo;

    console.log(`${c.nombre}: canjeó "${c.descripcion}" (${c.pts} pts) hace ${c.diasAtras} días. Saldo: ${nuevoSaldo} pts.`);
  }

  console.log('\nListo — corré scripts/diagnostico-panel-victoria-cafe.mjs para confirmar.');
}

main();
