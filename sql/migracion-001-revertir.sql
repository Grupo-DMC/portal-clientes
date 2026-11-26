/* =====================================================================
   DMC Portal Clientes · revierte la migración 001 — logo del cliente
   Borra clientes.cliente_logo con TODOS los logos subidos (no se pueden
   recuperar: si los quieres conservar, respáldalos antes). El portal vuelve a
   mostrar la inicial del cliente, o el logo dejado como archivo en
   public/clientes, y el panel avisa que no se pueden guardar logos.

   portal.schema_version se borra solo si ya no le queda ninguna migración.

   Requisito: revertir antes las migraciones 002 en adelante.

   Uso:  sqlcmd -S servidor -d DMC_Core -i sql/migracion-001-revertir.sql
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE DMC_Core;
GO

IF OBJECT_ID('portal.schema_version', 'U') IS NOT NULL
   AND EXISTS (SELECT 1 FROM portal.schema_version WHERE version > 1)
    THROW 50101, 'Hay migraciones posteriores a la 001 aplicadas: reviértelas antes, de la mayor a la menor.', 1;
GO

IF OBJECT_ID('clientes.cliente_logo', 'U') IS NOT NULL DROP TABLE clientes.cliente_logo;
GO

IF OBJECT_ID('portal.schema_version', 'U') IS NOT NULL
BEGIN
    DELETE FROM portal.schema_version WHERE version = 1;
    IF NOT EXISTS (SELECT 1 FROM portal.schema_version) DROP TABLE portal.schema_version;
END
GO

PRINT 'Migración 001 revertida.';
GO
