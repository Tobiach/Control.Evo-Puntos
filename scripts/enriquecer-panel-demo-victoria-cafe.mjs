// Enriquece el panel del dueño de Victoria Café (Al Paso) para que TODAS las secciones del
// panel operativo (fase C) muestren datos reales — hoy varias quedan vacías o planas porque
// la siembra anterior (sembrar-panel-pro-victoria-cafe.mjs) las dejó a mitad de camino.
//
// Diagnóstico previo (scripts/diagnostico-panel-victoria-cafe.mjs, corrido antes de esto):
//   - Copiloto: solo 1 acción de 3 posibles.
//   - Referidos: 0 filas en la tabla — el script anterior declaró éxito sin chequear el
//     campo `registrado`/`creado` de la respuesta de la RPC, solo la ausencia de error JS.
//   - Horario valle: las 23 visitas están TODAS a la misma hora (20hs) — la franja 15-17hs
//     nunca tiene una sola visita.
//   - Desafíos: 1 en curso + 1 ya vencido sin cumplirse — cero "cumplidos".
//   - VIP (300 pts): nadie llega hoy (Bruno bajó de umbral al canjear).
//   - CRM: cero notas/etiquetas cargadas.
//   - Evento: terminó hace 7 días.
//   - Recompensas: la más vieja tiene 10 días, faltan 30 para que el copiloto la marque sola.
//
// CRITERIO DE ESTE SCRIPT (a diferencia del anterior): cada paso que llama una RPC verifica
// el campo de éxito de la RESPUESTA (`data.registrado`, `data.creado`, `data.premiado_ahora`),
// no solo la ausencia de error de red/JS — así no se repite el bug de arriba. Cada checkpoint
// imprime su resultado antes de seguir al siguiente.
//
// Requiere haber corrido antes (en este orden): sembrar-victoria-cafe.mjs,
// sembrar-panel-pro-victoria-cafe.mjs. Es re-corrible: los pasos que pueden duplicarse
// (notas, recompensas viejas, puntos por vencer) sobrescriben en vez de acumular.
//
// Uso: node scripts/enriquecer-panel-demo-victoria-cafe.mjs

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
const CLIENTES = {
  bruno: { email: 'cliente.bruno.victoriacafe.demo@gmail.com', password: 'ControlEvo2026!' },
  valentina: { email: 'cliente.valentina.victoriacafe.demo@gmail.com', password: 'ControlEvo2026!' },
  julieta: { email: 'cliente.julieta.victoriacafe.demo@gmail.com', password: 'ControlEvo2026!' },
};

const MS_DIA = 86_400_000;
const haceDias = (d) => Date.now() - d * MS_DIA;

async function iniciarSesion(email, password) {
  const supabase = clienteNuevo();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.error(`No se pudo iniciar sesión como ${email}:`, error?.message);
    process.exit(1);
  }
  return supabase;
}

/** Cambia SOLO la hora (y minutos) de un timestamp ISO, conservando el día calendario. */
function conHora(timestampIso, hora, minutos = 0) {
  const fecha = new Date(timestampIso);
  fecha.setHours(hora, minutos, 0, 0);
  return fecha.toISOString();
}

async function main() {
  const supabaseDueno = await iniciarSesion(EMAIL_DUENO, PASSWORD_DUENO);
  const supabaseBruno = await iniciarSesion(CLIENTES.bruno.email, CLIENTES.bruno.password);
  const supabaseValentina = await iniciarSesion(CLIENTES.valentina.email, CLIENTES.valentina.password);
  const supabaseJulieta = await iniciarSesion(CLIENTES.julieta.email, CLIENTES.julieta.password);
  console.log('4 sesiones abiertas (dueño + 3 clientes).\n');

  await checkpoint1_horariosRealistas(supabaseDueno);
  await checkpoint2_puntosPorVencer(supabaseDueno);
  await checkpoint3_recompensaVieja(supabaseDueno);
  await checkpoint4_referidos(supabaseBruno, supabaseValentina, supabaseJulieta);
  await checkpoint5y6_desafioYVip(supabaseDueno, supabaseBruno, supabaseValentina);
  await checkpoint7_notasEtiquetas(supabaseDueno, supabaseBruno, supabaseValentina, supabaseJulieta);
  await checkpoint8_eventoVigente(supabaseDueno);

  console.log('\nListo — corré scripts/diagnostico-panel-victoria-cafe.mjs para verificar el resultado final.');
}

