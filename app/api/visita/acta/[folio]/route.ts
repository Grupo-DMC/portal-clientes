import { datosNombre, datosPdfActa } from "@/lib/data/portal/acta";
import { detalleVisita } from "@/lib/data/portal";
import { idCliente } from "@/lib/data/sql";
import { dispositionAdjunto, nombreArchivoActa } from "@/lib/acta/nombres";
import { log } from "@/lib/log";
import { generarPdfActa } from "@/lib/pdf/acta";
import { sesionApiPortal } from "@/lib/server/apiPortal";

// GET /api/visita/acta/:folio — el acta en PDF que recibe el cliente, SIN
// comentarios internos (mismo documento que «Acta en PDF» de sys_tecnicos).
// Solo de una visita del cliente de la sesión: otra responde 404.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ folio: string }> }) {
  const auth = await sesionApiPortal();
  if ("rechazo" in auth) return auth.rechazo;
  const { ses } = auth;
  const { folio } = await params;

  try {
    const visita = await detalleVisita(ses.ctx, decodeURIComponent(folio));
    if (!visita) return new Response("No encontrada", { status: 404, headers: { "Cache-Control": "no-store" } });
    if (visita.estado !== "completada") return new Response("El acta todavía no está cerrada.", { status: 409, headers: { "Cache-Control": "no-store" } });

    const pdf = await generarPdfActa(await datosPdfActa(idCliente(ses.ctx.clienteIdBd), visita, ses.cliente));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": dispositionAdjunto(nombreArchivoActa(datosNombre(visita, ses.cliente))),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    log.error("api.acta.pdf", { err, usuarioId: ses.cookie?.uc ?? null });
    return new Response("No se pudo generar el PDF.", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
