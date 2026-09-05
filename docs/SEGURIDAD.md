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

**Error tracking: activo desde el 9/8/2026, con una regresión real encontrada y corregida el
14/8/2026.** Sentry conectado (`src/lib/sentry.ts`, null-safe igual criterio que Supabase —
PAT-001), probado en vivo originalmente. El 14/8 se detectó que `Sentry.init()` fallaba en
silencio en producción con "Invalid Sentry Dsn" — la env var `VITE_SENTRY_DSN` en Vercel tenía
un BOM invisible pegado adelante, probablemente de cuando se cargó desde Windows. Mientras tanto
(desde que se rompió hasta el fix) no se capturó ningún error real. Corregido con `.trim()` al
leer la env var (defensivo, no depende de limpiar el valor guardado en Vercel) y redeployado —
confirmar con un error real que vuelva a llegar al ingest antes de darlo por resuelto de nuevo.
Hay una alerta activa (`id 17399089`, proyecto `javascript-react-premia` en la org `control-evo`)
que avisa por email ante cualquier error nuevo o una regresión — apunta al equipo
`notificaciones-premia`, con reenvío automático a miembros activos si el equipo no tiene
notificaciones configuradas.

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

**Decisión tomada (10/8/2026):** 30 días para exportar (datos del local, clientes, historial
de puntos y canjes) tras la cancelación, eliminación definitiva e irreversible a los 60 días,
con aviso al comercio antes de ejecutar el borrado. Ya está redactado en `docs/TERMINOS.md`
§6.

**Lo que sigue sin existir es la implementación** — verificado en el código, no asumido: no
hay ninguna función de export (CSV/JSON) de datos de un negocio, ni ningún flujo de
"cancelar/dar de baja" distinto del botón de "pausar" que ya existe en el panel
(`cambiarEstadoNegocio`, `PanelDueno.tsx`). Pausar es reversible y no dispara ningún
conteo de días; cancelar todavía no es un estado que la app modele. Mientras no se construya,
la política queda escrita pero no hay un mecanismo real que la ejecute — si un comercio
cancela hoy, el cumplimiento de los 30/60 días sería manual. Segunda etapa, no bloqueante
para publicar los términos (que documentan un compromiso, no requieren que el mecanismo ya
exista), pero sí para poder cumplirlo de verdad si alguien cancela antes de construirlo.

## 5.1 Rate limiting en endpoints de puntos/canjes/referidos

**Resuelto (2026-08-25, migración `0023_rate_limiting_rpcs.sql`).** Las 8 RPC sensibles
(`verificar_pin_cajero`, `cobrar_con_pin`, `confirmar_canje`, `iniciar_canje`,
`registrar_referido`, `revisar_premio_referido`, `crear_desafio`, `revisar_desafios`) ahora
cortan si se pasa un máximo de intentos en una ventana de tiempo, vía una tabla de eventos +
función helper (`verificar_rate_limit`) — límites generosos (pensados para tolerar el uso real
a mano, no para un script en loop). La clave del límite es `negocio_id` para las funciones sin
sesión (PIN de mostrador, anon) y `auth.uid()` para las autenticadas. `canjear_recompensa`
(0004/0017, ya sin ningún uso real desde que existe `iniciar_canje`/`confirmar_canje`, 0021)
se cerró en vez de agregarle rate limiting a código muerto. **Pendiente de aplicar en
producción vía SQL Editor de Supabase** — escrito, no corrido todavía (ver `docs/DEPLOY.md`).

De paso se encontró y corrigió (migración `0022_fix_confirmar_canje_pin.sql`) un bug real:
`confirmar_canje` (0021) validaba el PIN contra `negocios.pin_cajero`, columna que ya no
existe desde el fix de 0005 (se movió a `negocio_pin`). Toda llamada tiraba error — el cajero
no podía confirmar ningún canje verificable hasta este fix. También pendiente de aplicar.

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
