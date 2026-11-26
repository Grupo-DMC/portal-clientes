import Lista from "@/components/panel/ui/Lista";
import { Encabezado } from "@/components/panel/ui/Piezas";
import { listarClientes } from "@/lib/data/panel/clientes";
import { ACTIVO, plural } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Clientes · Panel interno" };

export default async function Page() {
  await exigirModulo("clientes");
  const clientes = await listarClientes();
  const activos = clientes.filter((c) => c.activo).length;

  return (
    <section className="view" aria-labelledby="cliTitulo">
      <Encabezado titulo="Clientes" sub={`${plural(activos, "cliente activo", "clientes activos")} de ${clientes.length} registrados en DMC_Core.`} />
      <div className="panel">
        <Lista
          titulo="Clientes"
          csv="clientes"
          placeholder="Buscar por nombre, razón social o RUT"
          buscarEn={["nombre", "razonSocial", "rut"]}
          filtros={[{ k: "activo", label: "Estado", estados: ACTIVO }]}
          filas={clientes.map((c) => ({ ...c, href: `/panel/clientes/${c.id}` }))}
          columnas={[
            { k: "nombre", label: "Cliente", href: "href", sub: "razonSocial" },
            { k: "rut", label: "RUT" },
            { k: "marcas", label: "Marcas", tipo: "num" },
            { k: "sucursales", label: "Sucursales", tipo: "num" },
            { k: "cuentas", label: "Cuentas portal", tipo: "num" },
            { k: "visitasAnio", label: "Visitas este año", tipo: "num" },
            { k: "ultimaVisita", label: "Última visita", tipo: "fecha" },
            { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVO },
          ]}
        />
      </div>
    </section>
  );
}
