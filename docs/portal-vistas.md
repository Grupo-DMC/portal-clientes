# Vistas del esquema `portal` (DMC_Core)

Especificación de las vistas que lee el portal cliente. Las crea el administrador de la base en
`DMC_Core`. La cuenta `dmc_app_portal` solo tiene `SELECT` sobre el esquema `portal`; no lee las tablas.

Esquemas de origen (copia 1:1 de las tablas de `dmc`, mismas columnas e ids):

| Esquema | Tablas que usan estas vistas |
| --- | --- |
| `clientes` | `cliente`, `marca`, `sucursal`, `mall` |
| `tecnico` | `visita`, `visita_ejecucion`, `visita_trabajo`, `visita_trabajo_subtrabajo`, `visita_foto`, `visita_video`, `visita_firma`, `problema`, `tecnico`, `catalogo_motivo`, `catalogo_trabajo`, `catalogo_problema`, `catalogo_problema_estado` |
| `seguridad` | **ninguna**: nada de este esquema se expone |

Los nombres de columna salen del esquema de sys_tecnicos (`sql/dmc_contingencia_sqlserver.sql`, con las
migraciones hasta la 045). Lo marcado **[VERIFICAR]** es una regla o un dato que hay que confirmar, no un
nombre inventado.

## Reglas comunes a todas las vistas

1. **Toda vista expone `cliente_id bigint NOT NULL`** (= `clientes.cliente.id`). La app siempre filtra
   `WHERE cliente_id = @cliente` y, en la misma petición, fija
   `EXEC sp_set_session_context @key = N'cliente_id', @value = <id>, @read_only = 1;` para el RLS.
2. **Nada interno**: no se expone nada de `seguridad.*` (usuarios, roles, auditoría), ni
   `tecnico.visita_ejecucion.comentario_interno`, `tecnico.visita_interno`,
   `tecnico.visita_pendiente_gestion`, `tecnico.problema_gestion`, `tecnico.problema_historial`, ni
   fotos o videos con `interno = 1`. Tampoco `clientes.contacto`, `contacto_cargo`, `persona_local`
   (datos personales; el portal no los muestra).
3. **Sin binarios en las vistas de listado**: fotos, videos y firmas van por id. El contenido sale solo
   de las vistas `*_contenido` (sección 3), que la app consulta de a una fila: `WHERE id = @id AND cliente_id = @cliente`.
4. **Solo filas vigentes**: `tecnico.visita.activo = 1` en toda vista que pase por una visita, y
   `activo = 1` en cliente, sucursal, trabajos, fotos y videos (ver filtros de cada vista).
5. Las fechas se exponen con su tipo original (`date`, `datetime2`). La app las formatea en SQL.

| # | Vista | Pantalla | La app la lee hoy |
| --- | --- | --- | --- |
| 1 | `portal.v_cliente` | Dashboard (cabecera) | Sí |
| 2 | `portal.v_sucursal` | Dashboard, Mis sucursales, ficha del local | Sí |
| 3 | `portal.v_visita` | Visitas, Dashboard (gráfico), Trabajos planificados, ficha del local | Sí |
| 4 | `portal.v_visita_ejecucion` | Detalle de visita (acta) | Próximo paso |
| 5 | `portal.v_visita_trabajo` | Detalle de visita | Próximo paso |
| 6 | `portal.v_visita_trabajo_item` | Detalle de visita | Próximo paso |
| 7 | `portal.v_visita_problema` | Detalle de visita | Próximo paso |
| 8 | `portal.v_visita_foto` | Detalle de visita (galería) | Próximo paso |
| 9 | `portal.v_visita_video` | Detalle de visita | Próximo paso |
| 10 | `portal.v_visita_firma` | Detalle de visita | Próximo paso |
| 11 | `portal.v_visita_foto_contenido` | Descarga de una foto | Próximo paso |
| 12 | `portal.v_visita_video_contenido` | Descarga de un video | Próximo paso |
| 13 | `portal.v_visita_firma_contenido` | Imagen de la firma | Próximo paso |

