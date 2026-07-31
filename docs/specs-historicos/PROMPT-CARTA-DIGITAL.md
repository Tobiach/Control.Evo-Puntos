# Carta digital pública (por negocio)

## Contexto

Inspirado en lacartaa.com (menú QR): cada negocio necesita una carta digital propia con
fotos, precios y descripción de lo que vende — **distinta de las recompensas** (las
recompensas son "lo que se canjea con puntos"; la carta es "lo que se vende normalmente,
en pesos"). Confirmado con el usuario: es una sección nueva dentro de cada negocio, y
**la ve cualquiera sin login, tipo QR público** (como un menú de restaurante escaneado
en la mesa) — no requiere ser cliente registrado ni logueado.

Leé antes de escribir código: `supabase/migrations/0001_schema.sql` completo (schema y
políticas RLS existentes), `src/lib/panelDueno.ts`, `src/components/dueno/SeccionNegocio.tsx`
y `SeccionRecompensas.tsx` (mismo estilo de código/UI a seguir), `src/App.tsx` (cómo se
maneja la navegación — NO hay React Router, es manejo manual de estado + query params
como `?rubro=`).

## Qué SÍ hacer

### 1. Schema
Nueva migración `supabase/migrations/0007_carta_digital.sql`:
- Tabla `carta_items` (id BIGSERIAL, negocio_id TEXT FK a `negocios`, nombre TEXT,
  descripcion TEXT, precio DECIMAL, categoria TEXT, foto_url TEXT NULL, disponible
  BOOLEAN DEFAULT true, orden INT DEFAULT 0, created_at).
- RLS: lectura pública SIN restricción de autenticación para items de negocios
  `activo = true` (igual de pública que la lectura de `negocios`/`recompensas` — de
  hecho más pública todavía, porque ni siquiera debe requerir que sea un negocio
  "afiliado al marketplace", cualquiera con el link debe poder verla). Escritura solo
  por el dueño (`auth.uid() = dueno_user_id` del negocio, mismo patrón que
  `recompensas`).
- Fotos: por ahora solo `foto_url` como TEXT (el dueño pega una URL de imagen ya
  subida a algún lado — no implementar upload de archivos en esta tanda, es una fase
  aparte si hace falta).

### 2. Panel del dueño
- Nueva sección `SeccionCarta.tsx` (mismo patrón que `SeccionRecompensas.tsx`): alta,
  edición y borrado de items de carta (nombre, descripción, precio, categoría, URL de
  foto, disponible sí/no). A diferencia de recompensas (que se reemplazan enteras en
  cada guardado), acá cada item debe poder editarse/borrarse individualmente porque
  una carta puede tener muchos items y reemplazar todo en cada guardado sería
  incómodo — usá updates/inserts/deletes puntuales, no un reemplazo completo.
- Mostrar en el panel el link público de la carta (`/?carta=<negocioId>`, ver punto 3)
  con botón de copiar — mismo componente visual que ya existe para el código del
  negocio en `SeccionNegocio.tsx`.
- Funciones nuevas en `panelDueno.ts`: `cargarCartaDelNegocio`, `guardarItemCarta`,
  `borrarItemCarta` (o los nombres que tengan más sentido, seguí el patrón
  `ResultadoPanel<T>` ya usado en todo el archivo).

### 3. Vista pública (sin login)
- Nuevo componente `src/components/carta/CartaPublica.tsx`: trae los items del
  negocio (agrupados por categoría) + datos básicos del negocio (nombre, emoji,
  categoría) usando el cliente Supabase directo (sin auth, la policy ya lo permite).
  Diseño profesional: fotos, precio destacado, descripción, agrupado por categoría,
  usando la paleta del rubro del negocio (mismo patrón `data-rubro` + CSS vars ya
  usado en toda la app).
- Ruta: usar **query param**, no path segment (`/?carta=cafe-nardo`), porque el
  proyecto no tiene ningún rewrite de Vercel para SPA routing (`vercel.json` no
  existe) — un path tipo `/carta/cafe-nardo` daría 404 al refrescar o compartir
  directo. Detectar `?carta=` en `main.tsx` o al inicio de `App.tsx` (mirá cómo ya se
  lee `?rubro=` en `App.tsx` para seguir el mismo patrón) y renderizar
  `CartaPublica` ANTES de cualquier chequeo de auth/rubro — debe funcionar sin
  sesión, sin elegir rubro, sin nada previo.
- Si el negocio no existe o está `activo = false`: mensaje honesto ("Esta carta ya no
  está disponible"), no un error crudo.

## Qué NO hacer

- No mezclar la carta con las recompensas — son conceptos distintos, no reuses la
  tabla `recompensas` para esto.
- No requerir login para ver la carta — es pública por diseño explícito del usuario.
- No implementar upload de imágenes (solo URL por ahora).
- No tocar el marketplace del cliente, el mapa, ni las mecánicas de puntos/ruleta —
  esta tarea es independiente de eso.
- No generar el QR imprimible en esta tanda (mostrar el link para copiar alcanza por
  ahora; generar una imagen de QR es una mejora simple para después, no bloqueante).

## Checklist antes de terminar

- `npm run lint` → 0 errores
- `npm run build` → sin warnings críticos nuevos
- `npm run test` → todos los tests existentes en verde + nuevos para lógica pura
- Migración `0007_carta_digital.sql` sin aplicar todavía (se la doy yo al usuario)
- Commit con mensaje claro
