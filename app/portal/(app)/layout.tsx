import { Figtree, Outfit } from "next/font/google";
import { redirect } from "next/navigation";
import PortalShell from "@/components/portal/shell/PortalShell";
import type { PortalDatos } from "@/lib/contratos/portal";
import { DatosPendientesError, cargarPortal } from "@/lib/data/portal";
import { log } from "@/lib/log";
import { urlFoto, versionFoto } from "@/lib/server/fotoPerfil";
import { urlLogoPortal, versionLogo } from "@/lib/server/logoCliente";
import { sesionPortal } from "@/lib/server/portalSesion";
import "../portal.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-outfit", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree", display: "swap" });

export const dynamic = "force-dynamic";

/* Portal cliente: diseño, colores y orden del prototipo entregado. La sesión se verifica aquí contra la base (defensa en capas con proxy.ts).
   Los datos se cargan en el servidor desde DMC_Core (lib/data/portal) y bajan al PortalProvider. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Valida la sesión contra la base en cada request (activo, sesion_version, cliente).
  const ses = await sesionPortal();
  if (!ses) redirect("/login");
  if (ses.debeCambiarPassword) redirect("/cambiar-clave");

  let datos: PortalDatos;
  try {
    // La foto de perfil va en paralelo con los datos; si la tabla aún no existe, sin foto.
    // Foto de perfil y logo del cliente van en paralelo con los datos. Si sus tablas aún no
    // existen, sin foto y con el logo estático del cliente (public/clientes), si lo hay.
    const clienteId = ses.ctx.clienteIdBd;
    const [d, version, versionDelLogo] = await Promise.all([
      cargarPortal({ ...ses.ctx, cliente: ses.cliente }),
      ses.cookie.uc ? versionFoto(ses.cookie.uc).catch(() => null) : Promise.resolve(null),
      clienteId ? versionLogo(clienteId).catch(() => null) : Promise.resolve(null),
    ]);
    datos = {
      ...d,
      usuario: { ...d.usuario, foto: urlFoto(version) },
      cliente: { ...d.cliente, logo: clienteId ? urlLogoPortal(clienteId, versionDelLogo) : null },
    };
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