Con las vistas 1 a 3 funcionan el dashboard, las sucursales, la lista de visitas y los trabajos planificados.

---

## 1. Vistas que la app ya consulta

### 1.1 `portal.v_cliente`

Pantalla: Dashboard (nombre, razón social y RUT del cliente).
Filtro fijo: `c.activo = 1`. Una fila por cliente.

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `clientes.cliente.id` |
| `nombre` | nvarchar(80) | `clientes.cliente.nombre_fantasia` |
| `razon_social` | nvarchar(160) | `clientes.cliente.razon_social` |
| `rut` | varchar(12) | `clientes.cliente.rut` |
| `garantia_meses` | smallint NULL | `clientes.cliente.garantia_meses` |
| `plan_calibracion` | bit NULL | `clientes.cliente.plan_calibracion` |

No exponer: `notas`, `motivo_inactivo`.

```sql
CREATE VIEW portal.v_cliente AS
SELECT c.id AS cliente_id, c.nombre_fantasia AS nombre, c.razon_social, c.rut,
       c.garantia_meses, c.plan_calibracion
FROM clientes.cliente AS c
WHERE c.activo = 1;
```

### 1.2 `portal.v_sucursal`

Pantallas: Dashboard (tabla de sucursales, marcas, garantías), Mis sucursales, ficha del local.
Joins: `sucursal` → `marca` (INNER), `mall` (LEFT), `cliente` (INNER, para la garantía del cliente).
Filtro fijo: `s.activo = 1`. Una fila por sucursal.

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `clientes.sucursal.cliente_id` |
| `sucursal_id` | bigint | `clientes.sucursal.id` |
| `codigo` | varchar(20) NULL | `clientes.sucursal.codigo` |
| `nombre` | nvarchar(120) | `clientes.sucursal.nombre` |
| `marca` | nvarchar(80) | `clientes.marca.nombre` |
| `mall` | nvarchar(120) NULL | `clientes.mall.nombre` |
| `direccion` | nvarchar(180) | `clientes.sucursal.direccion` |
| `comuna` | nvarchar(80) | `clientes.sucursal.comuna` |
| `region` | nvarchar(80) | `clientes.sucursal.region` |
| `telefono` | varchar(30) NULL | `clientes.sucursal.telefono` |
| `fecha_instalacion` | date NULL | `clientes.sucursal.fecha_instalacion` |
| `remota` | bit NULL | `clientes.sucursal.remota` |
| `en_garantia` | bit NULL | `clientes.sucursal.en_garantia` |
| `garantia_meses` | smallint NULL | `COALESCE(clientes.sucursal.garantia_meses, clientes.cliente.garantia_meses)` |
| `garantia_vence` | date NULL | `DATEADD(month, garantia_meses, fecha_instalacion)` **[VERIFICAR la regla]** |
| `problemas_abiertos` | int | problemas de la sucursal con `estado <> 'RESUELTO'` (ver SQL) |

Uso en la app:
- `garantia_vence >= hoy` → la sucursal se muestra con garantía «Vigente».
- «Garantías por vencer» = sucursales que vencen en los próximos 30 días; «Plan vigente hasta» = el
  `garantia_vence` más lejano. **[VERIFICAR las dos reglas y los 30 días]**
- `problemas_abiertos > 0` → estado «Con observaciones»; si no, «Operativa». **[VERIFICAR]** (el estado
  «Fuera de servicio» no tiene origen en la base).

No exponer: `notas`, `motivo_inactivo`.

