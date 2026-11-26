/* =====================================================================
   DMC Portal Clientes · revierte la migración 004 — devuelve los permisos sueltos
   Vuelve a otorgar a dmc_app_portal los permisos sobre los esquemas completos,
   tal como estaban el 25-11-2026 antes de la 004. El rol sys_clientes_app no
   se toca.

   Uso:  sqlcmd -S servidor -d DMC_Core -i sql/migracion-004-revertir.sql
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE DMC_Core;
GO

GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::clientes  TO dmc_app_portal;
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::tecnico   TO dmc_app_portal;
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::seguridad TO dmc_app_portal;
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON SCHEMA::portal    TO dmc_app_portal;
GO

DELETE FROM portal.schema_version WHERE version = 4;
GO

PRINT 'Migración 004 revertida: dmc_app_portal volvió a sus permisos de esquema.';
GO