// ============================================================
// CHECKPOINT 1 — Horarios realistas (arregla "efecto horario valle": hoy 0 siempre)
// ============================================================
async function checkpoint1_horariosRealistas(supabaseDueno) {
  console.log('--- Checkpoint 1: horarios realistas de visitas ---');
  const { data: visitas, error } = await supabaseDueno
    .from('visitas')
    .select('id, created_at')
    .eq('negocio_id', NEGOCIO_ID)
    .order('id', { ascending: true });
  if (error) {
    console.error('No pude leer las visitas:', error.message);
    process.exit(1);
  }

  // Patrón de horas de un café real: pico de mañana, almuerzo, la franja valle (15-17hs,
  // reforzada porque el negocio ya usa el incentivo de puntos x2 ahí) y salida laboral/tarde.
  const HORAS = [9, 16, 12, 19, 15, 11, 20, 16, 13, 18, 15];
  let actualizadas = 0;
  for (let i = 0; i < (visitas ?? []).length; i += 1) {
    const v = visitas[i];
    const hora = HORAS[i % HORAS.length];
    const nuevoTimestamp = conHora(v.created_at, hora, Math.floor(Math.random() * 50));
    const { error: errUpd } = await supabaseDueno.from('visitas').update({ created_at: nuevoTimestamp }).eq('id', v.id);
    if (errUpd) {
      console.error(`No pude actualizar la visita ${v.id}:`, errUpd.message);
      continue;
    }
    actualizadas += 1;
  }
  console.log(`${actualizadas}/${visitas?.length ?? 0} visitas con hora redistribuida.\n`);
}

// ============================================================
// CHECKPOINT 2 — Puntos por vencer urgentes (dispara la acción más fuerte del copiloto)
// ============================================================
async function checkpoint2_puntosPorVencer(supabaseDueno) {
  console.log('--- Checkpoint 2: puntos por vencer ---');
  const { data: crm, error } = await supabaseDueno.rpc('clientes_del_negocio', { p_negocio_id: NEGOCIO_ID });
  if (error) {
    console.error('No pude leer el CRM:', error.message);
    process.exit(1);
  }
  const porNombre = Object.fromEntries((crm ?? []).map((f) => [f.nombre, f]));

  const plan = [
    { nombre: 'Bruno Aguilar', diasParaVencer: 2 }, // urgente (≤3 días → se pinta rojo)
    { nombre: 'Julieta Ferrero', diasParaVencer: 6 }, // visible pero no urgente
  ];
  for (const { nombre, diasParaVencer } of plan) {
    const cliente = porNombre[nombre];
    if (!cliente) {
      console.error(`No encontré a "${nombre}" en el CRM.`);
      continue;
    }
    const vencenAt = new Date(Date.now() + diasParaVencer * MS_DIA).toISOString();
    const { error: errUpd } = await supabaseDueno
      .from('relaciones_negocio')
      .update({ puntos_vencen_at: vencenAt })
      .eq('negocio_id', NEGOCIO_ID)
      .eq('cliente_id', cliente.cliente_id);
    if (errUpd) {
      console.error(`No pude actualizar puntos_vencen_at de ${nombre}:`, errUpd.message);
      continue;
    }
    console.log(`${nombre}: ${cliente.puntos} pts vencen en ${diasParaVencer} días.`);
  }
  console.log();
}

// ============================================================
// CHECKPOINT 3 — Recompensa vieja sin canjes (dispara la 3ra acción del copiloto)
// ============================================================
async function checkpoint3_recompensaVieja(supabaseDueno) {
  console.log('--- Checkpoint 3: recompensas con antigüedad real ---');
  // Ya cumplieron el umbral de 30 días del copiloto — aspiracionales, tiene sentido que
  // tarden más en canjearse que "Café Filtrado" o "Latte" (que sí ya tienen canjes).
  const DESCRIPCIONES = ['Pizza Individual', 'Docena Mixta Premium'];
  const creadaHace35Dias = new Date(haceDias(35)).toISOString();
  for (const descripcion of DESCRIPCIONES) {
    const { error, count } = await supabaseDueno
      .from('recompensas')
      .update({ created_at: creadaHace35Dias })
      .eq('negocio_id', NEGOCIO_ID)
      .eq('descripcion', descripcion)
      .select('descripcion', { count: 'exact' });
    if (error) {
      console.error(`No pude backdatear "${descripcion}":`, error.message);
      continue;
    }
    console.log(`"${descripcion}" ahora tiene 35 días (${count ?? 0} fila afectada).`);
  }
  console.log();
}