```sql
CREATE VIEW portal.v_sucursal AS
SELECT s.cliente_id, s.id AS sucursal_id, s.codigo, s.nombre,
       m.nombre AS marca, ml.nombre AS mall,
       s.direccion, s.comuna, s.region, s.telefono,
       s.fecha_instalacion, s.remota, s.en_garantia,
       COALESCE(s.garantia_meses, c.garantia_meses) AS garantia_meses,
       CASE WHEN s.fecha_instalacion IS NOT NULL
                 AND COALESCE(s.garantia_meses, c.garantia_meses) IS NOT NULL
            THEN DATEADD(month, COALESCE(s.garantia_meses, c.garantia_meses), s.fecha_instalacion)
       END AS garantia_vence,                                   -- [VERIFICAR]
       (SELECT COUNT(*)
          FROM tecnico.problema AS p
          JOIN tecnico.visita   AS v ON v.id = p.visita_id
         WHERE v.sucursal_id = s.id AND v.activo = 1
           AND p.estado <> 'RESUELTO') AS problemas_abiertos
FROM clientes.sucursal AS s
JOIN clientes.marca    AS m  ON m.id = s.marca_id
JOIN clientes.cliente  AS c  ON c.id = s.cliente_id
LEFT JOIN clientes.mall AS ml ON ml.id = s.mall_id
WHERE s.activo = 1;
```

### 1.3 `portal.v_visita`

Pantallas: Visitas (lista), Dashboard (gráfico por mes), Trabajos planificados (`estado = 'PROGRAMADA'`
desde hoy), ficha del local.
Joins: `visita` → `sucursal` (INNER), `tecnico` (INNER), `catalogo_motivo` (INNER, por `motivo_codigo`).
Filtro fijo: `v.activo = 1` (las visitas eliminadas no se muestran). Una fila por visita.

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `tecnico.visita.cliente_id` |
| `visita_id` | bigint | `tecnico.visita.id` |
| `folio` | varchar(16) | `tecnico.visita.folio` |
| `sucursal_id` | bigint | `tecnico.visita.sucursal_id` |
| `sucursal` | nvarchar(120) | `clientes.sucursal.nombre` |
| `fecha_programada` | date | `tecnico.visita.fecha_programada` |
| `fecha_hasta` | date NULL | `tecnico.visita.fecha_hasta` |
| `hora_programada` | time(0) NULL | `tecnico.visita.hora_programada` |
| `estado` | varchar(16) | `tecnico.visita.estado` (código tal cual) |
| `tecnico` | nvarchar(161) | `tecnico.tecnico.nombre_completo` |
| `motivo` | nvarchar(80) | `tecnico.catalogo_motivo.nombre` |

La app traduce `estado`: `PROGRAMADA`→Programada, `COMPLETADA`→Completada, `CANCELADA`→Cancelada,
`CANCELADA_ADMIN`→Cancelada por admin. **[VERIFICAR]** qué mostrar para `EN_CURSO`, `REAGENDADA` y
`PENDIENTE` (hoy, provisoriamente, «Programada»).

No exponer: `trabajo_solicitado` e `indicaciones_acceso` (pueden traer claves de Wi-Fi o de acceso:
**[VERIFICAR]** si el cliente debe ver la solicitud y con qué limpieza), los datos del responsable
(`responsable_*`, datos personales), `problema_origen_id`, `creada_por`, `tecnico_ayudante_id`.

```sql
CREATE VIEW portal.v_visita AS
SELECT v.cliente_id, v.id AS visita_id, v.folio, v.sucursal_id, s.nombre AS sucursal,
       v.fecha_programada, v.fecha_hasta, v.hora_programada, v.estado,
       t.nombre_completo AS tecnico, cm.nombre AS motivo
FROM tecnico.visita          AS v
JOIN clientes.sucursal       AS s  ON s.id = v.sucursal_id
JOIN tecnico.tecnico         AS t  ON t.id = v.tecnico_id
JOIN tecnico.catalogo_motivo AS cm ON cm.codigo = v.motivo_codigo
WHERE v.activo = 1;
```

---

## 2. Detalle de la visita (acta)

