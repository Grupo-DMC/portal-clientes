import { redirect } from "next/navigation";
import LoginFlow from "@/components/LoginFlow";
import { publicAccts } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";

export const metadata = { title: "Ingresar · Panel interno" };

export default async function PanelLogin({ searchParams }: { searchParams: Promise<{ salio?: string }> }) {
  if ((await getSession())?.k === "panel") redirect("/panel");
  const sp = await searchParams;
  return (
    <LoginFlow
      surface="panel"
      accounts={publicAccts("panel")}
      demoNotice={sp.salio ? "Cerraste sesión correctamente." : undefined}
      copy={{
        brand: "Panel interno", kicker: "Panel interno DMC", title: "Ingresa con tu cuenta Grupo DMC", idLabel: "Correo corporativo",
        idPlaceholder: "nombre@grupodmc.cl", sideTitle: "Clientes, sucursales y equipos en un", sideEm: "solo registro.",
        sideText: "Reemplaza al DMC Clientes legacy. Cada persona del equipo ve solo lo que su rol permite.",
        inactiveText: "Tu cuenta DMC fue desactivada. Pide a un administrador del panel que la reactive.",
        notice: sp.salio ? "Cerraste sesión correctamente." : undefined, support: "soporte@grupodmc.cl",
      }}
    />
  );
}
