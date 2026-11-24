import { redirect } from "next/navigation";
import Login from "@/components/login/Login";
import { inicioEquipo } from "@/lib/mantenimiento";
import { sesionVigente } from "@/lib/server/portalSesion";

export const metadata = { title: "Ingresar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;

  // Solo se redirige con una sesión vigente en la base (no solo por cookie), para evitar bucles con los layouts.
  const ses = await sesionVigente().catch(() => null);
  if (ses?.tipo === "panel") redirect(inicioEquipo());
  if (ses?.tipo === "portal") redirect("/portal");

  return <Login loggedOut={sp.salio === "1"} />;
}
