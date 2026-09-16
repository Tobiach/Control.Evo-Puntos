# Brief para Claude — decisiones pendientes de Premia.ar

> Documento armado por Claude Code (con acceso al repo) para que Tobías lo pegue en una
> conversación aparte de Claude.ai y vos (sin acceso al código) lo ayudes a pensar las
> decisiones de abajo. Todo lo que dice acá está verificado contra el código/la base real de
> producción — no son estimaciones. 15/9/2026.

## Qué es Premia.ar (contexto mínimo)

App argentina de fidelización de barrio (React+Supabase). Un cliente suma puntos reales
visitando comercios afiliados (bares, cafés, almacenes), los canjea por recompensas que carga
cada dueño, y tiene un nivel/XP global ("Premín", una mascota que evoluciona en 5 formas a
medida que sube de nivel) que cruza todos los comercios donde tiene actividad. Está en
producción (`premia-ar.vercel.app`) con 73+ comercios reales de Palermo/CABA cargados. Todavía
0 usuarios reales activos fuera de cuentas de prueba — está en etapa de pulir la experiencia
antes de salir a buscar los primeros clientes reales.

**Lo que se te pide**: no ejecutar nada (no tenés el código) — analizar, dar estructura,
señalar riesgos u orden lógico, y ayudar a decidir entre las opciones que ya están planteadas
en cada bloque. Cuando algo diga "necesita una decisión", esa es literalmente la pregunta a
responder.

---

## Bloque 1 — Imágenes: qué preparar y en qué orden

**El hallazgo central**: verificado contra la base de producción real (no una muestra), **79
de 80 comercios reales no tienen ninguna imagen cargada** (ni logo ni foto de portada) — 0 de
73 del lote de barrio. Solo un comercio (el que se usa para hacer demos, "Victoria Café") tiene
un logo. La app entera hoy se ve con degradés de color + emoji como fallback en casi el 100%
de los casos, no porque el diseño esté mal sino porque no hay fotos reales cargadas todavía.

**Los 3 tipos de imagen que existen en el sistema:**

| Campo | Rol | Formato | Dónde se ve |
|---|---|---|---|
| Logo del comercio | Marca/isotipo | Cuadrado, fondo blanco o transparente | Listas de "mis lugares", carta digital |
| Portada del comercio | Foto de ambiente/producto | Panorámica (horizontal) | Home (fondo de la card principal), explorador de comercios, header al entrar a un comercio |
| Foto de producto (por ítem de menú) | Foto puntual de un plato/bebida | Cuadrada o cercana | Carta digital — es por ítem, no por comercio, mucho más trabajo (potencialmente decenas por comercio) |

**Premín (la mascota) — el asset más transversal**: tiene 5 formas de evolución YA APROBADAS
por Tobías en una hoja de referencia (existe, pero Claude Code no la tiene guardada en el
repo — solo la descripción en texto de abajo). Cada forma se ve en casi todas las pantallas
(header del Home, card de nivel, la "Pokédex" de evolución en el perfil).

Las 5 formas aprobadas, en texto (sobre el Premín base: una copa/trofeo dorada con "P",
brújula, zapatillas coral):

1. **Recién Llegado** (0 XP) — Premín base tal cual, brújula de esfera coral.
2. **Cliente Fijo** (200 XP) — suma vincha/cinta coral en la cabeza.
3. **Habitué** (1.000 XP) — bufanda tejida coral/crema, tacita de café humeante en una mano,
   brújula dorada en la otra. La forma más relajada, "como en su casa".
4. **Cráneo del Barrio** (3.000 XP) — capa corta verde oscuro, bandolera verde con "P",
   3-4 esferitas orbitando (representa la red). Sonrisa canchera.
5. **Prócer del Barrio** (8.000 XP) — forma final: capa larga coral al viento, corona dorada
   con gema, halo dorado, destellos.

Formato técnico necesario: PNG transparente, canvas cuadrado, misma altura visual en las 5
(para que no salte al evolucionar) + una silueta plana de cada una (para los niveles todavía
no alcanzados).

**Preguntas para vos:**
- ¿Cuál es el orden más razonable para conseguir 73 sets de fotos (logo+portada) sin que sea
  un cuello de botella eterno? (ya se decidió arrancar por 5 comercios puntuales que se usan
  para demos, antes de encarar el resto — ¿tiene sentido esa secuencia, o hay una mejor?)
- ¿Vale la pena un piso de calidad mínimo (ej. una sola foto decente por comercio alcanza para
  arrancar) en vez de esperar un set completo por comercio?
