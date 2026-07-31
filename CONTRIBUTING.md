# Cómo se trabaja en este repo

Reglas de trabajo para cualquiera que toque este código — humano o agente de IA.

## Antes de tocar código

1. Leer [README.md](README.md) y [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) si es la
   primera vez en el repo.
2. Leer el archivo completo que vas a modificar antes de editarlo — puede haber cambiado
   recientemente por otro trabajo en paralelo.
3. Si el cambio toca el esquema de Supabase: proponer el approach y esperar OK antes de
   escribir la migración. No hay CLI conectado — se aplica a mano en el SQL Editor. Nunca
   asumir que una migración recién escrita ya corrió en producción.

## Verificación — no negociable

Ningún cambio se considera terminado sin correr, uno mismo, los tres:

```bash
npm run lint    # 0 errores
npm run build   # sin warnings críticos nuevos
npm run test    # todo en verde
```

"Compila" no es lo mismo que "funciona". Si hay una pantalla o flujo que se puede probar en el
navegador (`npm run dev`, `http://localhost:3001/?club`), probarlo como lo probaría un cliente
real antes de dar el cambio por bueno.

## Reglas de contenido — no negociables

- **Cero prueba social falsa**: nunca testimonios, reseñas, estrellas, countdowns ni
  cantidades de usuarios inventadas. Todo badge de actividad sale de un dato real.
- **Nunca inventar precios ni condiciones comerciales** — eso se define fuera del código.
- **Todo dato placeholder se marca como tal**, en el código (comentario explícito) y al
  comunicarlo — nunca se presenta contenido de relleno como si fuera definitivo.
- **Diseño**: no renombrar tokens de color existentes en `src/index.css` (ver
  [docs/DISENO.md](docs/DISENO.md)) — solo cambiar valores. No tocar diseño visual sin que se
  haya pedido explícitamente.

## Convenciones de código

- Reusar componentes/lógica existente antes de crear algo nuevo — revisar `src/lib/` y
  `src/components/` primero.
- Sin abstracciones para casos hipotéticos: resolver el problema de hoy, no el que podría
  existir después.
- Sin comentarios que expliquen QUÉ hace el código (el nombre ya lo dice) — solo el PORQUÉ
  cuando no es obvio (una restricción, un workaround, un caso borde no evidente).
- Tests nuevos para features nuevas, en el mismo patrón que ya existe en el archivo
  `*.test.tsx`/`*.test.ts` vecino.

## Git

- Commits con mensaje claro (prefijo `feat:`/`fix:`/`chore:` + descripción corta en español,
  ver el historial para el estilo exacto).
- Nunca forzar push a `main`.
- El deploy a producción es un paso aparte — ver [docs/DEPLOY.md](docs/DEPLOY.md). Pushear a
  `origin/main` no despliega nada por sí solo.
