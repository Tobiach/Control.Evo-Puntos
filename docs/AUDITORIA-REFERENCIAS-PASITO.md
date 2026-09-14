# Auditoría de referencias — Pasito (12/9/2026)

> Complementa `docs/DIAGNOSTICO-PRODUCTO.md` y `docs/ROADMAP-PRODUCTO.md` — no repite lo ya
> diagnosticado ahí (F1-F8, Fases 0-4). Esto son hallazgos **nuevos**, contra 10 capturas reales
> de **Pasito** (app argentina de pasos caminados + canje en comercios) que Tobías pidió cruzar
> contra Premia de cara al lanzamiento. Código de hallazgo: **G1-G8** (G7 sistema de imágenes
> en `docs/SISTEMA-IMAGENES.md`, G8 más abajo — reconciliación puntual del Home con esta misma
> auditoría, 12/9).

## Contexto de la referencia

Pasito: mecánica base = pasos caminados (no compras), pero la capa de marketplace/canje/
gamificación es comparable punto por punto con Premia — explorador de locales con premios,
historial de canjes, rachas, ranking. Útil como cruce aunque el motor de fondo sea distinto.

## Hallazgos que resuelven algo que Premia no tiene resuelto

| # | Hallazgo | Qué logra | Por qué importa |
|---|---|---|---|
| **G1** | Filtro **"Te alcanza"** en Explorar — solo locales donde ya podés canjear algo, en cualquier lado | Reduce a un toque "¿qué puedo canjear ya?" en vez de recorrer local por local | Es la acción de mayor intención que puede tener un usuario; hoy no existe fuera de Mis Premios |
| **G2** | El **nombre del premio** (no solo % de progreso) como pill visible en la card de Explorar | Explorar "vende" el premio en vez de mostrar solo una barra abstracta | Corrige en concreto la crítica ya diagnosticada en F7 ("Explorar = mapa de utilidad") |
| **G3** | **Cierre de racha perdida** + comparación contra tu propio promedio ("perdiste tu racha de N semanas", "-53% vs. tu promedio") | Contenido real de retención (pérdida, no ganancia) con datos 100% propios del usuario | Hoy solo avisamos "racha en riesgo" *antes* de perderla; nunca cerramos el capítulo ni comparamos contra vos mismo. Es contenido gratis para el push de Fase 3 |
| **G4** | Filtros **"Abierto ahora"** (dato real ya existente) y **"Favoritos"** (guardado sin haber visitado) en Explorar | Dos formas más de acotar 94 locales sin depender de haber ido | Completa 2.2b (Explorar ya no depende de la geo, esta semana) |
| **G5** | Misión **"subí una foto y ganá puntos"** | Fuente de puntos sin depender de visita nueva ni del cajero | Única mecánica genuinamente nueva de las 6 — pero es la única con **riesgo operativo real** (moderación/fraude), no es solo diseño |
| **G6** | **Grupos** para hacer algo en compañía (vs. el referido 1-a-1 actual) | Loop social más fuerte que el referido de a uno | Candidato de Fase 4, **después** de la investigación 4.1 que el roadmap ya pide — no antes |

## Ya cubierto por el roadmap actual (sin trabajo nuevo)

- Ranking/porcentil global ("top 9% de CABA"): Pasito puede mostrarlo por volumen real de
  usuarios. Premia ya tuvo y **apagó a propósito** un ranking social simulado (Fase 0.4,
  `AMIGOS_MOCK`). Esta referencia **confirma que esa decisión estuvo bien** — candidato real
  recién en Fase 4, con densidad real de usuarios, nunca simulado.
- "Descubrir" con sparkle = mismo concepto que "Nuevos para vos" (otra forma de UI, no feature nueva).
- Historial de canjes = ya existe ("Premios que ya conseguiste" en `TabPerfilMarketplace`).
- Nav inferior con pill oscura en la pestaña activa, números grandes en `font-titulo` para stats
  = mismo criterio que ya usa Premia.

## Qué NO aplica — rompería la identidad de Premia

- **Badges de escasez ("¡Últimos!") sin dato real detrás** — `CONTRIBUTING.md` prohíbe
  urgencia/prueba social inventada. Solo válido si el dueño carga un cupo real; eso es decisión
  de negocio, no un patrón a copiar tal cual.
