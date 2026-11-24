import "server-only";
import type { ClientePortalDto, VisitaCompletaDto } from "@/lib/contratos/portal";
import type { DatosNombre } from "@/lib/acta/nombres";
import type { DatosPdfActa, ImagenActa } from "@/lib/pdf/acta";
import type { EntradaZip } from "@/lib/zip/stream";
import { TRAMO, extension, leerArchivo, leerCompleto, leerTramo } from "./archivos";

// El acta descargable del cliente (PDF y .zip de multimedia), armada SOLO con lo
// que ya pasó el filtro por cliente: el detalle de detalleVisita() y los archivos
// de portal.v_visita_archivo, que excluyen el comentario interno y lo marcado
// como interno. Mismo criterio que sys_tecnicos (pdfDeVisita, archivosMultimedia).

/** Fotos del acta: las del trabajo, en el orden de la vista (las de problemas van con su problema, pero igual son del cliente). */
export const fotosDelActa = (v: VisitaCompletaDto) => v.archivos.filter((a) => a.tipo === "FOTO");
export const videosDelActa = (v: VisitaCompletaDto) => v.archivos.filter((a) => a.tipo === "VIDEO");
const firmaTienda = (v: VisitaCompletaDto) => v.archivos.find((a) => a.tipo === "FIRMA_TIENDA") ?? v.archivos.find((a) => a.tipo.startsWith("FIRMA_")) ?? null;

export function datosNombre(v: VisitaCompletaDto, cliente: ClientePortalDto | null | undefined): DatosNombre {
  return { folio: v.folio, sucursal: v.sucursal, cliente: cliente?.razonSocial || cliente?.nombre || "" };
}

/** Lee varias imágenes con a lo más `n` consultas en vuelo (el pool tiene pocas conexiones). */
async function leerImagenes(clienteId: number, items: { tipo: string; id: string; etiqueta: string | null }[], n = 3): Promise<(ImagenActa | null)[]> {
  const salida: (ImagenActa | null)[] = new Array(items.length).fill(null);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      for (let i = siguiente++; i < items.length; i = siguiente++) {
        const it = items[i];
        const a = await leerCompleto(clienteId, it.tipo.toLowerCase(), it.id).catch(() => null);
        salida[i] = a ? { bytes: new Uint8Array(a.bytes), mime: a.mime, etiqueta: it.etiqueta } : null;
      }
    })
  );
  return salida;
}

/** Problemas: «Equipo A × 2, Equipo B» → chips. */
const itemsDe = (texto: string | null) => (texto ? texto.split(/\s*[,;]\s*/).filter(Boolean) : []);

export async function datosPdfActa(clienteId: number, v: VisitaCompletaDto, cliente: ClientePortalDto | null | undefined): Promise<DatosPdfActa> {
  const fotos = fotosDelActa(v);
  const firma = firmaTienda(v);
  const imagenes = await leerImagenes(clienteId, [
    ...fotos.map((f) => ({ tipo: f.tipo, id: f.id, etiqueta: f.descripcion })),
    ...(firma ? [{ tipo: firma.tipo, id: firma.id, etiqueta: null }] : []),
  ]);
  const real = v.motivos.filter((m) => m.ambito === "REAL").map((m) => m.motivo);
  const plan = v.motivos.filter((m) => m.ambito !== "REAL").map((m) => m.motivo);

  return {
    folio: v.folio,
    cliente: cliente?.nombre || cliente?.razonSocial || "",
    marca: v.marca,
    sucursal: { nombre: v.sucursal, codigo: v.sucursalCodigo ?? null, direccion: v.direccion, comuna: v.comuna, region: v.region },
    mall: v.mall ?? null,
    fechaISO: v.fechaISO ?? null,
    horaInicio: v.horaInicio,
    horaTermino: v.horaTermino,
    duracionMin: v.duracionMin,
    // Los motivos que confirmó el técnico en terreno; si no hay, los agendados (como en sys_tecnicos).
    motivos: real.length ? real : plan.length ? plan : [v.motivo].filter(Boolean),
    trabajos: v.trabajos.map((t) => ({ trabajo: t.trabajo, subtrabajos: t.subtrabajos, detalle: t.detalle })),
    detalle: v.observaciones,
    problemas: v.problemas.map((p) => ({ tipo: p.tipo, items: itemsDe(p.items), descripcion: p.descripcion, solucion: p.solucion })),
    tecnico: v.tecnico,
    tecnicoAyudante: v.tecnicoAyudante,
    responsable: v.responsable,
    firma: firma
      ? { nombre: firma.descripcion, rut: firma.rut ?? null, firmadoEn: firma.fecha, imagen: imagenes[fotos.length] ?? null }
      : null,
    fotos: imagenes.slice(0, fotos.length).filter((x): x is ImagenActa => x !== null),
  };
}

/** Lee un archivo a tramos de la base (para el .zip): nunca más de TRAMO bytes en memoria. */
async function* trozosDe(clienteId: number, tipo: string, id: string): AsyncGenerator<Uint8Array> {
  const primero = await leerArchivo(clienteId, tipo, id);
  if (!primero) throw new Error("El archivo ya no está disponible.");
  yield new Uint8Array(primero.trozo);
  let pos = primero.trozo.length;
  while (pos < primero.largo) {
    const t = await leerTramo(clienteId, primero, pos, Math.min(TRAMO, primero.largo - pos));
    if (!t.length) throw new Error("El archivo terminó antes de lo esperado.");
    pos += t.length;
    yield new Uint8Array(t);
  }
}

/** Entradas del .zip de multimedia: «Foto N.jpg» y «Video N.mov», solo material para el cliente. */
export function entradasMultimedia(clienteId: number, v: VisitaCompletaDto): EntradaZip[] {
  const fotos = fotosDelActa(v).map((a, i) => ({ a, nombre: `Foto ${i + 1}.${extension(a.mime)}` }));
  const videos = videosDelActa(v).map((a, i) => ({ a, nombre: `Video ${i + 1}.${extension(a.mime)}` }));
  return [...fotos, ...videos].map(({ a, nombre }) => ({ nombre, trozos: () => trozosDe(clienteId, a.tipo.toLowerCase(), a.id) }));
}
