# Recuperar contraseña (dueño y cliente)

## Contexto

Ni `LoginDueno.tsx` ni `LoginCliente.tsx` tienen un flujo de "olvidé mi contraseña".
Es un gap real: cualquier usuario que olvide su contraseña queda bloqueado sin forma
de recuperarla desde la app.

Leé primero `src/lib/auth.ts` completo (los patrones `ResultadoAuth`, `traducirError`,
`validarEmail`, cómo `registrarDueno`/`ingresarDueno`/`registrarCliente`/`ingresarCliente`
ya están armados) y `src/components/auth/LoginDueno.tsx` + `LoginCliente.tsx` (para
mantener el mismo estilo visual y de copy — español rioplatense, directo).

## Qué SÍ hacer

1. En `src/lib/auth.ts`, agregar:
   - `solicitarRecuperacion(email: string): Promise<ResultadoAuth>` — llama a
     `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })`. El
     `redirectTo` debe apuntar a una ruta nueva de la app donde el usuario cargue
     su nueva contraseña (ver punto 3) — usar `window.location.origin` +
     `/restablecer-password` (o el nombre de ruta que definas, documentalo).
   - `actualizarPassword(nuevaPassword: string): Promise<ResultadoAuth>` — llama a
     `supabase.auth.updateUser({ password: nuevaPassword })`, se usa en la pantalla
     de restablecimiento (el usuario ya llega con una sesión de recuperación activa
     por el link del mail, no hace falta pedirle el email de nuevo ahí).
2. En `LoginDueno.tsx` y `LoginCliente.tsx`: agregar un link/botón "¿Olvidaste tu
   contraseña?" visible solo en el modo "ingresar" (no en "registro"). Al tocarlo,
   mostrar un mini-formulario (puede ser el mismo formulario con el campo de
   contraseña oculto y un botón "Enviar link de recuperación") que llama a
   `solicitarRecuperacion` y muestra un mensaje de confirmación ("Te enviamos un
   link a tu email — revisá tu bandeja y spam").
3. Nueva pantalla/ruta para restablecer la contraseña después de tocar el link del
   mail: un componente nuevo `src/components/auth/RestablecerPassword.tsx` con un
   solo campo (nueva contraseña, con `validarPassword` ya existente) + botón
   "Guardar nueva contraseña", que llama a `actualizarPassword`. Esta pantalla debe
   detectarse por la URL (Supabase agrega un hash/query con el token de
   recuperación al redirigir) — revisá cómo `useSesion.ts` maneja el estado de
   sesión actual y aprovechalo o extendelo, sin romper el flujo de sesión normal
   de dueño/cliente. Documentá en el commit qué ruta exacta eligieron para esto y
   por qué (ej. query param `?modo=restablecer` en la raíz, o una ruta separada).
4. Mensajes de error/éxito con el mismo tono que ya existe en `traducirError`
   (agregar los casos nuevos que haga falta ahí, no crear un sistema de traducción
   de errores paralelo).

## Qué NO hacer

- No tocar `registrarDueno`, `ingresarDueno`, `registrarCliente`, `ingresarCliente`,
  `vincularCliente` — ya funcionan, no son parte de esta tarea.
- No tocar nada de `src/components/dueno/`, `src/components/cajero/`, ni el
  marketplace/appcliente — son de otra tanda en paralelo, no te cruces.
- No inventar un backend propio de recuperación — todo pasa por
  `supabase.auth.resetPasswordForEmail`/`updateUser`, el estándar del SDK.

## Checklist antes de terminar

- `npm run lint` → 0 errores
- `npm run build` → sin warnings críticos nuevos
- `npm run test` → todos los tests existentes en verde
- Commit con mensaje claro, incluyendo qué ruta/mecanismo eligieron para detectar
  la sesión de recuperación
