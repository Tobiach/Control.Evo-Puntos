# PROMPT — Control.Evo Club de Puntos (versión mobile, para Fable 5)

Rol: sos un ingeniero de producto senior construyendo, de punta a punta y de forma autónoma,
una app mobile-first que cumple DOS funciones con el mismo código:

1. **Demo de venta**: un dueño de bar/restaurante o de supermercado la toca en su propio celular
   durante un pitch y entiende el sistema de fidelización de Control.Evo en menos de 2 minutos,
   sin ver ningún panel de administración complejo.
2. **Producto real**: la misma base de código, más adelante, se conecta a datos reales (hoy corre
   100% con datos mock, sin backend) y queda instalable para el cliente final del negocio.

No es un mockup estático ni un video — es una app funcional, interactiva, con estado real en React.

## Contexto de negocio (Control.Evo)

Control.Evo vende sistemas digitales white-label a bares/restaurantes y supermercados en
Argentina. El "Club de Puntos" es el módulo de fidelización: el cliente del local acumula
puntos cuando compra, el dueño ve quién vuelve y quién no, y el mozo/cajero ve en el momento
cuánto le falta al cliente para el próximo premio (gancho de upsell en el cobro). La marca es
"Control.Evo" — no uses ningún otro nombre de marca para el producto.

## Los 2 rubros — arrancan juntos, con selector

Un selector inicial (o `?rubro=gastro` / `?rubro=super` en la URL) cambia tema visual y datos
mock. Usá EXACTAMENTE estas paletas reales (ya en producción en los proyectos de origen — no
inventes otras):

**Gastronomía** (referencia: bar-restaurante-arg / Cielo Rooftop) — tema oscuro:
```
fondo:        #0D0D0D    fondo-medio: #1A1A1A    card: #242424
acento:       #C9973A    acento-claro: #E5B860
texto:        #F5F0E8    texto-muted: #A89880
```

**Supermercado** (referencia: Super Ezefran) — tema claro:
```
fondo:        #F5F6FA    texto-dark: #111827   texto-mid: #4B5563
rojo marca:   #8B0000    rojo-oscuro: #6B0000
dorado:       #C9A84C    dorado-claro: #FFF8DC
borde:        #E5E7EB
```

Ya están cargadas como variables base en `src/index.css` de este repo (paleta gastronomía por
defecto) — extendé el archivo agregando las variables de supermercado y un mecanismo para
alternar el `@theme` activo según el rubro elegido (mismo patrón: variables CSS inyectadas en
runtime, no dos builds separados).

## El flujo — 3 pantallas + cierre, con recorrido guiado

Pantalla 0 — Bienvenida: logo/texto "Control.Evo — Club de Puntos", selector de rubro
(Gastronomía / Supermercado), botón "Ver cómo funciona".

Luego, un recorrido de 3 pasos que el usuario avanza tocando (swipe o botón "Siguiente"), cada
uno con su propia identidad dentro del flujo:

**Paso 1 — "Soy el cliente"**
Simula que sos un cliente del local. Pantalla de login simplificado (solo teléfono, sin
contraseña real — es demo). Al "entrar", mostrar una tarjeta de socio: nombre, nivel
(Nuevo → Frecuente → VIP), puntos acumulados, barra de progreso hacia el próximo nivel, y la
próxima recompensa concreta (ej. "te faltan 80 pts para: Cocktail de bienvenida" en gastronomía,
o "te faltan 120 pts para: 10% de descuento" en supermercado).

**Paso 2 — "Soy quien cobra"**
Simula la pantalla que ve el mozo/cajero al cobrar. Un formulario simple: monto de la compra +
teléfono del cliente (con autocompletado/sugerencia sobre los clientes mock ya cargados). Al
confirmar: animación de "+X puntos" sumando en vivo, y debajo, en el momento, el aviso
"le faltan X puntos para: [recompensa]" — este aviso es el corazón del producto, tiene que
sentirse inmediato y satisfactorio (usar `motion` para la animación).
Fórmula de puntos: 1 punto cada $100 en gastronomía, 1 punto cada Gs. 5.000 en supermercado
(dos monedas reales, no conviertas una a la otra).