- **Balance único global persistente (chip de "puntos" siempre visible arriba)** — funciona en
  Pasito porque tiene UNA moneda global. Premia tiene saldo **independiente por negocio**; un
  chip único mentiría sobre qué representa ese número. El XP global existe pero no es gastable.
- **Paleta/tono fitness-tech (verde+negro, frío, deportivo)** — Premia es barrio/cálido (dorado,
  coral, sage). No es una dirección a explorar.
- **Mascota** — Pasito no tiene un personaje con la fuerza de Premín. Nada que importar; Premín
  se mantiene exactamente como está (recién definido su sistema de evolución, ver
  `docs/NIVELES-Y-PREMIN.md`).

## Orden priorizado

| Prioridad | Qué | Tamaño / dependencia |
|---|---|---|
| ~~P0~~ | ~~Los 73 negocios sin consentimiento~~ | **Decisión de Tobías (12/9/2026): se mantienen activos y publicados.** Riesgo aceptado conscientemente — ver `docs/MUESTRAS-LOTE.md`. Sin acción pendiente. |
| ~~P1~~ | ~~G2 — premio visible en card de Explorar~~ | **Hecho (12/9).** Pill con el nombre de la recompensa (alcanzable o próxima) en `TarjetaExplorar` |
| ~~P1~~ | ~~G1 — filtro "Te alcanza"~~ | **Hecho (12/9).** Chip en `TabMapa`, filtra por `mejorRecompensaDisponible(...) !== null` |
| P2 | G4 — "Abierto ahora" / Favoritos | Chico ("Abierto ahora" sin dato nuevo; "Favoritos" necesita guardar estado — local primero, Supabase después si vale la pena) |
| P2 | G3 — cierre de racha + comparación a tu promedio | Mediano; el aviso solo se ve solo si el usuario abre la app ese día hasta que exista Fase 3 (push) |
| P3 | G5 — misión "subí foto y ganá" | Mediano + **decisión de operación pendiente** (moderación/fraude) antes de construir |
| P3 | G6 — grupos | Grande; depende de la investigación 4.1 (todavía no hecha) |
| ~~P1~~ | ~~G8 — foto real en el héroe (tono calmo) + en "Nuevos para vos"~~ | **Hecho (12/9).** Chico, sin dependencias — ver detalle abajo |

## G8 — reconciliar el Home (2.2) con esta misma auditoría

Pedido puntual de Tobías: el banner ilustrado "Comunidad Premia" que 2.2 sacó del Home hacía
sentir la red viva; sin él, ¿el Home quedó frío? Análisis:

- **G1/G2/G4 no cubren esto** — viven en Explorar (`TabMapa`/`TarjetaExplorar`), no tocan el
  Home en absoluto.
- **El hueco real no era una sección faltante**: era que el héroe tiene un solo tratamiento
  visual para sus 5 tipos de señal, y el más plano (`tono: calmo` — sin urgencia real) le toca
  justo a los dos casos más frecuentes: usuario satisfecho y usuario nuevo. "Tus lugares"/
  "Nuevos para vos" tampoco tenían ni una foto, solo logos de 36px.
- **Qué NO se hizo**: no volvió "Los más elegidos" ni "Premia recomienda" como secciones (F7
  sigue siendo válido sobre esas dos), no se puso un banner ilustrado fijo (una ilustración de
  marca que se repite todos los días se vuelve papel tapiz — ese momento vive en
  `OnboardingPremin`/`PortadaCliente` y, a futuro, en la identidad de red de Fase 4).
- **Qué se hizo** (`Marketplace.tsx`): el héroe en tono `calmo` usa la foto real del negocio
  (`portadaUrl`) de fondo si existe, mismo lenguaje visual que `TarjetaExplorar`/`TabInicio`
  (degradé oscuro + texto blanco). "Nuevos para vos" pasó de logo de 36px a una card con foto
  real arriba (`FotoNegocio`, mismo fallback de degradé por rubro que ya usa `TarjetaExplorar`
  — nunca "Foto pendiente"). Mismo dato que ya cargan los dueños, cero copy nuevo, cero sección
  nueva. Test: `Marketplace.test.tsx`.

---

## Plan de implementación — P1/P2 (lo que se construye ahora)

