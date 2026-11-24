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
- SQL Server (`mssql`) en **solo lectura**, detrás de `DATA_SOURCE=mock|db` (ver abajo)
- `zod` para validación, `pdf-lib` para PDFs, `qrcode` para códigos QR, `lucide-react` para iconos

> Esta versión de Next.js tiene cambios incompatibles respecto a versiones anteriores.
> Consulta `node_modules/next/dist/docs/` antes de modificar convenciones o estructura.

## Requisitos

- Node.js 20 o superior
- npm

## Puesta en marcha

```bash
npm install
cp .env.example .env.development   # en PowerShell: Copy-Item .env.example .env.development
npm run secreto                    # genera SESSION_SECRET (y HEALTHCHECK_TOKEN)
npm run dev
```

Abre <http://localhost:3000>.

## Variables de entorno y fuente de datos

La lista completa, con un comentario por variable, está en [`.env.example`](.env.example) (único
`.env` versionado). Los `.env.*` locales están en `.gitignore`.

- `DATA_SOURCE=mock` (por defecto): datos de ejemplo, no necesita base.
- `DATA_SOURCE=db`: SQL Server **solo lectura**; exige `DB_SERVER`, `DB_NAME`, `DB_USER`,
  `DB_PASSWORD` (el arranque falla con un mensaje claro si falta alguna). El mapeo de tablas está
  en `lib/data/portal/mapeo.ts` y lo que falta confirmar, en [`docs/DATOS_PENDIENTES.md`](docs/DATOS_PENDIENTES.md).
- `GET /api/salud` (con `Authorization: Bearer $HEALTHCHECK_TOKEN`) confirma la conexión.

La arquitectura replica la de sys_tecnicos: ver [`docs/ARQUITECTURA_REFERENCIA.md`](docs/ARQUITECTURA_REFERENCIA.md).

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
  login/          Login único (equipo DMC y clientes)
  panel/          Panel interno (rutas protegidas)
  portal/         Portal de clientes (rutas protegidas)
  local/          Acceso de local
components/       Componentes de UI por superficie (panel, portal, local)
lib/
  data.ts         Datos de ejemplo del panel interno y del acceso de local
  data/sql.ts     Consultas SQL (solo lectura)
  data/portal/    Capa de datos del portal: FuentePortal (mock.ts | db.ts) + mapeo.ts
  contratos/      Tipos de entrada/salida (DTO) del portal
  db/             Configuración y pool de SQL Server
  env.ts log.ts   Variables de entorno y log JSON
  arranque.ts     Validación al arrancar (la llama instrumentation.ts)
  schemas.ts      Esquemas zod
  calc.ts         Cálculos de negocio
  format.ts       Utilidades de formato
  server/         Sesión, cuentas y runtime (solo servidor)
proxy.ts          Primera barrera de autenticación para /panel y /portal
```

## Seguridad

- Hay un solo login en `/login`. El servidor decide por el correo y el directorio de cuentas
  (`lib/server/accounts.ts`) si la cuenta es del equipo DMC (`/panel`) o de un cliente (`/portal`);
  el navegador no elige el tipo de acceso.
- Las contraseñas se guardan solo como hash scrypt con salt por cuenta. Ante cualquier fallo el
  mensaje es genérico, y 5 intentos fallidos por correo bloquean el ingreso 15 minutos.
- La sesión va en una cookie firmada con `SESSION_SECRET`.
- `proxy.ts` bloquea el acceso a `/panel` y `/portal` sin sesión de la superficie correcta
  (redirige a `/login`); cada layout vuelve a verificarla (defensa en capas).
- El código que toca sesión y base de datos usa `server-only`.
