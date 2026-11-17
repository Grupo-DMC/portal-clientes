import { redirect } from "next/navigation";
import Shell, { type NavGroup } from "@/components/Shell";
import { StoreProvider } from "@/components/store";
import { ToastProvider } from "@/components/ui";
import { findAcct } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";
import { initials } from "@/lib/format";

const NAV: Record<string, string> = {
  dashboard: "Dashboard", clientes: "Clientes", sucursales: "Sucursales", malls: "Malls", catalogos: "Catálogos",
  garantias: "Garantías y calibraciones", notificaciones: "Notificaciones", usuarios: "Usuarios y permisos", auditoria: "Auditoría",
};
const GROUPS: [string, string[]][] = [
  ["", ["dashboard"]],
  ["Gestión", ["clientes", "sucursales", "malls"]],
  ["Operación", ["garantias", "notificaciones"]],
  ["Administración", ["catalogos", "usuarios", "auditoria"]],
];
/** null = todos los módulos */
const ROLE_ACC: Record<string, string[] | null> = {
  r1: null, r2: null,
  r3: ["dashboard", "clientes", "sucursales", "malls", "garantias"],
  r4: ["dashboard", "clientes", "sucursales", "malls", "garantias", "notificaciones"],
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ses = await getSession();
  if (ses?.k !== "panel") redirect("/panel/login");
  const acct = findAcct("panel", ses.id);
  if (!acct || acct.status === "inactivo" || acct.status === "bloqueado") redirect("/panel/login");
  const allow = ROLE_ACC[acct.rol ?? "r3"] ?? null;
  const groups: NavGroup[] = GROUPS.map(([title, ids]) => ({
    title,
    items: ids.filter((id) => !allow || allow.includes(id)).map((id) => ({ id, href: id === "dashboard" ? "/panel" : `/panel/${id}`, label: NAV[id] })),
  })).filter((g) => g.items.length);

  return (
    <ToastProvider>
      <StoreProvider>
        <Shell surface="panel" groups={groups} brandLine="Panel interno" user={{ n: acct.name, rol: acct.role, ini: initials(acct.name) }}>
          {children}
        </Shell>
      </StoreProvider>
    </ToastProvider>
  );
}