Todas filtran `tecnico.visita.activo = 1` y llevan `cliente_id` (de `tecnico.visita.cliente_id`) y `visita_id`.
Recomiendo que el portal muestre el detalle solo de visitas `COMPLETADA` **[VERIFICAR]**.

### 2.1 `portal.v_visita_ejecucion` — una fila por visita realizada

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `tecnico.visita.cliente_id` |
| `visita_id` | bigint | `tecnico.visita_ejecucion.visita_id` |
| `hora_inicio` | datetime2(0) | `tecnico.visita_ejecucion.hora_inicio` |
| `hora_termino` | datetime2(0) NULL | `tecnico.visita_ejecucion.hora_termino` |
| `responsable_nombre` | nvarchar(120) | `tecnico.visita_ejecucion.responsable_nombre` |
| `responsable_cargo` | nvarchar(80) NULL | `tecnico.visita_ejecucion.responsable_cargo` |
| `motivo_real` | nvarchar(80) NULL | `tecnico.catalogo_motivo.nombre` (LEFT JOIN por `motivo_real_codigo`) |
| `observaciones` | nvarchar(max) NULL | `tecnico.visita_ejecucion.observaciones` (el campo que ve el cliente en el acta) |

No exponer: `comentario_interno`, `responsable_rut`, `responsable_telefono`, `responsable_email`,
`dispositivo`, `app_version`, `registrado_offline`, `sincronizado_en`, `edicion_*`.

```sql
CREATE VIEW portal.v_visita_ejecucion AS
SELECT v.cliente_id, e.visita_id, e.hora_inicio, e.hora_termino,
       e.responsable_nombre, e.responsable_cargo, cm.nombre AS motivo_real, e.observaciones
FROM tecnico.visita_ejecucion AS e
JOIN tecnico.visita           AS v  ON v.id = e.visita_id
LEFT JOIN tecnico.catalogo_motivo AS cm ON cm.codigo = e.motivo_real_codigo
WHERE v.activo = 1;
```

### 2.2 `portal.v_visita_trabajo` — trabajos del acta

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `tecnico.visita.cliente_id` |
| `visita_id` | bigint | `tecnico.visita_trabajo.visita_id` |
| `visita_trabajo_id` | bigint | `tecnico.visita_trabajo.id` |
| `trabajo` | nvarchar(80) | `tecnico.catalogo_trabajo.nombre` (por `trabajo_codigo`) |
| `grupo_label` | nvarchar(60) NULL | `tecnico.catalogo_trabajo.grupo_label` |
| `motivo` | nvarchar(80) NULL | `tecnico.catalogo_motivo.nombre` (LEFT JOIN por `visita_trabajo.motivo_codigo`) |
| `detalle` | nvarchar(max) NULL | `tecnico.visita_trabajo.detalle` **[VERIFICAR si es visible para el cliente]** |
| `orden` | smallint | `tecnico.visita_trabajo.orden` |

Filtro fijo: `vt.activo = 1`.

```sql
CREATE VIEW portal.v_visita_trabajo AS
SELECT v.cliente_id, vt.visita_id, vt.id AS visita_trabajo_id,
       ct.nombre AS trabajo, ct.grupo_label, cm.nombre AS motivo, vt.detalle, vt.orden
FROM tecnico.visita_trabajo   AS vt
JOIN tecnico.visita           AS v  ON v.id = vt.visita_id
JOIN tecnico.catalogo_trabajo AS ct ON ct.codigo = vt.trabajo_codigo
LEFT JOIN tecnico.catalogo_motivo AS cm ON cm.codigo = vt.motivo_codigo
WHERE vt.activo = 1 AND v.activo = 1;
```

### 2.3 `portal.v_visita_trabajo_item` — ítems y cantidades de cada trabajo

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `tecnico.visita.cliente_id` |
| `visita_id` | bigint | `tecnico.visita_trabajo.visita_id` |
| `visita_trabajo_id` | bigint | `tecnico.visita_trabajo_subtrabajo.visita_trabajo_id` |
| `etiqueta` | nvarchar(80) | `tecnico.visita_trabajo_subtrabajo.etiqueta` |
| `cantidad` | smallint | `tecnico.visita_trabajo_subtrabajo.cantidad` |
| `orden` | smallint | `tecnico.visita_trabajo_subtrabajo.orden` |

