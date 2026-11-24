import sharp from "sharp";
import { log } from "@/lib/log";
import { sesionApiPortal } from "@/lib/server/apiPortal";
import { FotoNoDisponible, guardarFoto, leerFoto, quitarFoto, urlFoto } from "@/lib/server/fotoPerfil";

// /api/perfil/foto — foto de perfil de la cuenta de la sesión (nunca de otra).
//   GET    → la imagen (WebP). ?v=<versión> en la URL: caché privada larga.
//   POST   → multipart «foto»: JPG, PNG o WEBP de hasta 5 MB. Se valida por los
//            bytes (no solo por el tipo declarado), se reorienta, se reduce a
//            512 px y se guarda como WebP (~30–60 KB).
//   DELETE → quita la foto.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const LADO = 512;
const sinCache = { "Cache-Control": "no-store" };

const error = (status: number, mensaje: string, codigo: string) => Response.json({ error: mensaje, codigo }, { status, headers: sinCache });
const noDisponible = () => error(503, "Todavía no se pueden guardar fotos de perfil. Ya avisamos al equipo de DMC.", "FOTO_NO_DISPONIBLE");

/** Tipo real por la firma de los bytes. */
function tipoReal(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function GET() {
  const auth = await sesionApiPortal();
  if ("rechazo" in auth) return auth.rechazo;
  try {
    const foto = await leerFoto(auth.ses.cookie.uc!);
    if (!foto) return new Response("Sin foto", { status: 404, headers: sinCache });
    return new Response(new Uint8Array(foto.bytes), {
      headers: { "Content-Type": foto.mime, "Content-Length": String(foto.bytes.length), "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    if (err instanceof FotoNoDisponible) return new Response("Sin foto", { status: 404, headers: sinCache });
    log.error("api.perfil.foto", { err });
    return new Response("No se pudo leer la foto", { status: 503, headers: sinCache });
  }
}

export async function POST(req: Request) {
  const auth = await sesionApiPortal();
  if ("rechazo" in auth) return auth.rechazo;
  const usuarioId = auth.ses.cookie.uc!;

  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > MAX_BYTES + 64 * 1024) return error(413, "La foto debe pesar menos de 5 MB.", "FOTO_MUY_GRANDE");

  let archivo: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("foto");
    archivo = f instanceof File ? f : null;
  } catch {
    return error(400, "No recibimos la foto. Inténtalo de nuevo.", "FOTO_INVALIDA");
  }
  if (!archivo || archivo.size === 0) return error(400, "Elige una foto.", "FOTO_INVALIDA");
  if (archivo.size > MAX_BYTES) return error(413, "La foto debe pesar menos de 5 MB.", "FOTO_MUY_GRANDE");

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  if (!tipoReal(bytes)) return error(415, "Usa una imagen JPG, PNG o WEBP.", "FOTO_TIPO");

  let webp: Buffer;
  try {
    webp = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(LADO, LADO, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return error(415, "No pudimos leer esa imagen. Prueba con otra foto.", "FOTO_TIPO");
  }

  try {
    const version = await guardarFoto(usuarioId, "image/webp", webp);
    log.info("perfil.foto", { usuarioId, bytes: webp.length });
    return Response.json({ url: urlFoto(version) }, { headers: sinCache });
  } catch (err) {
    if (err instanceof FotoNoDisponible) return noDisponible();
    log.error("api.perfil.foto", { err, usuarioId });
    return error(503, "No pudimos guardar la foto. Inténtalo de nuevo en unos minutos.", "FOTO_ERROR");
  }
}

export async function DELETE() {
  const auth = await sesionApiPortal();
  if ("rechazo" in auth) return auth.rechazo;
  try {
    await quitarFoto(auth.ses.cookie.uc!);
    return Response.json({ url: null }, { headers: sinCache });
  } catch (err) {
    if (err instanceof FotoNoDisponible) return noDisponible();
    log.error("api.perfil.foto", { err });
    return error(503, "No pudimos quitar la foto. Inténtalo de nuevo.", "FOTO_ERROR");
  }
}
