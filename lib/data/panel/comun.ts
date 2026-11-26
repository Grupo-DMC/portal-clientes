import "server-only";

// Piezas comunes de la capa de datos del panel interno.
//
// El panel lee las TABLAS de DMC_Core (clientes.*, tecnico.*, seguridad.*), no
// las vistas portal.v_*: es del equipo DMC y ve todos los clientes. Todo pasa
// por consultaCon (lib/data/sql.ts), que rechaza cualquier sentencia que no sea
// un SELECT. Nunca se lee password_hash ni contenido binario en estas consultas.
//
// Las fechas salen en ISO ('YYYY-MM-DD' o 'YYYY-MM-DD HH:mm') para ordenar en el
// cliente; la UI las muestra como DD-MM-YYYY.

export const ISO_FECHA = (col: string) => `CONVERT(varchar(10), ${col}, 23)`;
export const ISO_FECHA_HORA = (col: string) => `CONVERT(varchar(16), ${col}, 120)`;

/**
 * Garantía de una sucursal, con los alias `s` (clientes.sucursal) y `c`
 * (clientes.cliente). Misma regla que portal.v_sucursal (docs/portal-vistas.md,
 * 1.2): meses de la sucursal o, si no tiene, los del cliente, contados desde la
 * instalación. [VERIFICAR la regla] — es la que ya usa el portal.
 */
export const SQL_GARANTIA_MESES = `COALESCE(s.garantia_meses, c.garantia_meses)`;
export const SQL_GARANTIA_VENCE = `CASE WHEN s.fecha_instalacion IS NOT NULL AND ${SQL_GARANTIA_MESES} IS NOT NULL
  THEN DATEADD(month, ${SQL_GARANTIA_MESES}, s.fecha_instalacion) END`;

/** Días antes del vencimiento en que una garantía cuenta como «por vencer» (igual que el portal). */
export const DIAS_POR_VENCER = 30;

/** Estado de la garantía a partir de una columna `vence` (date). */
export const SQL_ESTADO_GARANTIA = (vence: string) => `CASE
  WHEN ${vence} IS NULL THEN 'sin_datos'
  WHEN ${vence} < CAST(SYSDATETIME() AS date) THEN 'vencida'
  WHEN ${vence} <= DATEADD(day, ${DIAS_POR_VENCER}, CAST(SYSDATETIME() AS date)) THEN 'por_vencer'
  ELSE 'vigente' END`;

export type EstadoGarantia = "vigente" | "por_vencer" | "vencida" | "sin_datos";

/** Problemas no resueltos de una sucursal (alias `s`). Misma regla que el portal. */
export const SQL_PROBLEMAS_ABIERTOS = `(SELECT COUNT(*) FROM tecnico.problema p
   JOIN tecnico.visita v ON v.id = p.visita_id
  WHERE v.sucursal_id = s.id AND v.activo = 1 AND p.estado <> 'RESUELTO')`;

/** Fecha de hoy en Chile como 'YYYY-MM-DD' (Vercel corre en UTC: de noche ya sería mañana). */
export function hoyChile(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

/** Texto nulo → cadena vacía; para columnas opcionales que la UI muestra tal cual. */
export const txt = (v: string | null | undefined) => v ?? "";