```sql
CREATE VIEW portal.v_visita_trabajo_item AS
SELECT v.cliente_id, vt.visita_id, st.visita_trabajo_id, st.etiqueta, st.cantidad, st.orden
FROM tecnico.visita_trabajo_subtrabajo AS st
JOIN tecnico.visita_trabajo AS vt ON vt.id = st.visita_trabajo_id
JOIN tecnico.visita         AS v  ON v.id = vt.visita_id
WHERE vt.activo = 1 AND v.activo = 1;
```

### 2.4 `portal.v_visita_problema` — problemas encontrados en la visita

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `tecnico.visita.cliente_id` |
| `visita_id` | bigint | `tecnico.problema.visita_id` |
| `problema_id` | bigint | `tecnico.problema.id` |
| `tipo` | nvarchar(80) | `tecnico.catalogo_problema.nombre` (por `tipo_codigo`) |
| `estado` | varchar(10) | `tecnico.problema.estado` |
| `estado_nombre` | nvarchar(80) | `tecnico.catalogo_problema_estado.nombre` |
| `descripcion` | nvarchar(max) NULL | `tecnico.problema.descripcion` |
| `solucion` | nvarchar(max) NULL | `tecnico.problema.solucion` **[VERIFICAR si es visible para el cliente]** |
| `resuelto_en` | datetime2(0) NULL | `tecnico.problema.resuelto_en` |
| `orden` | smallint | `tecnico.problema.orden` |

```sql
CREATE VIEW portal.v_visita_problema AS
SELECT v.cliente_id, p.visita_id, p.id AS problema_id, cp.nombre AS tipo,
       p.estado, ce.nombre AS estado_nombre, p.descripcion, p.solucion, p.resuelto_en, p.orden
FROM tecnico.problema                 AS p
JOIN tecnico.visita                   AS v  ON v.id = p.visita_id
JOIN tecnico.catalogo_problema        AS cp ON cp.codigo = p.tipo_codigo
JOIN tecnico.catalogo_problema_estado AS ce ON ce.codigo = p.estado
WHERE v.activo = 1;
```

### 2.5 `portal.v_visita_foto` — referencias, sin bytes

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `tecnico.visita.cliente_id` |
| `visita_id` | bigint | `tecnico.visita_foto.visita_id` |
| `foto_id` | bigint | `tecnico.visita_foto.id` |
| `problema_id` | bigint NULL | `tecnico.visita_foto.problema_id` |
| `etiqueta` | nvarchar(40) NULL | `tecnico.visita_foto.etiqueta` |
| `mime` | varchar(40) | `tecnico.visita_foto.mime` |
| `bytes` | int NULL | `tecnico.visita_foto.bytes` |
| `orden` | smallint | `tecnico.visita_foto.orden` |
| `tomada_en` | datetime2(0) NULL | `tecnico.visita_foto.tomada_en` |

Filtro fijo: `f.activo = 1 AND f.interno = 0 AND f.contenido IS NOT NULL`.
No exponer: `contenido` (bytes), `archivo_url` (ruta interna de la app de técnicos).

```sql
CREATE VIEW portal.v_visita_foto AS
SELECT v.cliente_id, f.visita_id, f.id AS foto_id, f.problema_id, f.etiqueta,
       f.mime, f.bytes, f.orden, f.tomada_en
FROM tecnico.visita_foto AS f
JOIN tecnico.visita      AS v ON v.id = f.visita_id
WHERE f.activo = 1 AND f.interno = 0 AND f.contenido IS NOT NULL AND v.activo = 1;
```

