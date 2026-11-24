# sys_clientes

Sistema de gestión de clientes. **Todo sale de DMC_Core** (SQL Server): no hay datos de ejemplo.

| Ruta | Superficie | Uso |
|------|-----------|-----|
| `/portal` | Portal de clientes | Dashboard, sucursales y visitas (con fotos, videos y firmas) desde las vistas `portal.v_*` |
| `/panel` | Panel interno | Equipo DMC (ADMIN/COORDINADOR). Sus pantallas se retiraron hasta conectarlas a DMC_Core |

Además expone `GET /api/archivo/:tipo/:id` (foto, video o firma de una visita del cliente de la sesión, con `Range`).

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- SQL Server (`mssql`): lectura por vistas `portal.v_*`; escritura solo en `seguridad.*` (login)
- `zod` para validación, `bcryptjs` para claves, `lucide-react` para iconos

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

## Variables de entorno

La lista completa, con un comentario por variable, está en [`.env.example`](.env.example) (único
`.env` versionado). Los `.env.*` locales están en `.gitignore`.

- `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` son obligatorias: sin ellas el arranque falla
  con un mensaje claro. El mapeo de vistas está en `lib/data/portal/mapeo.ts` y lo que falta
  confirmar, en [`docs/DATOS_PENDIENTES.md`](docs/DATOS_PENDIENTES.md).
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
  actions/        Server Actions (login y cambio de clave)
  api/            Rutas API (archivos de visitas, salud)
  login/          Login único (equipo DMC y clientes)
  cambiar-clave/  Cambio de clave obligatorio (debe_cambiar_password)
  panel/          Panel interno (rutas protegidas)
  portal/         Portal de clientes (rutas protegidas)
components/       Componentes de UI (login, portal)
lib/
  data/sql.ts     Consultas SQL (solo lectura, filtradas por cliente)
  data/portal/    Capa de datos del portal: db.ts + mapeo.ts + archivos.ts
  contratos/      Tipos de entrada/salida (DTO) del portal
  db/             Configuración y pool de SQL Server
  env.ts log.ts   Variables de entorno y log JSON
  arranque.ts     Validación al arrancar (la llama instrumentation.ts)
  schemas.ts      Esquemas zod
  server/         Sesión y cuentas de DMC_Core (solo servidor)
proxy.ts          Primera barrera de autenticación para /panel y /portal
```

## Seguridad

- Hay un solo login en `/login`, contra DMC_Core (`lib/server/cuentas.ts`): `seguridad.usuario`
  con rol ADMIN o COORDINADOR entra a `/panel`; `seguridad.usuario_cliente` entra a `/portal`.
  El navegador no elige el tipo de acceso.
- Claves bcrypt. Ante cualquier fallo el mensaje es genérico. Cada intento queda en
  `seguridad.intento_login`; 5 fallos por correo o 20 por IP en 15 minutos bloquean el ingreso.
- La sesión va en una cookie firmada con `SESSION_SECRET` (id de cuenta, `cliente_id` y
  `sesion_version`) y se valida contra la base en cada request.
- El portal fija `sp_set_session_context(cliente_id)` y filtra `WHERE cliente_id = @cliente` en
  cada consulta; el cliente sale solo de la sesión.
- `proxy.ts` bloquea el acceso a `/panel` y `/portal` sin sesión de la superficie correcta
  (redirige a `/login`); cada layout vuelve a verificarla (defensa en capas).
- El código que toca sesión y base de datos usa `server-only`.
