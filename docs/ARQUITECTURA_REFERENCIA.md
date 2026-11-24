# Arquitectura de referencia: sys_tecnicos → sys_clientes

Análisis de `C:\Proyectos\DMC\New\sys_tecnicos` (paquete `sys_contigencia` v3.2.1), hecho **solo
leyendo**. De sus archivos `.env*` se tomaron únicamente los **nombres** de las variables; ningún
valor.

---

## 1. Stack y versiones

| Pieza | sys_tecnicos | sys_clientes (antes de este cambio) |
| --- | --- | --- |
| Framework | Next.js `^16.4.6` (App Router, Server Actions, `proxy.ts`) | Next.js `16.4.3` |
| UI | React 19.2.8 + Tailwind CSS 4 | igual (+ CSS propio del portal en `app/portal/portal.css`) |
| Lenguaje | TypeScript 5 (strict, `allowJs`) | igual; el portal tiene componentes `.jsx` |
| Validación | Zod 4 | Zod 4 |
| Acceso a datos | `mssql` 12 (driver tedious), SQL escrito a mano | `mssql` instalado, sin uso |
| Contraseñas | `bcryptjs` | `scrypt` de `node:crypto` |
| PDF | `pdf-lib` + `@pdf-lib/fontkit` | igual |
| Otros | `web-push`, `fflate`, `gsap`, `@vercel/analytics`, `@vercel/speed-insights` | `qrcode`, `lucide-react` |
| Gestor de paquetes | npm (`package-lock.json`), `overrides` de `@azure/msal-node` | igual |
| Build | `next build` (Turbopack); `distDir` configurable con `NEXT_DIST_DIR` | `next build` |
| Despliegue | Vercel (serverless) | Vercel (hay `.vercel` en `.gitignore`) |

No hay ORM ni migraciones automáticas: el esquema vive en `sql/` como scripts T-SQL numerados.

## 2. Estructura de carpetas y capas

No usa controller/service/repository de backend clásico: es un monolito Next.js con estas capas.

```
app/
  actions/      Server Actions: el «controller». Autoriza (sesión + permiso), valida con Zod
                y llama a lib/data. Toda escritura pasa por aquí; no hay API REST para el CRUD.
  api/          Rutas HTTP: binarios (PDF, fotos, video), /api/salud, cron, notificaciones.
  admin/ tecnico/ login/   Páginas (Server Components) que leen de lib/data y pasan props.
components/     admin/ (escritorio), mobile/ (técnico en terreno), ui/ (compartidos).
lib/
  contratos/    Tipos de entrada/salida de las acciones (DTO).
  data/         Acceso a datos («repository»): una función por consulta, SQL parametrizado.
                sql.ts: helpers (consulta, consultaCon, ejecutar, enTransaccion, F_FECHA…).
  db/           config.ts (entorno → config del driver) y pool.ts (pool perezoso).
  validacion/   Esquemas Zod de cada acción (comun.ts: `validar()` y primitivas).
  ui/           Utilidades puras de cliente (formato, fechas, estados).
  auth.ts session.ts permisos.ts roles.ts env.ts log.ts csp.ts types.ts
proxy.ts        Primer filtro de acceso (firma del token) + CSP con nonce.
sql/            Esquema base + migraciones numeradas + semillas ficticias.
tests/          Vitest (unidad, acciones, componentes, bd) y Playwright (e2e).
```

Criterio de capas (de `lib/data/sql.ts`): las acciones autorizan y validan; `lib/data` solo
persiste. `lib/types.ts` es la «entity» del dominio.

## 3. Configuración

- No hay perfiles propios: se usan los de Next.js (`NODE_ENV`) y su carga de `.env*`
  (`.env.development`, `.env.production`, `.env.local`). En producción, panel de Vercel.
- `lib/env.ts`: `env()`, `envObligatoria()`, `envBooleana()`, `envNumero()`, `hayConexionSql()`,
  `exigirConexionSql()`. Todo `server-only`; ninguna variable `NEXT_PUBLIC_`.
- `.env.example` es el único `.env` versionado y documenta cada variable.
- Variables (solo nombres): `SESSION_SECRET`, `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`,
  `DB_PASSWORD`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERT`, `DB_POOL_MAX`, `DB_CONNECT_TIMEOUT_MS`,
  `DB_REQUEST_TIMEOUT_MS`, `HEALTHCHECK_TOKEN`, `RESERVA_PLAZO_SEG`, `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RESEND_API_KEY`, `CORREO_REMITENTE`, `CORREO_DOMINIOS`,
  `AVISOS_CORREO_ACTIVO`, `CORREO_AVISOS_REMITENTE`, `APP_URL`, `CRON_SECRET`; en tests
  `TEST_DB_SERVER`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`. Leídas en código además:
  `DB_POOL_IDLE_MS`, `DB_TRUSTED_CONNECTION` (rechazada), `NEXT_DIST_DIR`.