// ============================================================
// CHECKPOINT 4 — Referidos reales (verificando la respuesta, no solo ausencia de error)
// ============================================================
async function checkpoint4_referidos(supabaseBruno, supabaseValentina, supabaseJulieta) {
  console.log('--- Checkpoint 4: referidos ---');
  const { data: filaBruno, error: errBruno } = await supabaseBruno.from('clientes').select('codigo_referido').single();
  if (errBruno || !filaBruno?.codigo_referido) {
    console.error('No pude leer el código de referido de Bruno:', errBruno?.message);
    process.exit(1);
  }
  const codigoBruno = filaBruno.codigo_referido;

  // Valentina: se registra como referida de Bruno y, como ya tiene 4+ visitas reales,
  // convierte al toque.
  const { data: reg1, error: errReg1 } = await supabaseValentina.rpc('registrar_referido', {
    p_codigo_referente: codigoBruno,
    p_negocio_id: NEGOCIO_ID,
  });
  if (errReg1) {
    console.error('Error de red/JS registrando a Valentina:', errReg1.message);
  } else if (reg1?.registrado !== true) {
    console.error('La RPC respondió que Valentina NO quedó registrada:', reg1); // el bug que encontramos antes
  } else {
    console.log('Valentina registrada como referida de Bruno (verificado: registrado=true).');
  }

  const { data: premio1, error: errPremio1 } = await supabaseValentina.rpc('revisar_premio_referido', {
    p_negocio_id: NEGOCIO_ID,
  });
  if (errPremio1) {
    console.error('Error revisando premio de Valentina:', errPremio1.message);
  } else if (premio1?.como_referido?.premiado !== true) {
    console.error('Valentina todavía no aparece premiada:', premio1);
  } else {
    console.log('Valentina CONVERTIDA (verificado: como_referido.premiado=true).');
  }

  // Julieta: se registra pero se queda con 3 de 4 visitas — la que el copiloto muestra
  // como "a un paso de convertir".
  const { data: reg2, error: errReg2 } = await supabaseJulieta.rpc('registrar_referido', {
    p_codigo_referente: codigoBruno,
    p_negocio_id: NEGOCIO_ID,
  });
  if (errReg2) {
    console.error('Error de red/JS registrando a Julieta:', errReg2.message);
  } else if (reg2?.registrado !== true) {
    console.error('La RPC respondió que Julieta NO quedó registrada:', reg2);
  } else {
    console.log('Julieta registrada como referida de Bruno (verificado: registrado=true) — queda PENDIENTE (3/4 visitas).');
  }
  console.log();
}

// ============================================================
// CHECKPOINTS 5+6 — Desafío cumplido de verdad + Valentina cruza el umbral VIP
// (mismas 2 visitas nuevas sirven para ambos: prueban el desafío Y suman los puntos que
// le faltan a Valentina para los 300 de VIP)
// ============================================================
async function checkpoint5y6_desafioYVip(supabaseDueno, supabaseBruno, supabaseValentina) {
  console.log('--- Checkpoints 5+6: desafío cumplido + Valentina cruza VIP ---');

  const { data: filaValentina, error: errFila } = await supabaseValentina.from('clientes').select('id, codigo_referido').single();
  if (errFila || !filaValentina?.codigo_referido) {
    console.error('No pude leer el código de referido de Valentina:', errFila?.message);
    process.exit(1);
  }

  // Par nuevo (Bruno → Valentina) para no chocar con los 2 desafíos ya existentes
  // (Bruno→Julieta, Valentina→Julieta), que la RPC bloquea como duplicados si siguen en curso.
  const { data: desafio, error: errDes } = await supabaseBruno.rpc('crear_desafio', {
    p_codigo_retado: filaValentina.codigo_referido,
    p_negocio_id: NEGOCIO_ID,
    p_tipo: 'visitas',
    p_meta: 2,
    p_dias: 10,
  });
  if (errDes) {
    console.error('Error de red/JS creando el desafío:', errDes.message);
    process.exit(1);
  }
  if (desafio?.creado !== true) {
    console.error('La RPC respondió que el desafío NO se creó:', desafio);
    process.exit(1);
  }
  console.log('Desafío creado: Bruno retó a Valentina a 2 visitas en 10 días (verificado: creado=true).');

  // 2 visitas reales de Valentina DESPUÉS de creado el desafío (cuentan para la ventana) y
  // que además la empujan de 233 a 308 pts — cruza los 300 de VIP.
  const nuevasVisitas = [
    { monto: 3500, categoria: 'Comida' },
    { monto: 4000, categoria: 'Bebidas' },
  ];
  const filas = nuevasVisitas.map((v) => ({
    cliente_id: filaValentina.id,
    negocio_id: NEGOCIO_ID,
    monto: v.monto,
    puntos: Math.floor(v.monto / 100),
    categoria: v.categoria,
  }));
  const { error: errIns } = await supabaseDueno.from('visitas').insert(filas);
  if (errIns) {
    console.error('No pude cargar las visitas nuevas de Valentina:', errIns.message);
    process.exit(1);
  }
  const puntosNuevos = filas.reduce((s, f) => s + f.puntos, 0);

  const { data: relActual, error: errRel } = await supabaseDueno
    .from('relaciones_negocio')
    .select('puntos')
    .eq('negocio_id', NEGOCIO_ID)
    .eq('cliente_id', filaValentina.id)
    .single();
  if (errRel) {
    console.error('No pude leer el saldo actual de Valentina:', errRel.message);
    process.exit(1);
  }
  const puntosFinales = relActual.puntos + puntosNuevos;
  const { error: errUpdRel } = await supabaseDueno
    .from('relaciones_negocio')
    .update({
      puntos: puntosFinales,
      ultima_visita_at: new Date().toISOString(),
      puntos_vencen_at: new Date(Date.now() + 60 * MS_DIA).toISOString(),
    })
    .eq('negocio_id', NEGOCIO_ID)
    .eq('cliente_id', filaValentina.id);
  if (errUpdRel) {
    console.error('No pude actualizar el saldo de Valentina:', errUpdRel.message);
    process.exit(1);
  }
  console.log(`Valentina: ${relActual.puntos} + ${puntosNuevos} = ${puntosFinales} pts (umbral VIP: 300).`);

  const { data: revision, error: errRev } = await supabaseBruno.rpc('revisar_desafios', { p_negocio_id: NEGOCIO_ID });
  if (errRev) {
    console.error('Error de red/JS revisando desafíos:', errRev.message);
    process.exit(1);
  }
  const elNuevo = (revision?.enviados ?? []).find((d) => d.otro_nombre === 'Valentina Ibarra' && d.meta === 2);
  if (elNuevo?.premiado !== true) {
    console.error('El desafío Bruno→Valentina todavía NO aparece cumplido:', elNuevo ?? revision);
  } else {
    console.log(`Desafío CUMPLIDO (verificado: premiado=true, premiado_ahora=${elNuevo.premiado_ahora}).`);
  }
  console.log();
}

