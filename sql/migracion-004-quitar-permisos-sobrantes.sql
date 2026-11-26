/* =====================================================================
   DMC Portal Clientes · migración 004 — quitar los permisos que sobran
   Microsoft SQL Server 2022 · base DMC_Core

   OPCIONAL, pero recomendada. Quita a dmc_app_portal los permisos sueltos
   sobre los esquemas completos (SELECT, INSERT, UPDATE, DELETE, EXECUTE en
   clientes, tecnico, seguridad y portal). Lo que la app necesita lo sigue
   recibiendo por el rol sys_clientes_app (migración 003).

   Por qué: la app solo escribe en cinco tablas. Con los permisos de hoy,
   quien obtuviera la cadena de conexión del despliegue podría borrar
   visitas, sucursales o cuentas. /api/salud ya avisa de esto («la cuenta SQL
   puede escribir»).

   Aplícala DESPUÉS de la 003 y de ver su verificación toda en OK. Luego
   prueba: el portal con una cuenta de cliente (dashboard, una visita, cambiar
   la foto de perfil) y el panel (dashboard; Logos: subir y quitar uno). Si
   algo falla, sql/migracion-004-revertir.sql deja la cuenta como estaba.

   No toca datos ni tablas.

   Requisito: tener aplicada la migración 003.
   Es idempotente: se puede correr varias veces sin romper nada.

   Uso:  sqlcmd -S servidor -d DMC_Core -i sql/migracion-004-quitar-permisos-sobrantes.sql
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE DMC_Core;
GO

IF NOT EXISTS (SELECT 1 FROM portal.schema_version WHERE version = 3)
    THROW 50004, 'Falta aplicar la migración 003 antes que esta.', 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_role_members
                WHERE role_principal_id = DATABASE_PRINCIPAL_ID('sys_clientes_app')
                  AND member_principal_id = DATABASE_PRINCIPAL_ID('dmc_app_portal'))
    THROW 50014, 'dmc_app_portal no está en el rol sys_clientes_app: vuelve a correr la migración 003.', 1;
GO

REVOKE SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::clientes  FROM dmc_app_portal;
REVOKE SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::tecnico   FROM dmc_app_portal;
REVOKE SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::seguridad FROM dmc_app_portal;
REVOKE SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::portal    FROM dmc_app_portal;
GO

/* Verificación, evaluada como la cuenta de la app (requiere IMPERSONATE, que
   tiene db_owner). Las tres primeras deben dar 1 y las tres últimas 0. */
EXECUTE AS USER = 'dmc_app_portal';
SELECT USER_NAME() AS cuenta,
       HAS_PERMS_BY_NAME('tecnico', 'SCHEMA', 'SELECT')                              AS lee_tecnico_1,
       HAS_PERMS_BY_NAME('clientes.cliente_logo', 'OBJECT', 'INSERT')                AS sube_logo_1,
       HAS_PERMS_BY_NAME('seguridad.intento_login', 'OBJECT', 'INSERT')              AS registra_login_1,
       HAS_PERMS_BY_NAME('tecnico.visita', 'OBJECT', 'DELETE')                       AS borra_visitas_0,
       HAS_PERMS_BY_NAME('clientes.sucursal', 'OBJECT', 'UPDATE')                    AS edita_sucursales_0,
       HAS_PERMS_BY_NAME('seguridad.usuario', 'OBJECT', 'UPDATE', 'activo', 'COLUMN') AS activa_usuarios_0;
REVERT;
GO

IF NOT EXISTS (SELECT 1 FROM portal.schema_version WHERE version = 4)
    INSERT INTO portal.schema_version (version, descripcion)
    VALUES (4, N'Fuera los permisos sueltos de dmc_app_portal: solo los del rol sys_clientes_app');
GO

PRINT 'Migración 004 aplicada.';
GO
