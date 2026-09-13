// Siembra UN cliente demo ("premia.latam@gmail.com") con actividad real y creíble en 5
// negocios REALES del marketplace (es_muestra = false, del lote de 73 sembrado con
// sembrar-muestras-lote.mjs) — para mostrar la app del lado del cliente con datos de
// verdad: puntos por negocio, historial de visitas, canjes ya hechos, racha y el nivel
// global de Premín (calcularXpTotal sobre la suma de puntos actuales, ver src/lib/club.ts).
//
// Todos los negocios de este lote comparten un único dueño (dueno.muestras-premia.demo@gmail.com,
// ver scripts/sembrar-muestras-lote.mjs) — por eso ese mismo dueño puede cargar `visitas` y
// `relaciones_negocio` directo (mismo patrón que scripts/sembrar-victoria-cafe.mjs).
//
// IMPORTANTE — descubierto al escribir este script (13/9/2026): la tabla `canjes` en
// producción SOLO tiene las columnas base de 0017_canjes.sql (cliente_id, negocio_id,
// recompensa_id, pts, descripcion, created_at). Las columnas de 0021_canjes_verificables.sql
// (estado, codigo_verificacion, expira_at, confirmado_at) NO EXISTEN — esa migración nunca se
// aplicó en producción, a pesar de que el frontend real (`panelCliente.ts`) ya llama a la RPC
// `iniciar_canje()` de esa misma migración. Confirmado en vivo: todo intento real de canjear
// una recompensa en producción hoy falla con `column "codigo_verificacion" does not exist`
// (sin perder los puntos del cliente — la función hace rollback). Por eso este script inserta
// los canjes de siembra con SOLO las columnas base — insertar `estado`/`confirmado_at` rompe
// igual que le rompe a la RPC real. Ver el hallazgo completo en
// docs/AUDITORIA-REFERENCIAS-PASITO.md y el pendiente en CLAUDE.md.
//
// Uso: node scripts/sembrar-cliente-demo-premia-latam.mjs

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

const clienteNuevo = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EMAIL_DUENO_LOTE = 'dueno.muestras-premia.demo@gmail.com';
const PASSWORD_DUENO_LOTE = 'ControlEvo2026!';

const EMAIL_CLIENTE = 'premia.latam@gmail.com';
const PASSWORD_CLIENTE = 'premia.startup!';
const NOMBRE_CLIENTE = 'Tobias';
const TELEFONO_CLIENTE = '11 9999-0001';

const MS_DIA = 86_400_000;
const haceDias = (dias) => new Date(Date.now() - dias * MS_DIA).toISOString();

async function autenticar(supabase, email, password, rol) {
  const { data: signUp, error: errSignUp } = await supabase.auth.signUp({ email, password });
  if (signUp?.session) return signUp.session.user;
  if (errSignUp && !errSignUp.message.toLowerCase().includes('already registered')) {
    console.error(`Error en signUp (${rol}):`, errSignUp.message);
  }
  const { data: signIn, error: errSignIn } = await supabase.auth.signInWithPassword({ email, password });
  if (errSignIn || !signIn.session) {
    console.error(
      `No se pudo autenticar a "${rol}" (${email}). Si el proyecto exige confirmar el email ` +
        'antes de dar sesión, confirmalo una vez a mano en el dashboard de Supabase ' +
        '(Authentication > Users) y volvé a correr este script.',
    );
    if (errSignIn) console.error(errSignIn.message);
    process.exit(1);
  }
  return signIn.session.user;
}

