/* =====================================================================
   DMC Portal Clientes · migración 002 — foto de perfil de las cuentas del portal
   Microsoft SQL Server 2022 · base DMC_Core

   Agrega seguridad.usuario_cliente_foto: la foto de perfil de cada cuenta del
   portal cliente (seguridad.usuario_cliente). seguridad.usuario_foto ya existe,
   pero es del equipo DMC (su FK apunta a seguridad.usuario).

   El portal guarda la foto ya reducida (512 px, WebP); el tope de 1 MB evita
   abusos. Al borrar la cuenta se borra su foto.

   Si la tabla ya existe (se creó con el script suelto del 24-11-2026), no se
   toca: solo se registra la versión.

   Requisito: tener aplicada la migración 001.
   Es idempotente: se puede correr varias veces sin romper nada.

   Uso:  sqlcmd -S servidor -d DMC_Core -i sql/migracion-002-foto-de-perfil-del-portal.sql
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE DMC_Core;
GO

IF OBJECT_ID('portal.schema_version', 'U') IS NULL
   OR NOT EXISTS (SELECT 1 FROM portal.schema_version WHERE version = 1)
    THROW 50002, 'Falta aplicar la migración 001 antes que esta.', 1;
GO

IF OBJECT_ID('seguridad.usuario_cliente_foto', 'U') IS NULL
    CREATE TABLE seguridad.usuario_cliente_foto (
        usuario_cliente_id  bigint          NOT NULL
            CONSTRAINT pk_usuario_cliente_foto PRIMARY KEY
            CONSTRAINT fk_usuario_cliente_foto_usuario REFERENCES seguridad.usuario_cliente (id) ON DELETE CASCADE,
        mime                varchar(20)     NOT NULL
            CONSTRAINT ck_usuario_cliente_foto_mime CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
        contenido           varbinary(max)  NOT NULL,
        actualizado_en      datetime2(0)    NOT NULL
            CONSTRAINT df_usuario_cliente_foto_actualizado DEFAULT (SYSDATETIME()),
        CONSTRAINT ck_usuario_cliente_foto_bytes CHECK (DATALENGTH(contenido) BETWEEN 1 AND 1048576)
    );
GO

IF NOT EXISTS (SELECT 1 FROM portal.schema_version WHERE version = 2)
    INSERT INTO portal.schema_version (version, descripcion)
    VALUES (2, N'Foto de perfil de las cuentas del portal (seguridad.usuario_cliente_foto)');
GO

PRINT 'Migración 002 aplicada.';
GO
