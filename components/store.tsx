"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { seed, seedPerms, seedRoles, type Db, type Perms } from "@/lib/data";
import type { Ask } from "@/components/ui";
import { MiniAsk, useToast } from "@/components/ui";

/* Estado de la demostración: datos estáticos (lib/data.ts) copiados a memoria
   para que las ediciones se vean al instante mientras se navega. Al conectar
   SQL Server, `mut` pasa a llamar Server Actions y deja de existir. */
type Roles = ReturnType<typeof seedRoles>;
type Store = {
  db: Db; perms: Perms; roles: Roles;
  mut: (fn: (d: Db) => void, msg?: string) => void;
  setPerms: (fn: (p: Perms) => void) => void;
  setRoles: (fn: (r: Roles, p: Perms) => void) => void;
  ask: (title: string, label: string, cb: (v: string) => void, val?: string) => void;
  extra: { serverTickets: Db["tickets"] };
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fuera de StoreProvider");
  return s;
};

export function StoreProvider({ children, serverTickets = [] }: { children: ReactNode; serverTickets?: Db["tickets"] }) {
  const toast = useToast();
  const [db, setDb] = useState<Db>(() => { const d = seed(); d.tickets.push(...serverTickets); return d; });
  const [perms, setP] = useState<Perms>(() => seedPerms());
  const [roles, setR] = useState<Roles>(() => seedRoles());
  const [asking, setAsking] = useState<Ask>(null);

  const mut = useCallback((fn: (d: Db) => void, msg?: string) => {
    setDb((s) => { const d = structuredClone(s); fn(d); return d; });
    if (msg) toast(msg);
  }, [toast]);
  const setPerms = useCallback((fn: (p: Perms) => void) => setP((s) => { const p = structuredClone(s); fn(p); return p; }), []);
  const setRoles = useCallback((fn: (r: Roles, p: Perms) => void) => {
    const r = structuredClone(roles), p = structuredClone(perms);
    fn(r, p); setR(r); setP(p);
  }, [roles, perms]);
  const ask = useCallback((title: string, label: string, cb: (v: string) => void, val?: string) => setAsking({ title, label, cb, val }), []);

  const value = useMemo(() => ({ db, perms, roles, mut, setPerms, setRoles, ask, extra: { serverTickets } }), [db, perms, roles, mut, setPerms, setRoles, ask, serverTickets]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {asking && <MiniAsk ask={asking} onClose={() => setAsking(null)} />}
    </Ctx.Provider>
  );
}

/** Helpers de lectura frecuentes. */
export function useLookups() {
  const { db } = useStore();
  return useMemo(() => {
    const cliOf = (id: string) => db.clients.find((c) => c.id === id)!;
    const mallOf = (id: string) => db.malls.find((m) => m.id === id);
    const sucOf = (id: string) => db.sucursales.find((s) => s.id === id)!;
    const sucN = (id: string) => db.sucursales.find((s) => s.id === id)?.n ?? "—";
    const ubic = (s: Db["sucursales"][number]) => (s.mall ? mallOf(s.mall)?.n ?? "" : s.calle);
    return { cliOf, mallOf, sucOf, sucN, ubic };
  }, [db]);
}
