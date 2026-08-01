// Completa la siembra de Victoria Café (Al Paso) para poder mostrar el panel operativo del
// dueño (fase C) con datos reales en canjes, referidos, desafíos y un evento — el script
// original (sembrar-victoria-cafe.mjs) ya carga negocio/recompensas/carta/premios/3 clientes
// con historial de visitas, pero es de ANTES de que existieran canjes/referidos/desafíos en
// este negocio puntual. Todo acá pasa por las funciones reales de la app (canjear_recompensa,
// registrar_referido, revisar_premio_referido, crear_desafio) — nunca un INSERT directo que
// se salte la validación real, mismo criterio que el resto del proyecto.
//
// Requisito previo: haber corrido `node scripts/sembrar-victoria-cafe.mjs` al menos una vez.
//
// También cambia la contraseña del dueño a la pedida por Tobias (autoservicio: entra con la
// vieja, se cambia a sí mismo — no hace falta service role key para esto).
//
// Uso: node scripts/sembrar-panel-pro-victoria-cafe.mjs

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
const clienteNuevo = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NEGOCIO_ID = 'victoria-cafe-al-paso';
const EMAIL_DUENO = 'dueno.victoria-cafe.demo@gmail.com';
const PASSWORD_VIEJA = 'ControlEvo2026!';
const PASSWORD_NUEVA = 'cafevictoria2026!';

const CLIENTES = {
  bruno: { email: 'cliente.bruno.victoriacafe.demo@gmail.com', password: PASSWORD_VIEJA },
  valentina: { email: 'cliente.valentina.victoriacafe.demo@gmail.com', password: PASSWORD_VIEJA },
  julieta: { email: 'cliente.julieta.victoriacafe.demo@gmail.com', password: PASSWORD_VIEJA },
};

async function iniciarSesion(email, password) {
  const supabase = clienteNuevo();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.error(`No se pudo iniciar sesión como ${email}:`, error?.message);
    process.exit(1);
  }
  return supabase;
}

