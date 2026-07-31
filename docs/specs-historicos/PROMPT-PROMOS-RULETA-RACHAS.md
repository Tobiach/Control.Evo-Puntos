# Promos, ruleta semanal, racha diaria y más negocios

## Contexto

El marketplace hoy tiene 10 negocios ficticios de Palermo (`src/data/negocios.ts`, 6
gastro + 4 super). Las mecánicas de retención ya existentes son: racha semanal/larga
(`src/lib/misiones.ts`), misiones/insignias, temporada mensual, y una "recompensa
sorpresa" tipo rasca-y-gana gatillada cada 200 pts acumulados (`RecompensaSorpresa.tsx`).
El pedido es sumar más variedad de negocios y 3 mecánicas nuevas que generen más
"enganche" real, sin duplicar lo que ya existe.

**IMPORTANTE — leé antes de escribir código:**
`src/lib/misiones.ts`, `src/lib/club.ts`, `src/data/mockClientes.ts`, `src/data/negocios.ts`,
`src/components/appcliente/TabInicio.tsx`, `src/components/appcliente/RecompensaSorpresa.tsx`
y `src/components/appcliente/Marketplace.tsx` — para no reinventar tipos o helpers que ya
existen (ej. `formatPuntos`, `rachaSemanas`, `rachaSemanal`, el patrón de `lanzarConfetti`).

## Qué SÍ hacer

### 1. Más negocios ficticios de Palermo
Sumar 6-8 negocios nuevos a `NEGOCIOS` en `src/data/negocios.ts`, variando categorías
dentro de cada rubro (ej. gastro: heladería, panadería/confitería, sushi/asiático, wine
bar; super: verdulería, fiambrería/rotisería, kiosco/drugstore). Mismas reglas que los
existentes: coordenadas reales dentro de Palermo, nombres 100% ficticios pero creíbles,
`recompensas` variadas y realistas para ese tipo de comercio, `clientesActivos` y
`fechaAlta` coherentes con el resto de los datos.

### 2. Promos estructuradas (2x1 / horario / delivery gratis / descuento)
Hoy un "2x1" es solo texto suelto dentro de `recompensas` (ej. "2x1 en pintas"). Crear un
concepto propio y visible:
- Nuevo tipo `Promo` en `src/data/negocios.ts` (o `mockClientes.ts` si es más consistente
  con dónde viven los otros tipos compartidos): `{ tipo: '2x1' | 'horario' | 'delivery-gratis'
  | 'descuento'; titulo: string; detalle?: string }`.
- Campo opcional `promos?: Promo[]` en `Negocio`.
- Cargar 1-3 promos realistas en varios de los negocios (nuevos y existentes que ya
  tenían "2x1"/"% off" sueltos en sus recompensas — no dupliques el texto, migralo al
  campo estructurado si tiene más sentido ahí).
- Mostrar las promos como badges/banner destacado tanto en la tarjeta del marketplace
  (`TarjetaNegocio` en `Marketplace.tsx`) como al entrar al negocio (`AppCliente.tsx` o
  `TabInicio.tsx`, el lugar que tenga más sentido visualmente) — con una etiqueta que
  distinga tipo de promo (ej. ícono/color distinto para "2x1" vs "delivery gratis").
- El horario valle (`horarioValle`) YA es una promo de tipo horario — no dupliques esa
  lógica, si querés unificarla bajo el mismo sistema de badges hacelo, pero sin romper
  `textoHorarioValle` en `misiones.ts` que ya se usa en `TabInicio.tsx`.

### 3. Ruleta semanal
Nuevo componente `src/components/appcliente/RuletaSemanal.tsx`, mecánica DISTINTA de
`RecompensaSorpresa` (esa es por puntos acumulados; esta es por tiempo):
- Se puede girar una vez cada 7 días (cooldown real basado en la última vez que se
  giró — persistir el timestamp de la última tirada de alguna forma consistente con
  cómo se maneja el resto del estado de la relación cliente-negocio en esta fase del
  proyecto — revisá cómo `MarketplaceApp.tsx` maneja el estado de `relaciones` antes de
  decidir dónde guardar esto).
- Rueda visual (SVG o `conic-gradient` con divisiones de premio), animación de giro con
  `motion/react` (ya es dependencia del proyecto) terminando en un premio aleatorio.
- Pool de premios más variado/grande que el de `RecompensaSorpresa` (incluir algún
  premio "grande" poco probable para generar expectativa — ej. probabilidades no
  uniformes: la mayoría de las porciones son premios chicos, 1-2 porciones son el
  premio grande).
- Confetti al caer en un premio bueno (reusar `src/lib/confetti.ts`).
- Mostrar cooldown restante ("Volvé en X días") cuando ya se usó esta semana, con el
  mismo lenguaje/tono que el resto de la copy del proyecto (español rioplatense,
  directo, sin relleno).
- Integrarla en `TabInicio.tsx`, en un lugar razonable del flujo (cerca de
  `RecompensaSorpresa` tiene sentido, pero no las mezcles en un solo componente).

### 4. Racha diaria
Hoy solo existen rachas SEMANALES (`rachaSemanas` en `club.ts`, `rachaSemanal` en
`misiones.ts`). Sumar una racha de DÍAS CONSECUTIVOS con al menos una visita (no
necesariamente todos los días tiene sentido para un bar, pero sí es un hook de
gamificación válido — tratalo como "racha de check-in", no fuerces que sea literal
"todos los días visitó el local"). Nueva función en `misiones.ts` o `club.ts` (el que
tenga el patrón más parecido) que calcule días consecutivos distintos con visita a
partir del `historial: Visita[]` ya existente (cada `Visita` tiene `diasAtras`). Mostrar
como badge chico en `TabInicio.tsx`, distinto visualmente del badge de racha semanal ya
existente (no lo reemplaces, conviven los dos).

## Qué NO hacer

- No tocar el mapa ni `Marketplace.tsx` más allá de agregar el badge de promos en
  `TarjetaNegocio` (si otro agente ya tocó el mapa en este mismo archivo, sé cuidadoso
  de no pisar esos cambios — revisá el diff actual del archivo antes de editarlo).
- No tocar auth, panel de dueño ni panel de cajero.
- No conectar estas 3 mecánicas nuevas a Supabase todavía — quedan en el mismo nivel que
  el resto de `appcliente/` (mock + capa real de puntos ya existente, sin tablas nuevas).
- No eliminar ni reemplazar `RecompensaSorpresa` — es una mecánica distinta y válida,
  conviven ambas.

## Checklist antes de terminar

- `npm run lint` → 0 errores
- `npm run build` → sin warnings críticos nuevos
- `npm run test` → todos los tests existentes en verde + tests nuevos para la lógica
  pura (racha diaria, selección de premio de la ruleta, cooldown de 7 días)
- Commit con mensaje claro describiendo qué se agregó
