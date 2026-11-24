import "server-only";
import { log } from "@/lib/log";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { inflateSync } from "node:zlib";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type Color, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

/**
 * El acta de la visita en PDF para el cliente. Portado de sys_tecnicos
 * (lib/pdf/acta.ts): mismo diseño, mismas secciones 01–05 y los mismos
 * helpers de dibujo; solo cambia de dónde salen los datos (vistas portal.v_*,
 * que ya excluyen el comentario interno y los archivos internos).
 *
 * Tipografía Inter (public/fonts); sin los archivos cae a Helvetica.
 */

export interface ImagenActa {
  bytes: Uint8Array;
  mime: string;
  /** Pie de la foto ("Placa receptora de antena"). */
  etiqueta?: string | null;
}

export interface DatosPdfActa {
  folio: string;
  cliente: string;
  marca: string;
  sucursal: { nombre: string; codigo: string | null; direccion: string; comuna: string; region: string };
  mall: string | null;
  /** 'YYYY-MM-DD' */
  fechaISO: string | null;
  /** 'HH:mm' */
  horaInicio: string | null;
  horaTermino: string | null;
  duracionMin: number | null;
  motivos: string[];
  trabajos: { trabajo: string; subtrabajos: { etiqueta: string; cantidad: number }[]; detalle: string | null }[];
  /** Detalle del trabajo (observaciones del técnico, visibles para el cliente). */
  detalle: string | null;
  problemas: { tipo: string; items: string[]; descripcion: string | null; solucion: string | null }[];
  tecnico: string;
  tecnicoAyudante: string | null;
  responsable: { nombre: string; cargo: string | null } | null;
  firma: { nombre: string | null; rut: string | null; /** 'DD-MM-YYYY HH:mm' */ firmadoEn: string | null; imagen: ImagenActa | null } | null;
  /** Fotos para el cliente (nunca las internas), en el orden del acta. */
  fotos: ImagenActa[];
}

// ── Medidas (A4 en puntos) ──────────────────────────────────────────────────
const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 43.5;
const UTIL = ANCHO - MARGEN * 2;
const DERECHA = MARGEN + UTIL;
/** Línea bajo el encabezado, medida desde arriba. */
const REGLA_ENCABEZADO = 58.5;
/** Por debajo de esta altura (y de PDF) no se escribe: ahí va el pie. */
const FONDO_UTIL = 56;
/** Columna del texto cuando la primera foto va a su lado, y la de la foto. */
const COL_TEXTO = 303;
const COL_FOTO = 187.5;

// ── Paleta: tinta casi negra, el morado del logo como acento ────────────────
function hex(h: string): Color {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
const TINTA = hex("#201e1d");
const TEXTO = hex("#3d3a39");
const GRIS = hex("#7f7b7b");
const REGLA = hex("#a6a4a4");
const FILA = hex("#d7d3d3");
const MARCA = hex("#6f2c91");
const MARCA_OSCURO = hex("#4f1d6c");
const CHIP = hex("#f1e7f4");
const ALERTA = hex("#c2410c");
const ALERTA_SUAVE = hex("#fff5ee");
const ALERTA_BORDE = hex("#f3cdb6");

/**
 * Las fuentes estándar del PDF codifican en WinAnsi (Latin-1 y unos pocos
 * signos más). Un emoji o un signo raro que el técnico haya pegado haría
 * fallar todo el documento —también con Inter, que no trae esos glifos—, así
 * que se omite.
 */
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function limpio(texto: string | null | undefined): string {
  return Array.from(String(texto ?? ""))
    .map((c) => {
      if (c === "\t") return " ";
      if (c === "\r") return "";
      const code = c.codePointAt(0) ?? 0;
      if (code === 10 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255) || WIN_ANSI_EXTRA.has(c)) return c;
      return "";
    })
    .join("");
}

/**
 * Ancho real del texto dibujado. `widthOfTextAtSize` descuenta el kerning,
 * pero `drawText` no lo aplica: medido así, las líneas salen hasta un 5% más
 * anchas de lo calculado y se pasan del margen. Se suma glifo por glifo.
 */
const anchos = new WeakMap<PDFFont, Map<string, number>>();
function anchoDe(fuente: PDFFont, texto: string, tam: number, espaciado = 0): number {
  let tabla = anchos.get(fuente);
  if (!tabla) anchos.set(fuente, (tabla = new Map()));
  let total = 0;
  let n = 0;
  for (const c of texto) {
    let w = tabla.get(c);
    if (w === undefined) tabla.set(c, (w = fuente.widthOfTextAtSize(c, 1000)));
    total += w;
    n++;
  }
  return (total * tam) / 1000 + n * espaciado;
}

// ── Fechas: vienen de SQL como texto local ('YYYY-MM-DD' y 'YYYY-MM-DDTHH:mm:ss') ──
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function partesFecha(iso: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(iso ?? "");
  if (!m) return null;
  const [a, me, d, hh, mm] = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)));
  return { a, me, d, hh, mm, dia: new Date(Date.UTC(a, me - 1, d)).getUTCDay() };
}

