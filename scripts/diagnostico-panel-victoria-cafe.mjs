// Diagnóstico de SOLO LECTURA: qué está mostrando HOY el panel del dueño de Victoria Café,
// para verificar contra el código antes/después de tocar la siembra. No escribe nada.
//
// Chequea el `error` de CADA query — la vez anterior un typo de columna (`created_at` en vez
// de `creado_at` en `referidos`) hizo que una consulta fallara en silencio y reportara "0"
// cuando en realidad los datos estaban bien. No repetir ese error acá.
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
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const NEGOCIO_ID = 'victoria-cafe-al-paso';
const EMAIL_DUENO = 'dueno.victoria-cafe.demo@gmail.com';
const PASSWORD = 'cafevictoria2026!';
const MS_DIA = 86_400_000;

/** `throw` si la query trajo error — nunca seguir de largo con `data: null` silencioso. */
function odesbordar(etiqueta, { data, error }) {
  if (error) {
    console.error(`ERROR en "${etiqueta}":`, error.message);
    process.exit(1);
  }
  return data;
}

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL_DUENO, password: PASSWORD });
  if (error || !data.session) {
    console.error('No pude loguearme como dueño:', error?.message);
    process.exit(1);
  }
  console.log('Logueado como dueño de Victoria Café.\n');
  const ahora = Date.now();

  const acciones = odesbordar('panel_acciones_reales', await supabase.rpc('panel_acciones_reales', { p_negocio_id: NEGOCIO_ID }));

  const recompensas = odesbordar(
    'recompensas',
    await supabase.from('recompensas').select('descripcion, pts, created_at').eq('negocio_id', NEGOCIO_ID).eq('activa', true),
  );
  const canjes = odesbordar(
    'canjes',
    await supabase.from('canjes').select('created_at, descripcion, pts').eq('negocio_id', NEGOCIO_ID).order('created_at', { ascending: false }),
  );
  // Replica la 3ra pata del copiloto (recompensa_sin_canjear), que vive en panelDueno.ts del
  // lado de la app, NO en la RPC — si solo se llama la RPC, este tipo de acción queda invisible.
  const treintaDiasAtras = ahora - 30 * MS_DIA;
  const descripcionesCanjeadas = new Set((canjes ?? []).map((c) => c.descripcion));
  const recompensasSinCanjear = (recompensas ?? []).filter(
    (r) => new Date(r.created_at).getTime() <= treintaDiasAtras && !descripcionesCanjeadas.has(r.descripcion),
  );

  console.log('=== COPILOTO ("Para hacer hoy" — RPC + la pata client-side de recompensas) ===');
  console.log(`${acciones?.length ?? 0} de la RPC (puntos_por_vencer / referido_a_un_paso):`);
  console.log(acciones?.length ? acciones : '(vacío)');
  console.log(`${recompensasSinCanjear.length} de recompensa_sin_canjear (≥30 días, 0 canjes):`);
  for (const r of recompensasSinCanjear) {
    const dias = Math.floor((ahora - new Date(r.created_at).getTime()) / MS_DIA);
    console.log(`  - "${r.descripcion}" lleva ${dias} días activa sin ningún canje`);
  }
  console.log(`TOTAL acciones que vería el dueño hoy: ${(acciones?.length ?? 0) + recompensasSinCanjear.length}`);

  const crm = odesbordar('clientes_del_negocio', await supabase.rpc('clientes_del_negocio', { p_negocio_id: NEGOCIO_ID }));
  console.log('\n=== CRM (clientes_del_negocio) ===');
  console.log(`Total clientes: ${crm?.length ?? 0}`);
  for (const c of crm ?? []) {
    console.log(
      `- ${c.nombre}: ${c.puntos} pts, ${c.cantidad_visitas} visitas, $${c.valor_total}, ${c.recompensas_usadas} canjes, VIP=${c.puntos >= 300}, nota="${c.nota ?? ''}", etiquetas=${JSON.stringify(c.etiquetas)}`,
    );
  }

  const relaciones = odesbordar(
    'relaciones_negocio',
    await supabase.from('relaciones_negocio').select('cliente_id, puntos, puntos_vencen_at, ultima_visita_at').eq('negocio_id', NEGOCIO_ID),
  );
  console.log('\n=== relaciones_negocio (puntos_vencen_at) ===');
  for (const r of relaciones ?? []) console.log(r);

  const visitas = odesbordar(
    'visitas',
    await supabase.from('visitas').select('created_at, monto, puntos').eq('negocio_id', NEGOCIO_ID).order('created_at', { ascending: false }),
  );
  console.log(`\n=== visitas: ${visitas?.length ?? 0} totales ===`);
  const horas = (visitas ?? []).map((v) => new Date(v.created_at).getHours());
  const enValle = horas.filter((h) => h >= 15 && h < 17).length;
  console.log('Horas del día en que ocurrieron:', horas.join(', '));
  console.log(`De esas, ${enValle} caen en la franja valle (15-17hs) configurada del negocio.`);

  console.log(`\n=== canjes: ${canjes?.length ?? 0} totales ===`);
  for (const c of canjes ?? []) {
    const diasAtras = Math.floor((ahora - new Date(c.created_at).getTime()) / MS_DIA);
    console.log(`- ${c.descripcion} (${c.pts} pts), hace ${diasAtras} días`);
  }

  const referidos = odesbordar(
    'referidos',
    await supabase.from('referidos').select('premiado_at, creado_at').eq('negocio_id', NEGOCIO_ID),
  );
  console.log(`\n=== referidos: ${referidos?.length ?? 0} totales, ${referidos?.filter((r) => r.premiado_at).length ?? 0} convertidos ===`);
  for (const r of referidos ?? []) console.log(r);

  const desafios = odesbordar(
    'desafios_amigos',
    await supabase.from('desafios_amigos').select('tipo, meta, vence_at, premiado_at, creado_at').eq('negocio_id', NEGOCIO_ID),
  );
  console.log(`\n=== desafíos: ${desafios?.length ?? 0} totales ===`);
  const resumenDesafios = { cumplidos: 0, enCurso: 0, fallados: 0 };
  for (const d of desafios ?? []) {
    const estado = d.premiado_at ? 'cumplidos' : new Date(d.vence_at).getTime() < ahora ? 'fallados' : 'enCurso';
    resumenDesafios[estado] += 1;
    console.log(d, '->', estado);
  }
  console.log('Resumen:', resumenDesafios);

  const eventos = odesbordar(
    'eventos_negocio',
    await supabase.from('eventos_negocio').select('nombre, fecha_inicio, fecha_fin').eq('negocio_id', NEGOCIO_ID),
  );
  console.log('\n=== eventos ===');
  for (const e of eventos ?? []) {
    const vigenteHoy = e.fecha_inicio <= new Date().toISOString().slice(0, 10) && e.fecha_fin >= new Date().toISOString().slice(0, 10);
    console.log(e, vigenteHoy ? '(vigente hoy)' : '(no vigente hoy)');
  }

  console.log(`\n=== recompensas activas: ${recompensas?.length ?? 0} ===`);
  const vencidas30 = (recompensas ?? []).filter((r) => new Date(r.created_at).getTime() <= treintaDiasAtras);
  console.log(`Con ≥30 días de antigüedad: ${vencidas30.map((r) => r.descripcion).join(', ') || '(ninguna)'}`);

  const conVarias = (crm ?? []).filter((c) => Number(c.cantidad_visitas) >= 2).length;
  const recurrencia = crm?.length ? Math.round((conVarias / crm.length) * 100) : 0;
  console.log(`\n=== resumen ===`);
  console.log(`Clientes activos: ${crm?.length ?? 0} · Recurrencia real (2+ visitas): ${recurrencia}%`);
}

main();
