import "server-only";
import { mantenimientoDmc, respuestaMantenimiento } from "@/lib/mantenimiento";
import { sesionPortalActiva, type SesionPortal } from "@/lib/server/portalSesion";
import { getSession } from "@/lib/server/session";

/**
 * Autorización común de las rutas /api del portal: una cuenta DMC en
 * mantenimiento recibe 503 con código MANTENIMIENTO_DMC (además de proxy.ts);
 * sin sesión de cliente válida, 401. El cliente sale SIEMPRE de la sesión.
 */
export async function sesionApiPortal(): Promise<{ ses: SesionPortal } | { rechazo: Response }> {
  if (mantenimientoDmc() && (await getSession())?.k === "panel") return { rechazo: respuestaMantenimiento() };
  const ses = await sesionPortalActiva();
  if (!ses) return { rechazo: new Response("No autorizado", { status: 401, headers: { "Cache-Control": "no-store" } }) };
  return { ses };
}
