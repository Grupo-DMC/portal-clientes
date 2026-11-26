/* =====================================================================
   DMC Portal Clientes · revierte la migración 002 — foto de perfil del portal
   Borra seguridad.usuario_cliente_foto con TODAS las fotos subidas (no se
   pueden recuperar). Las cuentas del portal vuelven a mostrar sus iniciales.

   Requisito: revertir antes las migraciones 003 en adelante.

   Uso:  sqlcmd -S servidor -d DMC_Core -i sql/migracion-002-revertir.sql
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE DMC_Core;
GO

IF EXISTS (SELECT 1 FROM portal.schema_version WHERE version > 2)
    THROW 50102, 'Hay migraciones posteriores a la 002 aplicadas: reviértelas antes, de la mayor a la menor.', 1;
GO

IF OBJECT_ID('seguridad.usuario_cliente_foto', 'U') IS NOT NULL DROP TABLE seguridad.usuario_cliente_foto;
GO

DELETE FROM portal.schema_version WHERE version = 2;
GO

PRINT 'Migración 002 revertida.';
GO
