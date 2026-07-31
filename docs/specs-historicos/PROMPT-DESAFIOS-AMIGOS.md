# Mini red social: desafíos entre amigos (por negocio)

## Contexto

Primera pieza de una "mini red social" dentro de cada negocio: un cliente reta a otro
(ej. "3 visitas esta semana", "probá el producto nuevo") y AMBOS ganan puntos extra si
se cumple. El objetivo es generar pertenencia a la comunidad del local, no solo puntos.

Leé antes de escribir código: `supabase/migrations/0001_schema.sql` (tabla `desafios`
YA EXISTE: `id, cliente_id, negocio_id, descripcion, meta, progreso, estado, vence_at,
created_at` — pensada para un desafío individual, no entre dos personas; evaluá si
conviene extenderla con una columna de "retado_por"/"cliente_objetivo" o si conviene una
tabla nueva de vínculo, decidí vos con criterio y documentalo), `src/lib/social.ts`,
`src/lib/referidos.ts` (patrón más reciente y más completo a seguir: RPC `SECURITY
DEFINER`, cálculo server-side, nunca confiar en el cliente), `src/components/appcliente/AppCliente.tsx`
y `TabPerfil.tsx` (dónde ya vive `SeccionReferidos.tsx`, para integrar en un lugar
consistente).

## Qué SÍ hacer

### 1. Schema
Nueva migración `supabase/migrations/0009_desafios_amigos.sql`:
- Extendé o creá lo necesario para soportar: un cliente (retador) desafía a OTRO
  cliente puntual (retado) dentro de un negocio puntual, con una meta concreta y
  simple (elegí 2-3 tipos de meta soportados para esta primera versión, ej.
  "N visitas antes de tal fecha" — no soportes metas arbitrarias de texto libre que
  no se puedan verificar server-side, tiene que ser algo que se pueda contar contra
  `visitas` real).
- El premio (puntos extra para AMBOS) se acredita SOLO cuando el retado cumple la
  meta real, verificado server-side contra `visitas` — mismo patrón que
  `revisar_premio_referido` en `0008_referidos.sql` (idempotente, sin doble
  acreditación, sin confiar en el estado de React).
- RLS: cada cliente ve los desafíos donde participa (como retador o como retado).

### 2. Funciones
- RPC `SECURITY DEFINER` para crear el desafío (validando que el retador y el retado
  sean clientes reales vinculados a auth, y que ambos tengan relación con ese negocio
  — no se puede desafiar a alguien que nunca fue a ese local).
- RPC `SECURITY DEFINER` para revisar/premiar el cumplimiento (mismo patrón que
  `revisar_premio_referido`).

### 3. UI
- Dentro de la app del cliente (en el negocio, no a nivel global): sección "Desafiá a
  un amigo" — elegís de tu lista de amigos (ver `src/lib/social.ts` para el concepto
  de `AmigoMock` ya existente, evaluá si conviene una lista real de amigos o alcanza
  con el código de referido/teléfono para esta primera versión — decidí con criterio
  y documentalo) y una meta de las soportadas.
- Vista de "Tus desafíos" con progreso (ej. "2 de 3 visitas") y estado (en curso /
  cumplido / vencido).
- Notificación visual simple cuando ganás un desafío (podés reusar `lanzarConfetti`
  de `src/lib/confetti.ts`).

## Qué NO hacer

- No tocar `referidos.ts`, `SeccionReferidos.tsx`, la carta digital, el mapa, ni el
  panel del dueño.
- No inventar metas no verificables (nada de "sé más simpático" ni texto libre sin
  forma de contarlo contra datos reales).
- No premiar sin verificación server-side real.

## Checklist antes de terminar

- `npm run lint` → 0 errores
- `npm run build` → sin warnings críticos nuevos
- `npm run test` → todos los tests existentes en verde + nuevos para lógica pura
- Migración `0009_desafios_amigos.sql` sin aplicar todavía (se la doy yo al usuario)
- Commit con mensaje claro documentando las decisiones de diseño que tomaste