/** '2026-10-13' → '13/10/2026'. */
function fechaCorta(iso: string | null | undefined): string {
  const p = partesFecha(iso);
  const dos = (n: number) => String(n).padStart(2, "0");
  return p ? `${dos(p.d)}/${dos(p.me)}/${p.a}` : iso || "—";
}

/** '2026-09-28' → 'Lunes'. */
function diaSemana(iso: string | null | undefined): string {
  const p = partesFecha(iso);
  return p ? DIAS[p.dia] : "";
}




interface Fuentes {
  normal: PDFFont;
  semi: PDFFont;
  negrita: PDFFont;
}

interface Chip {
  texto: string;
  ancho: number;
}

/** Escritor con salto de página automático. `y` es el borde superior libre. */
class Hoja {
  pagina!: PDFPage;
  y = 0;
  /** Dónde arranca el contenido en la página actual (tras el encabezado). */
  private tope = 0;

  constructor(
    private doc: PDFDocument,
    readonly f: Fuentes,
    private encabezado: (p: PDFPage) => number
  ) {
    this.nueva();
  }

  nueva() {
    this.pagina = this.doc.addPage([ANCHO, ALTO]);
    this.y = this.tope = this.encabezado(this.pagina);
  }

  get alInicio() {
    return this.y === this.tope;
  }

  /** Lo que cabe de alto en una página vacía. */
  get altoPagina() {
    return this.tope - FONDO_UTIL;
  }

  /** Asegura `alto` puntos libres antes del pie; si no, página nueva. */
  espacio(alto: number) {
    if (this.y - alto < FONDO_UTIL) this.nueva();
  }

  /** Texto en una sola línea con la parte de arriba en `top`; `sp` separa las letras. */
  linea(
    texto: string,
    x: number,
    top: number,
    tam: number,
    fuente: PDFFont,
    color: Color,
    sp = 0,
    pagina: PDFPage = this.pagina
  ) {
    const t = limpio(texto);
    const base = top - tam * 0.97;
    if (!sp) {
      pagina.drawText(t, { x, y: base, size: tam, font: fuente, color });
      return;
    }
    let cx = x;
    for (const c of t) {
      pagina.drawText(c, { x: cx, y: base, size: tam, font: fuente, color });
      cx += anchoDe(fuente, c, tam) + sp;
    }
  }

  /** Igual que `linea`, pero alineada a la derecha en `derecha`. */
  lineaDer(texto: string, derecha: number, top: number, tam: number, fuente: PDFFont, color: Color, sp = 0) {
    const t = limpio(texto);
    this.linea(t, derecha - anchoDe(fuente, t, tam, sp) + sp, top, tam, fuente, color, sp);
  }

  /** Etiqueta pequeña en mayúsculas y letras separadas. */
  rotulo(texto: string, x: number, top: number, color: Color = TINTA, tam = 8.2) {
    this.linea(texto.toUpperCase(), x, top, tam, this.f.semi, color, 0.85);
  }

