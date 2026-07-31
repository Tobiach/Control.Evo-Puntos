# Premia.ar

Club de fidelización real para negocios de barrio (Argentina). Un cliente final suma puntos
reales en cada negocio afiliado —cada uno con su propio saldo— y los descubre/canjea desde un
único marketplace. Los dueños de negocio gestionan su local desde un panel propio.

- **Producción:** https://premia-ar.vercel.app
- **Stack:** React 19 + Vite 6 + TypeScript + Tailwind CSS v4 + Supabase
- **Estado:** en producción, evolucionando de forma incremental (ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md))

## Empezar a trabajar (cualquier PC)

```bash
npm install
npm run dev        # http://localhost:3001
```

La app corre sin backend por defecto: sin variables de Supabase configuradas, todo funciona
con datos mock (`src/data/`) — ideal para desarrollar sin tocar la base real. Ver
[.env.example](.env.example) para las dos variables de Supabase; las claves reales NO están en
este repo (correctamente gitignoreadas). Pedíselas a quien administre el proyecto o buscalas en
el gestor de contraseñas del equipo — nunca las pegues en un commit ni en un doc.

### Antes de dar cualquier cambio por terminado

```bash
npm run lint    # tsc --noEmit — 0 errores
npm run build   # vite build — sin warnings críticos nuevos
npm run test    # vitest run — todos los tests en verde
```

No alcanza con que "compile" — correr los tres siempre antes de mergear.

## Estructura del repo

```
src/
├── components/
│   ├── entrada/       # Onboarding + portada de marca (primer contacto, antes de loguearse)
│   ├── auth/          # Login/registro de cliente, dueño, cajero
│   ├── appcliente/     # Marketplace + experiencia del cliente final (Home, Mapa, Perfil, etc.)
│   ├── dueno/         # Panel del dueño de negocio (CRM, promos, ranking, config)
│   ├── cajero/        # Panel de cajero (acreditar puntos)
│   ├── carta/         # Carta digital del negocio
│   └── cobro/         # Flujo de cobro/canje en el local
├── data/              # Datos mock (negocios, clientes) — fuente de verdad cuando no hay Supabase
├── lib/               # Lógica de negocio pura (puntos, niveles, rachas, promos, geo, etc.)
├── hooks/             # Hooks de React reutilizables
└── test/              # Setup de Vitest

docs/                  # Documentación de arquitectura, deploy y diseño (ver abajo)
docs/specs-historicos/ # Specs originales con las que se construyó cada feature (contexto, no how-to)
scripts/               # Scripts de siembra de datos reales en Supabase (uno por negocio demo)
```

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — cómo está armada la app: modos, pantallas, mock vs Supabase, marketplace vs negocio único.
- [docs/DISENO.md](docs/DISENO.md) — sistema de diseño: paleta, tipografía, convenciones de componentes.
- [docs/DEPLOY.md](docs/DEPLOY.md) — cómo se despliega a producción (Vercel) y desde qué PC.
- [CONTRIBUTING.md](CONTRIBUTING.md) — reglas de trabajo en este repo.

## Modelo de negocio (contexto para decisiones de producto)

Setup + mensual por negocio afiliado (precios fuera de este repo, se definen comercialmente).
Cada negocio es independiente entre sí; lo compartido entre todos es la "Red Premia" — el
marketplace y el login único del cliente. La plataforma sigue evolucionando: ninguna pantalla
se considera definitiva, los cambios de diseño/UX se hacen de forma incremental y reversible.