// negocioId -> { visitas: [{diasAtras, monto, categoria}], canje?: {descripcion, pts, diasAtras} }
// Montos = tickets reales de gastro/super de barrio (checks de bar/restó $5.500-11.500,
// almacén $3.000-14.000). `canje` es OPCIONAL y ya sucedió antes de hoy: se resta del total
// ganado para que el saldo actual quede consistente CON las recompensas reales de cada negocio
// (ver scripts/muestras-lote.data.json).
const PLAN = {
  bavieca: {
    // Recompensas: 150/300/450/700/1200. Canjeó la de 150 hace 24 días; hoy le alcanza para
    // la de 450 y le falta poco para la de 700 (racha de 3 días seguidos al principio).
    canje: { descripcion: 'Copa de vino de la casa', pts: 150, diasAtras: 24 },
    visitas: [
      { diasAtras: 1, monto: 6500, categoria: 'Bebidas' },
      { diasAtras: 2, monto: 6900, categoria: 'Comida' },
      { diasAtras: 3, monto: 7200, categoria: 'Bebidas' },
      { diasAtras: 8, monto: 6100, categoria: 'Comida' },
      { diasAtras: 13, monto: 8300, categoria: 'Bebidas' },
      { diasAtras: 19, monto: 6600, categoria: 'Comida' },
      { diasAtras: 26, monto: 7100, categoria: 'Bebidas' },
      { diasAtras: 33, monto: 5900, categoria: 'Comida' },
      { diasAtras: 41, monto: 6800, categoria: 'Bebidas' },
      { diasAtras: 50, monto: 7500, categoria: 'Comida' },
      { diasAtras: 59, monto: 6300, categoria: 'Bebidas' },
    ],
  },
  'baum-catrina': {
    // Recompensas: 150/250/400/600/900/1500. Sin canjes todavía, ya le alcanza para la de 600.
    visitas: [
      { diasAtras: 2, monto: 5500, categoria: 'Comida' },
      { diasAtras: 5, monto: 6200, categoria: 'Bebidas' },
      { diasAtras: 9, monto: 5100, categoria: 'Comida' },
      { diasAtras: 13, monto: 5800, categoria: 'Bebidas' },
      { diasAtras: 18, monto: 4900, categoria: 'Comida' },
      { diasAtras: 24, monto: 6400, categoria: 'Bebidas' },
      { diasAtras: 30, monto: 5300, categoria: 'Comida' },
      { diasAtras: 37, monto: 5700, categoria: 'Bebidas' },
      { diasAtras: 44, monto: 6000, categoria: 'Comida' },
      { diasAtras: 51, monto: 5400, categoria: 'Bebidas' },
      { diasAtras: 58, monto: 6600, categoria: 'Comida' },
      { diasAtras: 65, monto: 5000, categoria: 'Bebidas' },
    ],
  },
  'darsena-bar': {
    // Recompensas: 150/250/400/600/900/1500. Sin canjes, casi llega a la de 400 (91%).
    visitas: [
      { diasAtras: 5, monto: 6800, categoria: 'Bebidas' },
      { diasAtras: 12, monto: 5900, categoria: 'Comida' },
      { diasAtras: 19, monto: 7100, categoria: 'Bebidas' },
      { diasAtras: 27, monto: 6200, categoria: 'Comida' },
      { diasAtras: 35, monto: 5600, categoria: 'Bebidas' },
      { diasAtras: 44, monto: 4700, categoria: 'Comida' },
    ],
  },
  hoppe: {
    // Recompensas: 120/250/500/1000. Canjeó la de 120 hace 30 días; hoy le alcanza para la de 250.
    canje: { descripcion: '10% off en tu próxima compra', pts: 120, diasAtras: 30 },
    visitas: [
      { diasAtras: 1, monto: 9200, categoria: 'Descuentos' },
      { diasAtras: 8, monto: 7400, categoria: 'Regalos' },
      { diasAtras: 15, monto: 8100, categoria: 'Descuentos' },
      { diasAtras: 22, monto: 6800, categoria: 'Regalos' },
      { diasAtras: 29, monto: 7900, categoria: 'Descuentos' },
      { diasAtras: 36, monto: 8300, categoria: 'Regalos' },
      { diasAtras: 43, monto: 7200, categoria: 'Descuentos' },
    ],
  },
  'verduras-y-frutas-el-gringo': {
    // Recompensas: 120/250/500/1000. Recién arrancó, ya le alcanza justo para la de 120.
    visitas: [
      { diasAtras: 3, monto: 4600, categoria: 'Regalos' },
      { diasAtras: 11, monto: 3800, categoria: 'Descuentos' },
      { diasAtras: 19, monto: 3900, categoria: 'Regalos' },
    ],
  },
};

