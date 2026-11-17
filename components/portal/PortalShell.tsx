"use client";

import { Filter } from "lucide-react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import Shell, { type NavGroup } from "@/components/Shell";
import { StoreProvider, useStore } from "@/components/store";
import { NORTE, type Db, type Sucursal } from "@/lib/data";
import { initials } from "@/lib/format";

export type Perfil = "admin" | "zona" | "marca";
const PERF: Record<Perfil, { rol: string; alc: string; f: (s: Sucursal) => boolean }> = {
  admin: { rol: "Administrador cliente", alc: "Todo el cliente", f: () => true },
  zona: { rol: "Supervisor", alc: "Zona Norte", f: (s) => NORTE.includes(s.reg) },
  marca: { rol: "Supervisor", alc: "Marca Andes Home", f: (s) => s.marca === "Andes Home" },
};

type Ctx = { perfil: Perfil; me: { n: string; ini: string; rol: string; alc: string }; mine: Sucursal[]; isM: (x: { suc: string }) => boolean; isAdmin: boolean; db: Db };
const PC = createContext<Ctx | null>(null);
export const usePortal = () => {
  const c = useContext(PC);
  if (!c) throw new Error("usePortal fuera del portal");
  return c;
};

const NAV: [string, string][] = [
  ["dashboard", "Dashboard"], ["sucursales", "Mis sucursales"], ["visitas", "Visitas"], ["tickets", "Tickets"], ["cotizaciones", "Cotizaciones y despachos"],
  ["trabajos", "Trabajos planificados"], ["credenciales", "Credenciales de locales"], ["usuarios", "Usuarios y roles"], ["notificaciones", "Notificaciones"],
];
const GROUPS: [string, string[]][] = [
  ["", ["dashboard"]], ["Operación", ["sucursales", "visitas", "tickets", "trabajos"]], ["Comercial", ["cotizaciones"]], ["Administración", ["credenciales", "usuarios", "notificaciones"]],
];

function Inner({ perfil, name, children }: { perfil: Perfil; name: string; children: ReactNode }) {
  const { db } = useStore();
  const P = PERF[perfil];
  const cli = db.clients.find((c) => c.id === "c1")!;
  const mine = useMemo(() => db.sucursales.filter((s) => s.cli === "c1" && P.f(s)), [db.sucursales, P]);
  const me = { n: name, ini: initials(name), rol: P.rol, alc: P.alc };
  const ctx: Ctx = { perfil, me, mine, isAdmin: perfil === "admin", db, isM: (x) => mine.some((s) => s.id === x.suc) };
  const tAb = db.tickets.filter((t) => ctx.isM(t) && t.estado !== "Cerrado").length;
  const credPend = mine.filter((s) => s.cred !== "Activo").length;
  const groups: NavGroup[] = GROUPS.map(([title, ids]) => ({
    title,
    items: ids.map((id) => ({ id, href: id === "dashboard" ? "/portal" : `/portal/${id}`, label: NAV.find((n) => n[0] === id)![1], badge: id === "tickets" ? tAb : id === "credenciales" ? credPend : 0 })),
  }));
  return (
    <PC.Provider value={ctx}>
      <Shell
        surface="portal" groups={groups} brandLine="Portal cliente" user={{ n: me.n, rol: me.rol, ini: me.ini }} topRight={`${me.rol} · ${me.alc}`}
        header={<div className="border-t border-neutral-400 pt-[10px]"><div className="text-sm font-extrabold">{cli.rs}</div><div className="text-xs text-neutral-700">RUT {cli.rutStr}</div></div>}
        scopeBanner={perfil !== "admin" ? <div className="flex items-center gap-[10px] bg-surface px-10 py-[10px] text-[13px]"><Filter size={15} aria-hidden />Estás viendo solo las sucursales de tu alcance: <strong>{me.alc}</strong> ({mine.length} de 8).</div> : undefined}
      >
        {children}
      </Shell>
    </PC.Provider>
  );
}

export default function PortalShell({ perfil, name, serverTickets, children }: { perfil: Perfil; name: string; serverTickets: Db["tickets"]; children: ReactNode }) {
  return (
    <StoreProvider serverTickets={serverTickets}>
      <Inner perfil={perfil} name={name}>{children}</Inner>
    </StoreProvider>
  );
}
