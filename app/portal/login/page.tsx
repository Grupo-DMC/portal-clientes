import { redirect } from "next/navigation";
import LoginFlow from "@/components/LoginFlow";
import { publicAccts } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";

export const metadata = { title: "Ingresar · Portal cliente" };

export default async function PortalLogin({ searchParams }: { searchParams: Promise<{ salio?: string }> }) {
  if ((await getSession())?.k === "portal") redirect("/portal");
  const sp = await searchParams;
  return (
    <LoginFlow
      surface="portal"
      accounts={publicAccts("portal")}
      demoNotice={sp.salio ? "Cerraste sesión correctamente." : undefined}
      copy={{
        brand: "Portal cliente", kicker: "Portal cliente", title: "Tus sucursales, visitas y tickets", idLabel: "Correo",
        idPlaceholder: "nombre@tuempresa.cl", sideTitle: "Todo lo que DMC hace en tus locales,", sideEm: "a la vista.",
        sideText: "Cada usuario ve solo las sucursales de su alcance: todo el cliente, una zona o una marca.",
        inactiveText: "Tu usuario fue desactivado por el administrador de tu empresa. Pídele que lo reactive desde Usuarios y roles.",
        notice: sp.salio ? "Cerraste sesión correctamente." : undefined, support: "soporte@grupodmc.cl",
      }}
    />
  );
}