async function main() {
  const supabaseDueno = clienteNuevo();
  const duenoLote = await autenticar(supabaseDueno, EMAIL_DUENO_LOTE, PASSWORD_DUENO_LOTE, 'dueño del lote');
  console.log(`Autenticado como dueño del lote de muestras: ${duenoLote.id}`);

  const supabaseCliente = clienteNuevo();
  const usuarioCliente = await autenticar(supabaseCliente, EMAIL_CLIENTE, PASSWORD_CLIENTE, 'cliente demo');
  console.log(`Autenticado como cliente demo: ${usuarioCliente.id}`);

  const { data: filaCliente, error: errCliente } = await supabaseCliente
    .from('clientes')
    .upsert({ user_id: usuarioCliente.id, nombre: NOMBRE_CLIENTE, telefono: TELEFONO_CLIENTE }, { onConflict: 'telefono' })
    .select('id')
    .single();
  if (errCliente) {
    console.error('Error al crear/actualizar el cliente:', errCliente.message);
    process.exit(1);
  }
  console.log(`Cliente "${NOMBRE_CLIENTE}" (${filaCliente.id}) listo.\n`);

  let xpTotal = 0;

  for (const [negocioId, plan] of Object.entries(PLAN)) {
    const totalGanado = plan.visitas.reduce((suma, v) => suma + Math.floor(v.monto / 100), 0);
    const diasUltimaVisita = Math.min(...plan.visitas.map((v) => v.diasAtras));

    await supabaseDueno.from('visitas').delete().eq('cliente_id', filaCliente.id).eq('negocio_id', negocioId);

    // `canjes` no tiene policy de DELETE/UPDATE para el dueño (por diseño, ver 0017/0020) —
    // el script tiene que ser idempotente sin poder borrar: si el canje de esta corrida ya
    // existe (misma descripción), lo reusa en vez de insertarlo de nuevo (evitaría duplicarlo
    // en una segunda corrida).
    let totalCanjeado = 0;
    let notaCanje = '';
    if (plan.canje) {
      const { data: yaExiste } = await supabaseDueno
        .from('canjes')
        .select('id')
        .eq('cliente_id', filaCliente.id)
        .eq('negocio_id', negocioId)
        .eq('descripcion', plan.canje.descripcion)
        .maybeSingle();
      if (yaExiste) {
        totalCanjeado = plan.canje.pts;
        notaCanje = ` (canje ya existente: "${plan.canje.descripcion}", ${plan.canje.pts} pts)`;
      } else {
        const { error: errCanje } = await supabaseDueno.from('canjes').insert({
          cliente_id: filaCliente.id,
          negocio_id: negocioId,
          pts: plan.canje.pts,
          descripcion: plan.canje.descripcion,
          created_at: haceDias(plan.canje.diasAtras),
        });
        if (errCanje) {
          console.error(`[${negocioId}] No se pudo cargar el canje histórico:`, errCanje.message);
        } else {
          totalCanjeado = plan.canje.pts;
          notaCanje = ` (incluye 1 canje ya hecho: "${plan.canje.descripcion}", ${plan.canje.pts} pts)`;
        }
      }
    }
    const saldoFinal = totalGanado - totalCanjeado;

    const { error: errRelacion } = await supabaseDueno.from('relaciones_negocio').upsert(
      {
        cliente_id: filaCliente.id,
        negocio_id: negocioId,
        puntos: saldoFinal,
        ultima_visita_at: haceDias(diasUltimaVisita),
        puntos_vencen_at: haceDias(diasUltimaVisita - 60),
      },
      { onConflict: 'cliente_id,negocio_id' },
    );
    if (errRelacion) {
      console.error(`[${negocioId}] Error al crear la relación:`, errRelacion.message);
      continue;
    }

    const filasVisitas = plan.visitas.map((v) => ({
      cliente_id: filaCliente.id,
      negocio_id: negocioId,
      monto: v.monto,
      puntos: Math.floor(v.monto / 100),
      categoria: v.categoria,
      created_at: haceDias(v.diasAtras),
    }));
    const { error: errVisitas } = await supabaseDueno.from('visitas').insert(filasVisitas);
    if (errVisitas) {
      console.error(`[${negocioId}] Error al cargar visitas:`, errVisitas.message);
      continue;
    }

    xpTotal += saldoFinal;
    console.log(
      `[${negocioId}] ${plan.visitas.length} visitas, ${totalGanado} pts ganados, saldo actual ${saldoFinal} pts${notaCanje}.`,
    );
  }

  console.log(`\nXP global (suma de saldos actuales): ${xpTotal} pts.`);
  console.log('\nListo. Login de cliente para mostrar:');
  console.log(`  ${EMAIL_CLIENTE} / ${PASSWORD_CLIENTE}`);
  console.log('  Entrar por ?club → "Ya tengo cuenta" → ese mail y contraseña.');
}

main();
