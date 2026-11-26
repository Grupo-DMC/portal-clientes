import { Icon } from "@/components/portal/ui";
import Lista from "@/components/panel/ui/Lista";
import { Encabezado, Kpis } from "@/components/panel/ui/Piezas";
import { DIAS_POR_VENCER } from "@/lib/data/panel/comun";
import { listarSucursales } from "@/lib/data/panel/sucursales";
import { ESTADOS_GARANTIA, SI_NO, plural } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Garantías y calibraciones · Panel interno" };

export default async function Page() {
  await exigirModulo("garantias");
  const sucursales = (await listarSucursales()).filter((s) => s.activo);
  const por = (e: string) => sucursales.filter((s) => s.garantia === e).length;
  const sinDatos = por("sin_datos");
  const calibracion = sucursales.filter((s) => s.planCalibracion).length;

  return (
    <section className="view" aria-labelledby="gaTitulo">
      <Encabezado
        titulo="Garantías y calibraciones"
        sub={`Sucursales activas. La garantía vence a los meses de garantía (de la sucursal o, si no tiene, del cliente) contados desde la instalación; «por vencer» = en los próximos ${DIAS_POR_VENCER} días.`}
      />

      <Kpis
        items={[
          { label: "Por vencer", valor: por("por_vencer"), icon: "shield", tono: por("por_vencer") ? "amber" : undefined, nota: `próximos ${DIAS_POR_VENCER} días` },
          { label: "Vigentes", valor: por("vigente"), icon: "shieldOk", nota: "garantía al día" },
          { label: "Vencidas", valor: por("vencida"), icon: "alert", tono: por("vencida") ? "red" : undefined, nota: "requieren revisión comercial" },
          { label: "Con plan de calibración", valor: calibracion, icon: "gauge", nota: plural(sucursales.length, "sucursal activa", "sucursales activas") },
        ]}
      />

      {sinDatos > sucursales.length / 2 && (
        <p className="pn-nota is-amber" role="status">
          <Icon name="info" />
          <span>
            {plural(sinDatos, "sucursal no tiene", "sucursales no tienen")} fecha de instalación o meses de garantía en DMC_Core, así que su
            vencimiento no se puede calcular. Se completa desde el panel de técnicos (maestro de sucursales).
          </span>
        </p>
      )}

      <div className="panel">
        <Lista
          titulo="Garantías por sucursal"
          csv="garantias"
          placeholder="Buscar sucursal o cliente"
          buscarEn={["nombre", "cliente", "codigo"]}
          filtros={[
            { k: "garantia", label: "Garantía", estados: ESTADOS_GARANTIA },
            { k: "planCalibracion", label: "Calibración", estados: SI_NO },
            { k: "cliente", label: "Cliente" },
          ]}
          orden={{ k: "garantiaVence", dir: 1 }}
          filas={sucursales.map((s) => ({
            ...s,
            href: `/panel/sucursales/${s.id}`,
            meses: s.garantiaMeses ?? "",
          }))}
          columnas={[
            { k: "nombre", label: "Sucursal", href: "href", sub: "cliente" },
            { k: "fechaInstalacion", label: "Instalación", tipo: "fecha" },
            { k: "meses", label: "Meses", tipo: "num" },
            { k: "garantiaVence", label: "Vence", tipo: "fecha" },
            { k: "garantia", label: "Garantía", tipo: "estado", estados: ESTADOS_GARANTIA },
            { k: "planCalibracion", label: "Calibración", tipo: "estado", estados: SI_NO },
            { k: "ultimaVisita", label: "Última visita", tipo: "fecha" },
          ]}
        />
      </div>
    </section>
  );
}
