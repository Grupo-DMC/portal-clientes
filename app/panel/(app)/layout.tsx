import { redirect } from "next/navigation";
import Shell, { type NavGroup } from "@/components/Shell";
import ServerSync from "@/components/local/ServerSync";
import { snapshotLocal } from "@/components/local/server-data";
import { PanelUserProvider } from "@/components/panel/PanelUser";
import { StoreProvider } from "@/components/store";
import { ToastProvider } from "@/components/ui";
import { activeAcct } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";
import { initials, TODAY } from "@/lib/format";

const NAV: Record<string, string> = {
  dashboard: "Dashboard", clientes: "Clientes", sucursales: "Sucursales", malls: "Malls", catalogos: "Catálogos", reportes: "Reportes de locales",
  garantias: "Garantías y calibraciones", notificaciones: "Notificaciones", usuarios: "Usuarios y permisos", auditoria: "Auditoría",
};
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** «Lunes 23 de noviembre, 2026» a partir de la fecha de referencia de la demostración. */
const HOY = `${DIAS[TODAY.getDay()]} ${TODAY.getDate()} de ${MESES[TODAY.getMonth()]}, ${TODAY.getFullYear()}`;
const GROUPS: [string, string[]][] = [
  ["", ["dashboard"]],
  ["Gestión", ["clientes", "sucursales", "malls"]],
  ["Operación", ["reportes", "garantias", "notificaciones"]],
  ["Administración", ["catalogos", "usuarios", "auditoria"]],
];
/** null = todos los módulos */
const ROLE_ACC: Record<string, string[] | null> = {
  r1: null, r2: null,
  r3: ["dashboard", "clientes", "sucursales", "malls", "reportes", "garantias"],
  r4: ["dashboard", "clientes", "sucursales", "malls", "reportes", "garantias", "notificaciones"],
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ses = await getSession();
  if (ses?.k !== "panel") redirect("/login");
  const acct = activeAcct("panel", ses.id);
  if (!acct) redirect("/login");
  const allow = ROLE_ACC[acct.rol ?? "r3"] ?? null;
  const groups: NavGroup[] = GROUPS.map(([title, ids]) => ({
    title,
    items: ids.filter((id) => !allow || allow.includes(id)).map((id) => ({ id, href: id === "dashboard" ? "/panel" : `/panel/${id}`, label: NAV[id] })),
  })).filter((g) => g.items.length);

  // Lo que los locales reportaron mientras el panel estaba abierto (estado del servidor de la demostración).
  const local = snapshotLocal();

  return (
    <ToastProvider>
      <StoreProvider>
        <PanelUserProvider name={acct.name}>
          <ServerSync reportes={local.reportes} avisos={local.avisos} accesos={local.accesos} />
          <Shell surface="panel" groups={groups} brandLine="Panel interno" topRight={HOY} user={{ n: acct.name, rol: acct.role, ini: initials(acct.name) }}>
            {children}
          </Shell>
        </PanelUserProvider>
      </StoreProvider>
    </ToastProvider>
  );
}
