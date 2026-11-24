import { Figtree, Outfit } from "next/font/google";
import { cerrarSesion } from "@/app/actions/auth";
import { exigirSesionPanel } from "@/lib/server/portalSesion";
import "../../portal/portal.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-outfit", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree", display: "swap" });

export const dynamic = "force-dynamic";

/* Panel interno del equipo DMC. Solo cuentas de seguridad.usuario con rol ADMIN o
   COORDINADOR; la sesión se valida contra DMC_Core en cada request. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { cuenta } = await exigirSesionPanel();
  return (
    <div className={`pc ${outfit.variable} ${figtree.variable}`}>
      <main className="wrap">
        <header className="page-head">
          <div>
            <h1 className="page-title">Panel interno</h1>
            <p className="page-sub">{cuenta.nombre} · {cuenta.roles.join(", ")}</p>
          </div>
          <form action={cerrarSesion}>
            <button className="btn-out" type="submit">Cerrar sesión</button>
          </form>
        </header>
        {children}
      </main>
    </div>
  );
}
