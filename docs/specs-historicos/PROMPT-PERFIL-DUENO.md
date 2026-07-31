# Spec — Perfil del dueño + bloqueo de nombre + dirección real (sin API key de Google)

Repo: `C:\Users\estudiante\controlevo-puntos`. Stack: React 19 + Vite 6 + TS + Tailwind 4 +
Supabase. Leé `src/components/dueno/PanelDueno.tsx`, `src/components/dueno/SeccionNegocio.tsx`,
`src/lib/panelDueno.ts` y `src/lib/geo.ts` completos antes de escribir nada — hay convenciones
ya establecidas (null-safe sin backend, `ResultadoPanel<T>`, patrón `onCambiar(parche)`) que hay
que seguir, no inventar otras.

Decisión ya tomada con el usuario: **no hay API key de Google Maps**. La búsqueda de dirección
se resuelve con Nominatim (OpenStreetMap), gratis y sin key — mismo proveedor de tiles que ya
usa el mapa del marketplace (Leaflet).

## Qué construir

### 1. Migración nueva `supabase/migrations/0012_perfil_dueno.sql`

- Tabla `dueno_perfil`: `dueno_user_id uuid primary key references auth.users(id)`,
  `nombre_persona text not null default ''`, `created_at timestamptz not null default now()`,
  `updated_at timestamptz not null default now()`. RLS habilitado, únicas policies: el dueño
  lee/inserta/actualiza solo su propia fila (`auth.uid() = dueno_user_id`). Sin policy pública.
- Columnas nuevas en `negocios`: `calle text`, `altura text`, `codigo_postal text` (nullable,
  la dirección real del negocio vive ahí, no se duplica en otra tabla — perfil y la sección
  "Negocio → Ubicación" son dos vistas del mismo dato).
- No tocar `lat`/`lng`, ya existen.
- Dejar el archivo listo para que el usuario lo pegue a mano en el SQL Editor de Supabase (no
  hay CLI conectado en este proyecto) — no intentar aplicarlo vos.

### 2. Geocoding sin API key — `src/lib/geo.ts`

Agregar una función pura y testeable:

```
export async function geocodificarDireccion(query: string): Promise<{ lat: number; lng: number } | null>
```

- Pega contra `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=<query encodeado>`.
- Devuelve `{ lat, lng }` parseados del primer resultado, o `null` si no hay resultados o si
  falla la request (try/catch, nunca tirar excepción hacia arriba).
- **Nunca dispares esta función en cada tecla** — se llama solo desde un botón explícito
  "Buscar en el mapa" en la UI (política de uso de Nominatim: nada de auto-fire por keystroke).
- Agregar tests en `src/lib/geo.test.ts` (mockeando `fetch` global) para: resultado ok,
  sin resultados, error de red.

### 3. Componente reutilizable `src/components/dueno/BuscadorDireccion.tsx`

Reemplaza los inputs manuales de lat/lng dentro del Campo "Ubicación" de `SeccionNegocio.tsx`.
Props: `calle`, `altura`, `codigoPostal`, `lat`, `lng` (todos `string | number | null` según
corresponda) + `onCambiar(parche: { calle?, altura?, codigoPostal?, lat?, lng? })` — mismo
patrón `onCambiar(parche)` que ya usa `SeccionNegocio`.

- 3 inputs de texto: Calle, Altura, Código postal (opcional, decilo en la etiqueta).
- Botón "Buscar en el mapa" → arma el query `"${calle} ${altura}, Argentina"`, llama a
  `geocodificarDireccion`, y si devuelve resultado hace `onCambiar({ lat, lng })` + muestra
  "✓ Ubicación encontrada" con las coordenadas resueltas en modo solo lectura (ya no se tipean
  lat/lng a mano). Si devuelve `null`, mostrar "No encontramos esa dirección, revisá que esté
  bien escrita" sin romper nada (el dueño puede seguir usando "Usar mi ubicación actual" como
  alternativa, ese botón de geolocalización YA EXISTE en `SeccionNegocio.tsx` — no lo dupliques,
  solo asegurate de que conviva bien con el buscador nuevo dentro del mismo Campo "Ubicación").
