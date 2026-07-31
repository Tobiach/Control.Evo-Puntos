# PROMPT — Tanda 2: Logros, misiones y rachas (para Opus 4.8)

## Contexto — leer antes de tocar código

Este repo ya tiene: modo demo de venta (intacto, no tocar), modo "App del cliente" con
Inicio/Recompensas/Actividad/Perfil (`src/components/appcliente/`), y desde la Tanda 1 un
**marketplace de negocios ficticios** (`src/data/negocios.ts`) donde cada negocio tiene su propia
relación de puntos con el cliente vía `RelacionNegocio` (`historial: Visita[]`, cada `Visita`
con `diasAtras`, `monto`, `puntos` — ver `src/data/mockClientes.ts` para el tipo `Visita`).

**Todo lo de esta tanda es POR NEGOCIO, no global** — una racha, una misión o una insignia
pertenecen a la relación del cliente con UN negocio del marketplace, igual que sus puntos. Leé
`src/data/negocios.ts`, `src/components/appcliente/MarketplaceApp.tsx` y
`src/components/appcliente/TabInicio.tsx` / `TabActividad.tsx` antes de escribir nada, para
enganchar esto sobre lo que ya existe sin duplicar lógica.

## Qué construir (alcance exacto — nada de marketplace nuevo, ranking social, notificaciones
## push ni personalización, eso ya está hecho o es tanda 3)

**1. Racha semanal** — 4+ visitas en los últimos 7 días a ESE negocio = una recompensa especial
   desbloqueada (además de las recompensas normales del catálogo). Calculalo a partir de
   `historial` filtrando por `diasAtras <= 7`.

**2. Racha larga** — al menos 1 visita en cada una de 7 semanas consecutivas = medalla especial.
   Vas a necesitar extender `Visita` o `RelacionNegocio` con lo mínimo necesario para poder
   calcular esto de forma real (no lo hardcodees por cliente) — si te falta un campo, agregalo,
   no dupliques el tipo existente.

**3. Misión por evento** — agregá a `Negocio` un array opcional de misiones con fecha (`eventos:
   {nombre, fechaInicio, fechaFin, recompensaExtra}[]`, mock, ej. "Fin de semana de la cerveza")
   — si el cliente tiene una visita dentro de ese rango de fechas, desbloquea la recompensa
   especial del evento. Los eventos son configuración del negocio (simulá que el dueño los
   cargó), no algo que el cliente vea como "trampa" — se presentan como promoción especial.

**4. Misión "probá algo nuevo"** — si hace falta, agregá un campo simple a `Visita` (ej. `nuevo:
   boolean`, marcá 2-3 visitas del historial mock como `true`) y si el cliente tiene al menos
   una visita marcada como "probó algo nuevo", desbloqueá una insignia/puntos extra.

**5. Puntos x2 en horario valle** — agregá a `Negocio` un campo opcional de franja horaria floja
   (ej. `horarioValle: {desde: string, hasta: string, dias: number[]}`) y mostralo como un aviso
   informativo ("Puntos x2 martes de 18 a 20hs acá") en la vista del negocio — no hace falta que
   el cajero del modo demo lo aplique automático en esta tanda, alcanza con que se vea reflejado
   como beneficio informado al cliente en su vista.

**6. Insignias/medallas coleccionables** — una sección nueva (dentro de Perfil o Actividad, elegí
   el lugar que tenga más sentido con lo que ya existe) mostrando todas las insignias posibles
   de ESE negocio (racha semanal, racha larga, probó algo nuevo, evento especial) con estado
   "conseguida" o "bloqueada" — tarjetas visuales simples, no hace falta ilustración custom,
   un ícono de `lucide-react` + color de fondo alcanza por insignia.

**7. Temporada mensual** — barra de progreso del mes (cuántas de las misiones de arriba
   completó el cliente este mes sobre el total posible en ese negocio) con una recompensa
   grande si completa todas — mostrala en Inicio del negocio, no como pantalla nueva.

**Pulido visual (chico, sumalo de paso, no es una misión aparte):**
- Confetti (`canvas-confetti` — sí podés agregar esta dependencia puntual, es liviana y ya se
  usa en otros proyectos de Control.Evo) al desbloquear una insignia o completar la temporada.
- El contador de puntos en Inicio debe animar "subiendo" en vivo al entrar a la pantalla, no
  aparecer con el valor final de una.

## Requisitos técnicos (iguales al resto del repo)

- TypeScript estricto, sin `any` sin comentario.
- Mobile-first 375px, `motion` para transiciones, coherente con el estilo ya establecido
  (tarjetas redondeadas, tipografía 'Fredoka' en títulos/números grandes).
- No dupliques tipos ni lógica de negocio/marketplace ya existente — extendé lo que haga falta.

## Al terminar

Corré `npm run lint` y `npm run build` vos mismo — 0 errores antes de darte por terminado. Un
solo commit con mensaje `feat: rachas, misiones e insignias por negocio`. No hagas push.
