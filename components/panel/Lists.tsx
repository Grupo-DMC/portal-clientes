"use client";

import { Download, Plus, Search, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { calOf, garOf } from "@/lib/calc";
import { addM, days, fd, kindOf, REGIONES, stOf, TODAY } from "@/lib/format";
import { useLookups, useStore } from "@/components/store";
import { alertColor, Check16, DataTable, Field, Heading, Kpi, PageHead, Select, SourceBadge, useToast, type Cell, type Row } from "@/components/ui";
import { NewClienteModal } from "./Modals";

const tg = (t: string, k?: "neutral" | "accent" | "solid" | "outline" | "dark"): Cell => ({ tag: t, k: k ?? kindOf(t) });
export { tg };

/* ───────── Dashboard ───────── */
export function Dashboard() {
  const { db } = useStore();
  const { cliOf, sucOf, sucN } = useLookups();
  const router = useRouter();
  const toast = useToast();
  const [newCli, setNewCli] = useState(false);
  const ext = (s: string) => () => toast(`Abriendo ${s} en una pestaña nueva…`);
  const act = db.sucursales.filter((s) => s.activo && cliOf(s.cli).activo);
  const tAb = db.tickets.filter((t) => t.estado !== "Cerrado");

  const al = useMemo(() => {
    type A = { p: string; a: string; c: ReturnType<typeof cliOf>; sub: string; f: string | null; href: string };
    const out: A[] = [];
    db.clients.filter((c) => c.activo).forEach((c) => {
      const ss = act.filter((s) => s.cli === c.id);
      if (c.plan) {
        const e = addM(c.planDesde, c.planMeses), st = stOf(e);
        if (st !== "Vigente") out.push({ p: st === "Vencida" ? "Alta" : "Media", a: "Plan de garantía " + st!.toLowerCase(), c, sub: ss.length + " sucursales", f: e, href: `/panel/clientes/${c.id}` });
      } else ss.forEach((s) => {
        const g = garOf(db, s);
        if (g.st !== "Vigente") out.push({ p: g.st === "Vencida" ? "Alta" : "Media", a: "Garantía " + g.st!.toLowerCase(), c, sub: s.n, f: g.end, href: `/panel/sucursales/${s.id}` });
      });
      const n = c.calTodas ? ss.length : c.calSuc.length;
      if (n) {
        const st = stOf(c.calVence);
        if (st !== "Vigente") out.push({ p: st === "Vencida" ? "Alta" : "Media", a: "Calibración remota " + st!.toLowerCase(), c, sub: n + (n === 1 ? " sucursal" : " sucursales"), f: c.calVence, href: `/panel/clientes/${c.id}` });
      }
      ss.filter((s) => s.cred === "Sin clave").forEach((s) => out.push({ p: "Baja", a: "Local sin clave de acceso", c, sub: s.n, f: null, href: `/panel/sucursales/${s.id}` }));
    });
    tAb.filter((t) => t.prio === "Alta").forEach((t) => {
      const s = sucOf(t.suc);
      out.push({ p: "Alta", a: `${t.id} · ${t.prob}`, c: cliOf(s.cli), sub: s.n, f: t.f, href: `/panel/sucursales/${s.id}` });
    });
    const PR: Record<string, number> = { Alta: 0, Media: 1, Baja: 2 };
    return out.sort((a, b) => PR[a.p] - PR[b.p] || (a.f || "9").localeCompare(b.f || "9"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const alRows: Row[] = al.slice(0, 8).map((a) => ({ onClick: () => router.push(a.href), cells: [tg(a.p), { t: a.a, b: true }, { t: a.c.rs, sub: a.sub }, fd(a.f), { actions: [{ t: "Ver", on: () => router.push(a.href) }] }] }));
  const tkRows: Row[] = [...db.tickets].sort((a, b) => b.f.localeCompare(a.f)).slice(0, 6).map((t) => ({
    onClick: () => toast(`Abriendo ${t.id} en Sistema de tickets…`),
    cells: [{ t: t.id, b: true, sub: fd(t.f) }, { t: sucN(t.suc), sub: cliOf(sucOf(t.suc).cli).rs }, t.prob, tg(t.estado), tg(t.prio)],
  }));
  const vSem = db.visitas.filter((v) => days(v.f) >= -7 && days(v.f) <= 0).length;
  const gPV = al.filter((a) => a.a.startsWith("Garantía") || a.a.startsWith("Plan")).length;
  const cPV = al.filter((a) => a.a.startsWith("Calibración")).length;
  const nHigh = tAb.filter((t) => t.prio === "Alta").length;

  return (
    <>
      <PageHead
        kicker="Resumen operativo" title="Dashboard"
        actions={<>
          <button className="btn btn-secondary" onClick={() => router.push("/panel/sucursales")}><Store size={16} aria-hidden />Ver sucursales</button>
          <button className="btn btn-primary" onClick={() => setNewCli(true)}><Plus size={16} aria-hidden />Nuevo cliente</button>
        </>}
      />
      <div className="grid border-b-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", borderColor: "var(--color-divider)" }}>
        <Kpi l="Clientes activos" v={db.clients.filter((c) => c.activo).length} s={`de ${db.clients.length} registrados`} onClick={() => router.push("/panel/clientes")} />
        <Kpi l="Sucursales" v={act.length} s={`en ${new Set(act.map((s) => s.reg)).size} regiones`} onClick={() => router.push("/panel/sucursales")} />
        <Kpi l="Garantías por vencer" v={gPV} s="vencidas o en 30 días" c={alertColor} onClick={() => router.push("/panel/garantias?seg=Garantías")} />
        <Kpi l="Calibraciones por vencer" v={cPV} s="alertas de calibración" c={alertColor} onClick={() => router.push("/panel/garantias?seg=Calibraciones")} />
        <Kpi l="Tickets abiertos" v={tAb.length} s={`${nHigh} de prioridad alta`} c={alertColor} onClick={ext("Sistema de tickets")} />
        <Kpi l="Visitas de la semana" v={vSem} s="28 sep – 4 oct" onClick={ext("Sistema de técnicos")} />
      </div>
      <div className="mt-8 grid gap-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(520px,100%), 1fr))" }}>
        <div className="flex flex-col gap-3">
          <Heading title="Alertas priorizadas" hint="Garantías, calibraciones, tickets críticos y locales sin clave" />
          <DataTable cols={[{ l: "Prioridad", w: "96px" }, { l: "Alerta" }, { l: "Cliente / alcance" }, { l: "Fecha", w: "110px" }, { l: "", w: "70px" }]} rows={alRows} emptyTitle="Sin alertas" emptyText="No hay vencimientos ni tickets críticos pendientes." />
        </div>
        <div className="flex flex-col gap-3">
          <Heading title="Últimos tickets" />
          <SourceBadge name="Sistema de tickets" onOpen={ext("Sistema de tickets")} />
          <DataTable cols={TK_COLS} rows={tkRows} emptyTitle="Sin tickets" />
        </div>
      </div>
      {newCli && <NewClienteModal onClose={() => setNewCli(false)} />}
    </>
  );
}
export const TK_COLS = [{ l: "N°", w: "110px" }, { l: "Sucursal" }, { l: "Problema" }, { l: "Estado", w: "96px" }, { l: "Prioridad", w: "90px" }];
void TODAY;

/* ───────── Clientes ───────── */
export function ClientesList() {
  const { db } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState(""), [fTipo, setFTipo] = useState("Todos"), [fPlan, setFPlan] = useState("Todos"), [fCal, setFCal] = useState("Todos"), [inact, setInact] = useState(false);
  const [newCli, setNewCli] = useState(false);
  const qq = q.trim().toLowerCase(), qr = qq.replace(/[.\-\s]/g, "");
  const cl = db.clients.filter((c) =>
    (inact || c.activo) && (fTipo === "Todos" || c.tipo === fTipo) && (fPlan === "Todos" || (fPlan === "Con plan") === c.plan) &&
    (fCal === "Todos" || (fCal === "Todas las sucursales" ? c.calTodas : fCal === "Sucursales específicas" ? !c.calTodas && c.calSuc.length > 0 : !c.calTodas && !c.calSuc.length)) &&
    (!qq || c.rs.toLowerCase().includes(qq) || (qr && c.rutStr.replace(/[.\-]/g, "").toLowerCase().includes(qr))));
  const calTag = (c: (typeof cl)[number]): Cell => (c.calTodas ? tg("Todas", "dark") : c.calSuc.length ? tg(c.calSuc.length + " sucursal(es)", "neutral") : tg("No", "outline"));
  const open = (id: string) => () => router.push(`/panel/clientes/${id}`);
  const rows: Row[] = cl.map((c) => ({
    onClick: open(c.id), dim: !c.activo,
    cells: [{ t: c.rs, b: true, sub: c.rutStr }, c.tipo, { t: c.marcas.length, sub: c.marcas.join(", ") }, String(db.sucursales.filter((s) => s.cli === c.id).length),
      c.plan ? tg("Activo", "dark") : tg("Sin plan", "outline"), calTag(c), tg(c.activo ? "Activo" : "Inactivo"), { actions: [{ t: "Abrir", on: open(c.id) }] }],
  }));
  return (
    <>
      <PageHead title="Clientes" kicker={`${cl.length} clientes`} actions={<>
        <button className="btn btn-secondary" onClick={() => toast("Exportando clientes.csv…")}><Download size={16} aria-hidden />Exportar</button>
        <button className="btn btn-primary" onClick={() => setNewCli(true)}><Plus size={16} aria-hidden />Nuevo cliente</button>
      </>} />
      <div className="mb-5 grid items-end gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <div className="field col-span-2 min-w-0">
          <label htmlFor="cq">Buscar</label>
          <div className="relative"><Search size={15} className="absolute left-[10px] top-[10px] text-neutral-600" aria-hidden /><input id="cq" className="input !pl-8" placeholder="Razón social o RUT (76.384.120-5)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <Field label="Tipo"><Select value={fTipo} onChange={setFTipo} opts={["Todos", "Empresa", "Persona natural"]} /></Field>
        <Field label="Plan de garantía"><Select value={fPlan} onChange={setFPlan} opts={["Todos", "Con plan", "Sin plan"]} /></Field>
        <Field label="Calibración remota"><Select value={fCal} onChange={setFCal} opts={["Todos", "Todas las sucursales", "Sucursales específicas", "No contratada"]} /></Field>
        <Check16 checked={inact} onChange={setInact} label="Mostrar inactivos" />
      </div>
      <DataTable cols={[{ l: "Razón social / RUT" }, { l: "Tipo", w: "130px" }, { l: "Marcas", w: "minmax(0,.8fr)" }, { l: "Sucursales", w: "96px" }, { l: "Plan garantía", w: "120px" }, { l: "Calibración", w: "130px" }, { l: "Estado", w: "90px" }, { l: "", w: "70px" }]}
        rows={rows} emptyTitle="No encontramos clientes" emptyText="Prueba con otra razón social o RUT, o ajusta los filtros. Los clientes desactivados se ven con “Mostrar inactivos”." />
      {newCli && <NewClienteModal onClose={() => setNewCli(false)} />}
    </>
  );
}

/* ───────── Sucursales ───────── */
export const SUC_COLS = [{ l: "Sucursal" }, { l: "Cliente / marca" }, { l: "Ubicación" }, { l: "Comuna", w: "130px" }, { l: "Garantía", w: "100px" }, { l: "Calibración", w: "100px" }, { l: "Acceso local", w: "100px" }];
export function useSucRow() {
  const { db } = useStore();
  const { cliOf, ubic } = useLookups();
  const router = useRouter();
  return (s: (typeof db.sucursales)[number]): Row => {
    const g = garOf(db, s), c = calOf(db, s);
    return {
      onClick: () => router.push(`/panel/sucursales/${s.id}`), dim: !s.activo,
      cells: [{ t: s.n, b: true, sub: s.cod }, { t: cliOf(s.cli).rs, sub: s.marca }, { t: ubic(s), sub: s.mall ? "Mall · " + s.local : "Calle" }, { t: s.com, sub: s.reg }, tg(g.st!), c.v ? tg(c.st!) : tg("No", "outline"), tg(s.cred)],
    };
  };
}

export function SucursalesList() {
  const { db } = useStore();
  const { cliOf, ubic } = useLookups();
  const toast = useToast();
  const row = useSucRow();
  const [q, setQ] = useState(""), [cli, setCli] = useState("Todos"), [reg, setReg] = useState("Todas"), [inact, setInact] = useState(false);
  const sq = q.trim().toLowerCase();
  const sl = db.sucursales.filter((s) => (inact || s.activo) && (cli === "Todos" || cliOf(s.cli).rs === cli) && (reg === "Todas" || s.reg === reg) && (!sq || (s.n + " " + s.cod + " " + ubic(s)).toLowerCase().includes(sq)));
  return (
    <>
      <PageHead title="Sucursales" kicker={`${sl.length} sucursales`} actions={<button className="btn btn-secondary" onClick={() => toast("Exportando sucursales.csv…")}><Download size={16} aria-hidden />Exportar</button>} />
      <div className="mb-5 grid items-end gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <div className="field col-span-2 min-w-0">
          <label htmlFor="sq">Buscar</label>
          <div className="relative"><Search size={15} className="absolute left-[10px] top-[10px] text-neutral-600" aria-hidden /><input id="sq" className="input !pl-8" placeholder="Nombre, código de tienda o mall" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <Field label="Cliente"><Select value={cli} onChange={setCli} opts={["Todos", ...db.clients.map((c) => c.rs)]} /></Field>
        <Field label="Región"><Select value={reg} onChange={setReg} opts={["Todas", ...REGIONES]} /></Field>
        <Check16 checked={inact} onChange={setInact} label="Mostrar inactivas" />
      </div>
      <DataTable cols={SUC_COLS} rows={sl.map(row)} emptyTitle="No encontramos sucursales" emptyText="Ajusta la búsqueda o los filtros." />
    </>
  );
}

/* ───────── Malls ───────── */
export function MallsList() {
  const { db, mut, ask } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const mq = q.trim().toLowerCase();
  const rows: Row[] = db.malls.filter((m) => !mq || (m.n + m.com).toLowerCase().includes(mq)).map((m) => {
    const ss = db.sucursales.filter((s) => s.mall === m.id);
    return { onClick: () => router.push(`/panel/malls/${m.id}`), cells: [{ t: m.n, b: true }, m.dir, { t: m.com, sub: m.reg }, String(ss.length), String(new Set(ss.map((s) => s.cli)).size)] };
  });
  const add = () => ask("Nuevo mall", "Nombre del mall", (n) => mut((d) => { d.malls.push({ id: "m" + (d.malls.length + 1), n, dir: "Por completar", reg: "Metropolitana", com: "Santiago", activo: true }); }, `Mall “${n}” creado`));
  return (
    <>
      <PageHead kicker="Ubicaciones compartidas" title="Malls" actions={<button className="btn btn-primary" onClick={add}><Plus size={16} aria-hidden />Nuevo mall</button>} />
      <div className="field mb-5 max-w-[420px]">
        <label htmlFor="mq">Buscar</label>
        <div className="relative"><Search size={15} className="absolute left-[10px] top-[10px] text-neutral-600" aria-hidden /><input id="mq" className="input !pl-8" placeholder="Nombre o comuna" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <DataTable cols={[{ l: "Mall" }, { l: "Dirección" }, { l: "Comuna / región", w: "minmax(0,.8fr)" }, { l: "Sucursales", w: "100px" }, { l: "Clientes", w: "100px" }]} rows={rows} emptyTitle="No encontramos malls" />
    </>
  );
}

export function MallDetail({ id }: { id: string }) {
  const { db, mut, ask } = useStore();
  const row = useSucRow();
  const mall = db.malls.find((m) => m.id === id);
  if (!mall) return <p>No encontramos este mall.</p>;
  const ss = db.sucursales.filter((s) => s.mall === mall.id);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6 border-b-2 border-text pb-5">
        <div>
          <div className="kicker mb-[6px]">Mall</div>
          <h1 className="!m-0">{mall.n}</h1>
          <div className="mt-[6px] flex items-center gap-[6px] text-sm">{mall.dir}, {mall.com} · Región {mall.reg}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border-l border-neutral-300">
            <div className="border-r border-neutral-300 px-4"><div className="text-[26px] font-extrabold leading-none">{ss.length}</div><div className="text-[11px] text-neutral-700">Sucursales</div></div>
            <div className="border-r border-neutral-300 px-4"><div className="text-[26px] font-extrabold leading-none">{new Set(ss.map((s) => s.cli)).size}</div><div className="text-[11px] text-neutral-700">Clientes</div></div>
          </div>
          <button className="btn btn-secondary" onClick={() => ask("Editar dirección del mall", "Dirección", (v) => mut((d) => { d.malls.find((m) => m.id === mall.id)!.dir = v; }, "Mall actualizado"), mall.dir)}>Editar dirección</button>
        </div>
      </div>
      <h3 className="!mb-3">Sucursales en este mall</h3>
      <DataTable cols={SUC_COLS} rows={ss.map(row)} emptyTitle="Sin sucursales" emptyText="Ningún cliente tiene sucursales en este mall todavía." />
    </>
  );
}
