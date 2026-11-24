"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Audit, Db } from "@/lib/data";
import { TODAY_ISO } from "@/lib/format";

/* Persona del equipo DMC que tiene la sesión en el panel: firma los registros de auditoría. */
const Ctx = createContext<string>("Equipo DMC");
export const PanelUserProvider = ({ name, children }: { name: string; children: ReactNode }) => <Ctx.Provider value={name}>{children}</Ctx.Provider>;
export const usePanelUser = () => useContext(Ctx);

/** «YYYY-MM-DD HH:MM»: fecha de referencia de la demostración con la hora actual. */
export const ahoraStamp = (): string => {
  const d = new Date();
  return `${TODAY_ISO} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Agrega un registro al inicio de la auditoría (los más recientes primero). */
export const logAudit = (d: Db, u: string, ent: string, reg: string, acc: string, det: string): void => {
  const a: Audit = { f: ahoraStamp(), u, ent, reg, acc, det };
  d.audit.unshift(a);
};
