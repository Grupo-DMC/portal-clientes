/* =====================================================================
   DMC Portal Clientes · migración 003 — permisos explícitos de la app
   Microsoft SQL Server 2022 · base DMC_Core

   Por qué: la cuenta de la app (dmc_app_portal) funciona hoy porque tiene
   SELECT, INSERT, UPDATE, DELETE y EXECUTE sobre los esquemas completos
   clientes, tecnico, seguridad y portal, otorgados sueltos. Nada dice qué
   necesita de verdad: si alguien la reduce a «solo portal.v_*» (lo que propone
   docs/portal-vistas.md), el panel interno deja de funcionar, porque lee las
   TABLAS de los cuatro esquemas.

   Qué agrega: el rol sys_clientes_app con exactamente lo que la app usa, y la
   cuenta como miembro. Así la app sigue funcionando aunque se quiten los
   permisos sueltos (eso es la migración 004).

     Lectura ... SELECT en los esquemas clientes, tecnico, seguridad y portal.
     Escritura . las únicas que hace la app (lib/server/*):
       seguridad.intento_login ........ INSERT (cada intento de login)
       seguridad.usuario .............. UPDATE de 4 columnas (último acceso,
                                        cambio de clave)
       seguridad.usuario_cliente ...... UPDATE de 6 columnas (lo anterior +
                                        nombre y correo del perfil)
       seguridad.usuario_cliente_foto . INSERT, UPDATE, DELETE (migración 002)
       clientes.cliente_logo .......... INSERT, UPDATE, DELETE (migración 001)

   Solo AGREGA permisos: no quita ninguno ni toca datos. Los triggers de las
   tablas de cuentas siguen funcionando: todos los esquemas son de dbo y los
   triggers no usan SQL dinámico (encadenamiento de propiedad).

   Si la cuenta de la app se llama distinto en otro ambiente, reemplaza
   dmc_app_portal en todo este archivo (y en la 004 y los revertir).

   Al final muestra una verificación: todas las filas deben decir OK.

   Requisito: tener aplicada la migración 002. Cuenta con db_owner o
              db_securityadmin (crear roles y otorgar permisos).
   Es idempotente: se puede correr varias veces sin romper nada.

   Uso:  sqlcmd -S servidor -d DMC_Core -i sql/migracion-003-permisos-de-la-app.sql
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE DMC_Core;
GO

IF NOT EXISTS (SELECT 1 FROM portal.schema_version WHERE version = 2)
    THROW 50003, 'Falta aplicar la migración 002 antes que esta.', 1;
GO

IF DATABASE_PRINCIPAL_ID('dmc_app_portal') IS NULL
    THROW 50013, 'No existe el usuario de base de datos dmc_app_portal: reemplázalo por el DB_USER de este ambiente.', 1;
GO

IF DATABASE_PRINCIPAL_ID('sys_clientes_app') IS NULL
    CREATE ROLE sys_clientes_app AUTHORIZATION dbo;
GO

-- Lectura. El panel interno lee las tablas de los cuatro esquemas; el portal
-- cliente, las vistas portal.v_* y la columna contenido de visita_foto/_video/_firma.
GRANT SELECT ON SCHEMA::clientes  TO sys_clientes_app;
GRANT SELECT ON SCHEMA::tecnico   TO sys_clientes_app;
GRANT SELECT ON SCHEMA::seguridad TO sys_clientes_app;
GRANT SELECT ON SCHEMA::portal    TO sys_clientes_app;
GO

-- Escritura: solo estas tablas y, en las cuentas, solo estas columnas.
GRANT INSERT ON seguridad.intento_login TO sys_clientes_app;

GRANT UPDATE (ultimo_acceso_en, password_hash, debe_cambiar_password, sesion_version)
    ON seguridad.usuario TO sys_clientes_app;

GRANT UPDATE (ultimo_acceso_en, password_hash, debe_cambiar_password, sesion_version, nombre, email)
    ON seguridad.usuario_cliente TO sys_clientes_app;

GRANT INSERT, UPDATE, DELETE ON seguridad.usuario_cliente_foto TO sys_clientes_app;
GRANT INSERT, UPDATE, DELETE ON clientes.cliente_logo          TO sys_clientes_app;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_role_members
                WHERE role_principal_id = DATABASE_PRINCIPAL_ID('sys_clientes_app')
                  AND member_principal_id = DATABASE_PRINCIPAL_ID('dmc_app_portal'))
    ALTER ROLE sys_clientes_app ADD MEMBER dmc_app_portal;
GO

/* Verificación: lo que hereda el ROL (sin contar los permisos sueltos de la
   cuenta). Todas las filas deben decir OK; si alguna dice FALTA, el GRANT
   correspondiente de arriba no se aplicó. */
