import Lista from "@/components/panel/ui/Lista";
import { Encabezado } from "@/components/panel/ui/Piezas";
import { listarProblemas } from "@/lib/data/panel/operacion";
import { ESTADOS_PROBLEMA, plural } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Problemas · Panel interno" };

export default async function Page() {
  await exigirModulo("problemas");
  const problemas = await listarProblemas();
  const por = (c: string) => problemas.filter((p) => p.estadoCodigo === c).length;

  return (
    <section className="view" aria-labelledby="prTitulo">
      <Encabezado titulo="Problemas" sub={`${plural(problemas.length, "problema reportado", "problemas reportados")} en visitas vigentes. Primero los no resueltos.`}>
        <div className="status-sum">
          <div className="sum obs"><b className="num">{por("ABIERTO")}</b><span>Abiertos</span></div>
          <div className="sum"><b className="num">{por("AGENDADO")}</b><span>Agendados</span></div>
          <div className="sum obs"><b className="num">{por("PENDIENTE")}</b><span>Espera repuesto</span></div>
          <div className="sum ok"><b className="num">{por("RESUELTO")}</b><span>Resueltos</span></div>
        </div>
      </Encabezado>
      <div className="panel">
        <Lista
          titulo="Problemas"
          csv="problemas"
          placeholder="Buscar problema, cliente, sucursal, folio o descripción"
          buscarEn={["tipo", "cliente", "sucursal", "folio", "descripcion"]}
          filtros={[
            { k: "estadoCodigo", label: "Estado", estados: ESTADOS_PROBLEMA },
            { k: "tipo", label: "Tipo" },
            { k: "cliente", label: "Cliente" },
          ]}
          filas={problemas.map((p) => ({
            ...p,
            hrefVisita: `/panel/visitas/${p.visitaId}`,
            hrefSucursal: `/panel/sucursales/${p.sucursalId}`,
            origen: p.desdePanel ? "Registrado en el panel" : "",
          }))}
          columnas={[
            { k: "tipo", label: "Problema", sub: "origen" },
            { k: "descripcion", label: "Descripción", larga: true },
            { k: "sucursal", label: "Sucursal", href: "hrefSucursal", sub: "cliente" },
            { k: "folio", label: "Visita", href: "hrefVisita" },
            { k: "creadoEn", label: "Reportado", tipo: "fecha" },
            { k: "resueltoEn", label: "Resuelto", tipo: "fecha" },
            { k: "estadoCodigo", label: "Estado", tipo: "estado", estados: ESTADOS_PROBLEMA },
          ]}
        />
      </div>
    </section>
  );
}