- Fotos de producto (por ítem de carta): ¿directamente no vale la pena todavía dado el volumen,
  o hay un recorte razonable (ej. solo los 2-3 productos más pedidos por comercio)?

---

## Bloque 2 — "Misiones": qué construir ahí

Premia va a tener una 5ta sección en la navegación principal llamada "Misiones" (hoy es un
placeholder vacío tipo "estamos construyendo esto"). El hallazgo importante: **gran parte de
lo que haría falta ya existe en el sistema, sin usarse como "misión":**

- Ya existe un sistema de **desafíos entre amigos** (retador elige un amigo + una meta de
  visitas o "probar algo nuevo", con puntos de bonus si se cumple) — construido y probado,
  pero hoy escondido dentro del perfil del usuario, nadie lo encuentra.
- Ya existe el cálculo de **racha** (días/semanas seguidas visitando) y de **nivel/XP global**
  — ambos son "misiones implícitas" que nunca se presentaron como tales.
- Existe una tabla de base de datos para **insignias/logros permanentes** que nunca se usó —
  encajaría con medallas coleccionables tipo "Probaste 3 rubros distintos", "Primer canje",
  sin necesidad de construir nada nuevo del lado de los datos.

**Misiones que ya se pueden calcular con datos reales existentes** (sin construir nada nuevo
del lado del servidor): probar un comercio nuevo, volver 3 veces en el mes a tu lugar de
siempre, una racha de 7 días, subir de nivel, canjear tu primer premio, invitar a un amigo,
explorar 3 rubros distintos, probar algo nuevo de la carta, los desafíos entre amigos ya
mencionados.

**Misiones que necesitan una decisión de negocio antes de poder construirse** (no es solo
diseño, hay riesgo real): "subí una foto de tu visita y ganá puntos" y "dejá una reseña" —
ambas necesitan un plan de moderación/anti-fraude antes de existir (alguien podría subir
cualquier cosa o inventar reseñas falsas para ganar puntos).

**Preguntas para vos:**
- ¿Conviene una v1 simple (una lista con progreso de las misiones que ya se pueden calcular),
  y sumar después "logros permanentes" y "desafíos con amigos" como capas 2 y 3? ¿O tiene más
  sentido lanzar las 3 juntas?
- ¿La recompensa de una misión debería ser siempre puntos, o algunos logros podrían dar algo
  no-monetario (un accesorio/skin coleccionable de Premín, sin costo para el comercio)?
- Moderación de contenido subido por usuarios (fotos/reseñas): ¿vale la pena resolver este
  tema ahora que Misiones va a tener un lugar real en la app, o se puede lanzar una versión
  completa sin tocar esto todavía?

---

## Bloque 3 — Otras decisiones sueltas, todavía sin resolver

**Paleta de color del Home**: la card principal del Home (donde se muestra el premio más
relevante) hoy usa la paleta de marca existente (fondo oscuro neutro). Está pendiente una
decisión de si vale la pena una paleta más saturada/vistosa ahí específicamente — es una
decisión de identidad de marca, no algo que se pueda resolver solo con código.

**Canal para hacer que la gente vuelva a abrir la app** (hoy no existe ninguno — todo el
enganche depende de que el usuario se acuerde solo): la opción por defecto es notificaciones
push del navegador (gratis, sin depender de otro servicio). La alternativa sería mandar
mensajes por WhatsApp, que tiene más alcance real en Argentina pero requiere un proveedor
externo pago. ¿Empezar por push y sumar WhatsApp después, o directamente ir por WhatsApp?

**Qué gana un usuario al llegar al nivel más alto de Premín**: hoy la propuesta por defecto es
"reconocimiento visible + acceso anticipado a comercios nuevos de la red", sin tocar la
economía de puntos. ¿Vale la pena que desbloquee algo con valor económico real, o el
reconocimiento social alcanza?

**Un ranking o comparación social simple** ("estás entre los clientes más frecuentes de este
comercio"): es una versión chica de una idea más grande (grupos/comunidad), que requeriría
investigación con usuarios reales antes de construirse en grande. ¿Vale la pena una versión
mínima ahora, sin esperar esa investigación?

---

## Cómo usar esto

Pegá este documento completo en el chat de Claude.ai y pedile explícitamente lo que
necesites — por ejemplo: "priorizame estas decisiones de más a menos urgente", "dame los
pros/contras de cada opción", "armá un plan de 2 semanas con esto". El documento ya tiene
todo el contexto que hace falta para que pueda ayudar sin ver el código.
