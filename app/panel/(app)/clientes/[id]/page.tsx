import { notFound } from "next/navigation";
import Link from "next/link";
import Lista from "@/components/panel/ui/Lista";
import { Datos, Encabezado, Estado, Kpis, Seccion, Texto } from "@/components/panel/ui/Piezas";
import { detalleCliente } from "@/lib/data/panel/clientes";
import { listarVisitas } from "@/lib/data/panel/operacion";
import { ACTIVA, ACTIVO, ESTADOS_GARANTIA, ESTADOS_VISITA, SI_NO, fecha, plural } from "@/lib/panel/formato";
import { exigirModulo, idDeRuta, puedeVer } from "@/lib/server/panelAcceso";

export const metadata = { title: "Cliente · Panel interno" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { cuenta } = await exigirModulo("clientes");
  const id = idDeRuta((await params).id);
  const [c, visitas] = await Promise.all([detalleCliente(id), listarVisitas({ clienteId: id })]);
  if (!c) notFound();

  const verCuentas = puedeVer(cuenta.roles, "usuarios");
  const sucActivas = c.sucursales.filter((s) => s.activo).length;
  const conProblemas = c.sucursales.filter((s) => s.problemas > 0).length;
  const completadas = c.visitas.find((v) => v.estado === "COMPLETADA")?.n ?? 0;
  const programadas = c.visitas.find((v) => v.estado === "PROGRAMADA")?.n ?? 0;

  return (
    <section className="view" aria-labelledby="cdTitulo">
      <Encabezado titulo={c.nombre} volver={{ href: "/panel/clientes", label: "Clientes" }} sub={<>{c.razonSocial} · RUT <span className="num">{c.rut}</span></>}>
        <Estado estados={ACTIVO} valor={c.activo} />
        <Link className="btn-out" href="/panel/logos">Logo del cliente</Link>
      </Encabezado>

      <Kpis
        items={[
          { label: "Sucursales activas", valor: sucActivas, icon: "store", nota: `${plural(c.marcas.filter((m) => m.activo).length, "marca", "marcas")}` },
          { label: "Con problemas abiertos", valor: conProblemas, icon: "flag", tono: conProblemas ? "amber" : undefined, nota: "sucursales" },
          { label: "Visitas completadas", valor: completadas, icon: "visitOk", nota: "desde el inicio" },
          { label: "Visitas programadas", valor: programadas, icon: "calendar", nota: "pendientes de realizar" },
        ]}
      />

      <div className="pn-grid2">
        <Seccion titulo="Datos del cliente">
          <Datos
            items={[
              ["Nombre de fantasía", c.nombre],
              ["Razón social", c.razonSocial],
              ["RUT", c.rut],
              ["Garantía por defecto", c.garantiaMeses != null ? plural(c.garantiaMeses, "mes", "meses") : ""],
              ["Plan de calibración", c.planCalibracion == null ? "" : <Estado estados={SI_NO} valor={c.planCalibracion} />],
              ["Registrado el", fecha(c.creadoEn)],
              ...(!c.activo ? ([["Motivo de inactivación", c.motivoInactivo]] as [string, string][]) : []),
            ]}
          />
          {c.notas && (
            <>
              <h3 className="pn-subtitulo">Notas internas</h3>
              <Texto>{c.notas}</Texto>
            </>
          )}
        </Seccion>

        <Seccion titulo="Marcas" cuenta={c.marcas.length}>
          <Lista
            titulo="Marcas"
            filas={c.marcas}
            vacio="El cliente no tiene marcas."
            columnas={[
              { k: "nombre", label: "Marca" },
              { k: "sucursales", label: "Sucursales activas", tipo: "num" },
              { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVA },
            ]}
          />
        </Seccion>
      </div>

      <Seccion titulo="Sucursales" cuenta={c.sucursales.length}>
        <Lista
          titulo="Sucursales del cliente"
          csv={`sucursales-${c.nombre}`}
          placeholder="Buscar sucursal, código, mall o comuna"
          buscarEn={["nombre", "codigo", "mall", "comuna"]}
          filtros={[
            { k: "marca", label: "Marca" },
            { k: "region", label: "Región" },
            { k: "garantia", label: "Garantía", estados: ESTADOS_GARANTIA },
            { k: "activo", label: "Estado", estados: ACTIVA },
          ]}
          filas={c.sucursales.map((s) => ({ ...s, href: `/panel/sucursales/${s.id}`, lugar: [s.comuna, s.region].filter(Boolean).join(", ") }))}
          columnas={[
            { k: "nombre", label: "Sucursal", href: "href", sub: "codigo" },
            { k: "marca", label: "Marca" },
            { k: "mall", label: "Mall" },
            { k: "lugar", label: "Comuna" },
            { k: "problemas", label: "Problemas", tipo: "num" },
            { k: "ultimaVisita", label: "Última visita", tipo: "fecha" },
            { k: "garantia", label: "Garantía", tipo: "estado", estados: ESTADOS_GARANTIA },
            { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVA },
          ]}
        />
      </Seccion>

      {verCuentas && (
        <Seccion titulo="Cuentas del portal" cuenta={c.cuentas.length} sub="Usuarios del cliente que entran a /portal">
          <Lista
            titulo="Cuentas del portal"
            filas={c.cuentas.map((u) => ({ ...u, debe: u.debeCambiarPassword }))}
            vacio="El cliente todavía no tiene cuentas en el portal."
            columnas={[
              { k: "nombre", label: "Nombre", sub: "email" },
              { k: "ultimoAcceso", label: "Último acceso", tipo: "fechaHora" },
              { k: "creadoEn", label: "Creada", tipo: "fecha" },
              { k: "debe", label: "Debe cambiar clave", tipo: "estado", estados: SI_NO },
              { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVA },
            ]}
          />
        </Seccion>
      )}

      <Seccion titulo="Visitas" cuenta={visitas.length}>
        <Lista
          titulo="Visitas del cliente"
          csv={`visitas-${c.nombre}`}
          placeholder="Buscar folio, sucursal o técnico"
          buscarEn={["folio", "sucursal", "tecnico", "motivo"]}
          filtros={[{ k: "estado", label: "Estado", estados: ESTADOS_VISITA }, { k: "tecnico", label: "Técnico" }]}
          porPagina={20}
          filas={visitas.map((v) => ({ ...v, href: `/panel/visitas/${v.id}` }))}
          columnas={[
            { k: "folio", label: "Folio", href: "href" },
            { k: "fecha", label: "Fecha", tipo: "fecha", sub: "hora" },
            { k: "sucursal", label: "Sucursal" },
            { k: "motivo", label: "Motivo" },
            { k: "tecnico", label: "Técnico" },
            { k: "estado", label: "Estado", tipo: "estado", estados: ESTADOS_VISITA },
          ]}
        />
      </Seccion>
    </section>
  );
}
