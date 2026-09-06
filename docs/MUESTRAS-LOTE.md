# Lote de 73 locales reales de CABA en el marketplace

73 negocios reales de CABA (relevamiento de Tobías) cargados en Supabase y **publicados en
el marketplace**: aparecen en el mapa y en la lista de locales afiliados para cualquier
usuario final, con o sin cuenta.

> **Historial de la decisión.** Este lote se cargó primero como escaparate privado
> (`es_muestra = true`, solo visible por link directo). El **6/9/2026 Tobías decidió
> publicarlos en el marketplace real** para usuario final navegando, asumiendo que: los
> dueños no dieron consentimiento explícito, y las cartas/premios son genéricos por rubro
> (placeholder), no el menú real de cada local. Para revertir, ver "Despublicar".

## Cómo quedan visibles

Dos capas, las dos tocadas en este lote:

1. **Supabase** — los 73 tienen `es_muestra = false`. `src/lib/panelCliente.ts` los trae
   para cualquier **cliente logueado** (`cargarAppCliente`).
2. **`src/data/negocios.ts`** — los 73 están también en el array `NEGOCIOS` (mock), que es
   lo que ve un **invitado navegando sin cuenta** y la demo de venta interna. Ahí figuran
   como locales de ejemplo (`idsEjemplo`): se ven en el mapa y el perfil, pero un canje no
   pega contra Supabase (no tienen cajero/PIN configurado — un canje real se rompería).

Los cambios en `src/data/negocios.ts` **solo se ven después de un deploy** (ver
`docs/DEPLOY.md`: un push a `main` no despliega).

## De dónde salió cada negocio

Dos planillas de relevamiento de Tobías (Google Drive), filtrando lo que él marcó:

| Fuente | Qué se tomó |
|---|---|
| **"CRM Prospeccion - Post Visita"**, tab *Leads Prospección* | La única fila en **verde**: **Bavieca** (bar de vinos / vermutería). |
| **"CRM Prospeccion - Post Visita"**, tab *Super / Almacen* | Las **13 filas con la celda de teléfono en verde** → almacenes, vinotecas, dietéticas y afines de Villa Crespo / Palermo. Los nombres se resolvieron siguiendo los short-links de Google Maps. |
| **"datos URU Restaurates"**, *Hoja 1*, **filas 66 a 128** | 63 cervecerías / bares de Buenos Aires (Palermo, Villa Crespo, Boedo, Caballito, San Telmo). De esas 63 se cargan 59 (menos 3 duplicados y menos Cicerone — ver "Duplicados y salteados"). |

Total cargado: **13 almacenes + 60 gastro (Bavieca + 59 cervecerías/bares) = 73.**

Datos disponibles en las planillas: nombre, coordenadas, dirección (parcial), rating de
Maps, rango de precio, categoría, teléfono. **No había menú, logo ni fotos** en ninguna de
las dos — ver "Qué es genérico".

## La cuenta dueño

Los 73 comparten una sola cuenta de dueño (sirve para editar cualquiera desde el panel):

- **Usuario:** `dueno.muestras-premia.demo@gmail.com`
- **Clave:** `ControlEvo2026!`
- **Panel:** `https://premia-ar.vercel.app/?admin` (entra directo al login de dueño)
- **Carta pública de un negocio:** `https://premia-ar.vercel.app/?carta=<id>`

Cuando un dueño real quiera hacerse cargo de su local, se le arma su propia cuenta y se le
transfiere el `dueno_user_id` de ese negocio (hoy todos apuntan a la cuenta de arriba).

## Qué es genérico (revisar antes de vender un local puntual)

Carga **liviana**: `negocios` + `carta_items` + `recompensas` + `premios_ruleta`. Sin
clientes demo ni visitas backdateadas.

- **Carta y recompensas de los 73 son genéricas por rubro** (cervecería → estilos de
  cerveza + para picar + hamburguesas; almacén → sin carta, solo recompensas; bar de vinos
  → vinos por copa + vermús + tablas). **Ninguna es el menú real del local.** Antes de
  pitchear a un negocio puntual, cargarle su carta real desde el panel de dueño.
- **Puntos de las recompensas: placeholder.** Ajustar con el dueño real.
- **13 almacenes: sin `carta_items`** (un almacén no tiene menú), solo recompensas + ruleta.
- **Direcciones:** 34 tienen calle + altura reales; el resto quedó sin dirección (la planilla
  solo traía barrio o nada). Las coordenadas sí están en los 73 (de Maps).
- **3 almacenes** (`verduras-y-frutas-el-gringo`, `hoppe`, `3-corazones-supermercado`)
  tienen coordenadas aproximadas al barrio — la dirección de calle sí es la real.

## Duplicados y salteados

