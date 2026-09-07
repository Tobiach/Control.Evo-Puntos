# Spec — Home del marketplace como motor de relevancia

> Fase 2 del roadmap ([ROADMAP-PRODUCTO.md](ROADMAP-PRODUCTO.md)), hallazgo F1 del
> [DIAGNOSTICO-PRODUCTO.md](DIAGNOSTICO-PRODUCTO.md). Pantalla: `src/components/appcliente/Marketplace.tsx`.

## A. Objetivo de la pantalla

Que al abrir Premia el usuario entienda en 2 segundos **la única cosa relevante para él hoy** y
tenga una acción para hacerla. Hoy el Home apila ~10 secciones de peso parejo y no responde
"¿por qué abro Premia hoy?".

## B. Usuario

Cliente final logueado (real), en tres estados:
- **Con relaciones activas** (tiene puntos en ≥1 negocio) — el caso principal.
- **Nuevo real** (0 relaciones) — recién se registró, no fue a ningún lado todavía.
- **Invitado** — navega sin cuenta; ve el Home de demo con relaciones de ejemplo.

## C. Job to be done

"Cuando abro la app, quiero saber si hay algo que me conviene hacer ahora (un premio cerca,
puntos por vencer, x2 activo) sin tener que revisar negocio por negocio."

## D. Comportamiento deseado

Abrir → ver el héroe → tocar → llegar al negocio correcto con esa acción a la vista. Como
segundo movimiento (no primario), explorar 1-2 sugerencias curadas.

## E. Información necesaria (y de dónde sale — todo real)

| Señal | Fuente | Regla |
|---|---|---|
| Puntos por vencer | `relacion.ultimaVisitaDias`, `DIAS_VENCIMIENTO` (60) | `puntos > 0` y faltan ≤ 30 días |
| Recompensa lista | `mejorRecompensaDisponible(negocio.recompensas, puntos)` | hay al menos una alcanzable |
| Puntos x2 ahora | `negocio.horarioValle` + `horarioValleActivoAhora` | franja vigente ahora mismo |
| Cerca de una recompensa | `proximaRecompensa` → `faltan` | `faltan ≤ 60` o `≤ 20%` de la meta |
| Racha en riesgo | `rachaSemanal(relacion.historial)` | `visitas > 0`, no conseguida, faltan ≤ 2 |
| Descubrimiento (fallback) | `negocios` ordenados por `clientesActivos` | solo si no hay ninguna señal arriba |

## F. Jerarquía

1. **Héroe** — 1 señal, la más urgente. Título + detalle + 1 CTA. Ocupa la primera pantalla.
2. **Tus lugares** — acceso rápido a los negocios con relación (máx 1 fila horizontal).
3. **Una** sección de descubrimiento curada (no cinco). "Nuevos para vos" con 3, por calidad real.

Se retiran del Home: chips de intención, filtros de rubro y buscador (se van a Explorar, que ya
es su lugar), "Los más elegidos", "Hoy pasa esto", "Premia recomienda" con "Foto pendiente",
"Tu historia reciente" (vive completa en Perfil).

## G. Estructura propuesta

```
Header: "Hola, {nombre}" + Premín
─────────────────────────────────
[ HÉROE ]  ← señalesDelCliente() → la de mayor prioridad
   tipo · negocio · "Te faltan 50 pts para tu café" · [Ver {negocio}]
─────────────────────────────────
Tus lugares  → fila horizontal de tarjetas (si hay relaciones)
─────────────────────────────────
Nuevos para vos  → 3 negocios sin relación, por clientesActivos
```

Estado sin señales (usuario nuevo real, 0 relaciones):
```
Header
[ HÉROE = descubrimiento ]  "Empezá por {negocio} — {recompensa aspiracional}"  [Ver {negocio}]
Nuevos para vos → 3
```

## H. Razón de cada sección

- **Héroe**: es el 100% del valor del Home. Una idea, una acción (§10). El resto es contexto.
- **Tus lugares**: el usuario que ya tiene relación entra a "seguir" algo puntual — atajo, no exploración.
- **Nuevos para vos**: descubrimiento como segundo movimiento, curado (§14). Uno solo, no cinco.

## I. CTA principal

El del héroe, y cambia según la señal:
- vencimiento / recompensa-lista / near-win → **"Ver {negocio}"** (abre el negocio en su Inicio)
- x2-ahora → **"Ver {negocio}"** (misma acción; la urgencia la comunica el copy)
- descubrimiento → **"Conocer {negocio}"**

## J. Estados

