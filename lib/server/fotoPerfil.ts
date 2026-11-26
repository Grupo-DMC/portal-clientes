import "server-only";
import sql from "mssql";
import { getPoolEscritura } from "@/lib/db/pool";

// Foto de perfil de la cuenta del portal: seguridad.usuario_cliente_foto
// (sql/migracion-002-foto-de-perfil-del-portal.sql). Como las demás escrituras de la
// app, solo en seguridad.* y con texto fijo parametrizado. La cuenta sale
// SIEMPRE de la sesión (usuario_cliente.id), nunca del formulario.

/** La tabla todavía no existe en la base (falta aplicar el script). */
export class FotoNoDisponible extends Error {
  constructor() {
    super("Falta crear seguridad.usuario_cliente_foto (sql/migracion-002-foto-de-perfil-del-portal.sql).");
    this.name = "FotoNoDisponible";
  }
}

/** SQL Server 208: «Invalid object name». */
function traducir(err: unknown): never {
  if ((err as { number?: number })?.number === 208) throw new FotoNoDisponible();
  throw err;
}

async function pedido() {
  return (await getPoolEscritura()).request();
}

/** Marca de versión de la foto (para cambiar la URL y saltar la caché del navegador), o null si no tiene. */
export async function versionFoto(usuarioId: number): Promise<number | null> {
  try {
    const r = await (await pedido())
      .input("id", sql.BigInt, usuarioId)
      .query<{ v: number }>(`SELECT DATEDIFF_BIG(second, '2020-01-01', actualizado_en) AS v FROM seguridad.usuario_cliente_foto WHERE usuario_cliente_id = @id`);
    const v = r.recordset[0]?.v;
    return v == null ? null : Number(v);
  } catch (err) {
    return traducir(err);
  }
}

export async function leerFoto(usuarioId: number): Promise<{ mime: string; bytes: Buffer } | null> {
  try {
    const r = await (await pedido())
      .input("id", sql.BigInt, usuarioId)
      .query<{ mime: string; contenido: Buffer }>(`SELECT mime, contenido FROM seguridad.usuario_cliente_foto WHERE usuario_cliente_id = @id`);
    const f = r.recordset[0];
    return f ? { mime: f.mime, bytes: f.contenido } : null;
  } catch (err) {
    return traducir(err);
  }
}

/** Guarda (o reemplaza) la foto. Devuelve la nueva versión. */
export async function guardarFoto(usuarioId: number, mime: string, bytes: Buffer): Promise<number> {
  try {
    const r = await (await pedido())
      .input("id", sql.BigInt, usuarioId)
      .input("mime", sql.VarChar(20), mime)
      .input("bytes", sql.VarBinary(sql.MAX), bytes)
      .query<{ v: number }>(
        `UPDATE seguridad.usuario_cliente_foto SET mime = @mime, contenido = @bytes, actualizado_en = SYSDATETIME() WHERE usuario_cliente_id = @id;
         IF @@ROWCOUNT = 0
           INSERT INTO seguridad.usuario_cliente_foto (usuario_cliente_id, mime, contenido) VALUES (@id, @mime, @bytes);
         SELECT DATEDIFF_BIG(second, '2020-01-01', actualizado_en) AS v FROM seguridad.usuario_cliente_foto WHERE usuario_cliente_id = @id;`
      );
    return Number(r.recordset[0]?.v ?? Date.now());
  } catch (err) {
    return traducir(err);
  }
}

export async function quitarFoto(usuarioId: number): Promise<void> {
  try {
    await (await pedido()).input("id", sql.BigInt, usuarioId).query(`DELETE FROM seguridad.usuario_cliente_foto WHERE usuario_cliente_id = @id`);
  } catch (err) {
    traducir(err);
  }
}

/** URL de la foto de la sesión, con versión para que el navegador no muestre una vieja. */
export const urlFoto = (version: number | null) => (version == null ? null : `/api/perfil/foto?v=${version}`);
