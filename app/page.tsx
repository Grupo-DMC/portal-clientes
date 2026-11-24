import { redirect } from "next/navigation";
import { inicioEquipo } from "@/lib/mantenimiento";
import { sesionVigente } from "@/lib/server/portalSesion";

/* Entrada única: no tiene UI propia, solo envía a cada quien a su sitio. */
export default async function Home() {
  const ses = await sesionVigente().catch(() => null);
  if (ses?.tipo === "panel") redirect(inicioEquipo());
  if (ses?.tipo === "portal") redirect("/portal");
  redirect("/login");
}