- **loading**: skeleton del héroe (una card gris), no spinner suelto.
- **sin señales + con relaciones**: héroe = "Vas bien en {negocio con más puntos} — te faltan X
  para {próxima}." (near-win aunque esté lejos — siempre hay un próximo objetivo).
- **invitado**: igual que "con relaciones" usando las de ejemplo; el CTA de crear cuenta ya vive en Perfil.
- **error de carga**: el que ya maneja `MarketplaceApp` (no cambia).

### Usuario nuevo real (0 relaciones, 0 XP) — Home "Arrancás la partida"

Enfoque de juego (ver `docs/NIVELES-Y-PREMIN.md`). Su único trabajo: llevar a la primera visita.

- **Header**: Premín base + "Sos {nombre} · Recién Llegado".
- **Héroe = "Misión 1 · Tu primera visita"**: "Andá a {local} y registrá tu visita. Desbloqueás
  {recompensa más barata} y Premín evoluciona." CTA "Empezar". El {local} sale del contexto de
  entrada (ver abajo); si no hay ancla, del fallback `descubrir` de `heroeDelHome`.
- **"Cómo se juega"** — 3 pasos, se ve una vez (flag `celp_como_funciona_visto`), desaparece al
  aparecer la primera relación: elegís un local → registrás tu visita → subís, desbloqueás,
  Premín evoluciona.
- **Línea de evolución** — las 5 formas de Premín, las próximas en silueta, "Faltan 200 XP para
  {Cliente Fijo}". El gancho: se ve el camino desde el minuto cero.
- **"Locales para tu primera visita" — 3**, curados (`clientesActivos` o cercanía).
- **NO**: métricas en cero, lista de 90, mapa completo, tutorial largo, permisos.

**Variantes por contexto de entrada** (`contextoDeEntrada()`, Fase 2.3):
- **referido** (`celp_referido_pendiente` / `celp_entrada`): héroe = "Un amigo te sumó a su
  equipo en {local}. Van 1 visita cada uno = 100 pts los dos." CTA "Ver {local}".
- **QR en un local** (`?carta`/`?local` al alta): héroe = "Estás en {local}. Registrá tu primera
  visita ahora."
- **genérico** (`?club`): el héroe "Misión 1" con el local del fallback `descubrir`. Acá sí
  ofrecer geo, descartable ("Ver los que tenés cerca").

**Transición de salida**: al aparecer la primera relación, el Home pasa al motor de relevancia
normal y "Cómo se juega" desaparece. El puente es el momento del mostrador (Fase 1, `CreditoEnVivo`).

## K. Riesgos UX

- Que el héroe "salte" entre señales en cada apertura y se sienta inestable → desempate estable
  (orden de prioridad fijo; a igualdad, el negocio con más puntos).
- Que una señal de baja utilidad (racha en riesgo con recompensa mock) ocupe el héroe → racha
  queda última en prioridad y solo si no hay nada mejor.
- Perder el descubrimiento que hoy traccionaba → se conserva "Nuevos para vos", curado.

## L. Métrica de éxito

`home_heroe_click / home_heroe_visto` (necesita el evento de Fase 0.5+). Proxy sin analytics:
en `docs/METRICAS.sql`, tiempo entre `app_abierta` y primer `negocio_abierto` (debería bajar) y
% de sesiones con visita dentro de 72 h.

---

## Alcance de la implementación (Fase 2)

1. **2.1 — `src/lib/home.ts`** ✅: `senalesDelCliente()` / `heroeDelHome()`, puro y testeable.
2. **2.2 — `Marketplace.tsx`**: reescribir el render según G. Mover buscador/filtros a `Explorar`.
3. **2.3 — usuario nuevo real + estados** (J): `src/lib/entrada.ts` (`contextoDeEntrada()` +
   clave durable `celp_entrada`), `HomeVacio.tsx` ("Arrancás la partida", 3 variantes),
   `ComoFunciona.tsx`, branch en `Marketplace.tsx`. Framing de juego (`docs/NIVELES-Y-PREMIN.md`).
4. **2.4 — post-canje reabre el loop** (F8): en `TabRecompensas`, al confirmar, mostrar próxima
   meta + razón de próxima visita + gancho de referido.
5. **2.5 — referido en momentos de intención** (F6): héroe alternativo cuando no hay urgencia, y
   en el cierre post-canje/post-nivel.
6. **2.6 — evolución de Premín**: momento "Premín evolucionó" al cruzar umbral de XP + línea de
   evolución (siluetas) en Perfil. Depende de los 5 assets — ver `docs/NIVELES-Y-PREMIN.md`.
