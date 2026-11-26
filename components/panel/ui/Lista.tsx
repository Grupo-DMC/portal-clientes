"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon, Pill, SearchBox } from "@/components/portal/ui";
import { etiqueta, fecha, fechaHora, plural, type Estados } from "@/lib/panel/formato";

// Lista genérica del panel: búsqueda, filtros por columna, orden por encabezado,
// paginación y exportación a CSV. La configuración es serializable (sin
// funciones) para que la arme un Server Component con los datos ya leídos.

type Valor = string | number | boolean | null | undefined;
export type Fila = Record<string, Valor>;

export interface Columna {
  k: string;
  label: string;
  tipo?: "texto" | "num" | "fecha" | "fechaHora" | "estado";
  /** Para tipo «estado»: etiqueta y tono de cada valor. */
  estados?: Estados;
  /** Clave de la fila que trae el enlace de la celda. */
  href?: string;
  /** Clave de la fila con una segunda línea (gris) bajo el valor. */
  sub?: string;
  /** Texto largo: se corta a dos líneas. */
  larga?: boolean;
}

export interface FiltroLista {
  k: string;
  label: string;
  estados?: Estados;
}

export interface ListaProps {
  titulo: string;
  /** Filas planas (valores texto, número o booleano). */
  filas: readonly object[];
  columnas: Columna[];
  /** Claves en las que busca el cuadro de búsqueda. Sin él, no hay buscador. */
  buscarEn?: string[];
  placeholder?: string;
  filtros?: FiltroLista[];
  orden?: { k: string; dir: 1 | -1 };
  porPagina?: number;
  vacio?: string;
  /** Nombre del archivo CSV; sin él, no hay botón de exportar. */
  csv?: string;
  clave?: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function textoDe(c: Columna, v: Valor): string {
  if (v === null || v === undefined || v === "") return "";
  if (c.tipo === "fecha") return fecha(String(v));
  if (c.tipo === "fechaHora") return fechaHora(String(v));
  if (c.tipo === "estado" && c.estados) return etiqueta(c.estados, v).label;
  if (c.tipo === "num" && typeof v === "number") return v.toLocaleString("es-CL");
  return String(v);
}

function comparar(a: Valor, b: Valor): number {
  const va = a === "" || a == null;
  const vb = b === "" || b == null;
  if (va || vb) return va === vb ? 0 : va ? 1 : -1; // vacíos al final
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

function Celda({ c, f }: { c: Columna; f: Fila }) {
  const v = f[c.k];
  const texto = textoDe(c, v);
  let cuerpo: React.ReactNode = texto || <span className="pn-vacio">—</span>;
  if (c.tipo === "estado" && c.estados && texto) {
    const e = etiqueta(c.estados, v);
    cuerpo = <Pill tone={e.tono}>{e.label}</Pill>;
  }
  const href = c.href ? f[c.href] : null;
  if (href && texto) cuerpo = <Link className="pn-link" href={String(href)}>{cuerpo}</Link>;
  const sub = c.sub ? f[c.sub] : null;
  return (
    <td className={`${c.tipo === "num" ? "r num" : ""}${c.larga ? " pn-larga" : ""}${c.tipo === "fecha" || c.tipo === "fechaHora" ? " num nw" : ""}`}>
      {cuerpo}
      {sub ? <span className="pn-sub">{String(sub)}</span> : null}
    </td>
  );
}

function exportar(nombre: string, columnas: Columna[], filas: Fila[]) {
  const esc = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lineas = [columnas.map((c) => esc(c.label)).join(";"), ...filas.map((f) => columnas.map((c) => esc(textoDe(c, f[c.k]))).join(";"))];
  // BOM para que Excel abra las tildes bien; «;» porque Excel en español usa coma decimal.
  const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Lista({
  titulo, filas: filasEntrada, columnas, buscarEn, placeholder = "Buscar", filtros = [], orden, porPagina = 50,
  vacio = "No hay registros.", csv, clave = "id",
}: ListaProps) {
  const filas = filasEntrada as readonly Fila[];
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [ord, setOrd] = useState(orden ?? null);
  const [pagina, setPagina] = useState(1);

  const opciones = useMemo(
    () =>
      Object.fromEntries(
        filtros.map((fl) => {
          const valores = [...new Set(filas.map((f) => f[fl.k]).filter((v) => v !== "" && v != null).map(String))];
          valores.sort((a, b) => (fl.estados ? etiqueta(fl.estados, a).label : a).localeCompare(fl.estados ? etiqueta(fl.estados, b).label : b, "es"));
          return [fl.k, valores];
        })
      ),
    [filas, filtros]
  );

  const visibles = useMemo(() => {
    const t = norm(q.trim());
    let r = filas.filter(
      (f) =>
        filtros.every((fl) => !sel[fl.k] || String(f[fl.k]) === sel[fl.k]) &&
        (!t || !buscarEn || buscarEn.some((k) => norm(String(f[k] ?? "")).includes(t)))
    );
    if (ord) r = [...r].sort((a, b) => comparar(a[ord.k], b[ord.k]) * ord.dir);
    return r;
  }, [filas, filtros, sel, q, buscarEn, ord]);

  const paginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const p = Math.min(pagina, paginas);
  const pagFilas = visibles.slice((p - 1) * porPagina, p * porPagina);
  const hayFiltro = Boolean(q.trim()) || Object.values(sel).some(Boolean);
  const limpiar = () => { setQ(""); setSel({}); setPagina(1); };

  const ordenarPor = (k: string) => {
    setOrd((o) => (o?.k === k ? { k, dir: o.dir === 1 ? -1 : 1 } : { k, dir: 1 }));
    setPagina(1);
  };

  return (
    <div className="pn-lista">
      {(buscarEn || filtros.length > 0 || csv) && (
        <div className="pn-barra">
          {buscarEn && (
            <SearchBox label={`Buscar en ${titulo}`} placeholder={placeholder} value={q} onChange={(v: string) => { setQ(v); setPagina(1); }} />
          )}
          {filtros.map((fl) => (
            <label className="pn-filtro" key={fl.k}>
              <span className="sr">{fl.label}</span>
              <select className="input" value={sel[fl.k] ?? ""} onChange={(e) => { setSel((s) => ({ ...s, [fl.k]: e.target.value })); setPagina(1); }}>
                <option value="">{fl.label}: todos</option>
                {opciones[fl.k].map((v) => (
                  <option key={v} value={v}>{fl.estados ? etiqueta(fl.estados, v).label : v}</option>
                ))}
              </select>
            </label>
          ))}
          {hayFiltro && <button className="link" type="button" onClick={limpiar}>Limpiar</button>}
          <span className="pn-cuenta muted num" aria-live="polite">
            {visibles.length === filas.length ? plural(filas.length, "registro", "registros") : `${visibles.length.toLocaleString("es-CL")} de ${filas.length.toLocaleString("es-CL")}`}
          </span>
          {csv && (
            <button className="btn-out pn-csv" type="button" disabled={!visibles.length} onClick={() => exportar(csv, columnas, visibles)}>
              <Icon name="download" />CSV
            </button>
          )}
        </div>
      )}

      {visibles.length ? (
        <div className="table-wrap pn-tw">
          <table className="pn-table">
            <caption className="sr">{titulo}</caption>
            <thead>
              <tr>
                {columnas.map((c) => (
                  <th key={c.k} scope="col" className={c.tipo === "num" ? "r" : undefined}
                    aria-sort={ord?.k === c.k ? (ord.dir === 1 ? "ascending" : "descending") : undefined}>
                    <button type="button" onClick={() => ordenarPor(c.k)}>
                      {c.label}
                      <Icon name={ord?.k === c.k ? "chevron" : "sort"} className={ord?.k === c.k && ord.dir === -1 ? "" : ord?.k === c.k ? "pn-up" : "pn-sortable"} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagFilas.map((f, i) => (
                <tr key={String(f[clave] ?? i)}>
                  {columnas.map((c) => <Celda key={c.k} c={c} f={f} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pn-sin">
          <p>{hayFiltro ? "Ningún registro coincide con la búsqueda o los filtros." : vacio}</p>
          {hayFiltro && <button className="link" type="button" onClick={limpiar}>Quitar filtros</button>}
        </div>
      )}

      {paginas > 1 && (
        <nav className="pn-pag" aria-label={`Páginas de ${titulo}`}>
          <button className="btn-out" type="button" disabled={p <= 1} onClick={() => setPagina(p - 1)}><Icon name="left" />Anterior</button>
          <span className="num muted">Página {p} de {paginas}</span>
          <button className="btn-out" type="button" disabled={p >= paginas} onClick={() => setPagina(p + 1)}>Siguiente<Icon name="right" /></button>
        </nav>
      )}
    </div>
  );
}