### 2.6 `portal.v_visita_video` — referencias, sin bytes

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `tecnico.visita.cliente_id` |
| `visita_id` | bigint | `tecnico.visita_video.visita_id` |
| `video_id` | bigint | `tecnico.visita_video.id` |
| `problema_id` | bigint NULL | `tecnico.visita_video.problema_id` |
| `etiqueta` | nvarchar(40) NULL | `tecnico.visita_video.etiqueta` |
| `mime` | varchar(40) | `tecnico.visita_video.mime` |
| `bytes` | int NULL | `tecnico.visita_video.bytes` |
| `duracion_seg` | smallint NULL | `tecnico.visita_video.duracion_seg` |
| `ancho` | smallint NULL | `tecnico.visita_video.ancho` |
| `alto` | smallint NULL | `tecnico.visita_video.alto` |
| `orden` | smallint | `tecnico.visita_video.orden` |
| `grabado_en` | datetime2(0) NULL | `tecnico.visita_video.grabado_en` |

Filtro fijo: `vv.activo = 1 AND vv.interno = 0 AND vv.subida_completa = 1`.
No exponer: `contenido`, `archivo_url`, `bytes_recibidos`.

```sql
CREATE VIEW portal.v_visita_video AS
SELECT v.cliente_id, vv.visita_id, vv.id AS video_id, vv.problema_id, vv.etiqueta, vv.mime,
       vv.bytes, vv.duracion_seg, vv.ancho, vv.alto, vv.orden, vv.grabado_en
FROM tecnico.visita_video AS vv
JOIN tecnico.visita       AS v ON v.id = vv.visita_id
WHERE vv.activo = 1 AND vv.interno = 0 AND vv.subida_completa = 1 AND v.activo = 1;
```

### 2.7 `portal.v_visita_firma` — firma del responsable de tienda, sin bytes

| Columna | Tipo | Origen |
| --- | --- | --- |
| `cliente_id` | bigint | `tecnico.visita.cliente_id` |
| `visita_id` | bigint | `tecnico.visita_firma.visita_id` |
| `firma_id` | bigint | `tecnico.visita_firma.id` |
| `nombre` | nvarchar(120) | `tecnico.visita_firma.nombre` |
| `rut` | varchar(12) NULL | `tecnico.visita_firma.rut` **[VERIFICAR: hoy el portal lo muestra en el acta]** |
| `firmado_en` | datetime2(0) | `tecnico.visita_firma.firmado_en` |

Filtro fijo: `fi.rol = 'TIENDA'` (la firma del técnico no se expone **[VERIFICAR]**).
No exponer: `contenido`, `imagen_url`.

```sql
CREATE VIEW portal.v_visita_firma AS
SELECT v.cliente_id, fi.visita_id, fi.id AS firma_id, fi.nombre, fi.rut, fi.firmado_en
FROM tecnico.visita_firma AS fi
JOIN tecnico.visita       AS v ON v.id = fi.visita_id
WHERE fi.rol = 'TIENDA' AND v.activo = 1;
```

---

## 3. Contenido de archivos (descarga, de a uno)

Mismos filtros que su vista de referencia. La app las consulta **siempre** con
`WHERE <id> = @id AND cliente_id = @cliente` y nunca sin filtro por id.

| Vista | Columnas |
| --- | --- |
| `portal.v_visita_foto_contenido` | `cliente_id`, `foto_id` (`visita_foto.id`), `mime`, `contenido` (varbinary(max)) |
| `portal.v_visita_video_contenido` | `cliente_id`, `video_id` (`visita_video.id`), `mime`, `bytes`, `contenido` (varbinary(max)) |
| `portal.v_visita_firma_contenido` | `cliente_id`, `firma_id` (`visita_firma.id`), `contenido` (varbinary(max)) — PNG |

