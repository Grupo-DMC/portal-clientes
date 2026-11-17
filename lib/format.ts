/** Fecha de referencia de la demostración (los datos son estáticos). */
export const TODAY = new Date("2026-10-05T12:00:00");

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
