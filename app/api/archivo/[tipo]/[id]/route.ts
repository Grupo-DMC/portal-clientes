import sharp from "sharp";
import { TRAMO, extension, inicioDeRango, leerArchivo, leerCompleto, leerTramo, mimeReproducible, mimeSeguro, parsearRango } from "@/lib/data/portal/archivos";
import { idCliente } from "@/lib/data/sql";
import { log } from "@/lib/log";
import { sesionApiPortal } from "@/lib/server/apiPortal";

// GET /api/archivo/:tipo/:id — foto, video o firma de una visita del cliente de la sesión.
//   tipo: foto | video | firma_tecnico | firma_tienda
//   ?descarga=1 → Content-Disposition: attachment (con su tipo y extensión originales)
//   ?mini=1     → miniatura WebP de 480 px (fotos y firmas), para las grillas
// Range: se responde UN tramo (hasta 4 MiB) por pedido, leído en la misma consulta
// que valida el archivo: un video empieza a reproducirse tras una sola ida a la base.
// Sin Range se envía el archivo completo, a tramos, sin juntarlo en memoria.
// Un archivo que no es del cliente responde 404, igual que uno que no existe.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Los archivos de una visita no cambian (mismo id, mismos bytes): se dejan en la
 * caché PRIVADA del navegador una hora, para no volver a pedirlos a la base al
 * navegar entre fotos o al reabrir el acta. Nunca en cachés compartidas.
 */
const CACHE = "private, max-age=3600";
const MINI_LADO = 480;

const sinCache = { "Cache-Control": "no-store" };
const noEncontrado = () => new Response("No encontrado", { status: 404, headers: sinCache });

export async function GET(req: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const { tipo, id } = await params;

  // Cuenta DMC en mantenimiento → 503 MANTENIMIENTO_DMC (también en proxy.ts); sin sesión de cliente → 401.
  const auth = await sesionApiPortal();
  if ("rechazo" in auth) return auth.rechazo;
  const { ses } = auth;
  const cliente = idCliente(ses.ctx.clienteIdBd);
  const url = new URL(req.url);
  const usuarioId = ses.cookie?.uc ?? null;

  // ── Miniatura ──
  if (url.searchParams.get("mini") === "1" && tipo.toLowerCase() !== "video") {
    try {
      const archivo = await leerCompleto(cliente, tipo, id);
      if (!archivo) return noEncontrado();
      const mini = await sharp(archivo.bytes, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(MINI_LADO, MINI_LADO, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer();
      return new Response(new Uint8Array(mini), {
        headers: { "Content-Type": "image/webp", "Content-Length": String(mini.length), "Cache-Control": CACHE, "X-Content-Type-Options": "nosniff" },
      });
    } catch (err) {
      log.error("api.archivo.mini", { err, usuarioId });
      return new Response("No se pudo leer el archivo", { status: 503, headers: sinCache });
    }
  }

  const cabeceraRango = req.headers.get("range");
  let primera;
  try {
    primera = await leerArchivo(cliente, tipo, id, inicioDeRango(cabeceraRango));
  } catch (err) {
    log.error("api.archivo", { err, usuarioId });
    return new Response("No se pudo leer el archivo", { status: 503, headers: sinCache });
  }
  if (!primera) return noEncontrado();

  const total = primera.largo;
  const rango = parsearRango(cabeceraRango, total);
  if (rango === "invalido") {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}`, ...sinCache } });
  }

  const descarga = url.searchParams.get("descarga") === "1" || mimeSeguro(primera.mime) === "application/octet-stream";
  const nombre = `${tipo.toLowerCase()}-${primera.id}.${extension(primera.mime)}`;
  const headers: Record<string, string> = {
    "Content-Type": descarga ? mimeSeguro(primera.mime) : mimeReproducible(primera.mime),
    "Accept-Ranges": "bytes",
    "Content-Disposition": `${descarga ? "attachment" : "inline"}; filename="${nombre}"`,
    "Cache-Control": CACHE,
    "X-Content-Type-Options": "nosniff",
  };

  // ── Con Range: un tramo, ya leído en la primera consulta salvo «bytes=-N» ──
  if (rango) {
    const [inicio, finPedido] = rango;
    const fin = Math.min(finPedido, inicio + TRAMO - 1);
    let trozo: Buffer;
    try {
      trozo = inicio === inicioDeRango(cabeceraRango) && primera.trozo.length >= fin - inicio + 1
        ? primera.trozo.subarray(0, fin - inicio + 1)
        : await leerTramo(cliente, primera, inicio, fin - inicio + 1);
    } catch (err) {
      log.error("api.archivo", { err, usuarioId, aviso: "falló el tramo" });
      return new Response("No se pudo leer el archivo", { status: 503, headers: sinCache });
    }
    headers["Content-Length"] = String(trozo.length);
    headers["Content-Range"] = `bytes ${inicio}-${inicio + trozo.length - 1}/${total}`;
    return new Response(new Uint8Array(trozo), { status: 206, headers });
  }

  // ── Sin Range: el archivo completo. Si cupo en la primera lectura, de una vez. ──
  headers["Content-Length"] = String(total);
  if (primera.trozo.length >= total) return new Response(new Uint8Array(primera.trozo), { status: 200, headers });

  let pos = 0;
  let primeroEnviado = false;
  const cuerpo = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!primeroEnviado) {
        primeroEnviado = true;
        pos = primera.trozo.length;
        controller.enqueue(new Uint8Array(primera.trozo));
        return;
      }
      if (pos >= total) {
        controller.close();
        return;
      }
      try {
        const trozo = await leerTramo(cliente, primera, pos, Math.min(TRAMO, total - pos));
        if (trozo.length === 0) {
          controller.close();
          return;
        }
        pos += trozo.length;
        controller.enqueue(new Uint8Array(trozo));
      } catch (err) {
        log.error("api.archivo", { err, usuarioId, aviso: "falló un tramo" });
        controller.error(err);
      }
    },
  });
  return new Response(cuerpo, { status: 200, headers });
}
