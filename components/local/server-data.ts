import "server-only";
import { seed, type AvisoPortal, type Reporte, type Sucursal } from "@/lib/data";
import { TODAY_ISO } from "@/lib/format";
import { branchHref, normUsuario, sucursalesVisibles } from "@/lib/portal";

/* Estado efímero del servidor para los reportes que envían los locales (demostración: se pierde al reiniciar).
   Mismo patrón que lib/server/runtime.ts. Con SQL Server pasa a ser las tablas `reportes` y `avisos`.
   Lo leen el panel (components/local/ServerSync.tsx) y el acceso de local (app/local/page.tsx). */
type Srv = {
  reportes: Reporte[];
  /** Avisos del portal generados por los reportes, por id de usuario del portal. */
  avisos: Record<string, AvisoPortal[]>;
  /** Último ingreso de cada local en esta sesión del servidor («YYYY-MM-DD HH:MM»), por id de sucursal. */
  accesos: Record<string, string>;
  seq: number;
};
const g = globalThis as typeof globalThis & { __dmcLocal?: Srv };
const srv: Srv = (g.__dmcLocal ??= { reportes: [], avisos: {}, accesos: {}, seq: 149 });

/** «YYYY-MM-DD HH:MM» del momento actual, con la fecha de referencia de la demostración. */
const ahora = (piso = "00:00"): string => {
  const d = new Date();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${TODAY_ISO} ${hm > piso ? hm : piso}`;
};

export function registrarAcceso(sucId: string): void {
  srv.accesos[sucId] = ahora();
}

/** Crea el reporte (estado «nuevo») y un aviso «reporte_nuevo» para cada usuario del portal que ve esa sucursal. */
export function agregarReporte(suc: Sucursal, tipo: string, detalle: string): Reporte {
  const r: Reporte = {
    id: `R-${String(srv.seq++).padStart(4, "0")}`, suc: suc.id,
    // Los reportes de ejemplo llegan hasta las 10:20 de la fecha de referencia: los nuevos quedan siempre después.
    f: ahora("10:21"), tipo, detalle, estado: "nuevo", prioridad: null,
  };
  srv.reportes.push(r);
  const db = seed();
  db.usuariosPortal.forEach((u) => {
    if (normUsuario(u).estado === "suspendido") return;
    if (!sucursalesVisibles(db, u).some((s) => s.id === suc.id)) return;
    (srv.avisos[u.id] ??= []).push({
      id: `nr-${r.id}`, tipo: "reporte_nuevo", titulo: `Reporte nuevo ${r.id}`,
      texto: `${suc.n}: ${tipo.toLowerCase()}.`, f: r.f, leida: false, href: branchHref(suc), suc: suc.id,
    });
  });
  return r;
}

export const reportesDeLocal = (sucId: string): Reporte[] => srv.reportes.filter((r) => r.suc === sucId).map((r) => ({ ...r }));

/** Copia de lo generado por los locales, lista para pasarla a un Client Component (ServerSync). */
export function snapshotLocal(): { reportes: Reporte[]; avisos: Record<string, AvisoPortal[]>; accesos: Record<string, string> } {
  return { reportes: structuredClone(srv.reportes), avisos: structuredClone(srv.avisos), accesos: { ...srv.accesos } };
}
