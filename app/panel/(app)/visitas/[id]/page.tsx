import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/portal/ui";
import Lista from "@/components/panel/ui/Lista";
import { Datos, Encabezado, Estado, Seccion, Texto } from "@/components/panel/ui/Piezas";
import { detalleVisita } from "@/lib/data/panel/operacion";
import { ESTADOS_PROBLEMA, ESTADOS_VISITA, fecha, fechaHora } from "@/lib/panel/formato";
import { exigirModulo, idDeRuta } from "@/lib/server/panelAcceso";

export const metadata = { title: "Visita · Panel interno" };

function duracion(inicio: string, termino: string): string {
  if (!inicio || !termino) return "";
  const min = Math.round((Date.parse(termino.replace(" ", "T")) - Date.parse(inicio.replace(" ", "T"))) / 60000);
  if (!Number.isFinite(min) || min < 0) return "";
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

const ROL_FIRMA: Record<string, string> = { TIENDA: "Responsable de tienda", TECNICO: "Técnico" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await exigirModulo("visitas");
  const id = idDeRuta((await params).id);
  const v = await detalleVisita(id);
  if (!v) notFound();
  const e = v.ejecucion;

  return (
    <section className="view" aria-labelledby="vdTitulo">
      <Encabezado
        titulo={`Visita ${v.folio}`}
        volver={{ href: "/panel/visitas", label: "Visitas" }}
        sub={<>
          <Link className="link" href={`/panel/sucursales/${v.sucursalId}`}>{v.sucursal}</Link> ·{" "}
          <Link className="link" href={`/panel/clientes/${v.clienteId}`}>{v.cliente}</Link> · {fecha(v.fecha)}{v.hora ? ` ${v.hora}` : ""}
        </>}
      >
        <Estado estados={ESTADOS_VISITA} valor={v.estado} />
      </Encabezado>

      <p className="pn-nota">
        <Icon name="lock" />
        <span>Vista interna: incluye el comentario interno, las indicaciones de acceso y los datos del responsable, que el cliente no ve en su portal.</span>
      </p>

      <div className="pn-grid2">
        <Seccion titulo="Agendamiento">
          <Datos
            items={[
              ["Fecha programada", `${fecha(v.fecha)}${v.hora ? ` ${v.hora}` : ""}`],
              ["Hasta", fecha(v.fechaHasta)],
              ["Motivo", v.motivo],
              ["Técnico", v.tecnico],
              ["Ayudante", v.ayudante],
              ["Creada", `${fechaHora(v.creadoEn)}${v.enTerreno ? " · en terreno" : ""}`],
              ["Contacto en tienda", [v.responsable.nombre, v.responsable.cargo].filter(Boolean).join(" · ")],
              ["Teléfono del contacto", v.responsable.telefono],
            ]}
          />
          <h3 className="pn-subtitulo">Trabajo solicitado</h3>
          <Texto>{v.trabajoSolicitado}</Texto>
          {v.indicacionesAcceso && (
            <>
              <h3 className="pn-subtitulo">Indicaciones de acceso</h3>
              <Texto>{v.indicacionesAcceso}</Texto>
            </>
          )}
        </Seccion>

        <Seccion titulo="Ejecución" sub={e ? undefined : "Sin acta registrada"}>
          {e ? (
            <>
              <Datos
                items={[
                  ["Inicio", fechaHora(e.inicio)],
                  ["Término", fechaHora(e.termino)],
                  ["Duración", duracion(e.inicio, e.termino)],
                  ["Recibió", [e.responsable, e.cargo].filter(Boolean).join(" · ")],
                  ["Correo de quien recibió", e.email],
                  ["Motivo real", e.motivoReal],
                  ["Registro", `${e.offline ? "Sin conexión, sincronizado después" : "En línea"}${e.appVersion ? ` · app ${e.appVersion}` : ""}`],
                  ["Archivos", `${v.archivos.fotos} fotos, ${v.archivos.videos} videos${v.archivos.fotosInternas + v.archivos.videosInternos ? ` (+${v.archivos.fotosInternas + v.archivos.videosInternos} internos)` : ""}`],
                ]}
              />
              <h3 className="pn-subtitulo">Observaciones (las ve el cliente)</h3>
              <Texto>{e.observaciones}</Texto>
              <h3 className="pn-subtitulo">Comentario interno</h3>
              <Texto>{e.comentarioInterno}</Texto>
            </>
          ) : (
            <p className="muted">El técnico todavía no registró la ejecución de esta visita.</p>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Trabajos realizados" cuenta={v.trabajos.length}>
        <Lista
          titulo="Trabajos realizados"
          filas={v.trabajos}
          vacio="No hay trabajos registrados."
          columnas={[
            { k: "trabajo", label: "Trabajo", sub: "motivo" },
            { k: "items", label: "Ítems", larga: true },
            { k: "detalle", label: "Detalle", larga: true },
          ]}
        />
      </Seccion>

      <Seccion titulo="Problemas reportados" cuenta={v.problemas.length}>
        <Lista
          titulo="Problemas reportados"
          filas={v.problemas}
          vacio="No se reportaron problemas en esta visita."
          columnas={[
            { k: "tipo", label: "Problema" },
            { k: "descripcion", label: "Descripción", larga: true },
            { k: "solucion", label: "Solución", larga: true },
            { k: "resueltoEn", label: "Resuelto", tipo: "fecha" },
            { k: "estadoCodigo", label: "Estado", tipo: "estado", estados: ESTADOS_PROBLEMA },
          ]}
        />
      </Seccion>

      <div className="pn-grid2">
        <Seccion titulo="Firmas" cuenta={v.firmas.length}>
          {v.firmas.length ? (
            <ul className="pn-mini">
              {v.firmas.map((f) => (
                <li key={f.id}>
                  <b>{f.nombre}</b>
                  <span className="pn-mini-r num">{fechaHora(f.firmadoEn)}</span>
                  <span className="pn-mini-sub">{ROL_FIRMA[f.rol] ?? f.rol}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sin firmas.</p>
          )}
        </Seccion>

        <Seccion titulo="Historial de estados" cuenta={v.historial.length + v.reagendamientos.length}>
          {v.historial.length || v.reagendamientos.length ? (
            <ul className="pn-mini">
              {v.historial.map((h, i) => (
                <li key={`h${i}`}>
                  <b><Estado estados={ESTADOS_VISITA} valor={h.estado} /></b>
                  <span className="pn-mini-r num">{fechaHora(h.en)}</span>
                  <span className="pn-mini-sub">{[h.origen, h.motivo].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
              {v.reagendamientos.map((r, i) => (
                <li key={`r${i}`}>
                  <b>Reagendada del {fecha(r.anterior)}{r.nueva ? ` al ${fecha(r.nueva)}` : ""}</b>
                  <span className="pn-mini-r num">{fechaHora(r.en)}</span>
                  <span className="pn-mini-sub">{[r.origen, r.motivo].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sin cambios de estado registrados.</p>
          )}
        </Seccion>
      </div>
    </section>
  );
}
