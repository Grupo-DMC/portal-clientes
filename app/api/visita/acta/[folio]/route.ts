import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { seed } from "@/lib/data";
import { fl, maskRut } from "@/lib/format";
import { puede, resolverUsuarioPortal, sucursalesVisibles } from "@/lib/portal";
import { activeAcct } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";

/** Folios: «V-20961» (histórico) y «V-2026-01064». */
const FOLIO = /^V-(\d{4,6}|\d{4}-\d{5})$/;
const PURPLE = rgb(0x76 / 255, 0x22 / 255, 0x82 / 255);
const INK = rgb(0x1f / 255, 0x1c / 255, 0x21 / 255);
const MUTED = rgb(0x5f / 255, 0x5b / 255, 0x63 / 255);
const LINE = rgb(0xd6 / 255, 0xd3 / 255, 0xd9 / 255);

/** Acta de la visita técnica en PDF. Solo la ve quien tiene acceso a esa sucursal. */
export async function GET(_req: Request, { params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params;
  if (!FOLIO.test(folio)) return new Response("Folio no válido", { status: 400 });
  const ses = await getSession();
  if (!ses) return new Response("No autorizado", { status: 401 });

  const db = seed();
  const v = db.visitas.find((x) => x.id === folio);
  if (!v) return new Response("No encontrada", { status: 404 });
  const suc = db.sucursales.find((s) => s.id === v.suc)!;

  // Control de acceso por superficie y alcance (en el portal, el mismo que la interfaz: sucursales visibles y permiso «visitas»)
  if (ses.k === "local" && ses.id !== suc.id) return new Response("Prohibido", { status: 403 });
  if (ses.k === "portal") {
    const a = activeAcct("portal", ses.id);
    const u = a ? resolverUsuarioPortal(db, { email: a.email, name: a.name, perfil: a.perfil }) : null;
    const ok = !!a && !!u && suc.cli === a.clienteId && puede(u, "visitas") && sucursalesVisibles(db, u).some((s) => s.id === suc.id);
    if (!ok) return new Response("Prohibido", { status: 403 });
  }
  // El acta solo existe cuando la visita se completó.
  if (v.estado !== "completada") return new Response("El acta solo está disponible para visitas completadas", { status: 409 });
  const cli = db.clients.find((c) => c.id === suc.cli)!;
  const mall = db.malls.find((m) => m.id === suc.mall);
  const ubic = mall ? `${mall.n}, ${suc.local} - ${mall.dir}, ${mall.com}` : `${suc.calle}, ${suc.com}`;

  const doc = await PDFDocument.create();
  doc.setTitle(`Acta de visita ${v.id}`);
  doc.setAuthor("Grupo DMC");
  const page = doc.addPage([595, 842]);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const M = 48;
  let y = 842 - 48;

  try {
    const png = await doc.embedPng(await readFile(path.join(process.cwd(), "public", "DMC-logo.png")));
    const s = 44 / png.height;
    page.drawImage(png, { x: M, y: y - 44, width: png.width * s, height: 44 });
  } catch { /* sin logo: el acta igual se genera */ }
  page.drawText("ACTA DE VISITA TECNICA".replace("TECNICA", "TÉCNICA"), { x: 595 - M - 210, y: y - 14, size: 13, font: bold, color: INK });
  page.drawText(`Folio ${v.id}`, { x: 595 - M - 210, y: y - 30, size: 10, font: reg, color: MUTED });
  y -= 62;
  page.drawRectangle({ x: M, y, width: 595 - 2 * M, height: 3, color: PURPLE });
  y -= 26;

  const kv = (label: string, value: string, x: number, yy: number, w = 230) => {
    page.drawText(label.toUpperCase(), { x, y: yy, size: 7.5, font: bold, color: MUTED });
    wrap(page, value, reg, 10.5, x, yy - 13, w).forEach((ln, i) => page.drawText(ln, { x, y: yy - 13 - i * 13, size: 10.5, font: reg, color: INK }));
  };
  kv("Cliente", cli.rs, M, y); kv("RUT", cli.rutStr, M + 280, y);
  y -= 40;
  kv("Sucursal", `${suc.n} (${suc.cod})`, M, y); kv("Fecha", fl(v.f), M + 280, y);
  y -= 40;
  kv("Ubicación", ubic, M, y, 460);
  y -= 40;
  kv("Tipo de visita", v.tipo, M, y); kv("Técnico", v.tec, M + 280, y);
  y -= 44;

  section(page, "Trabajo realizado", y, bold); y -= 20;
  for (const ln of wrap(page, v.res, reg, 10.5, M, y, 495)) { page.drawText(ln, { x: M, y, size: 10.5, font: reg, color: INK }); y -= 14; }
  y -= 14;

  const det = v.detalle;
  if (det) {
    section(page, "Trabajos registrados", y, bold); y -= 18;
    page.drawText(`Horario: ${det.inicio} a ${det.fin}`, { x: M, y, size: 10, font: reg, color: MUTED }); y -= 18;
    for (const t of det.trabajos) {
      page.drawText(t.titulo, { x: M, y, size: 10.5, font: bold, color: INK }); y -= 15;
      for (const it of t.items) {
        const q = `x ${it.c}`;
        page.drawText(it.n, { x: M + 10, y, size: 10, font: reg, color: INK });
        page.drawText(q, { x: 595 - M - reg.widthOfTextAtSize(q, 10), y, size: 10, font: reg, color: INK });
        y -= 14;
      }
      y -= 6;
    }
    page.drawText(det.problemas.length ? `Problemas levantados: ${det.problemas.length}` : "Sin problemas registrados.", { x: M, y, size: 10.5, font: reg, color: INK });
    y -= 20;
  } else { section(page, "Informe del técnico", y, bold); y -= 18; }
  const chk = det ? [] : ["Prueba de detección con etiquetas AM", "Ajuste de sensibilidad", "Revisión de cableado y fuente", "Prueba de desactivador", "Contador reportando a plataforma"];
  chk.forEach((t, i) => {
    const res = i === 4 && v.tipo === "Correctiva" ? "Observación" : "OK";
    page.drawText(t, { x: M, y, size: 10.5, font: reg, color: INK });
    page.drawText(res, { x: 595 - M - bold.widthOfTextAtSize(res, 10.5), y, size: 10.5, font: bold, color: INK });
    page.drawLine({ start: { x: M, y: y - 6 }, end: { x: 595 - M, y: y - 6 }, thickness: 0.5, color: LINE });
    y -= 20;
  });
  y -= 30;

  page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.8, color: INK });
  page.drawLine({ start: { x: 595 - M - 200, y }, end: { x: 595 - M, y }, thickness: 0.8, color: INK });
  page.drawText(`Técnico: ${v.tec}`, { x: M, y: y - 14, size: 9, font: reg, color: MUTED });
  const rec = det?.firma ? `${det.firma.nombre} (RUT ${maskRut(det.firma.rut)})` : (db.personal[suc.id] ?? [{ n: "Personal del local" }])[0].n;
  page.drawText(`Recibe: ${rec}`, { x: 595 - M - 200, y: y - 14, size: 9, font: reg, color: MUTED });

  page.drawText("Grupo DMC · Ideas tecnológicas de seguridad · Documento generado por DMC Clientes", { x: M, y: 30, size: 8, font: reg, color: MUTED });

  const bytes = await doc.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="acta-${v.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function section(page: PDFPage, title: string, y: number, font: PDFFont) {
  page.drawText(title, { x: 48, y, size: 12, font, color: PURPLE });
}

function wrap(_page: PDFPage, text: string, font: PDFFont, size: number, _x: number, _y: number, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const t = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
