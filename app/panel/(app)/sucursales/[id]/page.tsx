import Link from "next/link";
import { notFound } from "next/navigation";
import Lista from "@/components/panel/ui/Lista";
import { Datos, Encabezado, Estado, Seccion, Texto } from "@/components/panel/ui/Piezas";
import { detalleSucursal } from "@/lib/data/panel/sucursales";
import { ACTIVA, ESTADOS_GARANTIA, ESTADOS_PROBLEMA, ESTADOS_VISITA, SI_NO, fecha, plural } from "@/lib/panel/formato";
import { exigirModulo, idDeRuta } from "@/lib/server/panelAcceso";

export const metadata = { title: "Sucursal · Panel interno" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await exigirModulo("sucursales");
  const id = idDeRuta((await params).id);
  const s = await detalleSucursal(id);
  if (!s) notFound();

  const abiertos = s.problemasLista.filter((p) => p.estadoCodigo !== "RESUELTO").length;

  return (
    <section className="view" aria-labelledby="sdTitulo">
      <Encabezado
        titulo={s.nombre}
        volver={{ href: "/panel/sucursales", label: "Sucursales" }}
        sub={<><Link className="link" href={`/panel/clientes/${s.clienteId}`}>{s.cliente}</Link> · {s.marca}{s.codigo ? ` · Código ${s.codigo}` : ""}</>}
      >
        <Estado estados={ACTIVA} valor={s.activo} />
        <Estado estados={ESTADOS_GARANTIA} valor={s.garantia} />
      </Encabezado>

      <div className="pn-grid2">
        <Seccion titulo="Ubicación y contacto">
          <Datos
            items={[
              ["Dirección", s.direccion],
              ["Comuna", s.comuna],
              ["Región", s.region],
              ["Mall", s.mallId ? <Link className="link" href={`/panel/malls/${s.mallId}`}>{s.mall}</Link> : ""],
              ["Teléfono", s.telefono],
              ["Atención remota", <Estado key="r" estados={SI_NO} valor={s.remota} />],
              ["Registrada el", fecha(s.creadoEn)],
              ...(!s.activo ? ([["Motivo de inactivación", s.motivoInactivo]] as [string, string][]) : []),
            ]}
          />
          {s.notas && (
            <>
              <h3 className="pn-subtitulo">Notas internas</h3>
              <Texto>{s.notas}</Texto>
            </>
          )}
          {s.nombresAnteriores.length > 0 && (
            <>
              <h3 className="pn-subtitulo">Nombres anteriores</h3>
              <ul className="pn-mini">
                {s.nombresAnteriores.map((n) => (
                  <li key={n.nombre + n.cambiadoEn}><b>{n.nombre}</b><span className="pn-mini-r num">hasta {fecha(n.cambiadoEn)}</span></li>
                ))}
              </ul>
            </>
          )}
        </Seccion>

        <Seccion titulo="Garantía y calibración">
          <Datos
            items={[
              ["Estado de la garantía", <Estado key="g" estados={ESTADOS_GARANTIA} valor={s.garantia} />],
              ["Instalación", fecha(s.fechaInstalacion)],
              ["Meses de garantía", s.garantiaMeses != null ? plural(s.garantiaMeses, "mes", "meses") : ""],
              ["Vence", fecha(s.garantiaVence)],
              ["Marcada «en garantía»", s.enGarantia == null ? "" : <Estado key="e" estados={SI_NO} valor={s.enGarantia} />],
              ["Plan de calibración", <Estado key="c" estados={SI_NO} valor={s.planCalibracion} />],
              ["Visitas completadas", String(s.visitas)],
              ["Última visita", fecha(s.ultimaVisita)],
            ]}
          />
          {s.garantia === "sin_datos" && (
            <p className="muted pn-aparte">
              Sin fecha de instalación o sin meses de garantía (de la sucursal o del cliente), no se puede calcular el vencimiento.
            </p>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Problemas" cuenta={s.problemasLista.length} sub={abiertos ? `${abiertos} sin resolver` : "Todos resueltos"}>
        <Lista
          titulo="Problemas de la sucursal"
          filas={s.problemasLista.map((p) => ({ ...p, href: `/panel/visitas/${p.visitaId}` }))}
          vacio="La sucursal no tiene problemas registrados."
          porPagina={15}
          columnas={[
            { k: "tipo", label: "Problema", sub: "descripcion" },
            { k: "folio", label: "Visita", href: "href" },
            { k: "creadoEn", label: "Reportado", tipo: "fecha" },
            { k: "resueltoEn", label: "Resuelto", tipo: "fecha" },
            { k: "estadoCodigo", label: "Estado", tipo: "estado", estados: ESTADOS_PROBLEMA },
          ]}
        />
      </Seccion>

      <Seccion titulo="Visitas" cuenta={s.visitasLista.length}>
        <Lista
          titulo="Visitas de la sucursal"
          csv={`visitas-${s.nombre}`}
          buscarEn={["folio", "tecnico", "motivo"]}
          placeholder="Buscar folio, técnico o motivo"
          filtros={[{ k: "estado", label: "Estado", estados: ESTADOS_VISITA }]}
          porPagina={20}
          filas={s.visitasLista.map((v) => ({ ...v, href: `/panel/visitas/${v.id}` }))}
          vacio="La sucursal todavía no tiene visitas."
          columnas={[
            { k: "folio", label: "Folio", href: "href" },
            { k: "fecha", label: "Fecha", tipo: "fecha", sub: "hora" },
            { k: "motivo", label: "Motivo" },
            { k: "tecnico", label: "Técnico" },
            { k: "estado", label: "Estado", tipo: "estado", estados: ESTADOS_VISITA },
          ]}
        />
      </Seccion>

      <Seccion titulo="Personal del local" cuenta={s.personas.length} sub="Responsables que firmaron o atendieron visitas">
        <Lista
          titulo="Personal del local"
          filas={s.personas}
          vacio="No hay personal registrado para esta sucursal."
          columnas={[
            { k: "nombre", label: "Nombre", sub: "cargo" },
            { k: "telefono", label: "Teléfono" },
            { k: "email", label: "Correo" },
            { k: "ultimaVez", label: "Última vez", tipo: "fecha" },
          ]}
        />
      </Seccion>
    </section>
  );
}
