import Lista from "@/components/panel/ui/Lista";
import { Encabezado } from "@/components/panel/ui/Piezas";
import { listarVisitas } from "@/lib/data/panel/operacion";
import { ESTADOS_VISITA, plural } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Visitas · Panel interno" };

export default async function Page() {
  await exigirModulo("visitas");
  const visitas = await listarVisitas();
  const cuenta = (e: string) => visitas.filter((v) => v.estado === e).length;

  return (
    <section className="view" aria-labelledby="visTitulo">
      <Encabezado titulo="Visitas" sub={`${plural(visitas.length, "visita", "visitas")} vigentes de todos los clientes (las eliminadas no se muestran).`}>
        <div className="status-sum">
          <div className="sum ok"><b className="num">{cuenta("COMPLETADA")}</b><span>Completadas</span></div>
          <div className="sum"><b className="num">{cuenta("PROGRAMADA")}</b><span>Programadas</span></div>
          <div className="sum obs"><b className="num">{cuenta("EN_CURSO")}</b><span>En curso</span></div>
        </div>
      </Encabezado>
      <div className="panel">
        <Lista
          titulo="Visitas"
          csv="visitas"
          placeholder="Buscar folio, cliente, sucursal o técnico"
          buscarEn={["folio", "cliente", "sucursal", "tecnico", "motivo"]}
          filtros={[
            { k: "estado", label: "Estado", estados: ESTADOS_VISITA },
            { k: "cliente", label: "Cliente" },
            { k: "tecnico", label: "Técnico" },
            { k: "motivo", label: "Motivo" },
          ]}
          filas={visitas.map((v) => ({
            ...v,
            href: `/panel/visitas/${v.id}`,
            hrefSucursal: `/panel/sucursales/${v.sucursalId}`,
            origen: v.enTerreno ? "Creada en terreno" : "",
          }))}
          columnas={[
            { k: "folio", label: "Folio", href: "href", sub: "origen" },
            { k: "fecha", label: "Fecha", tipo: "fecha", sub: "hora" },
            { k: "sucursal", label: "Sucursal", href: "hrefSucursal", sub: "cliente" },
            { k: "motivo", label: "Motivo" },
            { k: "tecnico", label: "Técnico" },
            { k: "estado", label: "Estado", tipo: "estado", estados: ESTADOS_VISITA },
          ]}
        />
      </div>
    </section>
  );
}