- **`cicerone-beer-wine` NO se cargó**: ya existe en producción como negocio **real**
  (`es_muestra = false`), de otra cuenta. No es nuestro para tocar. Si el prospecto de la
  planilla es el mismo local, ya está en Premia; si no, cargarlo con otro id.
- **3 filas duplicadas** en la planilla URU (filas 101 / 116 / 128) se descartaron: eran
  repetición exacta de I.P.A. Cervecería, Cervelar y Strange 2 (ya cargados desde las filas
  96 / 104 / 106). Las sucursales de Glück (Palermo, Recoleta, Caballito, San Telmo) sí son
  locales distintos y van todas.
- **`cerveza-loro-cerveceria-y-malteria-loro-cerveza-`**: el id quedó con un guión al final
  (el nombre es larguísimo y se cortó). Funciona igual. Si molesta, borrar la fila desde el
  dashboard de Supabase y volver a correr el script (la tabla `negocios` no tiene policy de
  DELETE, no se puede borrar desde el script).

## Cómo se administra

- Datos: **`scripts/muestras-lote.data.json`** (fuente de verdad, revisable).
- Notas por negocio (teléfono, web, rating, si la carta es genérica):
  **`scripts/muestras-lote.notas.json`** — no va a la base.
- Script: **`scripts/sembrar-muestras-lote.mjs`**. Idempotente (borra e re-inserta
  carta/recompensas/ruleta, upsert del negocio). Requiere `.env.local` con
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

```bash
node scripts/sembrar-muestras-lote.mjs --dry            # valida y muestra, no escribe
node scripts/sembrar-muestras-lote.mjs                  # siembra / re-siembra los 73
node scripts/sembrar-muestras-lote.mjs --solo=bavieca   # uno solo
node scripts/sembrar-muestras-lote.mjs --desde=15 --hasta=40
```

### Agregar más negocios al lote

1. Editar `scripts/muestras-lote.data.json` (mismo formato: `negocio` con columnas reales de
   la tabla, `carta`, `recompensas`, `premios_ruleta`; `es_muestra: false`).
2. `node scripts/sembrar-muestras-lote.mjs` → los mete en Supabase.
3. Agregarlos también a `src/data/negocios.ts` (array `NEGOCIOS`) para que los vea un
   invitado, y **deployar**.

### Despublicar (volver a escaparate privado)

```bash
node scripts/sembrar-muestras-lote.mjs --despublicar    # es_muestra = true en los 73
```

Y sacar el bloque "Lote de locales reales de CABA" de `src/data/negocios.ts` + deployar,
si no querés que un invitado los siga viendo.

---

<!-- tablas generadas desde scripts/muestras-lote.notas.json -->
### Almacenes / supermercados (13)

| Negocio | Categoría | id (para `?carta=<id>`) |
|---|---|---|
| Verduras y Frutas El Gringo | Verdulería y frutería | `verduras-y-frutas-el-gringo` |
| Hoppe | Almacén | `hoppe` |
| 3 Corazones Supermercado | Supermercado | `3-corazones-supermercado` |
| Almacén de Pollos Malabia | Granja y pollería | `almacen-de-pollos-malabia` |
| Lucca - Almacén de Vinos y Delicias | Almacén de vinos y delicatessen | `lucca-almacen-de-vinos-y-delicias` |
| Manolo Almacén de Bebidas | Almacén de bebidas | `manolo-almacen-de-bebidas` |
| XTragos Villa Crespo - Bebidas y Fiambres | Bebidas y fiambrería | `xtragos-villa-crespo-bebidas-y-fiambres` |
| Mar Abierto - Almacén de Mar | Pescadería y mariscos | `mar-abierto-almacen-de-mar` |
| Genmai - Almacén Orgánico | Almacén orgánico | `genmai-almacen-organico` |
| Chitta Almacén Natural | Almacén natural | `chitta-almacen-natural` |
| Axel Almacén | Almacén | `axel-almacen` |
| Kingston Kosher - Carnicería y Supermercado | Carnicería kosher y supermercado | `kingston-kosher-carniceria-y-supermercado` |
| Cilantro Mercado Natural | Mercado natural | `cilantro-mercado-natural` |

### Cervecerías, bares y afines (60)

