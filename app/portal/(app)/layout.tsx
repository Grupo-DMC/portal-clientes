import { redirect } from "next/navigation";
import PortalShell from "@/components/portal/PortalShell";
import { ToastProvider } from "@/components/ui";
import { findAcct } from "@/lib/server/accounts";
import { rt } from "@/lib/server/runtime";
import { getSession } from "@/lib/server/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ses = await getSession();
  if (ses?.k !== "portal") redirect("/portal/login");
  const acct = findAcct("portal", ses.id);
  if (!acct || acct.status === "inactivo" || acct.status === "bloqueado") redirect("/portal/login");
  return (
    <ToastProvider>
      <PortalShell perfil={acct.perfil ?? "admin"} name={acct.name} serverTickets={rt.tickets}>{children}</PortalShell>
    </ToastProvider>
  );
}
