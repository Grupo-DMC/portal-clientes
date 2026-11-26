import Link from "next/link";
import { Icon, Pill } from "@/components/portal/ui";
import { etiqueta, type Estados } from "@/lib/panel/formato";

// Piezas de presentación del panel (sin estado: sirven en Server Components).

export function Encabezado({
  titulo, sub, volver, children,
}: { titulo: string; sub?: React.ReactNode; volver?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="page-head pn-head">
      <div>
        {volver && (
          <Link className="pn-volver" href={volver.href}><Icon name="back" />{volver.label}</Link>
        )}
        <h1 className="page-title">{titulo}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="pn-head-extra">{children}</div>}
    </header>
  );
}

export function Seccion({
  titulo, cuenta, sub, id, children,
}: { titulo: string; cuenta?: number; sub?: React.ReactNode; id?: string; children: React.ReactNode }) {
  const hid = id ?? `s-${titulo.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="panel" aria-labelledby={hid}>
      <div className="panel-head">
        <h2 id={hid}>
          {titulo}
          {cuenta !== undefined && <span className="pn-n num">{cuenta.toLocaleString("es-CL")}</span>}
        </h2>
        {sub && <span className="panel-sub">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

/** Lista de datos «etiqueta: valor». Los valores vacíos se muestran como «Sin dato». */
export function Datos({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="pn-datos">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v === "" || v === null || v === undefined ? <span className="pn-vacio">Sin dato</span> : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Estado({ estados, valor }: { estados: Estados; valor: unknown }) {
  const e = etiqueta(estados, valor);
  return <Pill tone={e.tono}>{e.label}</Pill>;
}

export interface Kpi {
  label: string;
  valor: number | string;
  nota?: React.ReactNode;
  icon: string;
  href?: string;
  tono?: "amber" | "red";
}

export function Kpis({ items }: { items: Kpi[] }) {
  return (
    <section className="kpis pn-kpis" aria-label="Indicadores">
      {items.map((k) => {
        const cuerpo = (
          <>
            <span className="kpi-label"><Icon name={k.icon} />{k.label}</span>
            <span className="kpi-value num">{typeof k.valor === "number" ? k.valor.toLocaleString("es-CL") : k.valor}</span>
            {k.nota && <span className="kpi-note">{k.nota}</span>}
          </>
        );
        const cls = `kpi${k.tono ? ` is-${k.tono}` : ""}`;
        return k.href ? (
          <Link key={k.label} className={`${cls} pn-kpi-link`} href={k.href}>{cuerpo}</Link>
        ) : (
          <div key={k.label} className={cls}>{cuerpo}</div>
        );
      })}
    </section>
  );
}

/** Texto multilínea tal como lo escribió el técnico o el equipo. */
export function Texto({ children }: { children: string }) {
  return children ? <p className="pn-texto">{children}</p> : <p className="pn-vacio">Sin dato</p>;
}
