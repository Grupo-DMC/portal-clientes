import { datosNombre, entradasMultimedia } from "@/lib/data/portal/acta";
import { detalleVisita } from "@/lib/data/portal";
import { idCliente } from "@/lib/data/sql";
import { dispositionAdjunto, nombreZipMultimedia } from "@/lib/acta/nombres";
import { log } from "@/lib/log";
import { sesionApiPortal } from "@/lib/server/apiPortal";
import { zipEnStreaming } from "@/lib/zip/stream";

// GET /api/visita/multimedia/:folio — «Fotos y videos (.zip)»: solo el material
// para el cliente (portal.v_visita_archivo ya excluye lo interno). El .zip se
// arma en streaming: cada archivo se lee de la base a tramos de 4 MiB y se envía
// en el acto, sin juntar el .zip ni un video completo en memoria.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ folio: string }> }) {
  const auth = await sesionApiPortal();
  if ("rechazo" in auth) return auth.rechazo;
  const { ses } = auth;
  const { folio } = await params;
  const usuarioId = ses.cookie?.uc ?? null;

  let visita;
  try {
    visita = await detalleVisita(ses.ctx, decodeURIComponent(folio));
  } catch (err) {
    log.error("api.acta.zip", { err, usuarioId });
    return new Response("No se pudo preparar el .zip.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!visita) return new Response("No encontrada", { status: 404, headers: { "Cache-Control": "no-store" } });

  const entradas = entradasMultimedia(idCliente(ses.ctx.clienteIdBd), visita);
  if (!entradas.length) return new Response("La visita no tiene fotos ni videos para el cliente.", { status: 404, headers: { "Cache-Control": "no-store" } });

  const cuerpo = zipEnStreaming(entradas, (err, nombre) => log.error("api.acta.zip", { err, usuarioId, aviso: `falló ${nombre}` }));
  return new Response(cuerpo, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": dispositionAdjunto(nombreZipMultimedia(datosNombre(visita, ses.cliente))),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
