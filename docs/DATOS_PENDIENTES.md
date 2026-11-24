# Datos pendientes de confirmar

> **Actualización:** la base es `DMC_Core`. El portal lee solo vistas `portal.v_*` (copia 1:1 de `dmc`
> en el esquema `tecnico`). La especificación vigente de cada vista está en
> [`portal-vistas.md`](portal-vistas.md); las secciones 0 a 2 de abajo quedan como historia del análisis.

Para que `DATA_SOURCE=db` funcione hay que completar `lib/data/portal/mapeo.ts`. Hoy **todas** las
secciones están en `null`: no se inventó ningún nombre de tabla ni de columna. Mientras falte una
sección obligatoria, el portal muestra «El portal todavía no tiene sus datos configurados» con la
lista, y `/api/salud` la informa en `mapeo.pendientes`.

## 0. Preguntas previas

1. **¿El portal lee la misma base que sys_tecnicos (esquema `dmc`)?** Si es así, varias secciones
   tienen candidatos reales (abajo). Si es otra base, necesito su esquema.
2. **¿Se pueden crear vistas de solo lectura para el portal** (p. ej. esquema `portal`, una vista por
   sección)? Es lo recomendado: los joins y las reglas (estado de la sucursal, garantía vigente) quedan
   en la base y el mapeo es una línea por campo. Las crearía un DBA, no esta app.
3. **Cuenta SQL**: una cuenta con solo `db_datareader` (o `GRANT SELECT` sobre esas vistas).
   `/api/salud` avisa si la cuenta puede escribir.
4. **¿Cómo se vincula una cuenta del portal con su cliente?** Hoy la sesión trae el correo y un
   `clienteId` del directorio de prueba (`lib/server/accounts.ts`). Para la base, falta la tabla.

## 1. Secciones obligatorias

| Sección | Campos que necesita la UI | Candidato en el esquema de sys_tecnicos | Falta confirmar |
| --- | --- | --- | --- |
| `perfil` (usuario conectado) | id, nombre, rol, correo, cargo, teléfono | — (`dmc.usuario` es del equipo DMC) | Tabla de usuarios del portal, columna de filtro (correo) |
| `cliente` | nombre, razón social, RUT | `dmc.cliente` (`nombre_fantasia`, `razon_social`, `rut`) | Que sea la misma base; tipo del id que se filtra |
| `sucursales` | código, nombre, marca, mall, n.º de local, comuna, región, accesos, equipos, garantía, estado | `dmc.sucursal` (`codigo`, `nombre`, `comuna`, `region`, `cliente_id`) + `dmc.marca.nombre` + `dmc.mall.nombre` | **Sin equivalente conocido**: n.º de local, cantidad de accesos y de equipos, estado (operativa / con observaciones / fuera de servicio) y su regla, «garantía vigente» (¿`en_garantia`? ¿`garantia_meses` + `fecha_instalacion`?) |
| `visitas` | folio, fecha, sucursal, técnico, motivo, estado | `dmc.visita` (`folio`, `fecha_programada`, `estado`, `cliente_id`) + `dmc.tecnico` + `dmc.catalogo_motivo` | Columnas de nombre de técnico y motivo; traducción de estados `PROGRAMADA/EN_CURSO/COMPLETADA/PENDIENTE/REAGENDADA/CANCELADA/CANCELADA_ADMIN` → la UI solo conoce `programada/completada/cancelada/cancelada_admin`: ¿qué se muestra para EN_CURSO, PENDIENTE y REAGENDADA? ¿Se excluyen las `activo = 0`? ¿Qué estados cuentan en el gráfico de visitas? |
| `garantias` | garantías por vencer, plan vigente hasta | parcial: `dmc.cliente.garantia_meses`, `dmc.sucursal.garantia_meses`, `fecha_instalacion` | La regla de vencimiento y qué cuenta como «por vencer» (¿30 días?) |

Detalle del acta en el portal (trabajos, problemas, fotos, videos, firma): en la referencia sale de
`dmc.visita_ejecucion`, `dmc.visita_trabajo`, `dmc.visita_foto`, `dmc.visita_video` y
`dmc.visita_firma`. Falta decidir qué ve el cliente y cómo se sirven las fotos y videos (hoy son
rutas autenticadas de la app de técnicos). Con `db`, las visitas se muestran sin detalle.

## 2. Secciones opcionales (vacías mientras falten)

| Sección | Campos | Candidato | Falta |
| --- | --- | --- | --- |
| `cuentasLocales` (credenciales de locales) | código del local, usuario, estado, último acceso | — | Tabla completa |
| `reportes` (de los locales) | id, local, fecha, tipo, detalle, estado, prioridad pedida | — (¿`dmc.problema`?) | Tabla y estados `nuevo/revision/ticket/resuelto` |
| `usuarios` (del cliente) | id, nombre, correo, rol, zona, estado; locales asignados y permisos extra | — | Tabla de usuarios, de roles (`admin/zona/locales/encargado`) y de asignación a locales |
| `notificaciones` | id, tipo, título, texto, fecha, leída, enlace | `dmc.notificacion_usuario` (es del panel interno) | Tabla de avisos del cliente |
| preferencias de avisos | por tipo: portal/correo; frecuencia; silencio | — | Hoy se usan valores neutros fijos |
| zonas del cliente | id, nombre, sucursales | — | Tabla de zonas (hoy son de ejemplo) |
| `tickets` | id, sucursal, fecha, problema, estado, prioridad, descripción, solicitante | — | Tabla; valores de estado «abierto» y prioridades altas (`TICKET_ABIERTO`, `PRIORIDAD_ALTA` en `mapeo.ts`) |
| `trabajosPlanificados` | fecha, sucursal, trabajo, técnico, estado | ¿`dmc.visita` con estado `PROGRAMADA`? | Confirmar si es lo mismo |
| `cotizaciones` | id, sucursal, fecha, descripción, monto, estado | — | Tabla (¿sistema comercial/ERP?) |
| `despachos` | id, sucursal, fecha, ítems, estado | — | Tabla (¿guías de despacho del ERP?) |

## 3. Login con la base

Fuera de este cambio. Para pasar el login del portal a la base se necesita: tabla de cuentas del
portal, formato del hash de la clave (el portal usa scrypt; técnicos usa bcrypt), estado
activo/bloqueado y vínculo con el cliente. Mientras tanto, `lib/server/accounts.ts` sigue siendo el
directorio de cuentas.

## 4. Cómo completar una sección

Ver el ejemplo comentado al final de `lib/data/portal/mapeo.ts`. Con la sección completa:
`npm run typecheck` comprueba que no falte ningún campo, y `/api/salud` la pasa a `mapeo.confirmadas`.
