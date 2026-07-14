# PROMPT — Fase 4: Panel de cajero real con login (para Opus 4.8)

## Contexto — leer antes de tocar código

Hoy el "cobro" solo existe en el modo demo de venta (`src/components/PasoCajero.tsx`), que
recibe `clientes`/`onAcreditar` por props y no tiene login ni persiste nada real — es
intencionalmente una demo. Esta fase construye el **panel de cajero real** que usaría un
empleado del negocio ya dado de alta en la Fase 3 (`PanelDueno.tsx`, `src/lib/panelDueno.ts`),
conectado al schema real (`relaciones_negocio`, `visitas` en `supabase/migrations/0001_schema.sql`).

Leé `src/components/PasoCajero.tsx` (lógica de cálculo de puntos por monto, reusala, no la
reescribas), `src/lib/panelDueno.ts` y `src/lib/auth.ts`/`useSesion.ts` (patrón de sesión ya
establecido en Fases 2-3) antes de escribir nada.

## Qué construir

**Login de cajero** — más simple que el login del dueño: PIN numérico de 4 dígitos por negocio
(reusá el patrón de PIN ya usado en Control.Evo). La tabla `negocios` de la Fase 1 no tiene ese
campo — **no edites `supabase/migrations/0001_schema.sql` que ya "corrió"**, agregá una migración
nueva `supabase/migrations/0002_pin_cajero.sql` con el `ALTER TABLE negocios ADD COLUMN
pin_cajero TEXT` y su policy de RLS correspondiente (el dueño gestiona su propio PIN). No hace
falta cuenta de Supabase Auth separada para el cajero — el PIN alcanza para identificar que
quien cobra tiene autorización de ese negocio puntual.

**Pantalla de cobro** — formulario: teléfono del cliente + monto de la compra. Al confirmar:
1. Busca si existe `relaciones_negocio` para ese teléfono+negocio — si no existe, la crea
   (alta automática del cliente en ese negocio, primera visita).
2. Calcula puntos según `monto_por_punto` del negocio (misma fórmula que ya existe en
   `PasoCajero.tsx`, no la reinventes).
3. Inserta una fila en `visitas` y actualiza `puntos` y `ultima_visita_at` en
   `relaciones_negocio`.
4. Muestra el mismo tipo de feedback en vivo que ya existe en el modo demo (animación de puntos
   sumando + aviso de próxima recompensa) — reusá esos componentes/patrones visuales, no los
   dupliques.

**Modo sin Supabase conectado (`supabaseEnabled === false`, el caso de hoy):** el panel de
cajero funciona iguaI que el `PasoCajero.tsx` actual — cambios solo en memoria de React, con
un aviso breve de que está en modo demo. No bloquees esta pantalla solo porque no hay backend.

## Requisitos técnicos (iguales al resto del repo)

- TypeScript estricto, sin `any` sin comentario.
- Mobile-first 375px, estética consistente.
- No dupliques la fórmula de cálculo de puntos ni los componentes de animación/aviso de
  recompensa ya existentes — reusalos.

## Al terminar

Corré `npm run lint` y `npm run build` vos mismo — 0 errores antes de darte por terminado. Un
solo commit con mensaje `feat: panel de cajero real con login por PIN`. No hagas push.
