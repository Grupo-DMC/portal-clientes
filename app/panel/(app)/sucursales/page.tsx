import Lista from "@/components/panel/ui/Lista";
import { Encabezado } from "@/components/panel/ui/Piezas";
import { listarSucursales } from "@/lib/data/panel/sucursales";
import { ACTIVA, ESTADOS_GARANTIA, plural } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Sucursales · Panel interno" };

export default async function Page() {
  await exigirModulo("sucursales");
  const sucursales = await listarSucursales();
  const activas = sucursales.filter((s) => s.activo);
  const conProblemas = activas.filter((s) => s.problemas > 0).length;

  return (
    <section className="view" aria-labelledby="sucTitulo">
      <Encabezado
        titulo="Sucursales"
        sub={`${plural(activas.length, "sucursal activa", "sucursales activas")} de ${new Set(activas.map((s) => s.clienteId)).size} clientes.`}
      >
        <div className="status-sum">
          <div className="sum ok"><b className="num">{activas.length - conProblemas}</b><span>Sin problemas</span></div>
          <div className="sum obs"><b className="num">{conProblemas}</b><span>Con problemas abiertos</span></div>
        </div>
      </Encabezado>
      <div className="panel">
        <Lista
          titulo="Sucursales"
          csv="sucursales"
          placeholder="Buscar sucursal, cliente, código, mall o comuna"
          buscarEn={["nombre", "cliente", "codigo", "mall", "comuna"]}
          filtros={[
            { k: "cliente", label: "Cliente" },
            { k: "region", label: "Región" },
            { k: "garantia", label: "Garantía", estados: ESTADOS_GARANTIA },
            { k: "activo", label: "Estado", estados: ACTIVA },
          ]}
          orden={{ k: "cliente", dir: 1 }}
          filas={sucursales.map((s) => ({
            ...s,
            href: `/panel/sucursales/${s.id}`,
            hrefCliente: `/panel/clientes/${s.clienteId}`,
            lugar: [s.comuna, s.region].filter(Boolean).join(", "),
          }))}
          columnas={[
            { k: "nombre", label: "Sucursal", href: "href", sub: "codigo" },
            { k: "cliente", label: "Cliente", href: "hrefCliente", sub: "marca" },
            { k: "mall", label: "Mall" },
            { k: "lugar", label: "Comuna" },
            { k: "problemas", label: "Problemas", tipo: "num" },
            { k: "visitas", label: "Visitas", tipo: "num" },
            { k: "ultimaVisita", label: "Última visita", tipo: "fecha" },
            { k: "garantia", label: "Garantía", tipo: "estado", estados: ESTADOS_GARANTIA },
            { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVA },
          ]}
        />
      </div>
    </section>
  );
}