**Paso 3 — "Soy el dueño"**
Una sola pantalla resumen (NO un dashboard completo con tabs) con 4 métricas mock claras:
puntos acreditados esta semana, cantidad de clientes que subieron de nivel, cantidad de
clientes marcados como inactivos (con nombres, "hace 25 días que no viene"), y la próxima
recompensa más cercana a canjearse en toda la base de clientes.

**Cierre — Llamado a la acción**
Botón de WhatsApp: "¿Querés esto para tu negocio?" que abre `https://wa.me/` con un mensaje
prearmado (usá un número de placeholder configurable, ej. una constante `WHATSAPP_NUMBER` fácil
de cambiar). El mensaje debe adaptarse al rubro elegido (gastronomía vs supermercado).

## Datos mock necesarios

Creá un archivo de datos separado (`src/data/mockClientes.ts` o similar) con:
- 6-8 clientes ficticios por rubro, con nombre, teléfono (formato argentino/paraguayo
  según corresponda), puntos, nivel, última visita (algunos con fecha reciente, 2-3 marcados
  como inactivos con +20 días)
- 4-5 recompensas por rubro con su umbral de puntos (reusar el estilo de "club.recompensas" de
  Control.Evo: pts + descripción del premio)
- Nombres de negocio de ejemplo por rubro (gastronomía: "Cielo Rooftop"; supermercado: un
  nombre genérico tipo "Almacén Don Beto", no uses "Ezefran" porque ese es un cliente real
  con marca propia, no un ejemplo genérico)

No conectes Supabase, no hagas login real, no persistas nada en localStorage salvo que sea
estrictamente necesario para que la demo no se resetee entre los 3 pasos del mismo recorrido.

## Requisitos técnicos

- El scaffold YA está armado en este repo: Vite + React 19 + TypeScript strict + Tailwind 4
  (`@theme` en `src/index.css`) + `lucide-react` + `motion`. `npm run lint` (tsc --noEmit) da 0
  errores y `npm run build` compila limpio — mantené ambos así en cada paso.
  Corré `npm run lint` y `npm run build` vos mismo antes de darte por terminado.
- TypeScript estricto — sin `any` sin comentario explicando por qué.
- Mobile-first real: diseñar y probar en 375px de ancho, no "responsive" pensado desde desktop.
  El proyecto no tiene servidor de navegador para que vos lo veas — verificá con buen criterio
  de layout (flex/grid, unidades relativas) en vez de asumir que "andará bien".
- Animaciones con `motion` (ya instalado) — transiciones suaves entre los 3 pasos, no cortes
  bruscos.
- Sin dependencias nuevas más allá de las ya instaladas, salvo que sea imprescindible — si
  agregás alguna, dejá comentado por qué.
- Sin comentarios explicando qué hace el código (nombres de variables/funciones claros lo
  hacen innecesario) — comentarios solo donde haya una razón no obvia (ej. por qué una fórmula
  usa ese número).

## Qué NO construir

- Nada de panel admin con login por PIN, tabs múltiples ni las 8 funciones completas del
  sistema real de Control.Evo (Caja completa, Comandas, Galería, Auditoría, IA) — esto es
  una pieza de presentación de UN módulo (el club de puntos), no el producto entero.
- Nada de backend real, Supabase, ni variables de entorno con credenciales.
- Nada de autenticación real (contraseñas, hashing) — es una demo, no hace falta simular
  seguridad real.

## Al terminar

Dejá el repo en estado buildeable (`npm run lint` y `npm run build` sin errores) y hacé un
commit único con mensaje `feat: club de puntos mobile — flujo cliente/cajero/dueño + 2 rubros`.
No hagas push — eso lo reviso yo antes de subirlo a GitHub.
