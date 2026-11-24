/** Fecha de referencia de la demostración (los datos son estáticos). Es la fecha base del prototipo: 23-11-2026. */
export const TODAY_ISO = "2026-11-23";
export const TODAY = new Date(TODAY_ISO + "T12:00:00");

export const REGIONES = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso",
  "Metropolitana", "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos",
  "Los Lagos", "Aysén", "Magallanes",
];

export const COMUNAS: Record<string, string[]> = {
  "Arica y Parinacota": ["Arica"],
  Tarapacá: ["Iquique", "Alto Hospicio"],
  Antofagasta: ["Antofagasta", "Calama"],
  Atacama: ["Copiapó", "Vallenar"],
  Coquimbo: ["La Serena", "Coquimbo", "Ovalle"],
  Valparaíso: ["Valparaíso", "Viña del Mar", "Quilpué"],
  Metropolitana: ["Santiago", "Providencia", "Las Condes", "La Florida", "Maipú", "Ñuñoa", "Pudahuel", "Vitacura", "Puente Alto"],
  "O'Higgins": ["Rancagua"],
  Maule: ["Talca", "Curicó"],
  Ñuble: ["Chillán"],
  Biobío: ["Concepción", "Talcahuano", "Los Ángeles"],
  "La Araucanía": ["Temuco"],
  "Los Ríos": ["Valdivia"],
  "Los Lagos": ["Puerto Montt", "Osorno"],
  Aysén: ["Coyhaique"],
  Magallanes: ["Punta Arenas"],
};

/** Dígito verificador del RUT (módulo 11). */
export const DV = (n: number | string): string => {
  let s = 0;
  let m = 2;
  for (const d of String(n).split("").reverse()) {
    s += +d * m;
    m = m === 7 ? 2 : m + 1;
  }
  const r = 11 - (s % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
};

export const fmtRut = (n: number): string =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + DV(n);

/** true/false si el DV cuadra; null si el texto es demasiado corto para juzgar. */
export const checkRut = (str: string): boolean | null => {
  const c = String(str || "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (c.length < 8) return null;
  return DV(c.slice(0, -1)) === c.slice(-1);
};

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const MES_UP = MES.map((m) => m.toUpperCase());

export const fd = (iso?: string | null): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};
export const fl = (iso?: string | null): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${+d} ${MES[+m - 1]} ${y}`;
};
export const addM = (iso: string, m: number | string): string => {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + (+m || 0));
  return d.toISOString().slice(0, 10);
};
export const days = (iso: string): number =>
  Math.round((new Date(iso + "T12:00:00").getTime() - TODAY.getTime()) / 864e5);
export const stOf = (iso?: string | null): "Vencida" | "Por vencer" | "Vigente" | null => {
  if (!iso) return null;
  const d = days(iso);
  return d < 0 ? "Vencida" : d <= 30 ? "Por vencer" : "Vigente";
};

export type TagKind = "neutral" | "accent" | "solid" | "outline" | "dark";

export const KIND: Record<string, TagKind> = {
  Vigente: "neutral", "Por vencer": "accent", Vencida: "solid",
  Activo: "neutral", Activa: "neutral", Inactivo: "outline", Inactiva: "outline",
  "Sin clave": "accent", Bloqueado: "solid",
  Abierto: "solid", "En curso": "accent", Cerrado: "neutral",
  Alta: "solid", Media: "accent", Baja: "neutral",
  Aprobada: "neutral", Enviada: "accent", "En revisión": "outline", Rechazada: "outline",
  Entregado: "neutral", "En tránsito": "accent", Preparando: "outline",
  Confirmado: "neutral", "Por confirmar": "accent",
  Enviado: "neutral", Rebotado: "solid",
  "Plan del cliente": "dark", "No contratada": "outline",
};
export const kindOf = (t: string): TagKind => KIND[t] ?? "neutral";

export const initials = (name: string): string =>
  name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

export const fmtAlc = (a: string, v: string): string =>
  a === "Todo el cliente" || !v ? "Todo el cliente" : a === "Zona" ? v : a === "Región" ? "Región " + v : a === "Marca" ? "Marca " + v : v;

/* ---- Texto y fechas dd-mm-aaaa (formato chileno) ---- */

/** Quita tildes y pasa a minúsculas, para buscar sin importar acentos. */
export const norm = (s: string): string => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** «Mall Plaza Norte» → «mall-plaza-norte». */
export const slug = (s: string): string => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

/** «23-11-2026» → Date local (12:00); null si no es una fecha real. */
export function parseDMY(s: string): Date | null {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(s).trim());
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const x = new Date(y, mo - 1, d, 12);
  return x.getFullYear() === y && x.getMonth() === mo - 1 && x.getDate() === d ? x : null;
}
/** «23-11-2026 09:40» (hora opcional) → Date local; null si no es válida. */
export function parseDMYHM(s: string): Date | null {
  const [d, t = "00:00"] = String(s).trim().split(/\s+/);
  const x = parseDMY(d);
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!x || !m || +m[1] > 23 || +m[2] > 59) return null;
  x.setHours(+m[1], +m[2], 0, 0);
  return x;
}
/** «23-11-2026» → «2026-11-23» (formato interno de la base); null si no es válida. */
export function dmyToIso(s: string): string | null {
  const x = parseDMY(s);
  return x ? `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}` : null;
}
/** «2026-11-23 09:40» → «23-11-2026 09:40» (solo fecha si no trae hora). */
export const fdt = (iso?: string | null): string => {
  if (!iso) return "—";
  const [d, t] = iso.split(" ");
  return t ? `${fd(d)} ${t.slice(0, 5)}` : fd(d);
};
/** Hora «HH:MM» de un «YYYY-MM-DD HH:MM». */
export const hourOf = (iso: string): string => iso.split(" ")[1]?.slice(0, 5) ?? "";
/** Minutos entre dos horas «HH:MM». */
export const minutesBetween = (a: string, b: string): number => {
  const [h1, m1] = a.split(":").map(Number);
  const [h2, m2] = b.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
};
/** «Hoy», «Ayer», «Hace 3 días», «Mañana», «En 2 días» respecto de TODAY (acepta ISO con o sin hora). */
export const relative = (iso: string): string => {
  const n = days(iso.slice(0, 10));
  return n === 0 ? "Hoy" : n > 0 ? (n === 1 ? "Mañana" : `En ${n} días`) : n === -1 ? "Ayer" : `Hace ${-n} días`;
};

/** RUT de terceros parcial: «19.454.295-K» → «19.454.***-K». Acepta con o sin puntos y guion. */
export const maskRut = (r: string): string => {
  const c = String(r).replace(/[^0-9kK]/g, "").toUpperCase();
  if (c.length < 7) return "***";
  const body = c.slice(0, -1), dv = c.slice(-1);
  const head = body.slice(0, -3).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${head}.${body.slice(-3).replace(/\d/g, "*")}-${dv}`;
};
