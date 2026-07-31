# Nuevo rubro: Carnicerías

## Contexto

Hoy el sistema tiene 2 rubros fijos (`gastro`, `super`) hardcodeados como union type
`Rubro` en TypeScript y como `CHECK (rubro IN ('gastro','super'))` en el schema real de
Supabase. Se agrega un tercer rubro: **`carniceria`** — carnicerías de barrio.

Decisiones ya confirmadas con el usuario (no volver a preguntar):
1. Carnicería tiene **paleta visual propia** (no reusa gastro ni súper).
2. Los 4 negocios de ejemplo nuevos van al **marketplace ficticio** (`src/data/negocios.ts`,
   mismo lugar que Café Nardo, Almacén Guatemala, etc.) — NO se crean cuentas reales
   sembradas en Supabase para esta tanda.
3. La feature de nicho a construir ahora es el **"combo de asado de fin de semana"
   destacado** — no hace falta por ahora recompensas por kg ni un sistema de pedido
   anticipado (quedan fuera de esta tanda).
4. Un carnicero REAL debe poder elegir "Carnicería" como rubro en el onboarding real
   (no es solo para el marketplace ficticio) — esto requiere tocar el schema real de
   Supabase también.

Leé antes de escribir código, en este orden: `src/data/mockClientes.ts` (tipo `Rubro`,
`DATA_RUBROS`), `src/data/negocios.ts` (negocios ficticios existentes, tipo `Negocio`,
`HorarioValle`), `src/index.css` (paletas `gastro`/`super` vía `data-rubro`),
`src/components/appcliente/Marketplace.tsx` (`FILTROS`, `ESTILO_RUBRO`),
`src/components/appcliente/MarketplaceApp.tsx` (`COLOR_BARRA`),
`src/components/dueno/SeccionNegocio.tsx` (array `RUBROS` del onboarding),
`supabase/migrations/0001_schema.sql` (constraint `CHECK (rubro IN (...))` en `negocios`),
`public/landing/index.html` (menciones a "gastronomía y supermercados/almacenes").

## Qué SÍ hacer

### 1. Paleta propia de carnicería
En `src/index.css`, agregar un tercer bloque de CSS vars activado por
`:root[data-rubro='carniceria']`, con una identidad distinta a las 2 que ya existen
(gastro = navy oscuro + dorado; súper = claro + rojo). Dirección sugerida: estética de
carnicería de barrio — fondo oscuro cálido tipo madera/carbón, acento rojo profundo
(sello de calidad), texto crema cálido. Ejemplo de punto de partida (ajustar si al armar
se ve mal, usar criterio):
```
--color-fondo:        #1C1410;
--color-fondo-medio:  #241A14;
--color-card:         #2E211A;
--color-borde:        rgba(196, 74, 58, 0.25);
--color-acento:       #C4443A;
--color-acento-hover: #E0574B;
--color-on-acento:    #FFFFFF;
--color-texto:        #F5EDE4;
--color-texto-muted:  #A89184;
--color-premio:       #E0574B;
--color-premio-suave: rgba(196, 74, 58, 0.12);
--color-verde-ok:     #4CAF88;
--color-rojo:         #EF4444;
```

### 2. Tipo `Rubro` y schema real
- `Rubro = 'gastro' | 'super' | 'carniceria'` en `mockClientes.ts` — actualizar TODOS los
  lugares donde TypeScript se queje (Record<Rubro, ...>, switches, etc.) — el compilador
  te va a señalar cada uno con `npm run lint`, no asumas que ya los encontraste todos.
- Nueva migración `supabase/migrations/0011_rubro_carniceria.sql`: `ALTER TABLE negocios
  DROP CONSTRAINT` (buscar el nombre real del constraint, probablemente
  `negocios_rubro_check`) y volver a crearlo con los 3 valores. Dejarla sin aplicar, se
  la doy yo al usuario.
- `DATA_RUBROS` en `mockClientes.ts`: agregar la entrada `carniceria` completa (mismo
  shape que `gastro`/`super`: nombreNegocio ficticio de ejemplo tipo "Demo Carnicería"
  — mismo criterio que ya se usó para renombrar los otros dos demos genéricos, NO uses
  un nombre de negocio específico ahí — , recompensas temáticas de carnicería, clientes
  mock, etc).

### 3. Onboarding real (panel del dueño)
En `SeccionNegocio.tsx`, agregar `{ valor: 'carniceria', etiqueta: 'Carnicería' }` al
array `RUBROS` — así un dueño real puede elegir este rubro al cargar su negocio.

### 4. Marketplace y filtros
- `Marketplace.tsx`: agregar 'Carnicería' a `FILTROS` y su entrada correspondiente en
  `ESTILO_RUBRO` (con los colores de la sección 1).
- `MarketplaceApp.tsx`: agregar la entrada de `carniceria` en `COLOR_BARRA` (color de la
  barra del navegador al entrar a un negocio de este rubro).

### 5. Cuatro negocios ficticios de carnicería
Sumar 4 carnicerías de barrio a `NEGOCIOS` en `src/data/negocios.ts` — mismo criterio que
los negocios ficticios ya existentes: nombres 100% ficticios pero creíbles de Palermo,
coordenadas reales dentro del barrio, `rubro: 'carniceria'`, recompensas temáticas
(cortes, combos, delivery — usar criterio, no hace falta que sean por kg ya que esa idea
quedó fuera de esta tanda).

### 6. Combo de asado de fin de semana (la feature de nicho)
- Nuevo campo opcional en el tipo `Negocio` (`src/data/negocios.ts`), ej.
  `comboFinde?: { descripcion: string; precio?: number; dias: number[] }` (`dias` en el
  mismo formato 0-6 que ya usa `HorarioValle.dias`).
  Cargalo en las 4 carnicerías nuevas con un combo creíble (ej. "Combo asado familiar:
  vacío + chorizo + morcilla", viernes a domingo).
- Mostrarlo como un banner destacado en la vista del negocio (`TabInicio.tsx` o donde
  tenga más sentido visualmente) — mismo patrón visual que ya existe para
  `horarioValle` (revisá `textoHorarioValle` en `misiones.ts` como referencia de estilo,
  armá un helper equivalente `textoComboFinde` si hace falta), pero mostrado solo si hoy
  es uno de los días configurados (o simplemente siempre visible como destacado — usar
  criterio, documentar la decisión en el commit).

### 7. Landing
En `public/landing/index.html`, actualizar las menciones a "gastronomía y
supermercados/almacenes" para incluir carnicerías donde tenga sentido (hero, FAQ,
footer) — sin reescribir toda la landing, solo esas menciones puntuales.

## Qué NO hacer

- No implementar recompensas por kg ni el sistema de pedido anticipado — quedaron fuera
  de esta tanda explícitamente.
- No crear cuentas reales sembradas en Supabase para las 4 carnicerías de ejemplo — solo
  van al marketplace ficticio.
- No tocar auth, referidos, desafíos, carta digital, ni el mapa — no son parte de esta
  tarea.
- No eliminar ni renombrar los rubros `gastro`/`super` existentes.

## Checklist antes de terminar

- `npm run lint` → 0 errores (prestá atención a TODOS los lugares donde el compilador se
  queje por el nuevo valor del union type)
- `npm run build` → sin warnings críticos nuevos
- `npm run test` → todos los tests existentes en verde + nuevos si agregás lógica pura
  (ej. `textoComboFinde`)
- Migración `0011_rubro_carniceria.sql` sin aplicar todavía (se la doy yo al usuario)
- Commit con mensaje claro