SELECT e.objeto, e.permiso, e.columna,
       CASE WHEN EXISTS (
           SELECT 1 FROM sys.database_permissions p
            WHERE p.grantee_principal_id = DATABASE_PRINCIPAL_ID('sys_clientes_app')
              AND p.state = 'G' AND p.permission_name = e.permiso
              AND (   (e.clase = 'SCHEMA' AND p.class = 3 AND p.major_id = SCHEMA_ID(e.objeto))
                   OR (e.clase = 'OBJECT' AND p.class = 1 AND p.major_id = OBJECT_ID(e.objeto)
                       AND (p.minor_id = 0 OR p.minor_id = COLUMNPROPERTY(OBJECT_ID(e.objeto), e.columna, 'ColumnId'))))
       ) THEN 'OK' ELSE 'FALTA' END AS estado
  FROM (VALUES
    ('clientes',  'SCHEMA', 'SELECT', NULL),
    ('tecnico',   'SCHEMA', 'SELECT', NULL),
    ('seguridad', 'SCHEMA', 'SELECT', NULL),
    ('portal',    'SCHEMA', 'SELECT', NULL),
    ('seguridad.intento_login',        'OBJECT', 'INSERT', NULL),
    ('seguridad.usuario',              'OBJECT', 'UPDATE', 'ultimo_acceso_en'),
    ('seguridad.usuario',              'OBJECT', 'UPDATE', 'password_hash'),
    ('seguridad.usuario',              'OBJECT', 'UPDATE', 'debe_cambiar_password'),
    ('seguridad.usuario',              'OBJECT', 'UPDATE', 'sesion_version'),
    ('seguridad.usuario_cliente',      'OBJECT', 'UPDATE', 'ultimo_acceso_en'),
    ('seguridad.usuario_cliente',      'OBJECT', 'UPDATE', 'password_hash'),
    ('seguridad.usuario_cliente',      'OBJECT', 'UPDATE', 'debe_cambiar_password'),
    ('seguridad.usuario_cliente',      'OBJECT', 'UPDATE', 'sesion_version'),
    ('seguridad.usuario_cliente',      'OBJECT', 'UPDATE', 'nombre'),
    ('seguridad.usuario_cliente',      'OBJECT', 'UPDATE', 'email'),
    ('seguridad.usuario_cliente_foto', 'OBJECT', 'INSERT', NULL),
    ('seguridad.usuario_cliente_foto', 'OBJECT', 'UPDATE', NULL),
    ('seguridad.usuario_cliente_foto', 'OBJECT', 'DELETE', NULL),
    ('clientes.cliente_logo',          'OBJECT', 'INSERT', NULL),
    ('clientes.cliente_logo',          'OBJECT', 'UPDATE', NULL),
    ('clientes.cliente_logo',          'OBJECT', 'DELETE', NULL)
  ) AS e(objeto, clase, permiso, columna);
GO

IF NOT EXISTS (SELECT 1 FROM portal.schema_version WHERE version = 3)
    INSERT INTO portal.schema_version (version, descripcion)
    VALUES (3, N'Rol sys_clientes_app con los permisos exactos de la app');
GO

PRINT 'Migración 003 aplicada.';
GO