```sql
CREATE VIEW portal.v_visita_foto_contenido AS
SELECT v.cliente_id, f.id AS foto_id, f.mime, f.contenido
FROM tecnico.visita_foto AS f
JOIN tecnico.visita      AS v ON v.id = f.visita_id
WHERE f.activo = 1 AND f.interno = 0 AND f.contenido IS NOT NULL AND v.activo = 1;

CREATE VIEW portal.v_visita_video_contenido AS
SELECT v.cliente_id, vv.id AS video_id, vv.mime, vv.bytes, vv.contenido
FROM tecnico.visita_video AS vv
JOIN tecnico.visita       AS v ON v.id = vv.visita_id
WHERE vv.activo = 1 AND vv.interno = 0 AND vv.subida_completa = 1 AND v.activo = 1;

CREATE VIEW portal.v_visita_firma_contenido AS
SELECT v.cliente_id, fi.id AS firma_id, fi.contenido
FROM tecnico.visita_firma AS fi
JOIN tecnico.visita       AS v ON v.id = fi.visita_id
WHERE fi.rol = 'TIENDA' AND fi.contenido IS NOT NULL AND v.activo = 1;
```

Videos de hasta 25 MB: si el administrador prefiere no servirlos por vista, se puede dejar fuera el
12 y mostrar solo la referencia **[VERIFICAR]**.

---

## 4. Row-Level Security (si se activa)

La app fija `SESSION_CONTEXT(N'cliente_id')` (bigint, `@read_only = 1`) en cada petición, en el mismo
lote que el `SELECT` y sobre una conexión recién reiniciada (el pool limpia la sesión antes de cada uso).

Las políticas de seguridad de SQL Server se definen sobre **tablas** **[VERIFICAR si la versión del
servidor admite aplicarlas sobre vistas]**. Propuesta, sobre las tablas que llevan `cliente_id`:

```sql
CREATE FUNCTION portal.fn_rls_cliente(@cliente_id bigint)
RETURNS TABLE WITH SCHEMABINDING AS
RETURN SELECT 1 AS permitido
       WHERE @cliente_id = CAST(SESSION_CONTEXT(N'cliente_id') AS bigint)
          OR SESSION_CONTEXT(N'cliente_id') IS NULL AND USER_NAME() <> N'dmc_app_portal';  -- [VERIFICAR]

CREATE SECURITY POLICY portal.politica_cliente
  ADD FILTER PREDICATE portal.fn_rls_cliente(id)         ON clientes.cliente,   -- su id es el cliente
  ADD FILTER PREDICATE portal.fn_rls_cliente(cliente_id) ON clientes.sucursal,
  ADD FILTER PREDICATE portal.fn_rls_cliente(cliente_id) ON tecnico.visita
WITH (STATE = ON);
```

Notas para el administrador:
- La segunda condición del predicado deja que las demás cuentas (la app de técnicos, que no fija el
  contexto) sigan viendo todo. Sin ella, la política filtraría también a sys_tecnicos. **[VERIFICAR]**
- `clientes.cliente` no tiene columna `cliente_id`: su predicado va sobre `id`.
- El filtro de la tabla también se aplica cuando se lee a través de una vista `portal.v_*`.
- Las tablas hijas (`visita_foto`, `problema`, …) no tienen `cliente_id`; quedan cubiertas porque toda
  vista las une con `tecnico.visita`, que sí está filtrada.
- La app además filtra siempre `WHERE cliente_id = @cliente`, con o sin RLS.

---

## 5. Sin origen en `clientes` ni `tecnico` (no hay vista posible hoy)

El portal los muestra vacíos o como «sin datos» con `DATA_SOURCE=db`:

- Usuarios del portal, sus roles, zonas y locales asignados (el perfil sale de la sesión; `seguridad.*`
  no se expone).
- Vínculo cuenta del portal → `cliente_id`. Hoy va en `lib/server/accounts.ts` (`clienteIdBd`).
- Credenciales de locales, reportes de los locales, tickets, cotizaciones, despachos, notificaciones.
- Número de local, cantidad de accesos y de equipos de cada sucursal.
