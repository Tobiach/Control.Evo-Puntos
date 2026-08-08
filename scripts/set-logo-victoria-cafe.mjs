// Setea logo_url del negocio de muestra Victoria Café al asset ya copiado a public/logos/.
// Un solo campo, no hace falta un script de siembra completo — reusa la sesión del dueño
// (misma tabla `negocios` que ya edita `guardarNegocioYRecompensas` desde el panel).
//
// Uso: node scripts/set-logo-victoria-cafe.mjs
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
const LOGO_URL = '/logos/victoria-cafe.jpg';

async function main() {
  const { error: errAuth } = await supabase.auth.signInWithPassword({
    email: 'dueno.victoria-cafe.demo@gmail.com',
    password: 'cafevictoria2026!',
  });
  if (errAuth) {
    console.error('No pude loguearme como dueño:', errAuth.message);
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('negocios')
    .update({ logo_url: LOGO_URL })
    .eq('id', NEGOCIO_ID)
    .select('id, logo_url')
    .single();
  if (error) {
    console.error('No pude setear el logo:', error.message);
    process.exit(1);
  }
  console.log(`Logo seteado: ${data.id} -> ${data.logo_url}`);
  console.log('Ojo: esta URL relativa solo resuelve una vez deployado (public/logos/ se sirve desde el build).');
}

main();
