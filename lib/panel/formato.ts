// Formato y etiquetas del panel interno. Puro: lo usan Server y Client Components.

export type Tono = "ok" | "obs" | "crit" | "prog" | "off";
export type Estados = Record<string, { label: string; tono: Tono }>;

/** 'YYYY-MM-DD' → 'DD-MM-YYYY'. Vacío si no hay fecha. */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return d && m && a ? `${d}-${m}-${a}` : iso;
}

/** 'YYYY-MM-DD HH:mm' → 'DD-MM-YYYY HH:mm'. */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const hora = iso.slice(11, 16);
  return hora ? `${fecha(iso)} ${hora}` : fecha(iso);
}

export const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-CL")} ${n === 1 ? uno : varios}`;

export const ESTADOS_VISITA: Estados = {
  PROGRAMADA: { label: "Programada", tono: "prog" },
  EN_CURSO: { label: "En curso", tono: "obs" },
  REAGENDADA: { label: "Reagendada", tono: "prog" },
  PENDIENTE: { label: "Pendiente", tono: "obs" },
  COMPLETADA: { label: "Completada", tono: "ok" },
  CANCELADA: { label: "Cancelada", tono: "off" },
  CANCELADA_ADMIN: { label: "Cancelada por admin", tono: "off" },
};

export const ESTADOS_PROBLEMA: Estados = {
  ABIERTO: { label: "Abierto", tono: "crit" },
  AGENDADO: { label: "Agendado", tono: "prog" },
  PENDIENTE: { label: "Espera repuesto", tono: "obs" },
  RESUELTO: { label: "Resuelto", tono: "ok" },
};

export const ESTADOS_GARANTIA: Estados = {
  vigente: { label: "Vigente", tono: "ok" },
  por_vencer: { label: "Por vencer", tono: "obs" },
  vencida: { label: "Vencida", tono: "crit" },
  sin_datos: { label: "Sin datos", tono: "off" },
};

export const ACTIVO: Estados = {
  true: { label: "Activo", tono: "ok" },
  false: { label: "Inactivo", tono: "off" },
};

export const ACTIVA: Estados = {
  true: { label: "Activa", tono: "ok" },
  false: { label: "Inactiva", tono: "off" },
};

export const SI_NO: Estados = {
  true: { label: "Sí", tono: "ok" },
  false: { label: "No", tono: "off" },
};

export function etiqueta(estados: Estados, valor: unknown): { label: string; tono: Tono } {
  const k = String(valor);
  return estados[k] ?? { label: k || "—", tono: "off" };
}

/** Nombre corto del mes para el gráfico: '2026-03' → 'mar'. */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const mesCorto = (clave: string) => MESES[Number(clave.slice(5, 7)) - 1] ?? clave;
