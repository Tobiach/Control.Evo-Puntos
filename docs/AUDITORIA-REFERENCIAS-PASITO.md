# Auditoría de referencias — Pasito (12/9/2026)

> Complementa `docs/DIAGNOSTICO-PRODUCTO.md` y `docs/ROADMAP-PRODUCTO.md` — no repite lo ya
> diagnosticado ahí (F1-F8, Fases 0-4). Esto son hallazgos **nuevos**, contra 10 capturas reales
> de **Pasito** (app argentina de pasos caminados + canje en comercios) que Tobías pidió cruzar
> contra Premia de cara al lanzamiento. Código de hallazgo: **G1-G6**.

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
| P1 | G2 — premio visible en card de Explorar | Chico, sin dependencias |
| P1 | G1 — filtro "Te alcanza" | Chico, sin dependencias |
| P2 | G4 — "Abierto ahora" / Favoritos | Chico ("Abierto ahora" sin dato nuevo; "Favoritos" necesita guardar estado — local primero, Supabase después si vale la pena) |
| P2 | G3 — cierre de racha + comparación a tu promedio | Mediano; el aviso solo se ve solo si el usuario abre la app ese día hasta que exista Fase 3 (push) |
| P3 | G5 — misión "subí foto y ganá" | Mediano + **decisión de operación pendiente** (moderación/fraude) antes de construir |
| P3 | G6 — grupos | Grande; depende de la investigación 4.1 (todavía no hecha) |

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