| Negocio | Categoría | id (para `?carta=<id>`) |
|---|---|---|
| Bavieca | Bar de vinos · Vermutería | `bavieca` |
| Baum Catrina | Cervecería artesanal | `baum-catrina` |
| Desarmadero Bar/Session | Cervecería artesanal | `desarmadero-bar-session` |
| Dársena Bar | Cervecería artesanal | `darsena-bar` |
| Byra Villa Crespo | Cervecería | `byra-villa-crespo` |
| Hops Cerveceria Artesanal | Cervecería artesanal | `hops-cerveceria-artesanal` |
| Jerome Palermo | Cervecería artesanal | `jerome-palermo` |
| Baum serrano | Cervecería artesanal | `baum-serrano` |
| La Birreria Palermo | Cervecería artesanal | `la-birreria-palermo` |
| Blest Palermo | Cervecería artesanal | `blest-palermo` |
| Tap Haus | Cervecería artesanal | `tap-haus` |
| La Birrería Villa Crespo | Cervecería artesanal | `la-birreria-villa-crespo` |
| Buller | Bar | `buller` |
| Cervecería_Bar Valk Taproom | Cervecería | `cerveceria-bar-valk-taproom` |
| La Choppería de Palermo | Cervecería | `la-chopperia-de-palermo` |
| 1516 Cervecería - Palermo | Cervecería artesanal | `1516-cerveceria-palermo` |
| Doble Sentido, Bar Cultural | Cervecería artesanal | `doble-sentido-bar-cultural` |
| Es Malta | Cervecería artesanal | `es-malta` |
| PIBÄ Soho | Cervecería artesanal | `piba-soho` |
| Bar Barril | Bar | `bar-barril` |
| Bècha [Esquina Cervecera] | Cervecería artesanal | `becha-esquina-cervecera` |
| Compañia Cervecera Perro Negro | Cervecería | `compania-cervecera-perro-negro` |
| Strange Brewing | Cervecería artesanal | `strange-brewing` |
| Glück Cervecería - Palermo | Cervecería | `gluck-cerveceria-palermo` |
| Los Caminantes | Cervecería artesanal | `los-caminantes` |
| Temple Craft Soho | Cervecería artesanal | `temple-craft-soho` |
| 1947 cerveceria | Cervecería | `1947-cerveceria` |
| ORZO BAR Music & Brewery | Cervecería artesanal | `orzo-bar-music-brewery` |
| Biere bar🍺 / La ventanita ☕️ cafeteria de especialidad | Cervecería artesanal | `biere-bar-la-ventanita-cafeteria-de-especialidad` |
| Charlie Hops | Cervecería artesanal | `charlie-hops` |
| I.P.A. Cervecería | Cervecería | `i-p-a-cerveceria` |
| Temple Craft Hollywood | Cervecería artesanal | `temple-craft-hollywood` |
| CERVECERÍA Y FOCACCERIA TK | Cervecería | `cerveceria-y-focacceria-tk` |
| Madigan Cervecería Y Tragos | Cervecería | `madigan-cerveceria-y-tragos` |
| Guarda La Vieja | Cervecería artesanal | `guarda-la-vieja` |
| Santaella Cerveceria | Cervecería artesanal | `santaella-cerveceria` |
| Bunker | Bar | `bunker` |
| Cervelar | Cervecería artesanal | `cervelar` |
| Cerveza Loro - Cervecería y Maltería Loro - Cerveza sin TACC Libre de Gluten | Cervecería artesanal | `cerveza-loro-cerveceria-y-malteria-loro-cerveza-` |
| Strange 2 | Cervecería | `strange-2` |
| Errantes Cervecería Artesanal y Hamburguesería Boedo | Cervecería artesanal | `errantes-cerveceria-artesanal-y-hamburgueseria-b` |
| El Fermentador | Cervecería artesanal | `el-fermentador` |
| El Refugio - Cervecería y Cafetería | Cervecería artesanal | `el-refugio-cerveceria-y-cafeteria` |
| Figueroa Cervecería | Cervecería | `figueroa-cerveceria` |
| Bien Berraco Cervecería | Cervecería | `bien-berraco-cerveceria` |
| Glück Cervecería - Recoleta | Cervecería artesanal | `gluck-cerveceria-recoleta` |
| Cervecería López | Cervecería | `cerveceria-lopez` |
| Rolo Cervecería | Cervecería | `rolo-cerveceria` |
| Titan Cerveceria 🍺🍕🌭 | Cervecería | `titan-cerveceria` |
| Varsovia Beer | Cervecería artesanal | `varsovia-beer` |
| Rabieta | Cervecería artesanal | `rabieta` |
| Glück Cervecería - Caballito | Cervecería | `gluck-cerveceria-caballito` |
| Don Andrés | Cervecería artesanal | `don-andres` |
| Glück Cervecería - San Telmo | Cervecería artesanal | `gluck-cerveceria-san-telmo` |
| Dos99 Cervecería | Cervecería artesanal | `dos99-cerveceria` |
| The Prancing Pony | Cervecería artesanal | `the-prancing-pony` |
| Club de la Birra Caballito | Cervecería | `club-de-la-birra-caballito` |
| Alba Bodegón Cervecería | Cervecería | `alba-bodegon-cerveceria` |
| Cervecería Untertürkheim | Cervecería artesanal | `cerveceria-unterturkheim` |
| Winston Club | Restaurante | `winston-club` |
