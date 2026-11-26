import "server-only";
import sql from "mssql";
import { getPoolEscritura } from "@/lib/db/pool";

// Logo de cada cliente: clientes.cliente_logo (sql/migracion-001-logo-del-cliente.sql).
// Lo escribe SOLO el panel interno (equipo DMC con rol de panel); el portal
// solo lee el logo de su propio cliente (el de la sesión).
//
// Mientras la tabla no exista, el portal usa los logos estáticos de
// LOGOS_ESTATICOS (public/clientes) y el panel avisa que no se puede guardar.

export class LogoNoDisponible extends Error {
  constructor() {
    super("Falta crear clientes.cliente_logo (sql/migracion-001-logo-del-cliente.sql).");
    this.name = "LogoNoDisponible";
  }
}

/** Logos dejados como archivo en public/clientes, por cliente_id. Respaldo hasta que exista la tabla. */
export const LOGOS_ESTATICOS: Record<number, string> = {
  5: "/clientes/5.webp", // Puma
};

/** 208 = «Invalid object name» (la tabla no existe); 229/230 = sin permiso. */
function traducir(err: unknown): never {
  const n = (err as { number?: number })?.number;
  if (n === 208 || n === 229 || n === 230) throw new LogoNoDisponible();
  throw err;
}

async function pedido() {
  return (await getPoolEscritura()).request();
}

const V = `DATEDIFF_BIG(second, '2020-01-01', actualizado_en)`;

/** Versión del logo guardado de un cliente (para la URL), o null. */
export async function versionLogo(clienteId: number): Promise<number | null> {
  try {
    const r = await (await pedido()).input("id", sql.BigInt, clienteId).query<{ v: number }>(`SELECT ${V} AS v FROM clientes.cliente_logo WHERE cliente_id = @id`);
    const v = r.recordset[0]?.v;
    return v == null ? null : Number(v);
  } catch (err) {
    return traducir(err);
  }
}

/** Versiones de todos los logos guardados (para la lista del panel). */
export async function versionesLogos(): Promise<Map<number, number>> {
  try {
    const r = await (await pedido()).query<{ id: string; v: number }>(`SELECT cliente_id AS id, ${V} AS v FROM clientes.cliente_logo`);
    return new Map(r.recordset.map((f) => [Number(f.id), Number(f.v)]));
  } catch (err) {
    return traducir(err);
  }
}

export async function leerLogo(clienteId: number): Promise<{ mime: string; bytes: Buffer } | null> {
  try {
    const r = await (await pedido())
      .input("id", sql.BigInt, clienteId)
      .query<{ mime: string; contenido: Buffer }>(`SELECT mime, contenido FROM clientes.cliente_logo WHERE cliente_id = @id`);
    const f = r.recordset[0];
    return f ? { mime: f.mime, bytes: f.contenido } : null;
  } catch (err) {
    return traducir(err);
  }
}

/** Guarda o reemplaza el logo del cliente. Devuelve la nueva versión. */
export async function guardarLogo(clienteId: number, mime: string, bytes: Buffer, usuarioId: number): Promise<number> {
  try {
    const r = await (await pedido())
      .input("id", sql.BigInt, clienteId)
      .input("mime", sql.VarChar(20), mime)
      .input("bytes", sql.VarBinary(sql.MAX), bytes)
      .input("usuario", sql.BigInt, usuarioId)
      .query<{ v: number }>(
        `UPDATE clientes.cliente_logo SET mime = @mime, contenido = @bytes, actualizado_en = SYSDATETIME(), actualizado_por = @usuario WHERE cliente_id = @id;
         IF @@ROWCOUNT = 0
           INSERT INTO clientes.cliente_logo (cliente_id, mime, contenido, actualizado_por) VALUES (@id, @mime, @bytes, @usuario);
         SELECT ${V} AS v FROM clientes.cliente_logo WHERE cliente_id = @id;`
      );
    return Number(r.recordset[0]?.v ?? Date.now());
  } catch (err) {
    return traducir(err);
  }
}

export async function quitarLogo(clienteId: number): Promise<void> {
  try {
    await (await pedido()).input("id", sql.BigInt, clienteId).query(`DELETE FROM clientes.cliente_logo WHERE cliente_id = @id`);
  } catch (err) {
    traducir(err);
  }
}

/** URL del logo para el PORTAL (siempre el del cliente de la sesión): guardado → estático → null. */
export function urlLogoPortal(clienteId: number, version: number | null): string | null {
  if (version != null) return `/api/cliente/logo?v=${version}`;
  return LOGOS_ESTATICOS[clienteId] ?? null;
}

/** URL del logo de cualquier cliente para el PANEL. */
export function urlLogoPanel(clienteId: number, version: number | null): string | null {
  if (version != null) return `/api/panel/clientes/${clienteId}/logo?v=${version}`;
  return LOGOS_ESTATICOS[clienteId] ?? null;
}

/** Procesa la imagen subida: valida por bytes y la deja en WebP de máx. 256 px conservando transparencia. */
export async function prepararLogo(bytes: Uint8Array): Promise<Buffer | null> {
  const b = bytes;
  const esImagen =
    (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
    (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) ||
    (String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP");
  if (!esImagen) return null;
  const { default: sharp } = await import("sharp");
  try {
    return await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(256, 256, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer();
  } catch {
    return null;
  }
}
