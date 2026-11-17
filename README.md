# sys_clientes

Sistema de gestión de clientes con tres superficies:

| Ruta | Superficie | Uso |
|------|-----------|-----|
| `/panel` | Panel interno | Administración: clientes, malls, sucursales, garantías, catálogos, usuarios, auditoría y notificaciones |
| `/portal` | Portal de clientes | Sucursales, tickets, cotizaciones, trabajos, visitas, credenciales y usuarios |
| `/local` | Acceso de local | Vista de entrada para el personal en sitio |

Además expone `GET /api/visita/acta/[folio]`, que genera el acta de visita en PDF.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- SQL Server (`mssql`) — aún no conectado; los datos actuales son estáticos en `lib/data.ts`
- `zod` para validación, `pdf-lib` para PDFs, `qrcode` para códigos QR, `lucide-react` para iconos

> Esta versión de Next.js tiene cambios incompatibles respecto a versiones anteriores.
> Consulta `node_modules/next/dist/docs/` antes de modificar convenciones o estructura.

## Requisitos

- Node.js 20 o superior
- npm

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # en PowerShell: Copy-Item .env.example .env.local
npm run secreto              # genera un valor para SESSION_SECRET
npm run dev
```

Abre <http://localhost:3000>.

## Variables de entorno

Se definen en `.env.local` (ignorado por git). `.env.example` es la plantilla.

| Variable | Descripción |
|----------|-------------|
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión (32+ bytes hex). Obligatorio |
| `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT` | Conexión a SQL Server (aún sin uso) |

**Nunca** subas `.env.local` ni credenciales al repositorio; el `.gitignore` ya los excluye.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generación de tipos de Next + `tsc --noEmit` |
| `npm run secreto` | Genera un secreto aleatorio de 32 bytes en hex |

## Estructura

```
app/
  actions/        Server Actions (auth, local)
  api/            Rutas API (acta de visita en PDF)
  panel/          Panel interno (login + rutas protegidas)
  portal/         Portal de clientes (login + rutas protegidas)
  local/          Acceso de local
components/       Componentes de UI por superficie (panel, portal, local)
lib/
  data.ts         Datos estáticos actuales
  db.ts           Conexión a SQL Server
  schemas.ts      Esquemas zod
  calc.ts         Cálculos de negocio
  format.ts       Utilidades de formato
  server/         Sesión, cuentas y runtime (solo servidor)
proxy.ts          Primera barrera de autenticación para /panel y /portal
```

## Seguridad

- La sesión va en una cookie firmada con `SESSION_SECRET`.
- `proxy.ts` bloquea el acceso a `/panel` y `/portal` sin sesión de la superficie correcta;
  cada layout vuelve a verificarla (defensa en capas).
- El código que toca sesión y base de datos usa `server-only`.
