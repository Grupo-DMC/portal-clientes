"use client";

import { History, Plus, Power, RadioTower, Siren, Users, MapPin, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { QrCode, downloadQr } from "@/components/QrCode";
import { calOf, garOf, zonaOf } from "@/lib/calc";
import type { Db, Equipo, Sucursal } from "@/lib/data";
import { COMUNAS, days, fd, fl, kindOf, REGIONES, stOf, TODAY, addM } from "@/lib/format";
import { ESTADOS_CUENTA, ESTADOS_USUARIO, ESTADOS_VISITA, ROLES, accesoDe, alcanceLabel, estadoCuenta, reportePendiente } from "@/lib/portal";
import { useLookups, useStore } from "@/components/store";
import { Banner, Confirm, DataTable, Drawer, Field, Heading, ProgressBar, Seg, Select, SourceBadge, Tabs, Tag, Timeline, useToast } from "@/components/ui";
import { EquipoModal, PersonaModal } from "./Modals";
import { TK_COLS, tg } from "./Lists";
import { CuentaLocal } from "./Cuentas";
import { ReportesTabla, ordenCola } from "./Reportes";

const TABS = [
  { id: "datos", l: "Datos" }, { id: "personal", l: "Personal del local" }, { id: "instalacion", l: "Instalación" }, { id: "garantia", l: "Garantía" },
  { id: "calibracion", l: "Calibración remota" }, { id: "actividad", l: "Actividad", ro: true }, { id: "reportes", l: "Reportes del local" }, { id: "acceso", l: "Acceso del local" },
];
const hdr = "py-[6px] text-[11px] uppercase tracking-[.06em] text-neutral-700";

function EqHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-[6px] px-4 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[.1em]">{icon}{title}</div>;
}
function EqRow({ cols, min, head, cells, op }: { cols: string; min: number; head?: boolean; cells: React.ReactNode[]; op?: number }) {
  return (
    <div className="grid items-center gap-x-[10px] px-4" style={{ gridTemplateColumns: cols, minWidth: min, opacity: op ?? 1, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${head ? "var(--color-divider)" : "var(--color-neutral-300)"}`, fontSize: head ? 11 : 13 }}>
      {cells.map((c, i) => (<div key={i} className={head ? hdr : ""}>{c}</div>))}
    </div>
  );
}

export default function SucursalDetail({ id }: { id: string }) {
  const { db, mut, ask } = useStore();
  const { cliOf, mallOf, sucN } = useLookups();
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const suc = db.sucursales.find((s) => s.id === id);
  const [tab, setTab] = useState(sp.get("tab") ?? "datos");
  const [modal, setModal] = useState<null | { t: "eq"; acc: string; v?: Equipo } | { t: "per"; idx: number }>(null);
  const [hist, setHist] = useState<null | { acc: string; eq: string }>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; ok: () => void }>(null);
  if (!suc) return <p>No encontramos esta sucursal.</p>;

  const sc = cliOf(suc.cli), g = garOf(db, suc), c = calOf(db, suc);
  const upS = (k: keyof Sucursal, v: string | number | boolean, extra?: (x: Sucursal, d: Db) => void) =>
    mut((d) => { const x = d.sucursales.find((s) => s.id === suc.id)!; (x as Record<string, unknown>)[k] = v; extra?.(x, d); });
  const ext = (s: string) => () => toast(`Abriendo ${s} en una pestaña nueva…`);
  const ubLine = (suc.mall ? `${mallOf(suc.mall)?.n} · ${suc.local} · ${mallOf(suc.mall)?.dir}` : suc.calle) + ", " + suc.com;
  const accs = db.inst[suc.id] ?? [];
  const own = addM(suc.inst, suc.meses);
  const ini = new Date(suc.inst + "T12:00:00"), fin = new Date(own + "T12:00:00");
  const pct = Math.max(0, Math.min(100, Math.round(((TODAY.getTime() - ini.getTime()) / (fin.getTime() - ini.getTime())) * 100)));
  const isS = (x: { suc: string }) => x.suc === suc.id;
  const url = "local.dmc.cl/s/" + suc.cod;
  const reps = db.reportes.filter(isS).sort(ordenCola);
  const repPend = reps.filter(reportePendiente).length;
  const tabs = TABS.map((t) => (t.id === "reportes" && repPend ? { ...t, l: `Reportes del local (${repPend})` } : t));
  const ces = estadoCuenta(db, suc);
  const conAcceso = accesoDe(db, suc);

  const personas = db.personal[suc.id] ?? [];
  const perRows = personas.map((p, i) => ({
    dim: p.inactivo, cells: [{ t: p.n, b: true }, p.c, p.t, p.m || "—",
      { actions: p.inactivo ? [{ t: "Reactivar", on: () => mut((d) => { d.personal[suc.id][i].inactivo = false; }) }] : [{ t: "Editar", on: () => setModal({ t: "per", idx: i }) }, { t: "Desactivar", on: () => mut((d) => { d.personal[suc.id][i].inactivo = true; }, "Persona desactivada") }] }],
  }));
  const tkRow = (t: (typeof db.tickets)[number]) => ({ onClick: () => toast(`Abriendo ${t.id} en Sistema de tickets…`), cells: [{ t: t.id, b: true, sub: fd(t.f) }, { t: sucN(t.suc), sub: cliOf(sucOf2(t.suc)).rs }, t.prob, tg(t.estado), tg(t.prio)] });
  function sucOf2(i: string) { return db.sucursales.find((s) => s.id === i)!.cli; }
  const hAcc = hist && accs.find((a) => a.id === hist.acc), hEq = hAcc?.eq.find((e) => e.id === hist?.eq);

  const eqBtns = (acc: string, e: Equipo) => (
    <div className="flex justify-end gap-[2px]">
      <button className="btn btn-ghost !text-[13px]" onClick={() => setModal({ t: "eq", acc, v: e })}>Editar</button>
      <button className="btn btn-ghost !text-[13px]" onClick={() => setHist({ acc, eq: e.id })}><History size={14} aria-hidden />Historial</button>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 pb-5">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2">
          <a href="#" onClick={(e) => { e.preventDefault(); router.push(`/panel/clientes/${sc.id}`); }} className="kicker no-underline">{sc.rs} · {suc.marca}</a>
          <h1 className="!m-0">{suc.n}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-[6px] text-sm"><MapPin size={15} aria-hidden />{ubLine}</span>
            <Tag t={suc.activo ? "Activa" : "Inactiva"} />
            <Tag t={`Garantía ${g.st!.toLowerCase()}`} k={kindOf(g.st!)} />
            <Tag t={`Zona: ${zonaOf(db, suc)}`} k="outline" />
            <Tag t={`Cuenta del local: ${ESTADOS_CUENTA[ces].label.toLowerCase()}`} k={ESTADOS_CUENTA[ces].kind} />
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => suc.activo
          ? setConfirm({ title: `Desactivar ${suc.n}`, body: "La sucursal dejará de mostrarse en listados y su portal de local quedará bloqueado. Equipos e historial se conservan.", ok: () => upS("activo", false) })
          : upS("activo", true)}><Power size={15} aria-hidden />{suc.activo ? "Desactivar sucursal" : "Reactivar sucursal"}</button>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "datos" && (
        <div className="grid gap-x-10 gap-y-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))" }}>
          <div><h3 className="!mb-[6px]">Datos de la sucursal</h3><p className="!m-0 text-[13px] text-neutral-700">Si está en un mall, la región y comuna se toman del mall.</p></div>
          <div className="grid max-w-[820px] gap-x-5 gap-y-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <Field label="Marca"><Select value={suc.marca} onChange={(v) => upS("marca", v)} opts={sc.marcas} /></Field>
            <Field label="Código de tienda del cliente"><input className="input" value={suc.cod} onChange={(e) => upS("cod", e.target.value)} maxLength={12} /></Field>
            <Field label="Ubicación" span><Seg opts={["Mall", "Calle"] as const} value={suc.mall ? "Mall" : "Calle"} onChange={(t) => upS("mall", t === "Mall" ? suc.mall || "m1" : "", (x, d) => { if (t === "Mall") { const m = d.malls.find((mm) => mm.id === x.mall)!; x.reg = m.reg; x.com = m.com; } })} /></Field>
            {suc.mall ? (
              <>
                <Field label="Mall">
                  <select className="input" value={suc.mall} onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__add") ask("Agregar mall", "Nombre del mall", (n) => mut((d) => { const mid = "m" + (d.malls.length + 1); d.malls.push({ id: mid, n, dir: "Por completar", reg: suc.reg, com: suc.com, activo: true }); d.sucursales.find((x) => x.id === suc.id)!.mall = mid; }, `Mall “${n}” creado`));
                    else upS("mall", v, (x, d) => { const m = d.malls.find((mm) => mm.id === v)!; x.reg = m.reg; x.com = m.com; });
                  }}>
                    {db.malls.filter((m) => m.activo).map((m) => (<option key={m.id} value={m.id}>{m.n} — {m.com}</option>))}
                    <option value="__add">+ Agregar mall</option>
                  </select>
                </Field>
                <Field label="N° de local"><input className="input" value={suc.local} onChange={(e) => upS("local", e.target.value)} maxLength={30} /></Field>
              </>
            ) : <Field label="Dirección (calle y número)" span><input className="input" value={suc.calle} placeholder="Av. Providencia 2133" onChange={(e) => upS("calle", e.target.value)} maxLength={160} /></Field>}
            <Field label="Región"><Select value={suc.reg} disabled={!!suc.mall} onChange={(v) => upS("reg", v, (x) => { x.com = COMUNAS[x.reg][0]; x.zona = ""; })} opts={REGIONES} /></Field>
            <Field label="Comuna"><Select value={suc.com} disabled={!!suc.mall} onChange={(v) => upS("com", v)} opts={COMUNAS[suc.reg] ?? []} /></Field>
            <Field label="Zona del cliente"><Select value={zonaOf(db, suc)} onChange={(v) => upS("zona", v)} opts={[...sc.zonas.map((z) => z.n), "Sin zona"]} /></Field>
            <div style={{ gridColumn: "1 / -1" }}><button className="btn btn-primary" onClick={() => toast("Datos de la sucursal guardados")}>Guardar cambios</button></div>
          </div>
        </div>
      )}

      {tab === "personal" && (
        <>
          <Heading title="Personal del local" hint="Personas de contacto en tienda para coordinar visitas." actions={<button className="btn btn-primary" onClick={() => setModal({ t: "per", idx: -1 })}><Plus size={15} aria-hidden />Agregar persona</button>} />
          <DataTable cols={[{ l: "Nombre" }, { l: "Cargo" }, { l: "Teléfono", w: "150px" }, { l: "Correo" }, { l: "", w: "170px" }]} rows={perRows} emptyTitle="Sin personal registrado" />
        </>
      )}

      {tab === "instalacion" && (
        <>
          <Heading title="Instalación por accesos" hint={`${accs.length} accesos. Cada equipo guarda su historial de cambios.`} actions={<button className="btn btn-primary" onClick={() => ask("Nuevo acceso", "Nombre del acceso (ej. “Acceso bodega”)", (n) => mut((d) => { (d.inst[suc.id] ??= []).push({ id: suc.id + "a" + Date.now(), n, eq: [] }); }, `Acceso “${n}” creado`))}><Plus size={15} aria-hidden />Nuevo acceso</button>} />
          <div className="flex flex-col gap-6">
            {accs.map((a, ai) => {
              const A = a.eq.filter((e) => e.kind === "antena"), C = a.eq.filter((e) => e.kind === "contador"), O = a.eq.filter((e) => e.kind === "otro");
              const sum = (L: Equipo[]) => L.reduce((s, e) => s + (+e.cant || 0), 0);
              const est = (e: Equipo) => (e.inactivo ? " · Inactivo" : "");
              return (
                <div key={a.id} className="overflow-x-auto border-t-2 border-text bg-surface">
                  <div className="sticky left-0 flex flex-wrap items-center justify-between gap-4 border-b px-4 py-[14px]" style={{ borderColor: "var(--color-divider)" }}>
                    <div className="flex items-baseline gap-3"><span className="text-[13px] font-extrabold" style={{ color: "var(--color-accent-700)" }}>{String(ai + 1).padStart(2, "0")}</span><span className="text-[19px] font-extrabold">{a.n}</span><span className="text-xs text-neutral-700">{sum(A)} antenas · {sum(C)} contador(es) · {sum(O)} otros dispositivos</span></div>
                    <div className="flex gap-[6px]">
                      <button className="btn btn-ghost" onClick={() => ask("Renombrar acceso", "Nombre del acceso", (n) => mut((d) => { d.inst[suc.id][ai].n = n; }), a.n)}>Renombrar</button>
                      <button className="btn btn-secondary" onClick={() => setModal({ t: "eq", acc: a.id })}><Plus size={15} aria-hidden />Agregar equipo</button>
                    </div>
                  </div>
                  {a.eq.length === 0 && <div className="px-4 py-5 text-[13px] text-neutral-700">Este acceso aún no tiene equipos. Agrega antenas, contadores o alarmas.</div>}
                  {A.length > 0 && (<>
                    <EqHead icon={<RadioTower size={14} aria-hidden />} title="Antenas" />
                    <EqRow head cols="minmax(150px,1.3fr) 50px 70px minmax(250px,1.6fr) minmax(140px,1fr) minmax(130px,1fr) 96px 170px" min={1120} cells={["Modelo", "Cant.", "Remota", "UUID", "MAC", "N° serie", "Instalación", ""]} />
                    {A.map((e) => (<EqRow key={e.id} op={e.inactivo ? 0.5 : 1} cols="minmax(150px,1.3fr) 50px 70px minmax(250px,1.6fr) minmax(140px,1fr) minmax(130px,1fr) 96px 170px" min={1120}
                      cells={[<b key="m" className="block py-[9px]">{e.modelo}{est(e)}</b>, e.cant, e.remota ? "Sí" : "No", <span key="u" className="text-xs [overflow-wrap:anywhere]">{e.uuid || "—"}</span>, <span key="c" className="text-xs">{e.mac || "—"}</span>, <span key="s" className="text-xs">{e.serie}</span>, <span key="f" className="text-xs">{fd(e.fecha)}</span>, eqBtns(a.id, e)]} />))}
                  </>)}
                  {C.length > 0 && (<>
                    <EqHead icon={<Users size={14} aria-hidden />} title="Contador de personas" />
                    <EqRow head cols="minmax(150px,1.3fr) 50px minmax(130px,1.1fr) 70px 90px minmax(220px,1.6fr) 170px" min={940} cells={["Modelo", "Cant.", "IP", "DHCP", "Destino", "Apunta a", ""]} />
                    {C.map((e) => (<EqRow key={e.id} op={e.inactivo ? 0.5 : 1} cols="minmax(150px,1.3fr) 50px minmax(130px,1.1fr) 70px 90px minmax(220px,1.6fr) 170px" min={940}
                      cells={[<b key="m" className="block py-[9px]">{e.modelo}{est(e)}</b>, e.cant, <span key="i" className="text-xs">{e.dhcp ? "Asignada por DHCP" : e.ip || "—"}</span>, <span key="d" className="text-xs">{e.dhcp ? "Activo" : "No"}</span>, <span key="t" className="text-xs">{e.destino}</span>, <span key="u" className="text-xs [overflow-wrap:anywhere]">{e.url || "—"}</span>, eqBtns(a.id, e)]} />))}
                  </>)}
                  {O.length > 0 && (<>
                    <EqHead icon={<Siren size={14} aria-hidden />} title="Alarmas y otros dispositivos" />
                    <EqRow head cols="minmax(140px,1fr) minmax(150px,1.2fr) 50px minmax(120px,1fr) minmax(160px,1.3fr) 170px" min={860} cells={["Tipo", "Modelo", "Cant.", "N° serie", "MAC / UUID", ""]} />
                    {O.map((e) => (<EqRow key={e.id} op={e.inactivo ? 0.5 : 1} cols="minmax(140px,1fr) minmax(150px,1.2fr) 50px minmax(120px,1fr) minmax(160px,1.3fr) 170px" min={860}
                      cells={[<b key="t" className="block py-[9px]">{e.tipo}{est(e)}</b>, e.modelo, e.cant, <span key="s" className="text-xs">{e.serie || "—"}</span>, <span key="i" className="text-xs">{[e.mac, e.uuid].filter(Boolean).join(" / ") || "—"}</span>, eqBtns(a.id, e)]} />))}
                  </>)}
                  <div className="h-3" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "garantia" && (
        <>
          {g.plan && <div className="mb-6"><Banner tone="dark" icon={<ShieldCheck size={20} style={{ color: "var(--color-accent-400)" }} aria-hidden />}><div className="font-extrabold">Cubierta por plan del cliente</div><div className="text-[13px]">Cubierta por plan del cliente hasta el {fd(g.end)} ({sc.planMeses} meses desde {fd(sc.planDesde)}).</div></Banner></div>}
          <div className="grid gap-x-10 gap-y-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))" }}>
            <div><h3 className="!mb-[6px]">Garantía por instalación</h3><p className="!m-0 text-[13px] text-neutral-700">Fecha de instalación + duración = fin de garantía.</p></div>
            <div className="flex max-w-[820px] flex-col gap-5">
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                <Field label="Fecha de instalación"><input className="input" type="date" value={suc.inst} onChange={(e) => upS("inst", e.target.value)} /></Field>
                <Field label="Duración (meses)"><input className="input" type="number" min={1} value={suc.meses} onChange={(e) => upS("meses", Math.max(1, +e.target.value))} /></Field>
                <Field label="Fin de garantía (calculado)"><div className="flex min-h-9 items-center text-xl font-extrabold">{fd(own)}</div></Field>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between"><Tag t={stOf(own)!} size={11} /><span className="text-[13px] text-neutral-700">{days(own) < 0 ? `Venció hace ${-days(own)} días` : `Quedan ${days(own)} días`}</span></div>
                <ProgressBar pct={pct} />
                <div className="flex justify-between text-xs text-neutral-700"><span>Instalación</span><span>{pct}% transcurrido</span><span>Fin</span></div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "calibracion" && (
        <div className="grid gap-x-10 gap-y-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))" }}>
          <div><h3 className="!mb-[6px]">Calibración remota</h3><p className="!m-0 text-[13px] text-neutral-700">Se configura en la ficha del cliente (Garantía y calibración).</p><button className="btn btn-ghost mt-2" onClick={() => router.push(`/panel/clientes/${sc.id}?tab=garantia`)}>Ir a la ficha del cliente →</button></div>
          <div className="flex max-w-[720px] flex-col gap-4">
            <div className="flex flex-col border-t-2 border-text">
              {["Incluida por plan del cliente", "Contratada para esta sucursal", "No contratada"].map((t, i) => {
                const on = t === c.modo;
                const d = ["Aplica a todas las sucursales de " + sc.rs + ".", "Seleccionada individualmente en la ficha del cliente.", "Esta sucursal no tiene calibración remota."][i];
                return (
                  <div key={t} className="flex items-start gap-3 border-b px-2 py-[14px]" style={{ borderColor: on ? "var(--color-text)" : "var(--color-neutral-300)" }}>
                    <span className="mt-[2px] h-4 w-4 flex-none rounded-full border-[1.5px] border-text" style={{ background: on ? "var(--color-accent)" : "transparent", boxShadow: "inset 0 0 0 3px var(--color-bg)" }} />
                    <div><div className="font-bold">{t}</div><div className="text-[13px] text-neutral-700">{d}</div></div>
                  </div>
                );
              })}
            </div>
            {c.v && <div className="flex items-center gap-6"><div><div className="text-xs text-neutral-700">Vencimiento</div><div className="text-[22px] font-extrabold">{fd(c.v)}</div></div><Tag t={c.st!} /></div>}
          </div>
        </div>
      )}

      {tab === "actividad" && (
        <div className="flex flex-col gap-9">
          <div className="flex flex-col gap-3">
            <Heading title="Visitas" actions={<SourceBadge name="Sistema de técnicos" onOpen={ext("Sistema de técnicos")} />} />
            <DataTable cols={[{ l: "Fecha", w: "110px" }, { l: "N°", w: "120px" }, { l: "Tipo", w: "170px" }, { l: "Estado", w: "130px" }, { l: "Técnico", w: "150px" }, { l: "Trabajo realizado" }]}
              rows={db.visitas.filter(isS).sort((a, b) => b.f.localeCompare(a.f)).map((v) => ({ cells: [{ t: fd(v.f), b: true }, v.id, tg(v.tipo, "neutral"), { tag: ESTADOS_VISITA[v.estado].label, k: ESTADOS_VISITA[v.estado].kind }, v.tec, v.res] }))} emptyTitle="Sin visitas" emptyText="Esta sucursal aún no registra visitas en el Sistema de técnicos." />
          </div>
          <div className="flex flex-col gap-3">
            <Heading title="Tickets" actions={<SourceBadge name="Sistema de tickets" onOpen={ext("Sistema de tickets")} />} />
            <DataTable cols={TK_COLS} rows={db.tickets.filter(isS).map(tkRow)} emptyTitle="Sin tickets" emptyText="El local no tiene reportes registrados." />
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(360px,100%), 1fr))" }}>
            <div className="flex flex-col gap-3">
              <Heading title="Cotizaciones" actions={<SourceBadge name="Sistema de cotizaciones" onOpen={ext("Sistema de cotizaciones")} />} />
              <DataTable cols={[{ l: "N°", w: "100px" }, { l: "Fecha", w: "100px" }, { l: "Detalle" }, { l: "Monto", w: "120px" }, { l: "Estado", w: "110px" }]} rows={db.cotizaciones.filter(isS).map((c2) => ({ cells: [{ t: c2.id, b: true }, fd(c2.f), c2.desc, c2.monto, tg(c2.estado)] }))} emptyTitle="Sin cotizaciones" />
            </div>
            <div className="flex flex-col gap-3">
              <Heading title="Despachos" actions={<SourceBadge name="Bodega" onOpen={ext("Bodega")} />} />
              <DataTable cols={[{ l: "N°", w: "100px" }, { l: "Fecha", w: "100px" }, { l: "Contenido" }, { l: "Estado", w: "110px" }]} rows={db.despachos.filter(isS).map((c2) => ({ cells: [{ t: c2.id, b: true }, fd(c2.f), c2.items, tg(c2.estado)] }))} emptyTitle="Sin despachos" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Heading title="Trabajos planificados" actions={<SourceBadge name="Sistema de planificación" onOpen={ext("Sistema de planificación")} />} />
            <DataTable cols={[{ l: "Fecha", w: "110px" }, { l: "Trabajo" }, { l: "Técnico", w: "160px" }, { l: "Estado", w: "120px" }]} rows={db.plan.filter(isS).map((p) => ({ cells: [{ t: fd(p.f), b: true }, p.trabajo, p.tec, tg(p.estado)] }))} emptyTitle="Sin trabajos planificados" />
          </div>
        </div>
      )}

      {tab === "reportes" && (
        <>
          <Heading title="Reportes del local" hint="Lo que el personal de esta sucursal reportó desde su acceso. El cliente también los ve en su portal." />
          <ReportesTabla reportes={reps} ambito="sucursal" emptyTitle="Sin reportes" emptyText="El personal de este local aún no envía reportes." />
        </>
      )}

      {tab === "acceso" && (
        <div className="grid items-start gap-x-10 gap-y-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%), 1fr))" }}>
          <div className="flex flex-col gap-8">
            <CuentaLocal suc={suc} />
            <div className="flex flex-col gap-3">
              <Heading title="Personas con acceso en el portal cliente" hint="Quién puede ver este local en el portal, según su rol y alcance." />
              <DataTable cols={[{ l: "Usuario" }, { l: "Rol", w: "minmax(0,.8fr)" }, { l: "Vía", w: "minmax(0,.8fr)" }, { l: "Estado", w: "100px" }]}
                rows={conAcceso.map(({ u, via }) => ({ key: u.id, dim: u.estado === "suspendido", cells: [{ t: u.n, b: true, sub: u.m }, { t: ROLES[u.rolKey].label, sub: alcanceLabel(db, u) }, via, { tag: ESTADOS_USUARIO[u.estado].label, k: ESTADOS_USUARIO[u.estado].kind }] }))}
                emptyTitle="Nadie tiene acceso" emptyText="Ningún usuario del portal de este cliente ve esta sucursal." />
            </div>
          </div>
          <div className="flex flex-col gap-[14px] border-t-2 border-text bg-surface p-5">
            <div className="text-[11px] font-bold uppercase tracking-[.1em]">QR de la sucursal</div>
            <div className="self-start"><QrCode text={`https://${url}`} size={200} /></div>
            <div className="text-[13px]">Abre <strong>{url}</strong> con la sucursal ya identificada.</div>
            <div className="flex flex-col gap-[6px]">
              <button className="btn btn-primary btn-spread !py-2" onClick={() => { downloadQr(`https://${url}`, `QR-${suc.cod}.png`); toast(`Descargando QR-${suc.cod}.png (listo para imprimir 10×10 cm)`); }}>Descargar QR (PNG)</button>
              <button className="btn btn-secondary btn-spread !py-2" onClick={() => toast(`Descargando afiche QR-${suc.cod}.pdf`)}>Descargar afiche para pegar</button>
            </div>
          </div>
        </div>
      )}

      {modal?.t === "eq" && <EquipoModal sucId={suc.id} accId={modal.acc} init={modal.v} onClose={() => setModal(null)} />}
      {modal?.t === "per" && <PersonaModal sucId={suc.id} idx={modal.idx} onClose={() => setModal(null)} />}
      {confirm && <Confirm title={confirm.title} body={confirm.body} cta="Desactivar" onOk={confirm.ok} onClose={() => setConfirm(null)} />}
      {hist && hEq && hAcc && (
        <Drawer kicker="Historial del equipo" w={440} onClose={() => setHist(null)}
          title={hEq.kind === "antena" ? "Antena " + hEq.modelo : hEq.kind === "contador" ? "Contador " + hEq.modelo : `${hEq.tipo} · ${hEq.modelo}`}
          sub={`${suc.n} · ${hAcc.n} · Serie ${hEq.serie || "—"}`}>
          <Timeline items={[...hEq.hist].reverse().map((h) => ({ a: h.a, f: fd(h.f), u: h.u, d: h.d }))} />
        </Drawer>
      )}
    </>
  );
}
void fl;
