# Deploy

Producción: **https://premia-ar.vercel.app** (proyecto Vercel `premia-ar`, cuenta
`esenciezen@gmail.com`).

## El flujo real (dos PCs distintas)

Este proyecto se despliega desde una PC específica, no desde cualquiera:

1. **Cualquier PC de desarrollo** (donde se escribe código): antes de dar un bloque de trabajo
   por cerrado, correr `npm run lint && npm run build && npm run test`, commitear, y
   **pushear a `origin/main`**. El push es un paso obligatorio antes de deployar — sin él, la
   PC que deploya no tiene los cambios nuevos.
2. **PC que deploya**: `git pull` (trae los commits nuevos) → `npx vercel --yes --prod`.

**Nunca usar `git push` como si fuera el deploy** — pushear a GitHub no dispara nada solo;
alguien tiene que correr el `vercel --prod` a mano desde la PC con el token/sesión de Vercel
correcta.

## Variables de entorno en Vercel

Las mismas dos variables de `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
están configuradas directamente en el proyecto de Vercel (Settings → Environment Variables),
no en este repo. Si se rota la clave de Supabase, hay que actualizarla ahí también.

## Antes de cada deploy — checklist

- [ ] `npm run lint` → 0 errores
- [ ] `npm run build` → sin warnings críticos nuevos
- [ ] `npm run test` → todo en verde (si un test falla por timeout una sola vez, reintentarlo
      aislado antes de asumir que es una regresión real)
- [ ] Los cambios se probaron en `http://localhost:3001/?club` simulando el flujo real de un
      cliente (no solo el panel interno de demo)
- [ ] Se hizo `git push origin main` desde la PC de desarrollo

## Base de datos (Supabase)

No hay CLI de Supabase conectado a este repo — los cambios de esquema (nuevas tablas/columnas)
se escriben a mano en el SQL Editor de Supabase, proponiendo el approach primero y nunca
asumiendo que un cambio recién escrito ya se aplicó en producción.
