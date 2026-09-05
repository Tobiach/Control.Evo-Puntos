## Qué cambia y por qué

<!-- Descripción corta. Si toca el esquema de Supabase, decir qué migración agrega y si ya se
     aplicó a mano en el SQL Editor de producción (ver docs/SUPABASE.md). -->

## Checklist (ver CONTRIBUTING.md)

- [ ] `npm run lint` — 0 errores
- [ ] `npm run build` — sin warnings críticos nuevos
- [ ] `npm run test` — todo en verde
- [ ] Si hay una pantalla/flujo navegable, se probó en `http://localhost:3001/?club` (no solo el panel de demo)
- [ ] Si toca `supabase/migrations/`, se probó/aplicó contra un proyecto de Supabase real antes de mergear
- [ ] No hay claves ni URLs de Supabase/Vercel hardcodeadas en el diff

## Deploy

Mergear a `main` **no despliega nada solo** — el deploy a producción es un paso manual aparte
(ver [docs/DEPLOY.md](../docs/DEPLOY.md)).