## 4. Conexión a la base de datos

- **Motor**: SQL Server, esquema `dmc`.
- **Pool** (`lib/db/pool.ts`): perezoso, una promesa por instancia, se descarta si falla o si el
  pool emite `error`. `max` = `DB_POOL_MAX` (4), `min` 0, `idleTimeoutMillis` 30 s; timeouts de
  conexión y de consulta de 15 s. Pensado para serverless (pool chico).
- **TLS**: `DB_ENCRYPT` por defecto true y obligatorio en producción; `DB_TRUST_SERVER_CERT=true`
  en producción solo avisa.
- **Acceso**: SQL a mano con `request.input()` (parametrizado), sin stored procedures. Fechas
  convertidas en SQL (`CONVERT(varchar(10), col, 23)`), `bigint` → `num()`. Listas de ids por
  `OPENJSON`.
- **Transacciones**: `enTransaccion(fn)` con un `Ejecutor` que sirve suelto o dentro de una
  transacción; `UPDLOCK` donde la regla puede cambiar entre la validación y la escritura.
- **Versión del esquema**: `dmc.schema_version` comparada con `VERSION_ESQUEMA` y reportada en
  `/api/salud`.

## 5. Autenticación, autorización, sesión y CORS

- Login con correo y clave contra `dmc.usuario` (bcrypt). Tiempo constante ante correo
  inexistente, intentos limitados por correo e IP (`dmc.intento_login`).
- Sesión: cookie `dmc_session` httpOnly con token propio `{uid, exp, sv, modo}` firmado con
  HMAC-SHA256 (Web Crypto, también en Edge). **No es JWT.** Vence a los 45 min de inactividad y
  `proxy.ts` la renueva. `sv` (versión de sesión) invalida tokens al cambiar clave o roles.
- `getSesion()` (con `cache` de React) vuelve a leer usuario, roles y permisos en cada petición.
- Roles en `dmc.usuario_rol` (ADMIN, COORDINADOR, TECNICO) y «modos» (panel/técnico). Permisos
  `<módulo>.<acción>` (`lib/permisos.ts`) por rol en `dmc.rol_permiso`; `sesionCon(permiso)` es la
  puerta de cada acción.
- **CORS: no hay.** Todo es del mismo origen (páginas + Server Actions).
- Cabeceras de seguridad en `next.config.ts`; CSP con nonce desde `proxy.ts`.

## 6. Convenciones

- Español en dominio, archivos y comentarios; comentarios largos que explican el porqué.
- **Errores**: las acciones devuelven `{ ok: boolean; error?: string; … }` con mensajes para
  la persona; el detalle va a `log.error`. Errores de dominio como clases (`RutRepetido`).
- **Validación**: `validar(esquema, valor, contexto)` → `{ok, datos} | {ok:false, error}`;
  se hace después del control de permisos. Largos máximos alineados con las columnas.
- **Logging**: `lib/log.ts`, una línea JSON (`ts`, `nivel`, `contexto`, `usuarioId`, `error`),
  sin datos personales. Auditoría en tabla aparte.
- **Paginación**: no hay en general; listas completas con filtros en cliente y `TOP` puntual.
- **API**: no es una API REST de dominio. Las rutas `/api` devuelven binarios o JSON simple
  (`{ ok, … }`); 401/404 sin cuerpo.
- Código puro fuera de las consultas para poder probarlo sin base.

## 7. Frontend

- App Router: `/login`, `/admin/*` (escritorio, sidebar + header), `/tecnico/*` (móvil), con
  `layout.tsx`, `loading.tsx` y `error.tsx` por sección.
- Los Server Components leen de `lib/data` y pasan props; los componentes de cliente llaman a
  Server Actions. No hay fetch a una API propia ni librería de estado: estado local + providers
  de contexto (`ReferenciasProvider`, `UsuarioLocalProvider`).
- Tailwind 4 con variables CSS (`--color-bg`, …); componentes `components/ui/*`.

## 8. Testing, scripts, CI

