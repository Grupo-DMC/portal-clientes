import type { Db, Sucursal, Zona } from "./data";
import { addM, slug, stOf } from "./format";

export type Gar = { end: string; st: ReturnType<typeof stOf>; plan: boolean; ini: string; m: number };
export type Cal = { modo: string; v: string | null; st: string | null };

export const garOf = (db: Db, s: Sucursal): Gar => {
  const c = db.clients.find((x) => x.id === s.cli)!;
  if (c.plan) {
    const e = addM(c.planDesde, c.planMeses);
    return { end: e, st: stOf(e), plan: true, ini: c.planDesde, m: c.planMeses };
  }
  const e = addM(s.inst, s.meses);
  return { end: e, st: stOf(e), plan: false, ini: s.inst, m: s.meses };
};

export const calOf = (db: Db, s: Sucursal): Cal => {
  const c = db.clients.find((x) => x.id === s.cli)!;
  if (c.calTodas) return { modo: "Incluida por plan del cliente", v: c.calVence, st: stOf(c.calVence) };
  if (c.calSuc.includes(s.id)) return { modo: "Contratada para esta sucursal", v: c.calVence, st: stOf(c.calVence) };
  return { modo: "No contratada", v: null, st: "No contratada" };
};

/** Zona que corresponde a una ubicación: coincide la región y, si la zona lista comunas, también la comuna. */
export const zonaPorUbicacion = (zonas: Zona[], reg: string, com: string): Zona | undefined =>
  zonas.find((z) => z.regs.includes(reg) && (!z.comunas?.length || z.comunas.includes(com)));

/** Nombre de la zona de la sucursal (la asignada a mano o, si no, la que le corresponde por ubicación). */
export const zonaOf = (db: Db, s: Sucursal): string => {
  if (s.zona) return s.zona;
  const z = zonaPorUbicacion(db.clients.find((x) => x.id === s.cli)!.zonas, s.reg, s.com);
  return z ? z.n : "Sin zona";
};

/** Id estable de una zona: el declarado o, si falta, el slug de su nombre («Zona Norte» → «zona-norte»). */
export const zonaId = (z: Zona): string => z.id ?? slug(z.n);

/** Id de la zona de la sucursal (norte, oriente, sur, poniente…) o null si no tiene zona. */
export const zonaIdOf = (db: Db, s: Sucursal): string | null => {
  const n = zonaOf(db, s);
  const z = db.clients.find((x) => x.id === s.cli)?.zonas.find((zz) => zz.n === n);
  return z ? zonaId(z) : null;
};

export const eqCount = (db: Db, sucId: string) =>
  (db.inst[sucId] ?? []).flatMap((a) => a.eq).reduce((x, q) => x + (+q.cant || 0), 0);
