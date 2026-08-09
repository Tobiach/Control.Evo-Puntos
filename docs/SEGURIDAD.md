# Seguridad — preguntas que un prospecto/inversor va a hacer

Respuestas verificadas contra el código real (migraciones de `supabase/migrations/` y
`src/`), no supuestos. Última verificación: 2026-08-09. Si se agrega una tabla o una RPC
nueva, volver a correr las verificaciones de abajo antes de reafirmar cualquiera de estas
respuestas.

## 1. ¿Dónde están alojados los datos?

Supabase (Postgres administrado sobre AWS), proyecto `ajydiowgrdtivndthidh.supabase.co`.
No hay infraestructura propia — ni servidores, ni base de datos self-hosted.

## 2. ¿Un comercio puede ver datos de otro comercio o de otro cliente?

**No — verificado, no asumido.**

- Las 21 tablas de la base (13 en el schema inicial + 8 agregadas después) tienen Row Level
  Security habilitado — se verificó contando cada `CREATE TABLE` contra cada
  `ENABLE ROW LEVEL SECURITY` en las 20 migraciones: el número coincide exactamente, ninguna
  tabla quedó afuera.
- El patrón de policy es consistente en todo el proyecto: las tablas del dueño se filtran por
  `auth.uid() = dueno_user_id` (vía join a `negocios`), las del cliente por
  `auth.uid() = user_id` (vía join a `clientes`). Un dueño autenticado solo puede leer filas de
  SU `negocio_id`; un cliente solo las suyas.
- Las únicas 3 policies con `USING (true)` (lectura pública sin auth) son deliberadas y no
  filtran nada sensible: `niveles` (tabla de referencia estática, no hay dato de negocio
  puntual), `eventos_negocio` (contenido de marketing pensado para verse sin login, mismo
  criterio que la carta pública) y el INSERT de `notificaciones_enviadas` (el sistema
  registra, no expone lectura).
- Ya hubo una vulnerabilidad real de este tipo y se corrigió: el PIN del cajero vivía como
  columna en `negocios` (RLS filtra FILAS, no columnas — cualquiera con la key pública podía
  pedir `negocios?select=pin_cajero` y leer el PIN de cualquier negocio). Se movió a
  `negocio_pin`, una tabla aparte sin ninguna policy pública — ver
  `supabase/migrations/0005_seguridad_pin_cajero.sql` para el detalle completo, incluida la
  nota de qué se rompía y por qué.

## 3. ¿Qué pasa si el sistema (app web) se cae?

**Error tracking: sí, activo desde el 9/8/2026 — verificado, no es una promesa.** Sentry
conectado (`src/lib/sentry.ts`, null-safe igual criterio que Supabase — PAT-001), probado en
vivo (un error real disparó el request al ingest de Sentry antes de darlo por hecho) y
deployado a producción (DSN horneada en el bundle de `premia-ar.vercel.app`, confirmado con
curl). Hay una alerta activa (`id 17399089`, proyecto `javascript-react-premia` en la org
`control-evo`) que avisa por email ante cualquier error nuevo o una regresión — apunta al
equipo `notificaciones-premia`, con reenvío automático a miembros activos si el equipo no
tiene notificaciones configuradas.

**Uptime (caída total del sitio): sí, activo desde el 9/8/2026.** UptimeRobot (cuenta propia
de Premia.ar, `premia.latam@gmail.com` — separada de la cuenta general que usa Tobias para
otros proyectos) chequea `https://premia-ar.vercel.app` cada 5 minutos (mínimo del plan
free), monitor `id 803700757`, con el contacto de email confirmado enganchado (`id 8705870`)
— verificado por API, no asumido: `getMonitors` con `alert_contacts=1` devuelve el contacto
realmente linkeado al monitor, no solo existiendo suelto en la cuenta.

Límite conocido: no se pudo simular una caída real para confirmar que el email de alerta se
dispara de punta a punta — forzar eso significaría tirar abajo producción a propósito, que no
tiene sentido solo para probarlo. Si en algún momento el sitio se cae de verdad, ahí queda
confirmado; hasta entonces, la configuración está verificada pero el disparo real de la
alerta no.

Ver `controlevo-os/playbooks/technical/uptime-monitoring.md` — actualizado con este proyecto.

