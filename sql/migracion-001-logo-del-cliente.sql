/* =====================================================================
   DMC Portal Clientes · migración 001 — versión del esquema y logo del cliente
   Microsoft SQL Server 2022 · base DMC_Core

   Qué agrega, y para qué:

     1. portal.schema_version .. una fila por migración de sys_clientes
                                 aplicada. Es una serie PROPIA (001, 002…):
                                 las de sys_tecnicos siguen en
                                 tecnico.schema_version y no se tocan, así
                                 los dos sistemas nunca repiten un número.

     2. clientes.cliente_logo ... el logo de cada cliente (empresa), uno por
                                 cliente. Lo sube el equipo DMC desde el panel
                                 interno (/panel/logos) y reemplaza la inicial
                                 del cliente en su portal. Se guarda ya
                                 reducido (máx. 256 px, WebP).

   Desde esta migración, cada migración de sys_clientes termina registrando su
   número en portal.schema_version.

   Si la tabla de logos ya existe (se creó con el script suelto del
   24-11-2026), no se toca: solo se registra la versión.

   Requisito: una cuenta con CREATE TABLE (la cuenta de la app no lo tiene).
   Es idempotente: se puede correr varias veces sin romper nada.

   Uso:  sqlcmd -S servidor -d DMC_Core -i sql/migracion-001-logo-del-cliente.sql
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE DMC_Core;
GO

IF OBJECT_ID('portal.schema_version', 'U') IS NULL
    CREATE TABLE portal.schema_version (
        version      smallint       NOT NULL,
        descripcion  nvarchar(200)  NOT NULL,
        aplicada_en  datetime2(0)   NOT NULL CONSTRAINT df_portal_schema_version_aplicada DEFAULT (SYSDATETIME()),
        CONSTRAINT pk_portal_schema_version PRIMARY KEY (version)
    );
GO

IF OBJECT_ID('clientes.cliente_logo', 'U') IS NULL
    CREATE TABLE clientes.cliente_logo (
        cliente_id       bigint          NOT NULL
            CONSTRAINT pk_cliente_logo PRIMARY KEY
            CONSTRAINT fk_cliente_logo_cliente REFERENCES clientes.cliente (id) ON DELETE CASCADE,
        mime             varchar(20)     NOT NULL
            CONSTRAINT ck_cliente_logo_mime CHECK (mime IN ('image/png', 'image/webp')),
        contenido        varbinary(max)  NOT NULL,
        actualizado_en   datetime2(0)    NOT NULL
            CONSTRAINT df_cliente_logo_actualizado DEFAULT (SYSDATETIME()),
        -- Quién lo subió (seguridad.usuario: equipo DMC). NULL si se cargó por script.
        actualizado_por  bigint          NULL
            CONSTRAINT fk_cliente_logo_usuario REFERENCES seguridad.usuario (id),
        CONSTRAINT ck_cliente_logo_bytes CHECK (DATALENGTH(contenido) BETWEEN 1 AND 524288)
    );
GO

IF NOT EXISTS (SELECT 1 FROM portal.schema_version WHERE version = 1)
    INSERT INTO portal.schema_version (version, descripcion)
    VALUES (1, N'Versión del esquema de sys_clientes y logo de cada cliente (clientes.cliente_logo)');
GO

PRINT 'Migración 001 aplicada.';
GO
