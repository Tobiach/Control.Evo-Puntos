# Backlog — Upsells futuros (Control.Evo Puntos)

> Ideas confirmadas para más adelante, no para esta ronda de desarrollo. No implementar
> sin que Tobias lo pida explícitamente.

## Multi-PIN por empleado

Hoy el cajero de un negocio comparte 1 solo PIN para todos. Un negocio con varios
empleados/turnos no puede saber quién cobró cada venta. Requeriría: tabla de PINs por
empleado (nombre + PIN) en vez de 1 PIN único en `negocio_pin`, y que `cobrar_con_pin`
registre qué empleado hizo el cobro.

## Exportar clientes a CSV

El dueño puede ver su lista de clientes (mini-CRM) pero no puede sacarla del panel para
uso propio (ej. mandar un WhatsApp masivo, cargarla en otra herramienta). Botón de
exportar a `.csv` desde `SeccionClientes.tsx`, similar al patrón de `backup.ts` en
bar-restaurante-arg.

## Notificación al dueño por inactividad del negocio

Si un negocio lleva X días sin ninguna visita nueva, avisarle al dueño (ej. email o
notificación en el panel) — hoy no hay ninguna señal proactiva de que el club dejó de
usarse. Definir el umbral de días y el canal (¿email? ¿banner en el panel la próxima
vez que entra?) antes de construirlo.
