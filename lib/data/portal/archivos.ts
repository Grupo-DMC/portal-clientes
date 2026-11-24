import "server-only";
import { consultaDeCliente, num, numONull, sql, type TablaBinaria } from "@/lib/data/sql";

// Descarga de fotos, videos y firmas de una visita, SOLO del cliente de la sesión.
//
// 1. El archivo debe existir en portal.v_visita_archivo con ese cliente_id (la
//    vista ya excluye lo interno e inactivo).
// 2. El binario se lee de la columna `contenido` de tecnico.visita_foto,
//    tecnico.visita_video o tecnico.visita_firma, a tramos (SUBSTRING), y cada
//    lectura vuelve a exigir que el archivo esté en la vista con el cliente de la
//    sesión (JOIN o EXISTS). Ninguna consulta lee un binario sin filtrar por cliente.
//
// Rendimiento: DMC_Core está lejos (~0,35 s por ida y vuelta, ~0,7 s con el
// reinicio de la conexión). Antes cada foto costaba tres consultas (mime, largo
// y el tramo); ahora una sola trae el tipo, el largo y el primer tramo.

interface TipoArchivo {
  /** Valor de portal.v_visita_archivo.tipo */
  vista: "FOTO" | "VIDEO" | "FIRMA_TECNICO" | "FIRMA_TIENDA";
  tabla: TablaBinaria;
}

/** Tipos admitidos en la URL (/api/archivo/:tipo/:id), en minúsculas. */
export const TIPOS_ARCHIVO: Record<string, TipoArchivo> = {
  foto: { vista: "FOTO", tabla: "tecnico.visita_foto" },
  video: { vista: "VIDEO", tabla: "tecnico.visita_video" },
  firma_tecnico: { vista: "FIRMA_TECNICO", tabla: "tecnico.visita_firma" },
  firma_tienda: { vista: "FIRMA_TIENDA", tabla: "tecnico.visita_firma" },
};

/**
 * Tamaño de cada tramo leído de la base. Un video llega a 25 MB: con 4 MiB son
 * a lo más 7 idas y vueltas, y una foto o firma sale entera en la primera.
 */
export const TRAMO = 4 * 1024 * 1024;

const ID = /^\d{1,18}$/;

export interface InfoArchivo {
  tipo: TipoArchivo;
  id: string;
  mime: string;
  /** Bytes reales del binario (DATALENGTH(contenido)). */
  largo: number;
}

export interface LecturaArchivo extends InfoArchivo {
  /** Bytes [desde, desde + trozo.length). Puede venir vacío si `desde` pasa del final. */
  trozo: Buffer;
}

export function tipoArchivo(tipoUrl: string): TipoArchivo | null {
  return TIPOS_ARCHIVO[tipoUrl.toLowerCase()] ?? null;
}

/**
 * Tipo, largo y un tramo del archivo en UNA consulta. null si no existe, es de
 * otro cliente o no tiene contenido. `desde` en base 0; `largo` 0 = solo metadatos.
 */
export async function leerArchivo(clienteId: number, tipoUrl: string, id: string, desde = 0, largo = TRAMO): Promise<LecturaArchivo | null> {
  const tipo = tipoArchivo(tipoUrl);
  if (!tipo || !ID.test(id)) return null;

  const [fila] = await consultaDeCliente<{ mime: string; largo: string | number | null; trozo: Buffer | null }>(
    clienteId,
    `SELECT TOP (1) a.mime, DATALENGTH(t.contenido) AS largo,
            CASE WHEN @largo > 0 THEN SUBSTRING(t.contenido, @desde, @largo) END AS trozo
       FROM portal.v_visita_archivo a
       JOIN ${tipo.tabla} t ON t.id = a.archivo_id AND t.visita_id = a.visita_id
      WHERE a.cliente_id = @__cliente_id AND a.tipo = @tipo AND a.archivo_id = @id`,
    [
      ["tipo", sql.NVarChar(20), tipo.vista],
      ["id", sql.BigInt, id],
      // SUBSTRING es base 1.
      ["desde", sql.BigInt, num(desde) + 1],
      ["largo", sql.Int, largo],
    ],
    [tipo.tabla]
  );
  const total = numONull(fila?.largo);
  if (!fila || !total) return null;
  return { tipo, id, mime: fila.mime, largo: total, trozo: fila.trozo ?? Buffer.alloc(0) };
}