  lineas(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
    const salida: string[] = [];
    for (const parrafo of limpio(texto).split("\n")) {
      const palabras = parrafo.split(/\s+/).filter(Boolean);
      if (!palabras.length) {
        salida.push("");
        continue;
      }
      let actual = "";
      for (const palabra of palabras) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (anchoDe(fuente, prueba, tam) <= ancho) {
          actual = prueba;
          continue;
        }
        if (actual) salida.push(actual);
        // Una palabra que sola no cabe (un código, una URL) se parte a la fuerza.
        let resto = palabra;
        while (anchoDe(fuente, resto, tam) > ancho && resto.length > 1) {
          let corte = resto.length - 1;
          while (corte > 1 && anchoDe(fuente, resto.slice(0, corte), tam) > ancho) corte--;
          salida.push(resto.slice(0, corte));
          resto = resto.slice(corte);
        }
        actual = resto;
      }
      salida.push(actual);
    }
    return salida;
  }

  /** Dibuja líneas ya cortadas desde `top` hacia abajo, sin paginar. Devuelve lo que ocupan. */
  escribir(lineas: string[], x: number, top: number, tam: number, fuente: PDFFont, color: Color, alto = tam * 1.45) {
    lineas.forEach((l, i) => {
      if (l) this.linea(l, x, top - i * alto, tam, fuente, color);
    });
    return lineas.length * alto;
  }

  /** Regla horizontal de `grosor` puntos con su borde superior en `top`. */
  regla(x1: number, x2: number, top: number, grosor = 1.5, color: Color = REGLA, pagina: PDFPage = this.pagina) {
    pagina.drawRectangle({ x: x1, y: top - grosor, width: x2 - x1, height: grosor, color });
  }

  /**
   * Título de sección: regla, número en morado y nombre en mayúsculas.
   * `reserva` es lo mínimo del contenido que tiene que caber debajo, para que
   * el título nunca quede solo al pie de una página.
   */
  titulo(numero: number, texto: string, reserva = 40) {
    const hueco = this.alInicio ? 7 : 22;
    this.espacio(hueco + 40 + reserva);
    if (this.alInicio) this.y = this.tope - 7;
    else this.y -= hueco;
    this.regla(MARGEN, DERECHA, this.y);
    const n = String(numero).padStart(2, "0");
    this.linea(n, MARGEN, this.y - 13, 10.5, this.f.negrita, MARCA);
    this.linea(texto.toUpperCase(), MARGEN + anchoDe(this.f.negrita, n, 10.5) + 7, this.y - 13, 10.5, this.f.negrita, TINTA, 0.5);
    this.y -= 40;
  }

  /** Reparte etiquetas en filas de "píldoras" que caben en `ancho`. */
  chips(textos: string[], ancho: number, tam = 9.8): Chip[][] {
    const filas: Chip[][] = [];
    let fila: Chip[] = [];
    let ocupado = 0;
    for (const t of textos.map(limpio).filter(Boolean)) {
      const w = Math.min(ancho, anchoDe(this.f.semi, t, tam) + 16);
      if (fila.length && ocupado + 4.5 + w > ancho) {
        filas.push(fila);
        fila = [];
        ocupado = 0;
      }
      ocupado += (fila.length ? 4.5 : 0) + w;
      fila.push({ texto: t, ancho: w });
    }
    if (fila.length) filas.push(fila);
    return filas;
  }

  static altoChips(filas: Chip[][], alto = 21) {
    return filas.length ? filas.length * alto + (filas.length - 1) * 4.5 : 0;
  }

  dibujarChips(filas: Chip[][], x: number, top: number, tam = 9.8, alto = 21, fondo: Color = CHIP, color: Color = MARCA_OSCURO) {
    filas.forEach((fila, i) => {
      let cx = x;
      const cy = top - i * (alto + 4.5);
      for (const c of fila) {
        this.pagina.drawRectangle({ x: cx, y: cy - alto, width: c.ancho, height: alto, color: fondo });
        this.linea(c.texto, cx + 8, cy - (alto - tam) / 2 + 0.3, tam, this.f.semi, color);
        cx += c.ancho + 4.5;
      }
    });
  }
}

/** Tope de píxeles de una imagen del acta: una foto de celular ronda los 12 MP. */
const MAX_PIXELES = 16_000_000;
const MAX_LADO = 12_000;

const CANALES_PNG: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * PNG seguro de decodificar, o null. pdf-lib deja ganar al último IHDR y
 * descomprime sin tope, así que no basta con mirar el primero: se recorren los
 * chunks, se rechaza lo que cambia las dimensiones después (segundo IHDR) o
 * anima la imagen (acTL, fcTL, fdAT) y el IDAT se descomprime aquí con un tope
 * igual a lo que las dimensiones declaradas pueden ocupar.
 */
function dimensionesPng(b: Uint8Array): { ancho: number; alto: number } | null {
  const firma = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 33 || firma.some((x, i) => b[i] !== x)) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let ancho = 0;
  let alto = 0;
  let canales = 0;
  let profundidad = 0;
  let visto = false;
  let fin = false;
  const idat: Uint8Array[] = [];
  let i = 8;
  while (i + 12 <= b.length) {
    const largo = v.getUint32(i);
    const tipo = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    const datos = i + 8;
    if (largo > b.length - datos - 4) return null;
    if (!visto) {
      // El primer chunk es el IHDR y mide 13 bytes.
      if (tipo !== "IHDR" || largo !== 13) return null;
      visto = true;
      ancho = v.getUint32(datos);
      alto = v.getUint32(datos + 4);
      profundidad = b[datos + 8];
      canales = CANALES_PNG[b[datos + 9]] ?? 0;
      if (!canales || ancho < 1 || alto < 1 || ancho > MAX_LADO || alto > MAX_LADO || ancho * alto > MAX_PIXELES) return null;
    } else if (tipo === "IHDR" || tipo === "acTL" || tipo === "fcTL" || tipo === "fdAT") {
      return null;
    } else if (tipo === "IDAT") {
      idat.push(b.subarray(datos, datos + largo));
    } else if (tipo === "IEND") {
      fin = true;
      break;
    }
    i = datos + largo + 4;
  }
  if (!visto || !fin || idat.length === 0) return null;
  // Lo que ocupan las filas sin comprimir (más el byte de filtro de cada una),
  // con holgura para las pasadas del entrelazado.
  const fila = Math.ceil((ancho * canales * profundidad) / 8) + 1;
  const tope = fila * alto + 16 * alto + 1024;
  try {
    inflateSync(Buffer.concat(idat), { maxOutputLength: tope });
  } catch {
    return null;
  }
  return { ancho, alto };
}