- Mientras busca: estado de loading (`Loader2` de lucide-react, ya se usa en el resto del panel).

### 4. `src/lib/panelDueno.ts`

- Agregar `calle: string`, `altura: string`, `codigoPostal: string` a `DatosNegocioForm`
  (strings vacíos por default, no `null`, para que los inputs controlados no se rompan — mismo
  criterio que `nombre`/`categoria` ya en la interfaz).
- Sumarlos a `filaANegocio`, al `select(...)` de `cargarNegocioDelDueno`, y al upsert de
  `guardarNegocioYRecompensas`.
- Nuevas funciones para la tabla `dueno_perfil`:
  - `cargarPerfilDueno(duenoUserId): Promise<ResultadoPanel<{ nombrePersona: string } | null>>`
  - `guardarPerfilDueno(duenoUserId, nombrePersona: string): Promise<ResultadoPanel<void>>`
    (upsert por `dueno_user_id`).

### 5. Bloqueo del nombre — `src/components/dueno/SeccionNegocio.tsx`

El input "Nombre del negocio" pasa a `disabled`/`readOnly` cuando `negocio.id !== null` (ya se
guardó al menos una vez). Mientras esté bloqueado, mostrar debajo un texto chico: "Para cambiar
el nombre de tu negocio, andá a la pestaña Perfil." Mientras `negocio.id === null` (primera vez,
todavía no guardó nada) el campo queda editable como hoy.

### 6. Sección "Perfil" nueva

- `PanelDueno.tsx`: agregar `'perfil'` al union type `Seccion`, un ítem en `SECCIONES` (ícono
  `UserRound` de lucide-react, etiqueta "Perfil"), cargar el perfil en el mismo `useEffect` que
  ya carga el negocio (o uno nuevo análogo, seguí el patrón `activo`/cleanup ya usado ahí), y
  renderizar `<SeccionPerfil>` cuando `seccion === 'perfil'`.
- Nuevo `src/components/dueno/SeccionPerfil.tsx`:
  - Campo "Tu nombre" (`nombrePersona`) con su **propio botón "Guardar perfil"** que llama a
    `guardarPerfilDueno` directo (no participa del botón grande "Guardar mi negocio" de abajo,
    porque es una tabla distinta — seguí el mismo patrón de aviso ok/error que ya usa
    `PanelDueno` con `setAviso`, pasale un callback o replicá el patrón local).
  - Campo "Dirección de tu negocio" con el mismo `<BuscadorDireccion>` del punto 3, atado a
    `negocio.calle/altura/codigoPostal/lat/lng` (mismo dato que "Negocio → Ubicación", no lo
    dupliques) — los cambios acá SÍ pasan por `onCambiar` del padre y se guardan con el botón
    grande "Guardar mi negocio", igual que hoy.
  - Campo "Cambiar el nombre del negocio": input de texto separado, precargado con
    `negocio.nombre`, que llama `onCambiar({ nombre })` — dejá una nota chica: "Este cambio se
    guarda cuando toques 'Guardar mi negocio' más abajo." (reusa el guardado general, no crea
    un tercer botón de guardado).
  - En modo `preview` (sin conexión), igual que el resto del panel: no persiste, solo estado
    local + aviso "vista previa".

## Qué NO hacer en este bloque

- No inventar reverse-geocoding (no completar calle/altura automáticamente desde "Usar mi
  ubicación actual" — ese botón sigue solo poniendo lat/lng, como hoy).
- No tocar packs de precios, VIP, ni la sección Carta — son tareas aparte.
- No agregar dependencias nuevas (nada de librerías de autocompletado de direcciones — `fetch`
  nativo alcanza).
- No mostrar `lat`/`lng` como inputs editables a mano nunca más en `SeccionNegocio` — quedan
  solo de lectura una vez resueltos por el buscador o la geolocalización.
- No pegar la migración SQL en el chat ni aplicarla vos — solo dejar el archivo listo.

## Antes de terminar

Correr `npm run lint`, `npm run build` y `npm run test -- --run` en la raíz del repo. Los tres
tienen que pasar limpio antes de dar por terminado el bloque. Commitear con mensaje:
`feat: perfil del dueno + bloqueo de nombre + direccion real sin API key`.
