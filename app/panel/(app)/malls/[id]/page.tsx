import { notFound } from "next/navigation";
import Lista from "@/components/panel/ui/Lista";
import { Datos, Encabezado, Estado, Seccion } from "@/components/panel/ui/Piezas";
import { detalleMall } from "@/lib/data/panel/sucursales";
import { ACTIVA, ACTIVO, ESTADOS_GARANTIA, fechaHora } from "@/lib/panel/formato";
import { exigirModulo, idDeRuta } from "@/lib/server/panelAcceso";

export const metadata = { title: "Mall · Panel interno" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await exigirModulo("malls");
  const id = idDeRuta((await params).id);
  const m = await detalleMall(id);
  if (!m) notFound();

  return (
    <section className="view" aria-labelledby="mdTitulo">
      <Encabezado titulo={m.nombre} volver={{ href: "/panel/malls", label: "Malls" }} sub={[m.direccion, m.comuna, m.region].filter(Boolean).join(", ")}>
        <Estado estados={ACTIVO} valor={m.activo} />
      </Encabezado>

      <Seccion titulo="Datos del mall">
        <Datos
          items={[
            ["Dirección", m.direccion],
            ["Comuna", m.comuna],
            ["Región", m.region],
            ["Sucursales activas", String(m.sucursales)],
            ["Clientes con sucursal aquí", String(m.clientes)],
            ["Última modificación", fechaHora(m.actualizadoEn)],
            ...(!m.activo ? ([["Motivo de inactivación", m.motivoInactivo]] as [string, string][]) : []),
          ]}
        />
      </Seccion>

      <Seccion titulo="Sucursales en el mall" cuenta={m.sucursalesLista.length}>
        <Lista
          titulo="Sucursales en el mall"
          buscarEn={["nombre", "cliente", "codigo"]}
          placeholder="Buscar sucursal o cliente"
          filtros={[{ k: "cliente", label: "Cliente" }]}
          filas={m.sucursalesLista.map((s) => ({ ...s, href: `/panel/sucursales/${s.id}`, hrefCliente: `/panel/clientes/${s.clienteId}` }))}
          vacio="No hay sucursales registradas en este mall."
          columnas={[
            { k: "nombre", label: "Sucursal", href: "href", sub: "codigo" },
            { k: "cliente", label: "Cliente", href: "hrefCliente", sub: "marca" },
            { k: "problemas", label: "Problemas", tipo: "num" },
            { k: "ultimaVisita", label: "Última visita", tipo: "fecha" },
            { k: "garantia", label: "Garantía", tipo: "estado", estados: ESTADOS_GARANTIA },
            { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVA },
          ]}
        />
      </Seccion>
    </section>
  );
}
