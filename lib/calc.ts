import type { Db, Sucursal } from "./data";
import { addM, stOf } from "./format";

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

export const zonaOf = (db: Db, s: Sucursal): string => {
  if (s.zona) return s.zona;
  const z = db.clients.find((x) => x.id === s.cli)!.zonas.find((zz) => zz.regs.includes(s.reg));
  return z ? z.n : "Sin zona";
};

export const eqCount = (db: Db, sucId: string) =>
  (db.inst[sucId] ?? []).flatMap((a) => a.eq).reduce((x, q) => x + (+q.cant || 0), 0);
