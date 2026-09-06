# Lote de negocios de muestra (escaparate privado de venta)

73 negocios reales de CABA cargados en Supabase con **`es_muestra = true`**, para que Tobías
le muestre a cada prospecto su propio local dentro de Premia durante el pitch, sin que ese
negocio aparezca en el mapa/marketplace de clientes reales. Misma lógica que Victoria Café
(ver `scripts/sembrar-victoria-cafe.mjs` y `docs/ARQUITECTURA.md` → "Marketplace vs negocio único").

## Regla no negociable

Todo lo de este lote entra y se queda con **`es_muestra = true`**. Nunca se pasa a `false`
en lote ni por default. Se cambia **uno por uno**, y solo cuando Tobías confirma que ESE
dueño puntual dijo que sí y quiere estar en el marketplace real. `src/lib/panelCliente.ts`
ya filtra `es_muestra = false` antes de mostrar negocios a un cliente real — mientras el flag
esté en `true`, el negocio solo es accesible por link directo.

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

## La cuenta para mostrarlo

Una sola cuenta de dueño compartida por los 73:

- **Usuario:** `dueno.muestras-premia.demo@gmail.com`
- **Clave:** `ControlEvo2026!`
- **Panel en vivo:** `https://premia-ar.vercel.app/?admin` (entra directo al login de dueño)
- **Carta pública de un negocio:** `https://premia-ar.vercel.app/?carta=<id>` (sin login, para mandar por WhatsApp)

Para el pitch a un prospecto: compartís su `?carta=<id>`, o entrás al `?admin` con esa
cuenta y le mostrás el panel de su negocio. Cuando un dueño cierra, se le arma su propia
cuenta y recién ahí se evalúa pasarlo a `es_muestra = false` (ver "Promover uno a real").

## Qué es genérico (revisar antes de cada pitch)

Carga **liviana**: `negocios` + `carta_items` + `recompensas` + `premios_ruleta`. Sin
clientes demo ni visitas backdateadas (eso es el "tratamiento completo", se hace después,
negocio por negocio).

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

Editar `scripts/muestras-lote.data.json` (mismo formato: `negocio` con columnas reales de la
tabla, `carta`, `recompensas`, `premios_ruleta`) y correr el script. Mantener
`es_muestra: true`.

### Promover uno a real (marketplace)

Solo con confirmación explícita de Tobías, negocio por negocio. Desde el SQL Editor de
Supabase:

```sql
update negocios set es_muestra = false where id = '<id-del-negocio>';
```

Y darle al dueño su propia cuenta (no dejarlo bajo la cuenta compartida de muestras).

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
