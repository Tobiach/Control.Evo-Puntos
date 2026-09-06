// Siembra en lote los negocios de MUESTRA (es_muestra = true) para el escaparate privado
// de venta de Premia.ar. Mismo patrón que `scripts/sembrar-victoria-cafe.mjs`, pero:
//   - Una sola cuenta de dueño compartida para TODOS los negocios de este lote
//     (dueno.muestras-premia.demo@gmail.com). Tobías la usa con ?admin para mostrarle
//     a cada prospecto su propio local, o comparte el link directo ?carta=<id>.
//   - Carga liviana: negocio + carta + recompensas + ruleta. Sin clientes demo ni visitas
//     backdateadas (eso es el "tratamiento completo", se hace después, negocio por negocio,
//     solo cuando un dueño confirma que quiere entrar).
//   - Los datos salen de `scripts/muestras-lote.data.json` (generado a partir de dos
//     planillas de relevamiento de Tobías — ver docs/MUESTRAS-LOTE.md).
//
// REGLA NO NEGOCIABLE: todo lo que carga este script entra con es_muestra = true. NUNCA
// pasar es_muestra a false en lote. Se cambia uno por uno, y solo con confirmación
// explícita de Tobías de que ESE dueño dijo que sí.
//
// Requisitos previos (no hay CLI de Supabase conectado — ver docs/SUPABASE.md):
//   - Migraciones 0007 (carta_items), 0012 (calle/altura), 0013 (vip_desde_puntos),
//     0014 (es_muestra + premios_ruleta) aplicadas en producción. Si falta alguna, los
//     inserts fallan con un error claro de Postgres.
//   - La cuenta de dueño de abajo tiene que poder iniciar sesión. Si el proyecto exige
//     confirmar el email, confirmarlo una vez a mano en el dashboard (Authentication >
//     Users) y volver a correr.
//
// Uso:
//   node scripts/sembrar-muestras-lote.mjs --dry           # valida y muestra, no escribe
//   node scripts/sembrar-muestras-lote.mjs                  # siembra los 77
//   node scripts/sembrar-muestras-lote.mjs --solo=bavieca   # uno solo
//   node scripts/sembrar-muestras-lote.mjs --desde=1 --hasta=20

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const DRY = args.has('dry');

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

const EMAIL_DUENO = 'dueno.muestras-premia.demo@gmail.com';
const PASSWORD_DEMO = 'ControlEvo2026!';

const data = JSON.parse(
  readFileSync(new URL('./muestras-lote.data.json', import.meta.url), 'utf-8'),
);

// Slice / filtro
let lote = data;
if (args.get('solo')) lote = data.filter((d) => d.negocio.id === args.get('solo'));
const desde = args.get('desde') ? Number(args.get('desde')) : 1;
const hasta = args.get('hasta') ? Number(args.get('hasta')) : data.length;
if (!args.get('solo')) lote = data.slice(desde - 1, hasta);

if (!lote.length) {
  console.error('El filtro no seleccionó ningún negocio.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function autenticar() {
  const { data: signUp } = await supabase.auth.signUp({
    email: EMAIL_DUENO,
    password: PASSWORD_DEMO,
  });
  if (signUp?.session) return signUp.session.user;

  const { data: signIn, error } = await supabase.auth.signInWithPassword({
    email: EMAIL_DUENO,
    password: PASSWORD_DEMO,
  });
  if (error || !signIn.session) {
    console.error(
      `No se pudo autenticar la cuenta de muestras (${EMAIL_DUENO}).\n` +
        'Si el proyecto exige confirmar el email antes de dar sesión, confirmalo una vez ' +
        'a mano desde el dashboard (Authentication > Users) y volvé a correr.',
    );
    if (error) console.error(error.message);
    process.exit(1);
  }
  return signIn.session.user;
}

async function sembrarNegocio(uid, entrada, i) {
  const { negocio, carta, recompensas, premios_ruleta } = entrada;
  const etiqueta = `[${String(i).padStart(2, ' ')}/${lote.length}] ${negocio.id}`;

  if (DRY) {
    console.log(
      `${etiqueta}  ${negocio.nombre} · ${negocio.rubro} · carta:${carta.length} ` +
        `reco:${recompensas.length} ruleta:${premios_ruleta.length}`,
    );
    return;
  }

  const { error: eN } = await supabase.from('negocios').upsert(
    { ...negocio, dueno_user_id: uid },
    { onConflict: 'id' },
  );
  if (eN) {
    console.error(`${etiqueta}  ERROR negocio: ${eN.message}`);
    return;
  }

  await supabase.from('recompensas').delete().eq('negocio_id', negocio.id);
  if (recompensas.length) {
    const { error } = await supabase
      .from('recompensas')
      .insert(recompensas.map((r) => ({ ...r, negocio_id: negocio.id })));
    if (error) console.error(`${etiqueta}  ERROR recompensas: ${error.message}`);
  }

  await supabase.from('carta_items').delete().eq('negocio_id', negocio.id);
  if (carta.length) {
    const { error } = await supabase
      .from('carta_items')
      .insert(carta.map((c) => ({ ...c, negocio_id: negocio.id })));
    if (error) console.error(`${etiqueta}  ERROR carta: ${error.message}`);
  }

  await supabase.from('premios_ruleta').delete().eq('negocio_id', negocio.id);
  if (premios_ruleta.length) {
    const { error } = await supabase
      .from('premios_ruleta')
      .insert(premios_ruleta.map((p) => ({ ...p, negocio_id: negocio.id })));
    if (error) console.error(`${etiqueta}  ERROR ruleta: ${error.message}`);
  }

  console.log(`${etiqueta}  OK  ${negocio.nombre}`);
}

async function main() {
  console.log(
    `${DRY ? '[DRY RUN] ' : ''}Sembrando ${lote.length} negocio(s) de muestra ` +
      `(es_muestra = true) como ${EMAIL_DUENO}\n`,
  );

  let uid = 'dry-run';
  if (!DRY) {
    const usuario = await autenticar();
    uid = usuario.id;
    console.log(`Autenticado. dueno_user_id = ${uid}\n`);
    await supabase
      .from('dueno_perfil')
      .upsert(
        { dueno_user_id: uid, nombre_persona: 'Tobías — muestras Premia' },
        { onConflict: 'dueno_user_id' },
      );
  }

  let i = 1;
  for (const entrada of lote) {
    await sembrarNegocio(uid, entrada, i++);
  }

  console.log('\nListo.');
  if (!DRY) {
    console.log('\nLinks para compartir por WhatsApp (carta pública):');
    for (const { negocio } of lote) {
      console.log(`  ${negocio.nombre}\n    https://premia-ar.vercel.app/?carta=${negocio.id}`);
    }
    console.log(
      `\nPanel para mostrar en vivo: https://premia-ar.vercel.app/?admin\n` +
        `  usuario: ${EMAIL_DUENO}\n  clave:   ${PASSWORD_DEMO}`,
    );
  }
}

main();