/**
 * Ancho y alto declarados en la cabecera, sin decodificar nada. pdf-lib
 * descomprime el PNG entero para incrustarlo: un archivo de 10 KB que declara
 * decenas de miles de píxeles por lado reservaría gigas de memoria.
 */
function dimensiones(b: Uint8Array): { ancho: number; alto: number } | null {
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50) return dimensionesPng(b);
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marca = b[i + 1];
      if (marca === 0xff) {
        i++;
        continue;
      }
      if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)) {
        i += 2;
        continue;
      }
      // Cuadros de inicio (SOF), salvo DHT, JPG y DAC.
      if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
        return { alto: v.getUint16(i + 5), ancho: v.getUint16(i + 7) };
      }
      i += 2 + v.getUint16(i + 2);
    }
  }
  return null;
}

async function incrustar(doc: PDFDocument, img: ImagenActa): Promise<PDFImage | null> {
  try {
    const dim = dimensiones(img.bytes);
    // Sin dimensiones legibles no se incrusta: es lo que haría falta para medirla.
    if (!dim || dim.ancho < 1 || dim.alto < 1 || dim.ancho > MAX_LADO || dim.alto > MAX_LADO || dim.ancho * dim.alto > MAX_PIXELES) {
      log.error("imagen del acta descartada por sus dimensiones", { ancho: dim?.ancho, alto: dim?.alto });
      return null;
    }
    if (/png/i.test(img.mime)) return await doc.embedPng(img.bytes);
    if (/jpe?g/i.test(img.mime)) return await doc.embedJpg(img.bytes);
    // Sin mime confiable: se prueba por la firma de los bytes.
    if (img.bytes[0] === 0x89 && img.bytes[1] === 0x50) return await doc.embedPng(img.bytes);
    if (img.bytes[0] === 0xff && img.bytes[1] === 0xd8) return await doc.embedJpg(img.bytes);
  } catch (err) {
    log.error("no se pudo incrustar una imagen en el PDF", { err });
  }
  return null;
}

async function logo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "DMC-logo.png"));
    return await doc.embedPng(bytes);
  } catch {
    // Sin el archivo (despliegue que no lo trae) el encabezado va solo con texto.
    return null;
  }
}

/** Inter en tres pesos; sin los archivos, Helvetica. */
async function cargarFuentes(doc: PDFDocument): Promise<Fuentes> {
  try {
    doc.registerFontkit(fontkit);
    const leer = (nombre: string) => readFile(path.join(process.cwd(), "public", "fonts", nombre));
    const [r, s, b] = await Promise.all([leer("Inter_400Regular.ttf"), leer("Inter_600SemiBold.ttf"), leer("Inter_700Bold.ttf")]);
    // Sin ligaduras ni alternativas contextuales: el ancho que se mide es el que se dibuja.
    const opc = { subset: false, features: { liga: false, clig: false, calt: false } };
    return {
      normal: await doc.embedFont(r, opc),
      semi: await doc.embedFont(s, opc),
      negrita: await doc.embedFont(b, opc),
    };
  } catch (err) {
    log.error("no se pudo cargar Inter para el PDF; se usa Helvetica", { err });
    const normal = await doc.embedFont(StandardFonts.Helvetica);
    const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
    return { normal, semi: negrita, negrita };
  }
}

/** 'DD-MM-YYYY HH:mm' (como lo entrega SQL) → 'DD/MM/YYYY · HH:mm'. */
function fechaHoraDmy(t: string | null | undefined): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})(?: (\d{2}:\d{2}))?/.exec(t ?? "");
  return m ? `${m[1]}/${m[2]}/${m[3]}${m[4] ? ` · ${m[4]}` : ""}` : "";
}

function duracionMin(min: number | null): string | null {
  if (min === null || min < 0) return null;
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
}