- Vitest con proyectos `unidad`, `acciones`, `componentes` (jsdom) y `bd` (base desechable),
  stub de `server-only`, guarda que impide conectar a SQL en tests sin base. Playwright e2e
  contra build en `.next-e2e`.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test*`, `hash-password`, `secreto`.
- CI (GitHub Actions): `npm ci`, typecheck, lint, tests, `npm audit --omit=dev`, build con
  variables de relleno. Sin Docker.

## 9. Ambigüedades y posibles errores de la referencia (no copiados)

| # | Observación | Qué se hizo |
| --- | --- | --- |
| 1 | `DATA_SOURCE` aparece en sus `.env.development` y `.env.production`, pero **ningún archivo de código la lee** (el README dice que no hay modo demo). | En el portal sí se usa, con significado propio (`mock`/`db`). **Pregunta:** ¿era un resto, o se planea usar igual en técnicos? |
| 2 | Comentario de `lib/db/config.ts` habla de «mssql@11», pero el paquete es mssql 12. | Comentario corregido en la copia. |
| 3 | `lib/session.ts` dice que lo usa `middleware.ts`; en Next 16 es `proxy.ts`. | Solo documental. |
| 4 | `VERSION_ESQUEMA = 44` con migraciones hasta la 045 (explicado en el código). | No aplica al portal. |
| 5 | La CSP se publica como `Report-Only` (no bloquea). | El portal mantiene su CSP que sí se aplica (con `unsafe-inline`). Unificar es otra tarea. |
| 6 | `DB_TRUST_SERVER_CERT=true` en producción solo avisa. | Copiado igual (decisión explícita de la referencia). |
| 7 | `.gitignore` repite `.env*` y `.vercel` al final. | Inofensivo; no se copia. |
| 8 | La referencia limita el login por correo **e IP** (x-forwarded-for confiable en Vercel); el portal decidió no usar la IP. | Se mantiene la decisión del portal. **Pregunta:** ¿el portal se despliega en Vercel? Si es así, se puede igualar. |
| 9 | Next `^16.4.6` en técnicos vs `16.4.3` aquí; el propio `next` avisa de una vulnerabilidad conocida en 16.4.3. | No se actualizó (fuera de alcance). Recomendado. |

## 10. Lo que se replica tal cual / lo que se adapta

| Pieza | Se replica tal cual | Se adapta al portal cliente |
| --- | --- | --- |
| `lib/env.ts` | helpers `env*`, `hayConexionSql`, `exigirConexionSql` | + `fuenteDeDatos()` (`DATA_SOURCE=mock\|db`) y aviso si quedó `DB_DATABASE` |
| `lib/log.ts` | completo | `usuarioId` admite el correo (la sesión del portal se identifica por correo) |
| `lib/db/config.ts` | variables, TLS, timeouts, pool, error de `DB_TRUSTED_CONNECTION` | `readOnlyIntent: true`, `appName`; `DB_DATABASE` → `DB_NAME` |
| `lib/db/pool.ts` | completo | — |
| `lib/data/sql.ts` | `consulta`, `consultaCon`, `num`, `F_FECHA`, `agrupar` | **sin** `ejecutar`/`enTransaccion`; filtro `asegurarSoloLectura`; `ident()` y formatos DD-MM-YYYY |
| `lib/contratos/` | concepto (DTO de entrada/salida) | `portal.ts` con el contrato que ya consume la UI |
| `lib/data/<dominio>` | concepto (una capa de datos por dominio) | `lib/data/portal/`: interfaz `FuentePortal` + `mock.ts` + `db.ts` + `mapeo.ts` parametrizado |
| `app/api/salud` | token Bearer, 404 sin token, 503 con mensaje | informa fuente, si la cuenta puede escribir y secciones sin mapeo (no hay catálogos de visitas) |
| Validación al arrancar | — (la referencia valida en la primera consulta) | `instrumentation.ts` + `lib/arranque.ts` |
| CORS | — (no tiene) | `lib/cors.ts`, cerrado por defecto (`CORS_ORIGENES`) |
| `.env.example` / `.env.development` | formato y comentarios | variables del portal |
| `next.config.ts` | `distDir` con `NEXT_DIST_DIR`, `serverExternalPackages` | se mantienen las cabeceras y CSP propias |
| CI | pasos (typecheck, lint, audit, build con valores de relleno) | sin paso de tests (el portal aún no tiene Vitest) |
| Sesión y login | — | **No se migró**: sigue el directorio de cuentas de `lib/server/accounts.ts`. Requiere la tabla de usuarios del portal (ver DATOS_PENDIENTES) |
| Server Actions de escritura | — | No aplica: la base es de solo lectura por ahora; las ediciones del portal siguen en memoria |
| Tests (Vitest/Playwright) | — | Pendiente: agregar dependencias y proyectos como en la referencia |
| Panel interno `/panel` y `/local` | — | Fuera de alcance: siguen con `lib/data.ts` (datos de ejemplo) |
