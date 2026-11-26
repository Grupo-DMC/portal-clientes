import Lista from "@/components/panel/ui/Lista";
import { Encabezado } from "@/components/panel/ui/Piezas";
import { listarMalls } from "@/lib/data/panel/sucursales";
import { ACTIVO, plural } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Malls · Panel interno" };

export default async function Page() {
  await exigirModulo("malls");
  const malls = await listarMalls();
  const activos = malls.filter((m) => m.activo).length;
  const conSucursales = malls.filter((m) => m.sucursales > 0).length;

  return (
    <section className="view" aria-labelledby="mallTitulo">
      <Encabezado titulo="Malls" sub={`${plural(activos, "mall activo", "malls activos")} · ${conSucursales} con sucursales de clientes.`} />
      <div className="panel">
        <Lista
          titulo="Malls"
          csv="malls"
          placeholder="Buscar mall, dirección o comuna"
          buscarEn={["nombre", "direccion", "comuna"]}
          filtros={[{ k: "region", label: "Región" }, { k: "activo", label: "Estado", estados: ACTIVO }]}
          filas={malls.map((m) => ({ ...m, href: `/panel/malls/${m.id}` }))}
          columnas={[
            { k: "nombre", label: "Mall", href: "href", sub: "direccion" },
            { k: "comuna", label: "Comuna" },
            { k: "region", label: "Región" },
            { k: "sucursales", label: "Sucursales", tipo: "num" },
            { k: "clientes", label: "Clientes", tipo: "num" },
            { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVO },
          ]}
        />
      </div>
    </section>
  );
}