/** EXISTS común: el archivo `t` está en la vista, es de ese tipo y del cliente de la sesión. */
const EXISTE_EN_VISTA = `EXISTS (SELECT 1 FROM portal.v_visita_archivo a
   WHERE a.cliente_id = @__cliente_id AND a.tipo = @tipo AND a.archivo_id = t.id AND a.visita_id = t.visita_id)`;

/** Bytes [desde, desde + largo) del archivo (desde en base 0). */
export async function leerTramo(clienteId: number, info: InfoArchivo, desde: number, largo: number): Promise<Buffer> {
  const [fila] = await consultaDeCliente<{ trozo: Buffer | null }>(
    clienteId,
    `SELECT SUBSTRING(t.contenido, @desde, @largo) AS trozo FROM ${info.tipo.tabla} t WHERE t.id = @id AND ${EXISTE_EN_VISTA}`,
    [
      ["tipo", sql.NVarChar(20), info.tipo.vista],
      ["id", sql.BigInt, info.id],
      ["desde", sql.BigInt, num(desde) + 1],
      ["largo", sql.Int, largo],
    ],
    [info.tipo.tabla]
  );
  if (!fila?.trozo) throw new Error("El archivo dejó de estar disponible mientras se descargaba.");
  return fila.trozo;
}

/** El archivo completo en memoria (fotos y firmas para el PDF y las miniaturas). Tope de seguridad: 20 MB. */
export async function leerCompleto(clienteId: number, tipoUrl: string, id: string): Promise<{ mime: string; bytes: Buffer } | null> {
  const primero = await leerArchivo(clienteId, tipoUrl, id);
  if (!primero || primero.largo > 20 * 1024 * 1024) return null;
  const partes = [primero.trozo];
  let leidos = primero.trozo.length;
  while (leidos < primero.largo) {
    const t = await leerTramo(clienteId, primero, leidos, Math.min(TRAMO, primero.largo - leidos));
    if (!t.length) break;
    partes.push(t);
    leidos += t.length;
  }
  return { mime: primero.mime, bytes: Buffer.concat(partes) };
}

/** Tipos MIME que se sirven tal cual; cualquier otro va como descarga binaria. */
const MIME_SEGUROS = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"]);

export const mimeSeguro = (mime: string) => (MIME_SEGUROS.has(mime.toLowerCase()) ? mime.toLowerCase() : "application/octet-stream");

/**
 * Tipo con que se REPRODUCE en el navegador. Los clips de iPhone llegan como
 * video/quicktime (.mov con H.264/AAC): Chrome y Firefox no reproducen ese tipo
 * declarado, pero sí el mismo contenedor como video/mp4. La descarga mantiene .mov.
 */
export const mimeReproducible = (mime: string) => {
  const m = mimeSeguro(mime);
  return m === "video/quicktime" ? "video/mp4" : m;
};

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};
export const extension = (mime: string) => EXTENSIONES[mime.toLowerCase()] ?? "bin";

/**
 * Cabecera Range de un solo tramo → [inicio, fin] incluidos.
 * null = sin Range (archivo completo); "invalido" = 416.
 */
export function parsearRango(cabecera: string | null, total: number): [number, number] | null | "invalido" {
  if (!cabecera) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(cabecera.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "invalido";
  let inicio: number;
  let fin: number;
  if (m[1] === "") {
    // bytes=-N: los últimos N bytes.
    const n = Number(m[2]);
    if (n === 0) return "invalido";
    inicio = Math.max(0, total - n);
    fin = total - 1;
  } else {
    inicio = Number(m[1]);
    fin = m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1);
  }
  if (!Number.isSafeInteger(inicio) || !Number.isSafeInteger(fin) || inicio > fin || inicio >= total) return "invalido";
  return [inicio, fin];
}

/** Inicio pedido por un Range «bytes=N-…», sin conocer el total (para leer ese tramo en la primera consulta). */
export function inicioDeRango(cabecera: string | null): number {
  const m = cabecera ? /^bytes=(\d+)-\d*$/.exec(cabecera.trim()) : null;
  const n = m ? Number(m[1]) : 0;
  return Number.isSafeInteger(n) ? n : 0;
}
