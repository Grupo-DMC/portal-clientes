// Cálculos puros sobre los datos del portal: lo que no viene tal cual de la
// base y se deriva de otras secciones. Sin base de datos, para poder probarse
// solo (convención de sys_tecnicos: «lo que se pueda probar sin base de datos
// se escribe como función pura, fuera de las consultas SQL»).

import type { MarcaResumenDto, SucursalPortalDto, TicketPortalDto, VisitasResumenDto } from "@/lib/contratos/portal";

/** Cuántas sucursales tiene cada marca, en el orden en que aparecen. */
export function resumirMarcas(sucursales: Pick<SucursalPortalDto, "marca">[]): MarcaResumenDto[] {
  const totales = new Map<string, number>();
  for (const s of sucursales) totales.set(s.marca, (totales.get(s.marca) ?? 0) + 1);
  return [...totales].map(([nombre, total]) => ({ nombre, total }));
}

const DIA = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' → fecha local a medianoche (null si no es válida). */
function deISO(fecha: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/**
 * Visitas del año por mes, de los últimos 30 y 7 días, a partir de sus fechas.
 * Qué estados cuentan como «visita» está por confirmar (docs/DATOS_PENDIENTES.md):
 * hoy se cuentan todas las que lleguen.
 */
export function resumirVisitas(fechasISO: string[], hoy = new Date()): VisitasResumenDto {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const porMes = Array.from({ length: base.getMonth() + 1 }, () => 0);
  let mes = 0;
  let semana = 0;
  for (const texto of fechasISO) {
    const f = deISO(texto);
    if (!f || f > base) continue;
    if (f.getFullYear() === base.getFullYear()) porMes[f.getMonth()]++;
    const dias = (base.getTime() - f.getTime()) / DIA;
    if (dias < 30) mes++;
    if (dias < 7) semana++;
  }
  return { anio: base.getFullYear(), mes, semana, porMes, mesEnCurso: base.getMonth() };
}

/** 'YYYY-MM-DD' → 'DD-MM-YYYY'. */
export const isoADmy = (iso: string) => iso.split("-").reverse().join("-");

/**
 * Garantías del cliente a partir del vencimiento de cada sucursal
 * (portal.v_sucursal.garantia_vence). Reglas provisorias [VERIFICAR]:
 * - «vigente hasta»: el vencimiento más lejano entre las sucursales.
 * - «por vencer»: las que vencen entre hoy y `dias` días más.
 */
export function resumirGarantias(
  vencimientosISO: (string | null)[],
  dias: number,
  hoy = new Date()
): { porVencer: number; planVigenteHasta: string | null } {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let porVencer = 0;
  let maximo: string | null = null;
  for (const texto of vencimientosISO) {
    const f = texto ? deISO(texto) : null;
    if (!f || !texto) continue;
    const restantes = (f.getTime() - base.getTime()) / DIA;
    if (restantes >= 0 && restantes <= dias) porVencer++;
    if (!maximo || texto > maximo) maximo = texto;
  }
  return { porVencer, planVigenteHasta: maximo ? isoADmy(maximo) : null };
}

/** La garantía de una sucursal está vigente si vence hoy o después. */
export function garantiaVigente(vencimientoISO: string | null, hoy = new Date()): boolean {
  const f = vencimientoISO ? deISO(vencimientoISO) : null;
  return !!f && f >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
}

/** Estado de la sucursal: con problemas abiertos = «con observaciones». [VERIFICAR] */
export const estadoSucursal = (problemasAbiertos: number | null) => ((problemasAbiertos ?? 0) > 0 ? "observaciones" : "operativa");

/** Tickets abiertos por sucursal (por nombre), para la columna «Tickets». */
export function ticketsPorSucursal(tickets: Pick<TicketPortalDto, "sucursal" | "estado">[], abierto: string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const t of tickets) if (t.estado === abierto) mapa.set(t.sucursal, (mapa.get(t.sucursal) ?? 0) + 1);
  return mapa;
}
