import LogosClientes, { type ClienteLogo } from "@/components/panel/LogosClientes";
import { consultaCon } from "@/lib/data/sql";
import { LogoNoDisponible, urlLogoPanel, versionesLogos } from "@/lib/server/logoCliente";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Logos de clientes · Panel interno" };
export const dynamic = "force-dynamic";

/* El equipo DMC sube el logo de cada cliente (empresa). Ese logo reemplaza la
   inicial en el portal cliente (menú lateral y dashboard). Única pantalla del
   panel que escribe (vía /api/panel/clientes/[id]/logo). */
export default async function Page() {
  await exigirModulo("logos");
  const [clientes, versiones] = await Promise.all([
    consultaCon<{ id: string; nombre: string | null; razon: string | null; rut: string | null; activo: boolean }>(
      `SELECT CAST(id AS varchar(20)) AS id, nombre_fantasia AS nombre, razon_social AS razon, rut, activo
         FROM clientes.cliente ORDER BY activo DESC, nombre_fantasia`,
      []
    ),
    versionesLogos().then(
      (m) => ({ lista: true, m }),
      (err) => {
        if (err instanceof LogoNoDisponible) return { lista: false, m: new Map<number, number>() };
        throw err;
      }
    ),
  ]);

  const datos: ClienteLogo[] = clientes.map((c) => {
    const id = Number(c.id);
    const version = versiones.m.get(id) ?? null;
    return {
      id,
      nombre: c.nombre || c.razon || `Cliente ${id}`,
      razonSocial: c.razon ?? "",
      rut: c.rut ?? "",
      activo: Boolean(c.activo),
      logo: urlLogoPanel(id, version),
      guardado: version !== null,
    };
  });

  return <LogosClientes clientes={datos} tablaLista={versiones.lista} />;
}
