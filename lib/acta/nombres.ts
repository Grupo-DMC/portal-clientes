// Nombres de archivo del acta y su multimedia. Portado de sys_tecnicos
// (lib/ui/nombre-acta.ts) para que el cliente reciba los mismos nombres:
//   «Razón social - Sucursal.pdf» y «Multimedia razón social sucursal.zip».

/** Tope del nombre sin la extensión: Windows admite 255, pero la ruta completa también cuenta. */
const LARGO_MAXIMO = 150;

/** Nombres que Windows reserva a dispositivos, con o sin extensión. */
const RESERVADOS = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

/** Quita lo que Windows no admite en un nombre de archivo y los saltos de línea. */
export function sanearNombre(s: string | undefined | null): string {
  return String(s ?? "")
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Recorta por puntos de código; sin punto ni espacio final ni nombres reservados. */
export function acotarNombre(s: string, largo = LARGO_MAXIMO): string {
  const base = Array.from(s).slice(0, largo).join("").replace(/[\s.-]+$/, "");
  return RESERVADOS.test(base) ? `${base}_` : base;
}

export interface DatosNombre {
  folio: string;
  sucursal: string;
  /** Razón social del cliente; si no hay, el nombre de fantasía. */
  cliente: string;
}

export function nombreArchivoActa(v: DatosNombre): string {
  const partes = [sanearNombre(v.cliente), sanearNombre(v.sucursal)].filter(Boolean);
  if (!partes.length) partes.push(sanearNombre(`Acta ${v.folio}`));
  return `${acotarNombre(partes.join(" - ")) || "Acta"}.pdf`;
}

export function nombreZipMultimedia(v: DatosNombre): string {
  const partes = ["Multimedia", sanearNombre(v.cliente), sanearNombre(v.sucursal)].filter(Boolean);
  if (partes.length === 1) partes.push(sanearNombre(v.folio));
  return `${acotarNombre(partes.join(" "))}.zip`;
}

/** Content-Disposition con nombre UTF-8 (RFC 6266/5987) y respaldo ASCII. */
export function dispositionAdjunto(nombre: string): string {
  const ascii = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}
