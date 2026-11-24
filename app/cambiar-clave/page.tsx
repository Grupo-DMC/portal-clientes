import { redirect } from "next/navigation";
import CambioClave from "@/components/login/CambioClave";
import { inicioEquipo, mantenimientoDmc } from "@/lib/mantenimiento";
import { sesionVigente } from "@/lib/server/portalSesion";

export const metadata = { title: "Cambiar clave" };
export const dynamic = "force-dynamic";

/** Paso obligatorio cuando la cuenta (equipo o cliente) tiene debe_cambiar_password = 1. */
export default async function CambiarClavePage() {
  const ses = await sesionVigente();
  if (!ses) redirect("/login");
  if (ses.tipo === "panel" && mantenimientoDmc()) redirect(inicioEquipo());
  if (!ses.debeCambiar) redirect(ses.tipo === "panel" ? "/panel" : "/portal");
  return <CambioClave nombre={ses.nombre} />;
}
