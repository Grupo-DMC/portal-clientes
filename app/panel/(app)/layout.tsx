import { Figtree, Outfit } from "next/font/google";
import PanelShell from "@/components/panel/shell/PanelShell";
import { menuPara } from "@/lib/server/panelAcceso";
import { exigirSesionPanel } from "@/lib/server/portalSesion";
import "../../portal/portal.css";
import "@/components/panel/panel.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-outfit", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree", display: "swap" });

export const dynamic = "force-dynamic";

/* Panel interno del equipo DMC. Solo cuentas de seguridad.usuario con rol ADMIN o
   COORDINADOR; la sesión se valida contra DMC_Core en cada request. Cada página
   vuelve a verificarla con exigirModulo (lib/server/panelAcceso.ts), que además
   controla qué módulos ve cada rol. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { cuenta } = await exigirSesionPanel();
  return (
    <div className={`pc ${outfit.variable} ${figtree.variable}`}>
      <PanelShell menu={menuPara(cuenta.roles)} usuario={{ nombre: cuenta.nombre, roles: cuenta.roles }}>
        {children}
      </PanelShell>
    </div>
  );
}