async function main() {
  // 1. Contraseña del dueño: si ya se cambió en una corrida anterior, entra directo con la
  //    nueva; si no, entra con la vieja y la cambia. Así el script es seguro de re-correr.
  let supabaseDueno = clienteNuevo();
  const intento = await supabaseDueno.auth.signInWithPassword({ email: EMAIL_DUENO, password: PASSWORD_NUEVA });
  if (intento.data.session) {
    console.log('La contraseña ya estaba actualizada — sigo sin tocarla.');
  } else {
    supabaseDueno = await iniciarSesion(EMAIL_DUENO, PASSWORD_VIEJA);
    const { error: errPass } = await supabaseDueno.auth.updateUser({ password: PASSWORD_NUEVA });
    if (errPass) {
      console.error('No se pudo cambiar la contraseña:', errPass.message);
      process.exit(1);
    }
    console.log(`Contraseña del dueño actualizada a "${PASSWORD_NUEVA}".`);
  }

  // IDs reales de los 3 clientes ya sembrados, vía la RPC del CRM (la única forma de que el
  // dueño los lea: RLS de `clientes` es auth.uid() = user_id).
  const { data: filasCrm, error: errCrm } = await supabaseDueno.rpc('clientes_del_negocio', {
    p_negocio_id: NEGOCIO_ID,
  });
  if (errCrm) {
    console.error('No se pudo leer el CRM del negocio:', errCrm.message);
    process.exit(1);
  }
  const porNombre = Object.fromEntries(filasCrm.map((f) => [f.nombre, f]));
  console.log(
    'Clientes encontrados:',
    filasCrm.map((f) => `${f.nombre} (${f.puntos} pts, ${f.cantidad_visitas} visitas)`).join(' · '),
  );

  // 2. Canjes reales (vía canjear_recompensa, la misma función que usa la app: valida
  //    puntos y descuenta de verdad — quedan registrados en `canjes` desde la migración 0017).
  const supabaseBruno = await iniciarSesion(CLIENTES.bruno.email, CLIENTES.bruno.password);
  for (const pts of [80, 220]) {
    const { error } = await supabaseBruno.rpc('canjear_recompensa', { p_negocio_id: NEGOCIO_ID, p_pts: pts });
    if (error) console.error(`Bruno no pudo canjear ${pts} pts:`, error.message);
    else console.log(`Bruno canjeó una recompensa de ${pts} pts.`);
  }

  const supabaseValentina = await iniciarSesion(CLIENTES.valentina.email, CLIENTES.valentina.password);
  {
    const { error } = await supabaseValentina.rpc('canjear_recompensa', { p_negocio_id: NEGOCIO_ID, p_pts: 120 });
    if (error) console.error('Valentina no pudo canjear 120 pts:', error.message);
    else console.log('Valentina canjeó una recompensa de 120 pts.');
  }

  // 3. Referidos reales (vía registrar_referido + revisar_premio_referido — cuenta visitas
  //    REALES ya cargadas, así que Valentina convierte al toque y Julieta queda pendiente).
  const { data: filaBruno } = await supabaseBruno.from('clientes').select('codigo_referido').single();
  const codigoBruno = filaBruno?.codigo_referido;
  if (!codigoBruno) {
    console.error('Bruno no tiene código de referido — revisar el trigger set_codigo_referido.');
  } else {
    const { error: errReg1 } = await supabaseValentina.rpc('registrar_referido', {
      p_codigo_referente: codigoBruno,
      p_negocio_id: NEGOCIO_ID,
    });
    if (errReg1) console.error('Error registrando a Valentina como referida:', errReg1.message);
    const { error: errPremio1 } = await supabaseValentina.rpc('revisar_premio_referido', {
      p_negocio_id: NEGOCIO_ID,
    });
    if (errPremio1) console.error('Error revisando premio de Valentina:', errPremio1.message);
    else console.log('Valentina registrada como referida de Bruno y CONVERTIDA (ya tenía 4+ visitas reales).');

    const supabaseJulieta = await iniciarSesion(CLIENTES.julieta.email, CLIENTES.julieta.password);
    const { error: errReg2 } = await supabaseJulieta.rpc('registrar_referido', {
      p_codigo_referente: codigoBruno,
      p_negocio_id: NEGOCIO_ID,
    });
    if (errReg2) console.error('Error registrando a Julieta como referida:', errReg2.message);
    else console.log('Julieta registrada como referida de Bruno — PENDIENTE (solo 3 de 4 visitas reales).');

    // 4. Desafíos entre amigos reales (vía crear_desafio). La ventana de conteo empieza
    //    ahora, así que quedan reales "en curso" — no se fuerza un estado cumplido/fallado
    //    con datos que no existen.
    const { data: filaJulieta } = await supabaseJulieta.from('clientes').select('codigo_referido').single();
    const codigoJulieta = filaJulieta?.codigo_referido;
    if (codigoJulieta) {
      const { error: errDes1 } = await supabaseBruno.rpc('crear_desafio', {
        p_codigo_retado: codigoJulieta,
        p_negocio_id: NEGOCIO_ID,
        p_tipo: 'visitas',
        p_meta: 3,
        p_dias: 14,
      });
      if (errDes1) console.error('Error creando desafío Bruno→Julieta:', errDes1.message);
      else console.log('Desafío creado: Bruno retó a Julieta a 3 visitas en 14 días (en curso).');

      const { error: errDes2 } = await supabaseValentina.rpc('crear_desafio', {
        p_codigo_retado: codigoJulieta,
        p_negocio_id: NEGOCIO_ID,
        p_tipo: 'visitas',
        p_meta: 2,
        p_dias: 5,
      });
      if (errDes2) console.error('Error creando desafío Valentina→Julieta:', errDes2.message);
      else console.log('Desafío creado: Valentina retó a Julieta a 2 visitas en 5 días (en curso).');
    }
  }

  // 5. Evento real (INSERT directo: el dueño ya tiene policy FOR ALL en eventos_negocio,
  //    es la misma tabla que edita desde el panel). Ventana solapa con las visitas más
  //    recientes ya sembradas (hoy, hace 1 día, hace 2 días) para que "actividad de eventos"
  //    tenga números reales de verdad, no vacíos.
  const haceDias = (d) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
  await supabaseDueno.from('eventos_negocio').delete().eq('negocio_id', NEGOCIO_ID).eq('nombre', 'Semana del café de origen');
  const { error: errEvento } = await supabaseDueno.from('eventos_negocio').insert({
    negocio_id: NEGOCIO_ID,
    nombre: 'Semana del café de origen',
    fecha_inicio: haceDias(3),
    fecha_fin: haceDias(0),
    recompensa_extra: 'Cubanito Clásico gratis',
  });
  if (errEvento) console.error('Error creando el evento:', errEvento.message);
  else console.log('Evento "Semana del café de origen" cargado (hace 3 días → hoy).');

  console.log('\nListo. Podés entrar en http://localhost:3001/?admin con:');
  console.log(`  ${EMAIL_DUENO} / ${PASSWORD_NUEVA}`);
}

main();