### G2 — Premio visible en `TarjetaExplorar`

**Qué se hace:** agregar un pill con el nombre de la mejor recompensa alcanzable
(`mejorRecompensaDisponible`, ya existe en `lib/club.ts`) o, si ninguna es alcanzable todavía,
la más próxima (`proximaRecompensa`) — mismo cálculo que ya usa `TabMisLocales`, sin lógica
nueva. Convive con la barra de progreso actual, no la reemplaza.

**Qué logra:** la card deja de mostrar solo "vas al 40%" y empieza a mostrar "Café de
especialidad" — el premio real, no la abstracción.

**Por qué importa:** es la corrección concreta y barata de F7 ("Explorar como vitrina, no
mapa de utilidad").

### G1 — Filtro "Te alcanza" en `TabMapa`

**Qué se hace:** nuevo chip de filtro junto a los de rubro. Al activarse, `cercanos` se filtra
a negocios donde el cliente tiene relación **y** `mejorRecompensaDisponible(...) !== null`.
Sin geo sigue andando igual (ya no depende de ubicación desde 2.2b).

**Qué logra:** responde en un toque "¿qué puedo canjear ya, en cualquier local?" sin memoria
ni recorrido manual.

**Por qué importa:** es la acción de mayor intención de compra que puede tener un usuario —
hoy exige acordarse de memoria en qué locales tenía puntos.

### G4 — "Abierto ahora" + "Favoritos" en `TabMapa`

**Qué se hace:**
- "Abierto ahora": filtro nuevo usando `estadoAperturaAhora` (`lib/horarios.ts`, ya existe) —
  sin dato nuevo, solo UI.
- "Favoritos": estado nuevo por cliente. **Primera versión: localStorage** (sin backend,
  reversible, cero riesgo). Versión con backend real (tabla `favoritos`) solo si el uso
  justifica la migración — no se arranca ahí.

**Qué logra:** dos formas más honestas de acotar 94 locales ("me sirve ahora" / "quiero
recordar este") sin depender de haber visitado.

**Por qué importa:** completa 2.2b con el mismo criterio (Explorar es donde se navega TODO,
no el Home).

---

## Hallazgo P0 fuera de alcance de esta auditoría — ningún cliente real podía usar la app (13/9, RESUELTO)

Descubierto sembrando datos de un cliente demo (`scripts/sembrar-cliente-demo-premia-latam.mjs`),
no algo que esta auditoría buscara. **Confirmado en vivo, no es una hipótesis, y es más grave
de lo que parecía al principio**: no es solo que el canje falle — **ningún cliente real ve sus
puntos, sus negocios ni su actividad al loguearse.**

**Causa:** `supabase/migrations/0021_canjes_verificables.sql` nunca se aplicó en producción —
la tabla `canjes` real solo tiene las columnas de `0017_canjes.sql` (sin `estado`,
`codigo_verificacion`, `expira_at`, `confirmado_at`). Dos consecuencias, no una:

1. **Canjear está roto**: el frontend (`panelCliente.ts`) llama a la RPC `iniciar_canje()` de
   0021, que intenta insertar en esas columnas inexistentes → `column "codigo_verificacion"
   does not exist`. Verificado ejecutando la RPC real contra "Baum Catrina" con el cliente demo.
2. **Cargar el perfil está roto, para TODOS** (el hallazgo más grave, no obvio al principio):
   `panelCliente.ts` (función que arma `DatosAppCliente`) hace un `Promise.all` con 7 queries,
   una de ellas `.from('canjes').select('...,confirmado_at').eq('estado','confirmado')` — que
   también falla con `column canjes.confirmado_at does not exist`. Como el código junta los 7
   errores (`primerError = ... ?? canjesRes.error`) y devuelve `{ok:false}` si CUALQUIERA
   falló, **este único error tumba la carga completa del perfil**, no solo la lista de premios
   canjeados. Verificado reproduciendo exactamente esa query contra producción.

Esto es más grave que lo que ya estaba anotado en `CLAUDE.md` (que solo marcaba 0022/0023/0024
como "sin confirmar") — la base (0021) tampoco está, y sin ella las siguientes tres tampoco
pueden estar aplicadas.

**Arreglo — aplicado y verificado, nada pendiente (13-14/9):** `0021`→`0025` ya están pegadas
en producción (`0024` no hizo falta completa, era redundante con `0023`; su único cambio real
—bono de referido a la 1ra visita— quedó aislado en `0025_referido_primera_visita.sql`, ya
pegada). Tres pruebas reales de punta a punta, no solo lectura de código:

1. **Canje real completo**: `iniciar_canje` generó un código real, `confirmar_canje` lo validó
   contra un PIN de prueba y devolvió `{ok:true}`.
2. **Perfil del cliente**: la query de `panelCliente.ts` que antes tiraba `column
   canjes.confirmado_at does not exist` ya no da error.
3. **Referido a la 1ra visita**: se creó un cliente de prueba, se lo registró como referido, se
   le cargó UNA visita, y `revisar_premio_referido` devolvió `visitas_necesarias: 1` con
   `premiado: true` — el cliente de prueba y el bono de puntos de la prueba se revirtieron
   después, no quedó nada de esa prueba en la cuenta demo.

La fila `TEST` en `canjes` (de una prueba anterior) ya se borró (`DELETE FROM canjes WHERE
descripcion = 'TEST';`, corrido por Tobías el 13/9).

**Hallazgo menor aparte, no confirmado como causante de nada:** la variable de entorno
`VITE_SUPABASE_URL` del ambiente **Preview** en Vercel tiene un BOM (carácter invisible U+FEFF)
pegado adelante de la URL (`vercel env pull` lo muestra). Se probó explícitamente si esto rompe
algo real — no rompe: `supabase-js` hace `.trim()` internamente antes de usar la URL, que sí
elimina un BOM. Queda anotado por prolijidad, no como explicación del problema de arriba (esa
fue la migración 0021).

## Cliente demo con datos reales — "Tobias" (13/9)

Para mostrar la app del lado del cliente con actividad de verdad (no el estado "recién
llegado" ni el mock de venta), se sembró un cliente real de Supabase con historial en 5
negocios reales del marketplace (lote de 73, `es_muestra = false`):

- **Login:** `premia.latam@gmail.com` / `premia.startup!` (entrar por `?club`). Nombre del
  cliente: "Tobias" (así saluda el Home).
- 39 visitas reales repartidas en los últimos ~65 días, 2 canjes ya hechos (Bavieca y Hoppe),
  saldos actuales que dejan 4 de los 5 negocios ya canjeables o a menos del 15% de la próxima
  recompensa (Bavieca 602/700, Baum Catrina 679/900, Dársena Bar 363/400, Hoppe 429/500,
  Verduras y Frutas El Gringo 123/250).
- XP global (suma de puntos actuales): **2196 pts → nivel "Habitué"** (segundo de cinco).
- Racha de 3 días seguidos en Bavieca (días 1-2-3) para que la señal de racha tenga con qué
  dispararse.
- Script idempotente: `node scripts/sembrar-cliente-demo-premia-latam.mjs` (se puede volver a
  correr para reforzar/actualizar sin duplicar filas — el detalle de por qué `canjes` necesitó
  un manejo especial está comentado arriba del archivo).

## Home vs. Pasito — comparación puntual (13/9)

Cruce pedido por Tobías entre una captura real del Home de Premia (usuario "Martina", estado
"Arrancás la partida" — **cliente nuevo, cero relaciones todavía**, el fallback `descubrir` de
`heroeDelHome`) y una captura de Pasito con datos reales (69 pasos, racha de 2 días, gráfico de
7 días, ranking). **No es una comparación pareja**: la de Premia es el estado vacío a propósito
(2.3, "Arrancás la partida"), no el Home con actividad real — con el cliente demo de arriba
("Tobias", 5 negocios activos) el Home ya muestra "Tus lugares" y señales con color, no la
pantalla en blanco de la captura. Igual quedan brechas reales, listadas abajo.

| # | Qué tiene Pasito que Premia no | Es brecha real o ya está cubierto/decidido |
|---|---|---|
| 1 | Marca "PASITO" grande, centrada, en cada pantalla | **Decisión de posicionamiento, no bug.** Premia es infraestructura del comercio (el negocio es la marca, no Premia) — mismo criterio que ya rige logos/portadas en `DISENO.md`. Antes de agregar un wordmark propio, confirmar si eso contradice el objetivo de "se siente el club del negocio, no una app ajena". No lo sumaría sin que Tobías lo pida explícito. |
| 2 | Balance de puntos siempre visible arriba de todo | **No aplica igual.** Pasito tiene UN balance porque tiene UN juego; Premia tiene puntos por negocio (a propósito, es multi-comercio). Lo más parecido que ya existe es el nivel/XP global de Premín (`CardNivelXp`), pero solo vive en Perfil. Posible mejora chica: un chip de nivel junto al saludo del Home ("Habitué ⚡") — no un balance en puntos. |
| 3 | Gráfico de actividad de 7 días en el Home | **Brecha real.** Premia no anticipa nada de `TabActividad` en el Home. Conecta con G3 (ya en el backlog, P2) pero G3 vive en Actividad — promover un mini-resumen al Home es una extensión de G3, no algo nuevo desde cero. |
| 4 | Badge de racha positiva siempre visible ("2 DÍAS 🔥") | **Brecha real y barata.** Premia solo muestra racha cuando está *en riesgo* de perderse (`racha-riesgo`), nunca como refuerzo positivo mientras está activa. Candidato a quick-win: mismo dato que ya calcula `lib/home.ts`, falta el caso "racha sana, mostrala igual". |
| 5 | "Tu ranking" (posición global/ciudad) | **Ya mapeado, no nuevo.** Es la misma brecha que G6 (grupos) y Fase 4 (red visible) — depende de la investigación 4.1, todavía no hecha. Pasito lo resuelve más barato (un ranking simple, sin red social); vale la pena reconsiderar un ranking chico como versión reducida de G6 cuando se retome. |
| 6 | Segunda card de acción flotante ("Creá tu grupo") | **Brecha real, chica.** El sistema de referidos ya existe (`SeccionReferidos`) pero no se promueve desde el Home. Candidato a segunda card cuando el usuario todavía no invitó a nadie. |
| 7 | Paleta saturada + números grandes/bold + sombras | **Decisión de marca ya tomada**, no ausencia — ver `DISENO.md` (paleta cálida de barrio vs. la estética "fitness gamer" de Pasito). Copiarla sin criterio contradice esa decisión. Si el objetivo es "más vivo", ya hay piezas que empujan en esa dirección (`CreditoEnVivo`, `PreminEvoluciono`, foto real en el héroe de G8) — reforzarlas antes de cambiar la paleta. |

**Orden sugerido si se construye algo de esto:** #4 (racha positiva) primero — mismo dato, UI
chica, sin ambigüedad de producto. Después #6 (segunda card de invitar). #3 y #5 esperan a que
se retomen G3/G6 respectivamente. #1, #2 y #7 son decisiones de posicionamiento/marca que le
corresponden a Tobías, no implementación directa.

### G3 — Cierre de racha + comparación a tu promedio

**Qué se hace:** nueva señal derivada en `lib/home.ts` o `lib/misiones.ts`: detectar cuándo una
racha activa (`rachaSemanas`) cae a 0 habiendo sido > 0, y calcular el % real contra el
promedio propio de visitas del cliente en ese negocio. Se muestra como evento retrospectivo en
`TabActividad` (timeline) — no es un aviso "en riesgo" nuevo, es el cierre del que ya existe.

**Qué logra:** refuerzo de hábito vía pérdida real (no fabricada), con datos 100% del propio
usuario — nunca comparado con otros.

**Por qué importa:** hoy Premia solo avisa *antes* de perder la racha, nunca dice qué pasó ni
cómo veniás vos. Es contenido ya calculable que además sirve de copy real para el push de
Fase 3 quede como quede esa fase.

**Dependencia:** su valor completo depende de Fase 3 (push) — sin canal de salida, el aviso
solo se ve si el usuario abre la app ese mismo día.

---

## Diferido, con decisión pendiente antes de construir

- **G5 (misión "subí foto y ganá")**: necesita definir moderación (¿manual, cajero, IA?) y
  postura ante fraude antes de prometerlo. No arrancar sin esa definición.
- **G6 (grupos)**: espera la investigación 4.1 (5 usuarios frecuentes + 5 nuevos + 5 dueños)
  que el roadmap ya tenía pedida, sin hacer.
