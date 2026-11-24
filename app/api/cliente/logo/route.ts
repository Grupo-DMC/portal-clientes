import { log } from "@/lib/log";
import { sesionApiPortal } from "@/lib/server/apiPortal";
import { LogoNoDisponible, leerLogo } from "@/lib/server/logoCliente";

// GET /api/cliente/logo — logo del cliente de la sesión (nunca de otro: el id sale de la sesión).
// La URL lleva ?v=<versión>, así que se puede guardar largo en la caché privada.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await sesionApiPortal();
  if ("rechazo" in auth) return auth.rechazo;
  try {
    const logo = auth.ses.ctx.clienteIdBd ? await leerLogo(auth.ses.ctx.clienteIdBd) : null;
    if (!logo) return new Response("Sin logo", { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(new Uint8Array(logo.bytes), {
      headers: { "Content-Type": logo.mime, "Content-Length": String(logo.bytes.length), "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    if (!(err instanceof LogoNoDisponible)) log.error("api.cliente.logo", { err });
    return new Response("Sin logo", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