export async function generarPdfActa(d: DatosPdfActa): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Acta ${d.folio}`);
  doc.setAuthor("Grupo DMC");
  doc.setSubject(`Visita técnica · ${d.sucursal.nombre}`);

  const f = await cargarFuentes(doc);
  const { normal, semi, negrita } = f;
  const imgLogo = await logo(doc);
  const problemas = d.problemas;

  // ── Encabezado: igual en todas las páginas ──
  const encabezado = (p: PDFPage): number => {
    const altoLogo = 27;
    if (imgLogo) {
      const ancho = (imgLogo.width / imgLogo.height) * altoLogo;
      p.drawImage(imgLogo, { x: MARGEN, y: ALTO - 21 - altoLogo, width: ancho, height: altoLogo });
    } else {
      p.drawText("Grupo DMC", { x: MARGEN, y: ALTO - 42, size: 15, font: negrita, color: MARCA });
    }
    const t = limpio(`ACTA DE VISITA TÉCNICA · ${d.folio}`);
    const sp = 0.9;
    let cx = DERECHA - anchoDe(semi, t, 8.6, sp) + sp;
    for (const c of t) {
      p.drawText(c, { x: cx, y: ALTO - 36, size: 8.6, font: semi, color: TINTA });
      cx += anchoDe(semi, c, 8.6) + sp;
    }
    p.drawRectangle({ x: 0, y: ALTO - REGLA_ENCABEZADO, width: ANCHO, height: 1.5, color: REGLA });
    return ALTO - REGLA_ENCABEZADO - 1.5;
  };

  const h = new Hoja(doc, f, encabezado);
  let seccion = 0;

  // ── Portada: nombre de la tienda, folio y la barra de datos ──
  {
    h.y = ALTO - 107;
    h.rotulo("Acta de visita técnica", MARGEN, h.y, MARCA_OSCURO, 9.8);

    const nombre = limpio(d.sucursal.nombre || "Visita técnica");
    const anchoNombre = UTIL - 130;
    let tam = 30;
    while (tam > 20 && anchoDe(negrita, nombre, tam) > anchoNombre) tam -= 1;
    const lineasNombre = h.lineas(nombre, negrita, tam, anchoNombre).slice(0, 2);
    const altoNombre = lineasNombre.length * (tam + 4);
    h.escribir(lineasNombre, MARGEN, h.y - 23, tam, negrita, TINTA, tam + 4);

    const subtitulo = [d.cliente, d.marca, d.sucursal.codigo ? `Sucursal ${d.sucursal.codigo}` : ""].filter(Boolean).join(" · ");
    h.linea(subtitulo, MARGEN, h.y - 23 - altoNombre - 3, 11.2, normal, TINTA);

    h.lineaDer("N° DE ACTA", DERECHA, h.y - 37, 9, semi, TINTA, 0.85);
    h.lineaDer(d.folio, DERECHA, h.y - 52, 16.5, negrita, MARCA);

    h.y -= 91 + Math.max(0, altoNombre - (30 + 4));

    const celdas: { etiqueta: string; valor: string; sub: string; color?: Color }[] = [
      { etiqueta: "Fecha", valor: fechaCorta(d.fechaISO), sub: diaSemana(d.fechaISO) },
      { etiqueta: "Horario en tienda", valor: d.horaInicio ? `${d.horaInicio} – ${d.horaTermino ?? "—"}` : "—", sub: "Llegada y salida" },
      { etiqueta: "Duración", valor: duracionMin(d.duracionMin) ?? "—", sub: "En tienda" },
      {
        etiqueta: "Problemas",
        valor: problemas.length ? String(problemas.length) : "Ninguno",
        sub: problemas.length ? (problemas.length === 1 ? "Detectado" : "Detectados") : "Sin observaciones",
        color: problemas.length ? ALERTA : MARCA_OSCURO,
      },
    ];
    const alto = 67.5;
    const w = UTIL / celdas.length;
    h.regla(MARGEN, DERECHA, h.y);
    h.regla(MARGEN, DERECHA, h.y - alto + 1.5);
    celdas.forEach((c, i) => {
      const x = MARGEN + i * w;
      if (i > 0) h.pagina.drawRectangle({ x: x - 0.75, y: h.y - alto + 1.5, width: 1.5, height: alto - 1.5, color: REGLA });
      const px = i === 0 ? x : x + 11;
      const maxTexto = w - (i === 0 ? 8 : 19);
      let tamValor = 12;
      while (tamValor > 8 && anchoDe(semi, limpio(c.valor), tamValor) > maxTexto) tamValor -= 0.5;
      h.rotulo(c.etiqueta, px, h.y - 11);
      h.linea(c.valor, px, h.y - 30, tamValor, semi, c.color ?? TINTA);
      h.linea(c.sub, px, h.y - 48, 9, normal, TINTA);
    });
    h.y -= alto + 22;
  }

  // ── Fotos: la primera va junto al trabajo, el resto en la grilla ──
  const fotos: { img: PDFImage; pie: string }[] = [];
  {
    // Una por una: incrustar varias a la vez sumaría sus memorias.
    let n = 0;
    for (const x of d.fotos) {
      const img = await incrustar(doc, x);
      if (!img) continue;
      n++;
      const et = limpio(x.etiqueta).trim();
      fotos.push({ img, pie: et ? `Foto ${n} · ${et}` : `Foto ${n}` });
    }
  }

  /** Foto con su pie; devuelve el alto que ocupa. */
  const dibujarFoto = (foto: { img: PDFImage; pie: string }, x: number, top: number, ancho: number, altoMax: number) => {
    const escala = Math.min(ancho / foto.img.width, altoMax / foto.img.height);
    const w = foto.img.width * escala;
    const hh = foto.img.height * escala;
    h.pagina.drawImage(foto.img, { x, y: top - hh, width: w, height: hh });
    const pie = h.lineas(foto.pie, normal, 9, ancho);
    h.escribir(pie, x, top - hh - 6, 9, normal, GRIS, 12);
    return hh + 6 + pie.length * 12;
  };

  // ── 01 · Trabajo realizado ──
  {
    const trabajos = d.trabajos;
    const lateral = fotos[0] ?? null;
    h.titulo(++seccion, "Trabajo realizado", 90);

    let fotoPagina: PDFPage | null = null;
    let fotoBase = 0;
    if (lateral) {
      const altoMax = Math.min(250, h.y - FONDO_UTIL - 24);
      const alto = dibujarFoto(lateral, DERECHA - COL_FOTO, h.y, COL_FOTO, altoMax);
      fotoPagina = h.pagina;
      fotoBase = h.y - alto;
    }
    const anchoCol = () => (fotoPagina === h.pagina && h.y > fotoBase - 4 ? COL_TEXTO : UTIL);

    if (d.motivos.length) {
      const filas = h.chips(d.motivos, anchoCol());
      h.espacio(14 + Hoja.altoChips(filas));
      h.rotulo("Motivo de la visita", MARGEN, h.y);
      h.dibujarChips(filas, MARGEN, h.y - 20);
      h.y -= 20 + Hoja.altoChips(filas) + 17;
    }

    if (trabajos.length) {
      const xTarea = MARGEN + 30;
      const cabecera = () => {
        h.espacio(31 + 40);
        h.linea("#", MARGEN, h.y - 5, 10.5, negrita, TINTA);
        h.linea("Tarea", xTarea, h.y - 5, 10.5, negrita, TINTA);
        h.y -= 31;
        h.regla(MARGEN, MARGEN + anchoCol(), h.y + 1.5, 1.5, TINTA);
      };
      cabecera();
      trabajos.forEach((t, i) => {
        const ancho = anchoCol() - 30;
        const nombre = h.lineas(t.trabajo, normal, 10.5, ancho);
        const subs = t.subtrabajos.map((s) => (s.cantidad > 1 ? `${s.etiqueta} × ${s.cantidad}` : s.etiqueta));
        const lineasSubs = subs.length ? h.lineas(subs.join("  ·  "), normal, 9, ancho) : [];
        const lineasDetalle = t.detalle ? h.lineas(t.detalle, normal, 9, ancho) : [];
        const extra = lineasSubs.length + lineasDetalle.length;
        const alto = Math.max(30, 9 + nombre.length * 15 + (extra ? 2 + extra * 12 : 0) + 9);
        if (h.y - alto < FONDO_UTIL) {
          h.nueva();
          cabecera();
        }
        const col = anchoCol();
        h.linea(String(i + 1), MARGEN, h.y - 9, 10.5, negrita, MARCA_OSCURO);
        let y = h.y - 9;
        y -= h.escribir(nombre, xTarea, y, 10.5, normal, TINTA, 15);
        if (extra) {
          y -= 2;
          if (lineasSubs.length) y -= h.escribir(lineasSubs, xTarea, y, 9, normal, GRIS, 12);
          if (lineasDetalle.length) h.escribir(lineasDetalle, xTarea, y, 9, normal, TEXTO, 12);
        }
        h.y -= alto;
        h.regla(MARGEN, MARGEN + col, h.y + 0.75, 0.75, FILA);
      });
      h.y -= 17;
    }

    // Detalle del trabajo: texto libre en un recuadro que puede cruzar páginas.
    if (d.detalle?.trim()) {
      const pad = 14;
      const alto = 16;
      let lineas = h.lineas(d.detalle.trim(), semi, 11, anchoCol() - pad * 2 - 3);
      let primero = true;
      while (lineas.length) {
        const caben = Math.floor((h.y - FONDO_UTIL - pad * 2 - (primero ? 14 : 0)) / alto);
        if (caben < 1 || (caben < 2 && lineas.length > 1 && h.y - FONDO_UTIL < 80)) {
          h.nueva();
          continue;
        }
        const col = anchoCol();
        const tramo = lineas.slice(0, caben);
        lineas = lineas.slice(caben);
        const cabeza = primero ? 14 : 0;
        const altoCaja = tramo.length * alto + pad * 2 - 4 + cabeza;
        h.pagina.drawRectangle({ x: MARGEN + 0.75, y: h.y - altoCaja, width: col - 1.5, height: altoCaja, borderColor: TINTA, borderWidth: 1.5 });
        if (primero) h.rotulo("Detalle del trabajo", MARGEN + pad, h.y - pad + 1);
        h.escribir(tramo, MARGEN + pad, h.y - pad - cabeza + 2, 11, semi, TINTA, alto);
        h.y -= altoCaja;
        primero = false;
        if (lineas.length) h.nueva();
      }
      h.y -= 12;
    }

    if (fotoPagina === h.pagina && h.y > fotoBase) h.y = fotoBase;
    h.y -= 6;
  }

  // ── 02 · Problemas detectados (siempre presente, para que la numeración sea la del modelo) ──
  // El título reserva el alto real del primer problema (sys_tecnicos reservaba 80 pt
  // fijos y, con una caja más alta, el título quedaba solo al pie de la página).
  const medirProblema = (p: (typeof problemas)[number]) => {
    const pad = 13;
    const ancho = UTIL - 3 - pad * 2;
    const titulo = h.lineas(p.tipo || "Problema", negrita, 10.5, ancho - 26);
    const filasChips = h.chips(p.items, ancho);
    const bloques = [
      p.descripcion ? { etiqueta: "Descripción", lineas: h.lineas(p.descripcion, normal, 9.5, ancho) } : null,
      p.solucion ? { etiqueta: "Solución sugerida", lineas: h.lineas(p.solucion, normal, 9.5, ancho) } : null,
    ].filter((b): b is { etiqueta: string; lineas: string[] } => b !== null);
    const alto =
      pad + titulo.length * 15 + (filasChips.length ? 8 + Hoja.altoChips(filasChips) : 0) +
      bloques.reduce((s, b) => s + 9 + 12 + b.lineas.length * 13.3, 0) + pad - 2;
    return { pad, ancho, titulo, filasChips, bloques, alto };
  };
  h.titulo(++seccion, "Problemas detectados", problemas.length ? Math.min(medirProblema(problemas[0]).alto, h.altoPagina - 80) : 30);
  if (!problemas.length) {
    h.linea("Sin problemas detectados en esta visita.", MARGEN, h.y, 10.5, normal, TEXTO);
    h.y -= 24;
  }
  for (const [i, p] of problemas.entries()) {
    const { pad, titulo, filasChips, bloques, alto } = medirProblema(p);
    const x = MARGEN + 3 + pad;

    if (alto > h.altoPagina) {
      // No cabe ni en una página vacía: texto corrido para no cortarse.
      h.espacio(60);
      for (const l of titulo) {
        h.espacio(15);
        h.linea(l, MARGEN, h.y, 10.5, negrita, TINTA);
        h.y -= 15;
      }
      const y = h.y;
      for (const b of bloques) {
        for (const l of h.lineas(`${b.etiqueta}: ${b.lineas.join(" ")}`, normal, 9.5, UTIL)) {
          h.espacio(13.3);
          h.linea(l, MARGEN, h.y, 9.5, normal, TEXTO);
          h.y -= 13.3;
        }
      }
      h.y = Math.min(h.y, y) - 10;
      continue;
    }

    h.espacio(alto);
    h.pagina.drawRectangle({ x: MARGEN, y: h.y - alto, width: UTIL, height: alto, color: ALERTA_SUAVE, borderColor: ALERTA_BORDE, borderWidth: 0.75 });
    h.pagina.drawRectangle({ x: MARGEN, y: h.y - alto, width: 3, height: alto, color: ALERTA });
    let y = h.y - pad;
    h.pagina.drawRectangle({ x, y: y - 16, width: 17, height: 17, color: ALERTA });
    h.linea(String(i + 1), x + (17 - anchoDe(negrita, String(i + 1), 8.5)) / 2, y - 4, 8.5, negrita, rgb(1, 1, 1));
    y -= h.escribir(titulo, x + 26, y - 1, 10.5, negrita, TINTA, 15);
    if (filasChips.length) {
      y -= 8;
      h.dibujarChips(filasChips, x, y, 9.8, 21, rgb(1, 1, 1), ALERTA);
      y -= Hoja.altoChips(filasChips);
    }
    for (const b of bloques) {
      y -= 9;
      h.rotulo(b.etiqueta, x, y, GRIS, 7.5);
      y -= 12;
      y -= h.escribir(b.lineas, x, y, 9.5, normal, TEXTO, 13.3);
    }
    h.y -= alto + 9;
  }

  // ── 03 · Datos de la visita, en dos columnas ──
  {
    h.titulo(++seccion, "Datos de la visita", 200);
    const hueco = 20;
    const col = (UTIL - hueco) / 2;
    type Campo = { etiqueta: string; valor: string };
    const s = d.sucursal;
    const filas: (Campo | [Campo, Campo])[] = [
      [
        { etiqueta: "Cliente", valor: d.cliente || "—" },
        { etiqueta: "Marca", valor: d.marca || "—" },
      ],
      [
        { etiqueta: "Sucursal", valor: [s.nombre, s.codigo ? `(${s.codigo})` : ""].filter(Boolean).join(" ") || "—" },
        { etiqueta: "Mall", valor: d.mall || "Local a la calle" },
      ],
      { etiqueta: "Dirección", valor: [s.direccion, s.comuna, s.region].filter(Boolean).join(", ") || "—" },
      [
        { etiqueta: "Técnico a cargo", valor: d.tecnico || "—" },
        { etiqueta: "Técnico ayudante", valor: d.tecnicoAyudante || "No aplica" },
      ],
      [
        {
          etiqueta: "Responsable de tienda",
          valor: [d.responsable?.nombre ?? d.firma?.nombre ?? "—", d.responsable?.cargo].filter(Boolean).join("  ·  "),
        },
        // El teléfono del responsable no está expuesto en las vistas del portal: solo el RUT de la firma.
        { etiqueta: "RUT", valor: d.firma?.rut || "—" },
      ],
    ];
    for (const fila of filas) {
      const campos = Array.isArray(fila) ? fila : [fila];
      const ancho = Array.isArray(fila) ? col : UTIL;
      const lineas = campos.map((c) => h.lineas(c.valor || "—", normal, 10.5, ancho));
      const alto = 17 + Math.max(...lineas.map((l) => l.length)) * 14.5 + 11;
      h.espacio(alto);
      campos.forEach((c, i) => {
        const x = MARGEN + i * (col + hueco);
        h.rotulo(c.etiqueta, x, h.y);
        h.escribir(lineas[i], x, h.y - 17, 10.5, normal, TINTA, 14.5);
      });
      h.y -= alto;
      h.regla(MARGEN, DERECHA, h.y + 0.75, 0.75, FILA);
      h.y -= 0.75;
    }
    h.y -= 8;
  }

  // ── 04 · Registro fotográfico adicional: tres por fila, cada una a su proporción ──
  const resto = fotos.slice(1);
  if (resto.length) {
    const cols = 3;
    const hueco = 14;
    const lado = (UTIL - hueco * (cols - 1)) / cols;
    const altoMax = lado * 1.25;
    const altoDe = (fila: typeof resto) =>
      Math.max(
        ...fila.map((x) => {
          const hh = x.img.height * Math.min(lado / x.img.width, altoMax / x.img.height);
          return hh + 6 + h.lineas(x.pie, normal, 9, lado).length * 12;
        })
      );
    h.titulo(++seccion, "Registro fotográfico adicional", altoDe(resto.slice(0, cols)) + 14);
    for (let i = 0; i < resto.length; i += cols) {
      const fila = resto.slice(i, i + cols);
      const altoFila = altoDe(fila);
      h.espacio(altoFila + 14);
      fila.forEach((x, j) => dibujarFoto(x, MARGEN + j * (lado + hueco), h.y, lado, altoMax));
      h.y -= altoFila + 14;
    }
  }

  // ── 05 · Conformidad: la firma sobre su línea y los datos a la derecha ──
  {
    const alto = 120;
    h.titulo(++seccion, "Conformidad de la tienda", alto + 30);
    const imgFirma = d.firma?.imagen ? await incrustar(doc, d.firma.imagen) : null;
    const anchoFirma = 250;
    const base = h.y - 78;
    if (imgFirma) {
      const escala = Math.min((anchoFirma - 20) / imgFirma.width, 64 / imgFirma.height);
      h.pagina.drawImage(imgFirma, { x: MARGEN, y: base + 6, width: imgFirma.width * escala, height: imgFirma.height * escala });
    } else {
      h.linea("Sin firma", MARGEN, base + 34, 10.5, normal, GRIS);
    }
    h.regla(MARGEN, MARGEN + anchoFirma, base, 1.5, REGLA);
    h.rotulo("Firma del responsable de tienda", MARGEN, base - 10);

    const xEt = MARGEN + anchoFirma + 14;
    const xVal = xEt + 70;
    const datos: [string, string, PDFFont][] = [
      ["Nombre", d.firma?.nombre || d.responsable?.nombre || "—", semi],
      ["RUT", d.firma?.rut || "—", normal],
    ];
    if (d.firma?.firmadoEn) datos.push(["Firmado el", fechaHoraDmy(d.firma.firmadoEn), normal]);
    datos.forEach(([et, valor, fuente], i) => {
      const top = base - 10 + (datos.length - 1 - i) * 22;
      h.rotulo(et, xEt, top, TINTA, 8.2);
      h.linea(valor, xVal, top + 1.5, 10.5, fuente, TINTA);
    });
    h.y = base - 38;
    for (const l of h.lineas("Con su firma, la tienda deja constancia de la visita y de los trabajos descritos en esta acta.", normal, 10, UTIL)) {
      h.linea(l, MARGEN, h.y, 10, normal, TINTA);
      h.y -= 14;
    }
  }

  // ── Pie en todas las páginas ──
  for (const p of doc.getPages()) {
    p.drawRectangle({ x: 0, y: ALTO - 803.25, width: ANCHO, height: 1.5, color: REGLA });
    h.linea("Grupo DMC · Ideas tecnológicas de seguridad", MARGEN, ALTO - 812, 8.2, normal, TINTA, 0, p);
    const der = limpio(`Acta ${d.folio}`);
    h.linea(der, DERECHA - anchoDe(normal, der, 8.2), ALTO - 812, 8.2, normal, TINTA, 0, p);
  }

  return doc.save();
}