## 4. ¿Alguien puede hackearse puntos gratis?

**No — verificado a nivel de RLS y de código, no es una promesa.**

- `relaciones_negocio` (la tabla que tiene la columna `puntos`) NO tiene ninguna policy de
  INSERT ni UPDATE para el rol de cliente — solo tiene SELECT ("El cliente ve su propia
  relación"). Un cliente autenticado como sí mismo no puede escribir ahí ni con una llamada
  directa a la API; Postgres deniega por default sin policy que lo permita.
- Todo lo que cambia puntos pasa por funciones `SECURITY DEFINER` (corren con privilegios del
  dueño de la función, no del que la llama, y validan todo contra datos reales antes de
  tocar nada):
  - `cobrar_con_pin` — valida el PIN contra `negocio_pin` (tabla sin policy pública) antes de
    acreditar; el monto y los puntos se calculan server-side (`floor(monto / monto_por_punto)`).
  - `canjear_recompensa` — chequea `puntos_actuales >= pts_requeridos` antes de descontar.
  - `registrar_referido` / `revisar_premio_referido` — el premio se acredita solo si
    `COUNT(*)` de visitas REALES del referido en `visitas` llega a 4, contado en el momento
    de la llamada, nunca confiado del cliente.
  - `crear_desafio` / `revisar_desafios` — mismo patrón: cuenta visitas reales dentro de la
    ventana del desafío antes de premiar.
- `src/lib/panelCliente.ts` (la capa de datos que usa la app del cliente) no tiene ningún
  `.update()` ni `.insert()` — es de solo lectura del lado del cliente. No hay una ruta
  alternativa en el frontend que escriba puntos directo.

## 5. ¿Qué pasa con los datos de un comercio si deja de usar Premia.ar?

**No hay una política oficial todavía — esto es una decisión de negocio pendiente, no algo
que se pueda verificar en el código.** `docs/TERMINOS.md` §6 dice que dar de baja a un
negocio no afecta los puntos de sus clientes EN OTROS negocios del marketplace, pero no dice
qué pasa con los puntos/datos DENTRO de ese negocio puntual (¿se congelan? ¿se borran? ¿se
exportan?). `docs/PRIVACIDAD.md` §5 solo cubre el caso de un CLIENTE pidiendo borrar su
cuenta individual, no el caso de un comercio completo dándose de baja.

Queda un placeholder marcado en `docs/TERMINOS.md` §6 — hay que decidir la política antes de
que un prospecto lo pregunte en la mesa.

## 5.1 Rate limiting en endpoints de puntos/canjes/referidos

**No existe — verificado.** Ninguna RPC (`cobrar_con_pin`, `canjear_recompensa`,
`registrar_referido`, `revisar_premio_referido`, `crear_desafio`, `revisar_desafios`) tiene
ningún control de frecuencia, cooldown ni límite por IP/usuario/negocio. Hoy nada impide que
alguien con el PIN de un cajero automatice llamadas a `cobrar_con_pin` en loop, o que un
cliente automatice `registrar_referido` con distintas cuentas. Con pocos usuarios el riesgo es
bajo (a nadie le conviene todavía), pero es una prioridad real antes de escalar — no es
"CONFIRMAR", es un "NO, falta construirlo".

## 5.2 Otras preguntas de infraestructura que NO se pueden verificar desde el código

Estas requieren mirar el dashboard de Supabase/Vercel directamente, o son decisiones de
Tobias — no están en el repo, así que no se pueden responder "con certeza" sin ese paso:

- ¿Qué plan de Supabase (Free/Pro/Team) está activo hoy? Define límites reales de conexiones
  concurrentes y storage.
- ¿Hay backups automáticos configurados? ¿Con qué frecuencia y retención?
- ¿Quién tiene acceso a la base de datos de producción hoy, y con qué nivel?

## 6. ¿Para qué es el QR que se menciona?

No es una función de la app — no hay generación de QR en el código. Es el link de la carta
digital pública (`?carta=<negocioId>`, sin login) pensado para imprimirse como QR físico en
la mesa del comercio (ver el texto de ayuda en `SeccionCarta.tsx`: "Ideal para un QR en la
mesa"). El QR en sí se genera con cualquier herramienta externa a partir de ese link — no
hace falta construir nada nuevo en la app para esto.
