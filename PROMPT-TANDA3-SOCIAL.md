# PROMPT — Tanda 3: Social, notificaciones y personalización (para Opus 4.8)

## Contexto — leer antes de tocar código

Última tanda de tres. Ya existen: marketplace de negocios ficticios (`src/data/negocios.ts`),
puntos/historial por negocio (`RelacionNegocio`), y rachas/misiones/insignias (`src/lib/misiones.ts`,
`Insignias.tsx`). Todo lo de acá también es **por negocio**, no global. Leé
`src/components/appcliente/TabPerfil.tsx` (ya tiene el toggle de ranking y el bloque de
"Invitá un amigo" con código de referido — no lo dupliques, extendelo), `TabActividad.tsx`,
`TabInicio.tsx` y `src/data/mockClientes.ts` (tipo `Recompensa`, `Cliente`) antes de escribir nada.

## Qué construir

**Social**
1. **Grupos** — el cliente puede armar/ver un grupo mock de 3-4 amigos y ver quién sumó más
   puntos en la semana dentro de ESE negocio (reusá el patrón de ranking que ya existe en
   `TabPerfil.tsx`, pero acotado al grupo en vez de a todos los clientes del negocio).
2. **Desafíos entre amigos** — un desafío mock tipo "Juan te desafió a visitar 3 veces esta
   semana" con progreso (X/3) y estado (en curso/cumplido/fallado).
3. **Compartir logro** — botón para compartir una insignia conseguida (de la Tanda 2) usando
   Web Share API con fallback a copiar al portapapeles (mismo patrón que ya se usó para
   compartir el código de referido en `TabPerfil.tsx` — reusalo, no lo reinventes).
4. **Regalar puntos** — el cliente puede regalar una cantidad de sus puntos a un amigo mock;
   resta puntos reales del cliente activo en memoria y muestra confirmación (reusá
   `src/lib/confetti.ts` de la Tanda 2 para el momento de confirmar el regalo).

**Notificaciones — con permiso REAL del navegador, no simulado en texto**
5. Al entrar por primera vez a la app del cliente, pedí permiso real con la Notification API
   (`Notification.requestPermission()`). Si se concede, las siguientes situaciones deben
   disparar una notificación real del sistema operativo (no un toast dentro de la app):
   - Racha semanal en riesgo (ej. lleva 3 de las 4 visitas necesarias y quedan 2 días)
   - Puntos por vencer en menos de 15 días (esto ya se muestra como aviso visual en Inicio
     desde antes — sumale la notificación real, no dupliques el cálculo)
   - Recompensa nueva disponible (si el cliente llega justo al umbral de una recompensa que
     antes no podía pagar)
   - Cumpleaños del cliente mock (agregá una fecha de nacimiento mock si no existe, y si "hoy"
     coincide en la demo — dejalo fácil de forzar para poder probarlo, ej. un botón de debug
     visible solo en desarrollo que simule "hoy es tu cumpleaños")
   Manejá el caso de permiso denegado o no soportado sin romper nada — la app tiene que seguir
   funcionando igual, solo sin notificaciones nativas.
6. Si se deniega o no hay soporte, las mismas 4 situaciones se muestran igual como avisos
   visuales dentro de la app (no se pierde la función, solo el canal nativo).

**Personalización**
7. **Recompensa sorpresa** — una ruleta o "rasca y gana" visual simple (con `motion`, sin
   dependencias nuevas de canvas/juegos) que el cliente puede tocar una vez que llega a cierto
   umbral de puntos (ej. cada 200 pts acumulados desde la última vez que la usó) — dispara
   confetti al ganar.
8. **Nivel VIP con beneficios no monetarios** — agregá a cada negocio 1-2 beneficios de texto
   para el nivel más alto que NO sean descuento/puntos (ej. "Mesa preferencial sin espera",
   "Acceso a la carta de temporada antes que nadie") y mostralos en el perfil del cliente si
   alcanzó ese nivel.
9. **"Tus favoritos"** — derivá de `historial` (Tanda 2 ya tiene visitas con `monto`/`puntos`,
   sumale una `categoria` o `item` mock si hace falta) cuál es la recompensa/categoría más
   consumida por el cliente en ese negocio, y sugerí la recompensa relacionada más cercana a
   alcanzar.
10. **Combos** — extendé `Recompensa` con un campo opcional `costoDinero` (además de `pts`) para
    2-3 recompensas por negocio que se puedan canjear con "puntos + un poco de plata", y mostralo
    claramente diferenciado de las recompensas 100% por puntos.

**Pulido chico (sumalo de paso):**
- Tema visual que se ajusta levemente según la hora del día (ej. un overlay sutil más oscuro de
  noche) — nada agresivo, un detalle.

## Requisitos técnicos (iguales al resto del repo)

- TypeScript estricto, sin `any` sin comentario.
- Sin dependencias nuevas salvo que sea imprescindible.
- Mobile-first 375px, `motion` para transiciones, estética consistente con lo ya construido.
- Todo funcional de verdad sobre los datos mock — nada de placeholders que no reaccionen a nada.

## Al terminar

Corré `npm run lint` y `npm run build` vos mismo — 0 errores antes de darte por terminado. Un
solo commit con mensaje `feat: social, notificaciones reales y personalización por negocio`.
No hagas push.
