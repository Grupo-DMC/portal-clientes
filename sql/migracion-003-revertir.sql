/* =====================================================================
   DMC Portal Clientes · revierte la migración 003 — permisos explícitos de la app
   Saca a dmc_app_portal del rol sys_clientes_app y borra el rol. La cuenta
   queda solo con sus permisos sueltos de esquema.

   Requisito: revertir antes la migración 004. Si no, la cuenta se quedaría
   sin permisos y el portal y el panel dejarían de funcionar.

   Uso:  sqlcmd -S servidor -d DMC_Core -i sql/migracion-003-revertir.sql
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE DMC_Core;
GO

IF EXISTS (SELECT 1 FROM portal.schema_version WHERE version > 3)
    THROW 50103, 'Hay migraciones posteriores a la 003 aplicadas: reviértelas antes, de la mayor a la menor.', 1;
GO

IF EXISTS (SELECT 1 FROM sys.database_role_members
            WHERE role_principal_id = DATABASE_PRINCIPAL_ID('sys_clientes_app')
              AND member_principal_id = DATABASE_PRINCIPAL_ID('dmc_app_portal'))
    ALTER ROLE sys_clientes_app DROP MEMBER dmc_app_portal;
GO

IF DATABASE_PRINCIPAL_ID('sys_clientes_app') IS NOT NULL
    DROP ROLE sys_clientes_app;
GO

DELETE FROM portal.schema_version WHERE version = 3;
GO

PRINT 'Migración 003 revertida.';
GO
