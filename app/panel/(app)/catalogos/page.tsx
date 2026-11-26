import Lista from "@/components/panel/ui/Lista";
import { Encabezado, Seccion } from "@/components/panel/ui/Piezas";
import { listarCatalogos } from "@/lib/data/panel/administracion";
import { ACTIVO } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Catálogos · Panel interno" };

export default async function Page() {
  await exigirModulo("catalogos");
  const catalogos = await listarCatalogos();

  return (
    <section className="view" aria-labelledby="catTitulo">
      <Encabezado titulo="Catálogos" sub="Listas maestras que usa la operación. Se editan en el panel de técnicos; aquí se consultan." />

      <nav aria-label="Catálogos">
        <ul className="pn-indice">
          {catalogos.map((c) => (
            <li key={c.id}><a href={`#cat-${c.id}`}>{c.nombre} <span className="num">{c.filas.filter((f) => f.activo).length}</span></a></li>
          ))}
        </ul>
      </nav>

      {catalogos.map((c) => (
        <div className="pn-ancla" id={`cat-${c.id}`} key={c.id}>
          <Seccion titulo={c.nombre} cuenta={c.filas.length} sub={c.descripcion} id={`h-cat-${c.id}`}>
            <Lista
              titulo={c.nombre}
              filas={c.filas}
              clave="codigo"
              porPagina={25}
              buscarEn={c.filas.length > 12 ? ["codigo", "nombre", "extra"] : undefined}
              placeholder="Buscar código o nombre"
              vacio="El catálogo está vacío."
              columnas={[
                { k: "nombre", label: "Nombre", sub: "codigo" },
                ...(c.columnaExtra ? [{ k: "extra", label: c.columnaExtra, larga: true }] : []),
                { k: "orden", label: "Orden", tipo: "num" as const },
                { k: "activo", label: "Estado", tipo: "estado" as const, estados: ACTIVO },
              ]}
            />
          </Seccion>
        </div>
      ))}
    </section>
  );
}
