import Link from "next/link";
import { Icon } from "@/components/portal/ui";
import { Encabezado, Estado, Kpis, Seccion } from "@/components/panel/ui/Piezas";
import { hoyChile } from "@/lib/data/panel/comun";
import { resumenPanel } from "@/lib/data/panel/operacion";
import { ESTADOS_PROBLEMA, fecha, fechaHora, mesCorto, plural } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Dashboard · Panel interno" };

function variacion(actual: number, anterior: number): string {
  if (!anterior) return actual ? "sin visitas el mes pasado" : "igual que el mes pasado";
  const d = Math.round(((actual - anterior) / anterior) * 100);
  return d === 0 ? "igual que el mes pasado" : `${d > 0 ? "+" : ""}${d}% vs. mes pasado (${anterior})`;
}

export default async function Page() {
  const { cuenta } = await exigirModulo("dashboard");
  const r = await resumenPanel();
  const max = Math.max(1, ...r.porMes.map((m) => m.n));
  const mesHoy = hoyChile().slice(0, 7);

  return (
    <section className="view" aria-labelledby="dashTitulo">
      <Encabezado
        titulo="Dashboard"
        sub={`Hola, ${cuenta.nombre.split(" ")[0]}. Resumen de todos los clientes con datos de DMC_Core al ${fecha(hoyChile())}.`}
      />

      <Kpis
        items={[
          { label: "Clientes activos", valor: r.clientes, icon: "building", href: "/panel/clientes", nota: r.clientesInactivos ? `${r.clientesInactivos} inactivos` : "Todos activos" },
          { label: "Sucursales activas", valor: r.sucursales, icon: "store", href: "/panel/sucursales", nota: `${plural(r.malls, "mall", "malls")} · ${plural(r.cuentasPortal, "cuenta", "cuentas")} del portal` },
          { label: "Visitas realizadas este mes", valor: r.visitasMes, icon: "visitOk", href: "/panel/visitas", nota: variacion(r.visitasMes, r.visitasMesAnterior) },
          {
            label: "Problemas abiertos", valor: r.problemasAbiertos, icon: "flag", href: "/panel/problemas",
            tono: r.problemasAbiertos ? "amber" : undefined, nota: `${r.programadas7} visitas en los próximos 7 días${r.enCurso ? ` · ${r.enCurso} en curso` : ""}`,
          },
        ]}
      />

      <div className="pn-grid-main">
        <div className="pn-pila">
          <Seccion titulo="Visitas realizadas por mes" sub="Últimos 12 meses · el mes en curso en morado">
            <ol className="pn-chart" aria-label="Visitas completadas por mes">
              {r.porMes.map((m) => (
                <li key={m.mes} className={m.mes === mesHoy ? "is-now" : undefined}>
                  <span className="pn-bar-n num">{m.n}</span>
                  <span className="pn-bar" style={{ height: `${(m.n / max) * 100}%` }} aria-hidden="true" />
                  <span className="pn-bar-m">{mesCorto(m.mes)}<span className="sr"> {m.mes.slice(0, 4)}: {m.n} visitas</span></span>
                </li>
              ))}
            </ol>
          </Seccion>

          <Seccion titulo="Problemas abiertos recientes" cuenta={r.problemasAbiertos}>
            {r.problemas.length ? (
              <ul className="pn-mini">
                {r.problemas.map((p) => (
                  <li key={p.id}>
                    <Link href={`/panel/visitas/${p.visitaId}`}><b>{p.tipo} · {p.sucursal}</b></Link>
                    <span className="pn-mini-r"><Estado estados={ESTADOS_PROBLEMA} valor={p.estadoCodigo} /></span>
                    <span className="pn-mini-sub">{p.cliente} · {p.folio} · {fecha(p.creadoEn)}{p.descripcion ? ` · ${p.descripcion}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No hay problemas abiertos.</p>
            )}
            <Link className="pn-mini-foot" href="/panel/problemas">Ver todos los problemas<Icon name="right" /></Link>
          </Seccion>
        </div>

        <div className="pn-pila">
          <Seccion titulo="Próximas visitas">
            {r.proximas.length ? (
              <ul className="pn-mini">
                {r.proximas.map((v) => (
                  <li key={v.id}>
                    <Link href={`/panel/visitas/${v.id}`}><b>{v.sucursal}</b></Link>
                    <span className="pn-mini-r num">{fecha(v.fecha)}{v.hora ? ` ${v.hora}` : ""}</span>
                    <span className="pn-mini-sub">{v.cliente} · {v.tecnico}{v.motivo ? ` · ${v.motivo}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No hay visitas programadas desde hoy.</p>
            )}
            <Link className="pn-mini-foot" href="/panel/visitas">Ver todas las visitas<Icon name="right" /></Link>
          </Seccion>

          <Seccion titulo="Actividad reciente">
            {r.actividad.length ? (
              <ul className="pn-mini">
                {r.actividad.map((a) => (
                  <li key={a.id}>
                    <b title={a.texto}>{a.texto}</b>
                    <span className="pn-mini-r num">{fechaHora(a.en)}</span>
                    {a.actor && <span className="pn-mini-sub">{a.actor}{a.deTecnico ? " (técnico)" : ""}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin actividad registrada.</p>
            )}
            <Link className="pn-mini-foot" href="/panel/actividad">Ver toda la actividad<Icon name="right" /></Link>
          </Seccion>

          {r.garantiasPorVencer > 0 && (
            <p className="pn-nota is-amber" role="status">
              <Icon name="shield" />
              <span>{plural(r.garantiasPorVencer, "sucursal tiene", "sucursales tienen")} la garantía por vencer en los próximos 30 días. <Link className="link" href="/panel/garantias">Revisar</Link></span>
            </p>
          )}
        </div>
      </div>

    </section>
  );
}
