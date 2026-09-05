# Supabase — cómo se administra hoy y cómo pasar a CLI

Este documento existe porque `docs/DEPLOY.md` y `CONTRIBUTING.md` marcan lo mismo hace rato:
**no hay CLI de Supabase conectado a este repo.** Cada migración en `supabase/migrations/` se
escribe acá para que quede historia, pero se aplica a mano, copiando y pegando, en el SQL
Editor del dashboard. Eso ya causó al menos un bug real en producción (`0022_fix_confirmar_canje_pin.sql`
corrigiendo una migración anterior que nunca se había aplicado como se pensaba) y una migración
más (`0023_rate_limiting_rpcs.sql`) marcada como "escrita, no corrida" en `docs/SEGURIDAD.md`.
El riesgo no es hipotético: **el archivo `supabase/migrations/` y el esquema real de
producción pueden estar desincronizados ahora mismo**, y no hay forma de comprobarlo sin CLI.

## Un solo proyecto de Supabase — por diseño, no por descuido

Hoy existe un único proyecto (`ajydiowgrdtivndthidh.supabase.co`) que sirve tanto:

- negocios reales del marketplace (`es_muestra = false`)
- negocios de demo de venta para un prospecto puntual (`es_muestra = true`)

La separación es a nivel de fila (flag `es_muestra`), no de proyecto ni de esquema — y está
bien aplicada donde importa: `src/lib/panelCliente.ts` filtra `es_muestra = false` antes de
mostrarle negocios a un cliente real del marketplace (verificado, ver comentario en el código
junto al `.eq('es_muestra', false)`). Si en algún punto se agrega una consulta nueva que lea la
tabla `negocios` sin ese filtro, un negocio de demo se filtraría al marketplace real — al
agregar cualquier query nueva contra `negocios`, revisar si necesita el mismo filtro.

No hay separación de ambientes (dev/staging/prod): todo el desarrollo local que use
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` reales apunta a producción. Ver
"Qué decidir" más abajo.

## Cómo conectar el CLI (procedimiento manual — requiere login interactivo, no lo puede hacer un agente)

Ya se agregó `supabase/config.toml` con el `project_id`, pero **linkear el proyecto real
requiere tu sesión/token de Supabase** — hacerlo desde la PC que ya tiene acceso al dashboard:

```bash
npx supabase login                                    # login interactivo, una vez
npx supabase link --project-ref ajydiowgrdtivndthidh  # asocia este repo al proyecto real
```

### Paso crítico antes de correr nada más: confirmar que el historial coincide

Los archivos existentes (`0001_schema.sql` ... `0023_rate_limiting_rpcs.sql`) NO siguen el
formato de timestamp que espera el CLI (`YYYYMMDDHHMMSS_nombre.sql`), y nunca se registraron en
la tabla de historial de migraciones de Supabase (porque nunca se aplicaron vía CLI). Si corrés
`supabase db push` sin este paso, el CLI va a intentar re-aplicar migraciones que ya están en
producción a mano y va a fallar o, peor, duplicar objetos.

Orden correcto:

1. `npx supabase db pull` — trae el esquema REAL de producción a un archivo nuevo. Compararlo
   a mano contra lo que hay en `supabase/migrations/` para confirmar qué de los 23 archivos
   realmente se aplicó (incluida la duda concreta de `0023` y `0022`, marcadas como "no
   corridas" en `docs/SEGURIDAD.md` al momento de escribir esto).
2. Recién ahí decidir: renombrar los 23 archivos existentes al formato de timestamp y usar
   `supabase migration repair` para marcarlos como ya aplicados (si todos están realmente en
   producción), o reconciliar las diferencias que aparezcan.
3. De ahí en adelante, migraciones nuevas se crean con `npx supabase migration new <nombre>` y
   se aplican con `npx supabase db push` — nunca más copy-paste a mano en el SQL Editor.

No se hizo este paso en este cambio porque requiere acceso real al proyecto (login) y comparar
contra la base de producción — es una decisión y una acción que le corresponde a quien
administra el proyecto, no algo para automatizar sin supervisión.

## Qué decidir (no técnico, de proyecto)

- **¿Vale la pena un segundo proyecto de Supabase para desarrollo/staging?** Hoy cualquiera que
  configure las env vars reales en su máquina de desarrollo lee y escribe contra producción.
  Un proyecto free de Supabase adicional para dev resolvería esto sin costo.
- **Plan actual (Free/Pro/Team), backups automáticos y quién tiene acceso** — marcado como
  desconocido en `docs/SEGURIDAD.md` §5.2 desde el 9/8. Confirmarlo en el dashboard.
- **Aplicar en producción las dos migraciones pendientes** (`0022`, `0023`) antes de seguir
  agregando funcionalidad nueva sobre RPCs que hoy son vulnerables al rate-limit que se supone
  ya existe.
