"use client";
import { useMemo, useRef, useState } from "react";
import "./logos.css";

export interface ClienteLogo {
  id: number;
  nombre: string;
  razonSocial: string;
  rut: string;
  activo: boolean;
  /** URL del logo vigente (guardado o estático), o null. */
  logo: string | null;
  /** true si el logo está guardado en la base (se puede quitar). */
  guardado: boolean;
}

type Estado = { tipo: "cargando" | "ok" | "error"; texto: string } | null;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Tarjeta({ c, onCambio, deshabilitado }: { c: ClienteLogo; onCambio: (c: ClienteLogo) => void; deshabilitado: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>(null);
  const ocupado = estado?.tipo === "cargando";

  const pedir = async (init: RequestInit, ok: string) => {
    setEstado({ tipo: "cargando", texto: init.method === "DELETE" ? "Quitando…" : "Subiendo…" });
    try {
      const res = await fetch(`/api/panel/clientes/${c.id}/logo`, init);
      const data = (await res.json().catch(() => ({}))) as { url?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el logo.");
      onCambio({ ...c, logo: data.url ?? null, guardado: init.method !== "DELETE" });
      setEstado({ tipo: "ok", texto: ok });
    } catch (err) {
      setEstado({ tipo: "error", texto: err instanceof TypeError ? "Sin conexión. Inténtalo de nuevo." : (err as Error).message });
    }
  };

  const elegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return setEstado({ tipo: "error", texto: "Usa una imagen PNG, JPG o WEBP." });
    if (f.size > 3 * 1024 * 1024) return setEstado({ tipo: "error", texto: "El logo debe pesar menos de 3 MB." });
    const body = new FormData();
    body.append("logo", f);
    void pedir({ method: "POST", body }, "Logo guardado.");
  };

  return (
    <li className={`lc-card${c.activo ? "" : " is-off"}`} aria-busy={ocupado}>
      <div className="lc-logo" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo servido por la app (sesión del panel) */}
        {c.logo ? <img src={c.logo} alt="" /> : <span>{c.nombre[0]?.toUpperCase()}</span>}
      </div>
      <div className="lc-text">
        <strong>{c.nombre}</strong>
        <span className="muted">{[c.razonSocial, c.rut && `RUT ${c.rut}`].filter(Boolean).join(" · ")}</span>
        {!c.activo && <span className="pill off">Inactivo</span>}
        {estado && <span className={`lc-estado is-${estado.tipo}`} role={estado.tipo === "error" ? "alert" : "status"}>{estado.texto}</span>}
      </div>
      <div className="lc-acciones">
        <button className="btn-out" type="button" disabled={ocupado || deshabilitado} onClick={() => input.current?.click()}>
          {c.guardado ? "Cambiar" : "Subir logo"}
        </button>
        {c.guardado && (
          <button className="link" type="button" disabled={ocupado || deshabilitado} onClick={() => void pedir({ method: "DELETE" }, "Logo quitado.")}>
            Quitar
          </button>
        )}
        <input ref={input} className="sr" type="file" accept="image/png,image/jpeg,image/webp" tabIndex={-1} onChange={elegir} aria-label={`Elegir logo de ${c.nombre}`} />
      </div>
    </li>
  );
}

/** Lista de clientes con su logo: buscar, subir, cambiar y quitar. */
export default function LogosClientes({ clientes, tablaLista }: { clientes: ClienteLogo[]; tablaLista: boolean }) {
  const [lista, setLista] = useState(clientes);
  const [q, setQ] = useState("");
  const [soloSin, setSoloSin] = useState(false);

  const visibles = useMemo(() => {
    const t = norm(q.trim());
    return lista.filter((c) => (!soloSin || !c.logo) && (!t || norm(`${c.nombre} ${c.razonSocial} ${c.rut}`).includes(t)));
  }, [lista, q, soloSin]);
  const conLogo = lista.filter((c) => c.logo).length;

  return (
    <section className="view" aria-labelledby="lcTitulo">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="lcTitulo">Logos de clientes</h1>
          <p className="page-sub">El logo reemplaza la inicial del cliente en su portal (menú lateral y dashboard). PNG, JPG o WEBP; se guarda reducido a 256 px.</p>
        </div>
      </header>

      {!tablaLista && (
        <p className="lc-aviso" role="status">
          Todavía no se pueden guardar logos: falta crear la tabla <code>clientes.cliente_logo</code> en DMC_Core
          (<code>sql/2026-11-24_cliente_logo.sql</code>). Mientras tanto se muestran los logos cargados como archivo.
        </p>
      )}

      <div className="lc-barra">
        <input className="input lc-buscar" type="search" placeholder="Buscar por nombre, razón social o RUT" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cliente" />
        <label className="lc-check"><input type="checkbox" checked={soloSin} onChange={(e) => setSoloSin(e.target.checked)} /> Solo sin logo</label>
        <span className="muted lc-cuenta num">{visibles.length} de {lista.length} clientes · {conLogo} con logo</span>
      </div>

      {visibles.length ? (
        <ul className="lc-grid">
          {visibles.map((c) => (
            <Tarjeta key={c.id} c={c} deshabilitado={!tablaLista} onCambio={(n) => setLista((l) => l.map((x) => (x.id === n.id ? n : x)))} />
          ))}
        </ul>
      ) : (
        <div className="empty-state"><h2>Sin resultados</h2><p>Ningún cliente coincide con «{q}».</p></div>
      )}
    </section>
  );
}