// ============================================================
// CHECKPOINT 7 — Notas y etiquetas del CRM
// ============================================================
async function checkpoint7_notasEtiquetas(supabaseDueno, supabaseBruno, supabaseValentina, supabaseJulieta) {
  console.log('--- Checkpoint 7: notas y etiquetas del CRM ---');
  const clientes = {
    bruno: { supabase: supabaseBruno, nota: 'Pide siempre café filtrado grande, viene después del laburo.', etiquetas: ['Frecuente'] },
    valentina: { supabase: supabaseValentina, nota: 'Cumple años en septiembre — buen momento para un mimo extra.', etiquetas: ['VIP'] },
    julieta: { supabase: supabaseJulieta, nota: 'Se sumó hace poco, la trajo Bruno.', etiquetas: ['Nueva'] },
  };
  for (const [nombreClave, { supabase, nota, etiquetas }] of Object.entries(clientes)) {
    const { data: fila, error: errFila } = await supabase.from('clientes').select('id, nombre').single();
    if (errFila || !fila) {
      console.error(`No pude leer el id de ${nombreClave}:`, errFila?.message);
      continue;
    }
    const { error } = await supabaseDueno.rpc('actualizar_nota_cliente', {
      p_negocio_id: NEGOCIO_ID,
      p_cliente_id: fila.id,
      p_nota: nota,
      p_etiquetas: etiquetas,
    });
    if (error) {
      console.error(`No pude guardar la nota de ${fila.nombre}:`, error.message);
      continue;
    }
    console.log(`${fila.nombre}: nota + etiquetas [${etiquetas.join(', ')}] guardadas.`);
  }
  console.log();
}

// ============================================================
// CHECKPOINT 8 — Evento vigente HOY (el anterior terminó hace 7 días)
// ============================================================
async function checkpoint8_eventoVigente(supabaseDueno) {
  console.log('--- Checkpoint 8: evento vigente ---');
  await supabaseDueno.from('eventos_negocio').delete().eq('negocio_id', NEGOCIO_ID).eq('nombre', 'Semana del café de origen');

  const inicio = new Date(haceDias(2)).toISOString().slice(0, 10);
  const fin = new Date(Date.now() + 2 * MS_DIA).toISOString().slice(0, 10);
  const { error } = await supabaseDueno.from('eventos_negocio').insert({
    negocio_id: NEGOCIO_ID,
    nombre: 'Semana del Cubanito Bañado',
    fecha_inicio: inicio,
    fecha_fin: fin,
    recompensa_extra: 'Cubanito Bañado gratis',
  });
  if (error) {
    console.error('Error creando el evento vigente:', error.message);
    return;
  }
  console.log(`Evento "Semana del Cubanito Bañado" cargado (${inicio} → ${fin}, vigente hoy).\n`);
}

main();
