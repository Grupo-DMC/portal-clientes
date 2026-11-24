import { Figtree, Outfit } from "next/font/google";
import Image from "next/image";
import { redirect } from "next/navigation";
import { cerrarSesion } from "@/app/actions/auth";
import { mantenimientoDmc } from "@/lib/mantenimiento";
import { sesionVigente } from "@/lib/server/portalSesion";
import "../portal/portal.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-outfit", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-figtree", display: "swap" });

export const metadata = { title: "Portal en mantenimiento" };
export const dynamic = "force-dynamic";

/* Pantalla única para las cuentas internas de DMC mientras MAINTENANCE_DMC_USERS=true.
   No carga ningún dato del portal: solo el aviso y el botón para salir. */
export default async function MantenimientoPage() {
  const ses = await sesionVigente().catch(() => null);
  if (!ses) redirect("/login");
  if (ses.tipo === "portal") redirect("/portal");
  if (!mantenimientoDmc()) redirect("/panel");
  // Sin nombre en seguridad.usuario el «nombre» es el correo: entonces el saludo va sin nombre.
  const nombre = ses.nombre && !ses.nombre.includes("@") ? ses.nombre.split(" ")[0] : "";

  return (
    <div className={`pc ${outfit.variable} ${figtree.variable}`}>
      <main className="mant">
        <section className="mant-card" aria-labelledby="mantTitulo">
          <Image className="mant-logo" src="/pc/logo-dmc.png" alt="Grupo DMC" width={561} height={199} priority />
          <h1 id="mantTitulo">Portal en mantenimiento</h1>
          <p>
            Hola{nombre ? `, ${nombre}` : ""}. Estamos preparando el portal para nuestros clientes y por ahora no está
            disponible para cuentas del equipo DMC. Gracias por tu paciencia.
          </p>
          <form action={cerrarSesion}>
            <button className="btn-pri" type="submit">Cerrar sesión</button>
          </form>
        </section>
      </main>
    </div>
  );
}
