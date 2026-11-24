import { Figtree, Outfit } from "next/font/google";
import { redirect } from "next/navigation";
import PortalShell from "@/components/portal/shell/PortalShell";
import type { PortalDatos } from "@/lib/contratos/portal";
import { DatosPendientesError, cargarPortal } from "@/lib/data/portal";
import { log } from "@/lib/log";
import { activeAcct } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";
import "../portal.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-outfit", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree", display: "swap" });

export const dynamic = "force-dynamic";

/* Portal cliente: diseño, colores y orden del prototipo entregado. La sesión se verifica aquí (defensa en capas con proxy.ts).
   Los datos se cargan en el servidor desde lib/data/portal (DATA_SOURCE=mock|db) y bajan al PortalProvider. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ses = await getSession();
  if (ses?.k !== "portal") redirect("/login");
  const acct = activeAcct("portal", ses.id);
  if (!acct?.clienteId) redirect("/login");

  let datos: PortalDatos;
  try {
    datos = await cargarPortal({ email: acct.email, clienteId: acct.clienteId });
  } catch (err) {
    if (err instanceof DatosPendientesError) {
      log.warn("portal.layout", { aviso: "mapeo de datos pendiente", secciones: err.secciones });
      return (
        <div className={`pc ${outfit.variable} ${figtree.variable}`}>
          <main className="wrap">
            <div className="empty-state">
              <h2>El portal todavía no tiene sus datos configurados</h2>
              <p>Faltan por confirmar las tablas de: {err.secciones.join(", ")}.</p>
            </div>
          </main>
        </div>
      );
    }
    throw err;
  }

  return (
    <div className={`pc ${outfit.variable} ${figtree.variable}`}>
      <PortalShell datos={datos}>{children}</PortalShell>
    </div>
  );
}
