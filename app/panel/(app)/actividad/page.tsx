import Lista from "@/components/panel/ui/Lista";
import { Encabezado } from "@/components/panel/ui/Piezas";
import { listarActividad } from "@/lib/data/panel/operacion";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Actividad · Panel interno" };

const TOPE = 500;

/* Registro de eventos de la operación (tecnico.actividad): lo que escribe sys_tecnicos
   cuando se agenda, inicia, cierra o cambia una visita, o se edita un maestro. */
export default async function Page() {
  await exigirModulo("actividad");
  const actividad = await listarActividad(TOPE);

  return (
    <section className="view" aria-labelledby="acTitulo">
      <Encabezado
        titulo="Actividad"
        sub={`Eventos de la operación registrados por sys_tecnicos${actividad.length >= TOPE ? ` (los ${TOPE} más recientes)` : ""}.`}
      />
      <div className="panel">
        <Lista
          titulo="Actividad"
          csv="actividad"
          placeholder="Buscar en el texto o por persona"
          buscarEn={["texto", "detalle", "actor"]}
          filtros={[{ k: "tipo", label: "Tipo" }, { k: "quien", label: "Origen" }]}
          filas={actividad.map((a) => ({ ...a, quien: a.deTecnico ? "Técnico" : "Panel" }))}
          columnas={[
            { k: "en", label: "Fecha", tipo: "fechaHora" },
            { k: "texto", label: "Evento", larga: true, sub: "detalle" },
            { k: "tipo", label: "Tipo" },
            { k: "actor", label: "Quién", sub: "quien" },
          ]}
        />
      </div>
    </section>
  );
}
