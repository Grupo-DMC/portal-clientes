import { log } from "@/lib/log";
import { mantenimientoDmc, respuestaMantenimiento } from "@/lib/mantenimiento";
import { LogoNoDisponible, guardarLogo, leerLogo, prepararLogo, quitarLogo, urlLogoPanel } from "@/lib/server/logoCliente";
import { sesionPanel } from "@/lib/server/portalSesion";

// /api/panel/clientes/:id/logo — logo de un cliente, gestionado por el equipo DMC.
//   GET    → la imagen guardada.
//   POST   → multipart «logo»: PNG, JPG o WEBP de hasta 3 MB; se guarda como WebP de máx. 256 px.
//   DELETE → quita el logo guardado.
// Solo cuentas del panel (seguridad.usuario con rol ADMIN o COORDINADOR), validadas contra la base.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024;
const sinCache = { "Cache-Control": "no-store" };
const ID = /^\d{1,18}$/;
const error = (status: number, mensaje: string, codigo: string) => Response.json({ error: mensaje, codigo }, { status, headers: sinCache });
const noDisponible = () =>
  error(503, "Todavía no se pueden guardar logos: falta crear la tabla clientes.cliente_logo en la base.", "LOGO_NO_DISPONIBLE");

async function autorizar(idParam: string): Promise<{ clienteId: number; usuarioId: number } | Response> {
  if (mantenimientoDmc()) return respuestaMantenimiento();
  const ses = await sesionPanel();
  if (!ses || ses.cuenta.debeCambiarPassword) return new Response("No autorizado", { status: 401, headers: sinCache });
  if (!ID.test(idParam)) return new Response("No encontrado", { status: 404, headers: sinCache });
  return { clienteId: Number(idParam), usuarioId: ses.cuenta.id };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await autorizar((await params).id);
  if (a instanceof Response) return a;
  try {
    const logo = await leerLogo(a.clienteId);
    if (!logo) return new Response("Sin logo", { status: 404, headers: sinCache });
    return new Response(new Uint8Array(logo.bytes), {
      headers: { "Content-Type": logo.mime, "Content-Length": String(logo.bytes.length), "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    if (!(err instanceof LogoNoDisponible)) log.error("api.panel.logo", { err });
    return new Response("Sin logo", { status: 404, headers: sinCache });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await autorizar((await params).id);
  if (a instanceof Response) return a;

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) return error(413, "El logo debe pesar menos de 3 MB.", "LOGO_MUY_GRANDE");
  let archivo: File | null = null;
  try {
    const f = (await req.formData()).get("logo");
    archivo = f instanceof File ? f : null;
  } catch {
    return error(400, "No recibimos el archivo. Inténtalo de nuevo.", "LOGO_INVALIDO");
  }
  if (!archivo || archivo.size === 0) return error(400, "Elige una imagen.", "LOGO_INVALIDO");
  if (archivo.size > MAX_BYTES) return error(413, "El logo debe pesar menos de 3 MB.", "LOGO_MUY_GRANDE");

  const webp = await prepararLogo(new Uint8Array(await archivo.arrayBuffer()));
  if (!webp) return error(415, "Usa una imagen PNG, JPG o WEBP.", "LOGO_TIPO");

  try {
    const version = await guardarLogo(a.clienteId, "image/webp", webp, a.usuarioId);
    log.info("panel.logo", { usuarioId: a.usuarioId, clienteId: a.clienteId, bytes: webp.length });
    return Response.json({ url: urlLogoPanel(a.clienteId, version) }, { headers: sinCache });
  } catch (err) {
    if (err instanceof LogoNoDisponible) return noDisponible();
    // 547: el cliente no existe (FK).
    if ((err as { number?: number })?.number === 547) return error(404, "El cliente no existe.", "CLIENTE_NO_EXISTE");
    log.error("api.panel.logo", { err, clienteId: a.clienteId });
    return error(503, "No pudimos guardar el logo. Inténtalo de nuevo.", "LOGO_ERROR");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await autorizar((await params).id);
  if (a instanceof Response) return a;
  try {
    await quitarLogo(a.clienteId);
    log.info("panel.logo.quitar", { usuarioId: a.usuarioId, clienteId: a.clienteId });
    return Response.json({ url: urlLogoPanel(a.clienteId, null) }, { headers: sinCache });
  } catch (err) {
    if (err instanceof LogoNoDisponible) return noDisponible();
    log.error("api.panel.logo", { err, clienteId: a.clienteId });
    return error(503, "No pudimos quitar el logo. Inténtalo de nuevo.", "LOGO_ERROR");
  }
}
