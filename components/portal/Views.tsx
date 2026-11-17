"use client";

import { ArrowLeft, Camera, Copy, Download, Gauge, Info, Lock, MapPin, QrCode as QrIcon, Ticket, UserPlus, Wand2, X, Check, Circle, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientKeySchema } from "@/lib/schemas";
import { addM, days, fd, fl, kindOf, MES_UP, REGIONES, stOf, TODAY } from "@/lib/format";
import type { Sucursal } from "@/lib/data";
import { eqCount } from "@/lib/calc";
import { useStore } from "@/components/store";
import { Banner, DataTable, Drawer, Field, Kpi, Meta, Modal, ModalActions, PageHead, ProgressBar, Seg, Select, SourceBadge, Tag, Timeline, alertColor, Check16, useToast, type Row } from "@/components/ui";
import { tg } from "@/components/panel/Lists";
import { usePortal } from "./PortalShell";

const MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const BASE = [6, 5, 7, 8, 6, 9, 7, 8, 10, 0, 0, 0];

type Drw = { t: "visita" | "ticket" | "cot" | "des"; id: string } | null;

/** Hook común: lógica de estado de sucursal, garantía y drawers. */
function useP() {
  const { db, mut } = useStore();
  const P = usePortal();
  const router = useRouter();
  const toast = useToast();
  const cli = db.clients.find((c) => c.id === "c1")!;
  const sucOf = (id: string) => db.sucursales.find((s) => s.id === id)!;
  const sucN = (id: string) => sucOf(id)?.n ?? "—";
  const mallOf = (id: string) => db.malls.find((m) => m.id === id);
  const ubic = (s: Sucursal) => (s.mall ? `${mallOf(s.mall)!.n} · ${s.local}` : s.calle);
  const tks = db.tickets.filter(P.isM);
  const tAb = tks.filter((t) => t.estado !== "Cerrado");
  const gEnd = (s: Sucursal) => (cli.plan ? addM(cli.planDesde, cli.planMeses) : addM(s.inst, s.meses));
  const estado = (s: Sucursal) => {
    const t = tAb.filter((x) => x.suc === s.id);
    if (t.some((x) => x.prio === "Alta")) return { l: "Requiere atención", c: "var(--color-danger)", n: 3 };
    if (t.length || s.cred !== "Activo") return { l: "Con observaciones", c: "var(--color-accent-400)", n: 2 };
    return { l: "Operativa", c: "var(--color-neutral-500)", n: 1 };
  };
  const vis = db.visitas.filter(P.isM);
  return { ...P, db, mut, router, toast, cli, sucOf, sucN, ubic, tks, tAb, gEnd, estado, vis, mallOf };
}

/* ───────── Drawer de detalle (visita / ticket / cotización / despacho) ───────── */
export function DetalleDrawer({ d, onClose }: { d: NonNullable<Drw>; onClose: () => void }) {
  const { db, sucN, toast } = useP();
  const ext = (e: React.MouseEvent) => { e.preventDefault(); toast("Abriendo sistema de origen…"); };
  if (d.t === "visita") {
    const v = db.visitas.find((x) => x.id === d.id)!;
    return (
      <Drawer kicker={`Visita ${v.id}`} title={v.tipo} sub={`${sucN(v.suc)} · ${fl(v.f)}`} onClose={onClose}>
        <div className="flex flex-wrap items-center gap-3"><SourceBadge name="Sistema de técnicos" /><a href="#" onClick={ext} className="text-[13px] font-semibold">Ver en sistema de origen ↗</a></div>
        <Meta items={[{ l: "Técnico", v: v.tec }, { l: "Fecha", v: fd(v.f) }, { l: "Hora", v: "10:30 – 12:05" }, { l: "Recibido por", v: (db.personal[v.suc] ?? [{ n: "—" }])[0].n }]} />
        <div><h3 className="!mb-[6px] !text-base">Trabajo realizado</h3><p className="!m-0 text-sm">{v.res}</p></div>
        <div>
          <h3 className="!mb-[6px] !text-base">Informe del técnico</h3>
          {["Prueba de detección con etiquetas AM", "Ajuste de sensibilidad", "Revisión de cableado y fuente", "Prueba de desactivador", "Contador reportando a plataforma"].map((t, i) => (
            <div key={t} className="flex justify-between border-b border-neutral-300 py-2 text-sm"><span>{t}</span><strong>{i === 4 && v.tipo === "Correctiva" ? "Observación" : "OK"}</strong></div>
          ))}
        </div>
        <div>
          <h3 className="!mb-[6px] !text-base">Fotos</h3>
          <div className="grid grid-cols-3 gap-2">{["Antena izquierda", "Antena derecha", "Panel de control"].map((f) => (<div key={f} className="flex aspect-square flex-col justify-end bg-neutral-300 p-[6px] text-[11px] text-neutral-800"><Camera size={16} aria-hidden />{f}</div>))}</div>
        </div>
        <a className="btn btn-secondary self-start no-underline" href={`/api/visita/acta/${v.id}`} target="_blank" rel="noopener"><Download size={15} aria-hidden />Descargar acta (PDF)</a>
      </Drawer>
    );
  }
  if (d.t === "ticket") {
    const t = db.tickets.find((x) => x.id === d.id)!;
    const ev = [{ f: fd(t.f) + " 18:42", a: "Ticket creado", d: `Reportado desde el portal del local por ${t.nom ?? (db.personal[t.suc] ?? [{ n: "personal del local" }])[0].n}.` }, { f: fd(t.f) + " 19:10", a: "Asignado", d: "Asignado a Javier Tapia (técnico zona centro)." }];
    if (t.estado !== "Abierto") ev.push({ f: fd(t.f) + " 09:30", a: "En curso", d: "Visita programada para revisión en terreno." });
    if (t.estado === "Cerrado") ev.push({ f: "—", a: "Cerrado", d: "Problema resuelto en visita técnica." });
    const resp = t.estado === "Cerrado" ? "Se ajustó la sensibilidad de la antena y se reubicó la fuente de interferencia. Equipo operativo." : t.estado === "En curso" ? "Revisaremos en terreno. Mientras tanto, mantén la antena encendida y registra la hora de cada falsa alarma." : "";
    return (
      <Drawer kicker={`Ticket ${t.id}`} title={t.prob} sub={`${sucN(t.suc)} · ${fl(t.f)}`} onClose={onClose}>
        <div className="flex flex-wrap items-center gap-3"><SourceBadge name="Sistema de tickets" /><a href="#" onClick={ext} className="text-[13px] font-semibold">Ver en sistema de origen ↗</a></div>
        <div className="flex gap-2"><Tag t={t.estado} /><Tag t={`Prioridad ${t.prio.toLowerCase()}`} k={kindOf(t.prio)} /></div>
        <div className="bg-surface px-[14px] py-3 text-sm">“{t.desc}”</div>
        {resp && <div className="border-t-2 border-text pt-[10px]"><div className="mb-1 text-xs font-bold uppercase tracking-[.08em]">Respuesta del técnico</div><div className="text-sm">{resp}</div></div>}
        <div><h3 className="!mb-[10px] !text-base">Línea de tiempo</h3><Timeline items={[...ev].reverse()} /></div>
      </Drawer>
    );
  }
  const c = (d.t === "cot" ? db.cotizaciones : db.despachos).find((x) => x.id === d.id)! as { id: string; suc: string; f: string; estado: string; desc?: string; items?: string; monto?: string };
  const lines = d.t === "cot" ? [["Equipos y materiales", c.monto!], ["Instalación", "Incluida"], ["IVA", "Incluido"]] : [["Contenido", c.items!], ["Transportista", "Starken"], ["N° de seguimiento", "STK-" + c.id.slice(4) + "2291"]];
  return (
    <Drawer kicker={(d.t === "cot" ? "Cotización " : "Despacho ") + c.id} title={c.desc ?? c.items ?? ""} sub={`${sucN(c.suc)} · ${fl(c.f)}`} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-3"><SourceBadge name={d.t === "cot" ? "Sistema de cotizaciones" : "Bodega"} /><a href="#" onClick={ext} className="text-[13px] font-semibold">Ver en sistema de origen ↗</a></div>
      <div className="self-start"><Tag t={c.estado} size={11} /></div>
      <div className="border-t-2 border-text">{lines.map(([l, v]) => (<div key={l} className="flex justify-between gap-3 border-b border-neutral-300 py-[10px] text-sm"><span>{l}</span><strong>{v}</strong></div>))}</div>
      {d.t === "cot" && <div className="flex justify-between text-xl font-extrabold"><span>Total</span><span>{c.monto}</span></div>}
      <button className="btn btn-secondary self-start" onClick={() => toast(`Descargando ${c.id}.pdf`)}><Download size={15} aria-hidden />Descargar PDF</button>
    </Drawer>
  );
}

/* ───────── Dashboard ───────── */
export function PDashboard() {
  const { me, mine, db, cli, tAb, tks, estado, gEnd, vis, router } = useP();
  const [per, setPer] = useState<"Año" | "Mes" | "Semana">("Mes");
  const scale = mine.length / 8;
  const months = MES.map((m, i) => ({ m, n: Math.round(BASE[i] * scale) + vis.filter((v) => +v.f.slice(5, 7) === i + 1).length }));
  const mx = Math.max(...months.map((x) => x.n), 1);
  const inPer = (f: string) => (per === "Año" ? f.startsWith("2026") : per === "Mes" ? f.startsWith("2026-10") || (days(f) >= -30 && days(f) <= 0) : days(f) >= -7 && days(f) <= 0);
  const visCount = per === "Año" ? months.reduce((a, b) => a + b.n, 0) : vis.filter((v) => inPer(v.f)).length;
  const gpv = mine.filter((s) => stOf(gEnd(s)) !== "Vigente").length;
  const cpv = cli.calTodas && stOf(cli.calVence) !== "Vigente" ? mine.length : 0;
  const tkBySuc = mine.map((s) => ({ s, n: tAb.filter((t) => t.suc === s.id).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const sucList = mine.map((s) => ({ s, e: estado(s) })).sort((a, b) => b.e.n - a.e.n);
  void tks; void db;
  return (
    <>
      <PageHead kicker={`Hola, ${me.n}`} title="Dashboard" />
      <div className="grid border-b-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", borderColor: "var(--color-divider)" }}>
        <Kpi l="Sucursales" v={mine.length} s={`${cli.marcas.filter((m) => mine.some((s) => s.marca === m)).length} marcas`} />
        <Kpi l="Tickets abiertos" v={tAb.length} s={`${tAb.filter((t) => t.prio === "Alta").length} de prioridad alta`} c={alertColor} />
        <Kpi l="Garantías por vencer" v={gpv} s={cli.plan ? `Plan vigente hasta ${fd(addM(cli.planDesde, cli.planMeses))}` : "próximos 30 días"} c={gpv ? alertColor : undefined} />
        <Kpi l="Calibraciones por vencer" v={cpv} s={`vence el ${fd(cli.calVence)}`} c={cpv ? alertColor : undefined} />
        <div className="flex flex-col gap-[6px] px-4 pb-[18px] pt-5">
          <div className="flex items-center justify-between gap-[6px]"><span className="text-xs font-semibold text-neutral-700">Visitas</span><Seg small opts={["Año", "Mes", "Semana"] as const} value={per} onChange={setPer} /></div>
          <span className="text-[44px] font-extrabold leading-none tracking-[-0.03em]">{visCount}</span>
          <span className="text-xs text-neutral-700">{{ Año: "en 2026", Mes: "últimos 30 días", Semana: "últimos 7 días" }[per]}</span>
        </div>
      </div>
      <div className="mt-8 grid gap-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(420px,100%), 1fr))" }}>
        <div className="flex flex-col gap-7">
          <div>
            <div className="mb-3 flex items-baseline justify-between"><h3 className="!m-0">Visitas por mes · 2026</h3><span className="text-xs text-neutral-700">Octubre en curso</span></div>
            <div className="grid h-[200px] items-end gap-2 border-b-2 border-text pt-2" style={{ gridTemplateColumns: "repeat(12, minmax(0,1fr))" }} role="img" aria-label="Visitas por mes en 2026">
              {months.map((b, i) => (
                <div key={b.m} className="flex h-full flex-col items-stretch justify-end gap-1"><span className="text-left text-[11px] font-bold">{b.n || ""}</span><div style={{ height: `${Math.round((b.n / mx) * 100)}%`, background: i === 9 ? "var(--color-accent)" : "var(--color-text)" }} /></div>
              ))}
            </div>
            <div className="grid gap-2 pt-[6px]" style={{ gridTemplateColumns: "repeat(12, minmax(0,1fr))" }}>{months.map((b) => (<span key={b.m} className="text-[11px] text-neutral-700">{b.m}</span>))}</div>
          </div>
          <div>
            <h3 className="!mb-3">Tickets abiertos por sucursal</h3>
            <div className="border-t-2 border-text">
              {tkBySuc.map(({ s, n }) => (
                <button key={s.id} onClick={() => router.push("/portal/tickets")} className="hover-surface grid w-full cursor-pointer items-center gap-3 border-0 border-b border-neutral-300 bg-transparent px-1 py-[10px] text-left text-inherit" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr) 30px" }}>
                  <span className="font-semibold">{s.n}</span><div className="h-2 bg-neutral-200"><div className="h-full" style={{ width: `${Math.round((n / 3) * 100)}%`, background: "var(--color-accent)" }} /></div><span className="font-extrabold">{n}</span>
                </button>
              ))}
              {tkBySuc.length === 0 && <div className="px-1 py-5 text-sm text-neutral-700">No hay tickets abiertos en tus sucursales.</div>}
            </div>
          </div>
        </div>
        <div>
          <h3 className="!mb-3">Estado de sucursales</h3>
          <div className="border-t-2 border-text">
            {sucList.map(({ s, e }) => (
              <button key={s.id} onClick={() => router.push(`/portal/sucursales/${s.id}`)} className="hover-surface grid w-full cursor-pointer items-center gap-3 border-0 border-b border-neutral-300 bg-transparent px-1 py-[11px] text-left text-inherit" style={{ gridTemplateColumns: "12px minmax(0,1fr) auto" }}>
                <span className="h-[10px] w-[10px]" style={{ background: e.c }} />
                <span><span className="block font-bold">{s.n}</span><span className="text-xs text-neutral-700">{s.marca} · {s.com}</span></span>
                <span className="text-xs text-neutral-800">{e.l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────── Mis sucursales ───────── */
export function PSucursales() {
  const { mine, cli, estado, gEnd, ubic, db, router } = useP();
  const groups = cli.marcas.map((m) => ({ m, items: mine.filter((s) => s.marca === m) })).filter((g) => g.items.length);
  return (
    <>
      <PageHead kicker={`${mine.length} sucursales`} title="Mis sucursales" />
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <div key={g.m}>
            <div className="mb-[10px] flex items-baseline gap-3"><h3 className="!m-0 !text-[22px]">{g.m}</h3><span className="text-xs text-neutral-700">{g.items.length} {g.items.length === 1 ? "sucursal" : "sucursales"}</span></div>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(280px,100%), 1fr))" }}>
              {g.items.map((s) => {
                const e = estado(s), gs = stOf(gEnd(s))!;
                return (
                  <button key={s.id} onClick={() => router.push(`/portal/sucursales/${s.id}`)} className="flex cursor-pointer flex-col gap-[10px] border-0 border-t-2 border-text bg-surface p-4 text-left text-inherit transition-shadow hover:shadow-[var(--shadow-md)]">
                    <div className="flex justify-between gap-2"><span className="text-xs text-neutral-700">{s.cod}</span><span className="flex items-center gap-[6px] text-xs"><span className="h-2 w-2" style={{ background: e.c }} />{e.l}</span></div>
                    <div className="text-lg font-extrabold">{s.n}</div>
                    <div className="flex gap-[6px] text-[13px]"><MapPin size={14} className="mt-[2px] flex-none" aria-hidden /><span>{ubic(s)}<br /><span className="text-neutral-700">{s.com}, {s.reg}</span></span></div>
                    <div className="flex items-center justify-between gap-2 border-t pt-2" style={{ borderColor: "var(--color-divider)" }}>
                      <span className="text-xs text-neutral-700">{(db.inst[s.id] ?? []).length} accesos · {eqCount(db, s.id)} equipos</span>
                      <Tag t={`Garantía ${gs.toLowerCase()}`} k={kindOf(gs)} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────── Detalle de sucursal ───────── */
export function PSucursalDetail({ id }: { id: string }) {
  const { db, cli, estado, gEnd, ubic, router, vis, tks } = useP();
  const [drw, setDrw] = useState<Drw>(null);
  const suc = db.sucursales.find((s) => s.id === id);
  const { mine } = usePortal();
  if (!suc || !mine.some((s) => s.id === id)) return <p>No encontramos esta sucursal en tu alcance.</p>;
  const end = gEnd(suc), ini = cli.plan ? cli.planDesde : suc.inst;
  const pct = Math.max(0, Math.min(100, Math.round(((TODAY.getTime() - new Date(ini + "T12:00:00").getTime()) / (new Date(end + "T12:00:00").getTime() - new Date(ini + "T12:00:00").getTime())) * 100)));
  const e = estado(suc), cs = stOf(cli.calVence)!;
  const hasCal = cli.calTodas || cli.calSuc.includes(suc.id);
  const accs = db.inst[suc.id] ?? [];
  const sv = vis.filter((v) => v.suc === suc.id).sort((a, b) => b.f.localeCompare(a.f)).slice(0, 4);
  const stk = tks.filter((t) => t.suc === suc.id && t.estado !== "Cerrado");
  const th = "text-[11px] uppercase tracking-[.05em] text-neutral-700";
  return (
    <>
      <button className="btn btn-ghost mb-3" onClick={() => router.push("/portal/sucursales")}><ArrowLeft size={15} aria-hidden />Mis sucursales</button>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6 border-b-2 border-text pb-5">
        <div><div className="kicker mb-[6px]">{suc.marca} · {suc.cod}</div><h1 className="!m-0">{suc.n}</h1><div className="mt-[6px] flex items-center gap-[6px] text-sm"><MapPin size={15} aria-hidden />{ubic(suc)}, {suc.com} · Región {suc.reg}</div></div>
        <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-[10px] w-[10px]" style={{ background: e.c }} />{e.l}</span>
      </div>
      <div className="grid items-start gap-x-10 gap-y-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px,100%), 1fr))" }}>
        <div className="flex flex-col gap-5">
          <h3 className="!m-0">Accesos y equipos</h3>
          {accs.map((a) => {
            const A = a.eq.filter((x) => x.kind === "antena"), C = a.eq.filter((x) => x.kind === "contador"), O = a.eq.filter((x) => x.kind === "otro");
            return (
              <div key={a.id} className="flex flex-col gap-3 overflow-x-auto border-t-2 border-text bg-surface px-4 pb-4 pt-[14px]">
                <div className="text-lg font-extrabold">{a.n}</div>
                {A.length > 0 && (<div><div className="mb-1 text-[11px] font-bold uppercase tracking-[.1em]">Antenas</div>
                  <div className={`grid gap-x-[10px] border-b py-1 ${th}`} style={{ gridTemplateColumns: "minmax(150px,1.2fr) 44px 60px minmax(250px,1.6fr) minmax(140px,1fr) minmax(130px,1fr)", minWidth: 860, borderColor: "var(--color-divider)" }}><span>Modelo</span><span>Cant.</span><span>Remota</span><span>UUID</span><span>MAC</span><span>Serie</span></div>
                  {A.map((x) => (<div key={x.id} className="grid gap-x-[10px] border-b border-neutral-300 py-[7px] text-[13px]" style={{ gridTemplateColumns: "minmax(150px,1.2fr) 44px 60px minmax(250px,1.6fr) minmax(140px,1fr) minmax(130px,1fr)", minWidth: 860 }}><b>{x.modelo}</b><span>{x.cant}</span><span>{x.remota ? "Sí" : "No"}</span><span className="text-xs [overflow-wrap:anywhere]">{x.uuid || "—"}</span><span className="text-xs">{x.mac || "—"}</span><span className="text-xs">{x.serie}</span></div>))}</div>)}
                {C.length > 0 && (<div><div className="mb-1 text-[11px] font-bold uppercase tracking-[.1em]">Contador de personas</div>
                  <div className={`grid gap-x-[10px] border-b py-1 ${th}`} style={{ gridTemplateColumns: "minmax(150px,1.2fr) 44px minmax(110px,.9fr) minmax(140px,1fr) minmax(220px,1.6fr)", minWidth: 720, borderColor: "var(--color-divider)" }}><span>Modelo</span><span>Cant.</span><span>IP</span><span>MAC</span><span>Destino</span></div>
                  {C.map((x) => (<div key={x.id} className="grid gap-x-[10px] border-b border-neutral-300 py-[7px] text-[13px]" style={{ gridTemplateColumns: "minmax(150px,1.2fr) 44px minmax(110px,.9fr) minmax(140px,1fr) minmax(220px,1.6fr)", minWidth: 720 }}><b>{x.modelo}</b><span>{x.cant}</span><span className="text-xs">{x.dhcp ? "DHCP" : x.ip}</span><span className="text-xs">{x.mac || "—"}</span><span className="text-xs [overflow-wrap:anywhere]">{x.destino} · {x.url}</span></div>))}</div>)}
                {O.length > 0 && (<div><div className="mb-1 text-[11px] font-bold uppercase tracking-[.1em]">Alarmas y otros</div>
                  {O.map((x) => (<div key={x.id} className="grid gap-x-[10px] border-b border-neutral-300 py-[7px] text-[13px]" style={{ gridTemplateColumns: "minmax(140px,1fr) minmax(150px,1.2fr) 44px minmax(120px,1fr)", minWidth: 500 }}><b>{x.tipo}</b><span>{x.modelo}</span><span>{x.cant}</span><span className="text-xs">{x.serie}</span></div>))}</div>)}
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-t-2 border-text pt-3">
            <div className="flex items-center justify-between"><h3 className="!m-0 !text-lg">Garantía</h3><Tag t={stOf(end)!} /></div>
            <div className="text-[13px]">{cli.plan ? "Cubierta por el plan de garantía de Retail Andes S.A." : `Garantía por instalación (${suc.meses} meses desde ${fd(suc.inst)}).`}</div>
            <ProgressBar pct={pct} /><div className="text-xs text-neutral-700">Vence el {fd(end)}</div>
          </div>
          <div className="flex flex-col gap-2 border-t-2 border-text pt-3">
            <div className="flex items-center justify-between"><h3 className="!m-0 !text-lg">Calibración remota</h3><Tag t={cli.calTodas ? cs : "No contratada"} /></div>
            <div className="text-[13px]">{cli.calTodas ? "Incluida en tu plan" : hasCal ? "Contratada para esta sucursal" : "No contratada"} · vence {hasCal ? fd(cli.calVence) : "—"}</div>
          </div>
          {stk.length > 0 && (
            <div className="border-t-2 border-text pt-3"><h3 className="!mb-[6px] !text-lg">Tickets abiertos</h3>
              {stk.map((t) => (<button key={t.id} onClick={() => setDrw({ t: "ticket", id: t.id })} className="flex w-full cursor-pointer justify-between gap-2 border-0 border-b border-neutral-300 bg-transparent py-[9px] text-left text-[13px] text-inherit"><span><strong>{t.id}</strong> · {t.prob}</span><Tag t={t.estado} /></button>))}
            </div>
          )}
          <div className="border-t-2 border-text pt-3"><h3 className="!mb-[6px] !text-lg">Últimas visitas</h3>
            {sv.map((v) => (<button key={v.id} onClick={() => setDrw({ t: "visita", id: v.id })} className="hover-surface flex w-full cursor-pointer flex-col gap-[2px] border-0 border-b border-neutral-300 bg-transparent py-[10px] text-left text-inherit"><span className="text-xs text-neutral-700">{fl(v.f)} · {v.tipo}</span><span className="text-[13px]">{v.res}</span></button>))}
            {sv.length === 0 && <div className="py-2 text-[13px] text-neutral-700">Sin visitas registradas.</div>}
          </div>
        </div>
      </div>
      {drw && <DetalleDrawer d={drw} onClose={() => setDrw(null)} />}
    </>
  );
}

/* ───────── Visitas ───────── */
export function PVisitas() {
  const { vis, mine, sucN, sucOf, toast } = useP();
  const [drw, setDrw] = useState<Drw>(null);
  const [per, setPer] = useState<"Año" | "Mes" | "Semana">("Año"), [suc, setSuc] = useState("Todas"), [tipo, setTipo] = useState("Todos");
  const inPer = (f: string) => (per === "Año" ? f.startsWith("2026") : per === "Mes" ? f.startsWith("2026-10") || (days(f) >= -30 && days(f) <= 0) : days(f) >= -7 && days(f) <= 0);
  const rows: Row[] = vis.filter((v) => inPer(v.f) && (suc === "Todas" || sucN(v.suc) === suc) && (tipo === "Todos" || v.tipo === tipo)).sort((a, b) => b.f.localeCompare(a.f)).map((v) => ({
    onClick: () => setDrw({ t: "visita", id: v.id }),
    cells: [{ t: fd(v.f), b: true }, v.id, { t: sucN(v.suc), sub: sucOf(v.suc).marca }, tg(v.tipo, "neutral"), v.tec, { actions: [{ t: "Ver informe", on: () => setDrw({ t: "visita", id: v.id }) }] }],
  }));
  return (
    <>
      <PageHead kicker="Fuente: Sistema de técnicos" title="Visitas" actions={<button className="btn btn-secondary" onClick={() => toast("Exportando visitas.csv…")}><Download size={16} aria-hidden />Exportar</button>} />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Periodo"><Seg opts={["Año", "Mes", "Semana"] as const} value={per} onChange={setPer} /></Field>
        <Field label="Sucursal" className="min-w-[240px]"><Select value={suc} onChange={setSuc} opts={["Todas", ...mine.map((s) => s.n)]} /></Field>
        <Field label="Tipo" className="min-w-[220px]"><Select value={tipo} onChange={setTipo} opts={["Todos", "Mantención preventiva", "Correctiva", "Instalación", "Calibración remota"]} /></Field>
      </div>
      <DataTable cols={[{ l: "Fecha", w: "110px" }, { l: "N°", w: "100px" }, { l: "Sucursal" }, { l: "Tipo", w: "180px" }, { l: "Técnico", w: "160px" }, { l: "", w: "110px" }]} rows={rows} emptyTitle="Sin visitas en este periodo" emptyText="Prueba con Año o cambia la sucursal." />
      {drw && <DetalleDrawer d={drw} onClose={() => setDrw(null)} />}
    </>
  );
}

/* ───────── Tickets ───────── */
export function PTickets() {
  const { tks, sucN, sucOf } = useP();
  const [drw, setDrw] = useState<Drw>(null);
  const [est, setEst] = useState<"Todos" | "Abierto" | "En curso" | "Cerrado">("Todos");
  const rows: Row[] = tks.filter((t) => est === "Todos" || t.estado === est).sort((a, b) => b.f.localeCompare(a.f)).map((t) => ({
    onClick: () => setDrw({ t: "ticket", id: t.id }), cells: [{ t: t.id, b: true }, fd(t.f), { t: sucN(t.suc), sub: sucOf(t.suc).marca }, t.prob, tg(t.estado), tg(t.prio)],
  }));
  return (
    <>
      <PageHead kicker="Fuente: Sistema de tickets" title="Tickets" />
      <div className="mb-4 flex items-center gap-3"><span className="text-[13px] text-neutral-700">Estado</span><Seg opts={["Todos", "Abierto", "En curso", "Cerrado"] as const} value={est} onChange={setEst} /></div>
      <DataTable cols={[{ l: "N°", w: "100px" }, { l: "Fecha", w: "100px" }, { l: "Sucursal" }, { l: "Problema" }, { l: "Estado", w: "100px" }, { l: "Prioridad", w: "96px" }]} rows={rows} emptyTitle="Sin tickets" emptyText="Tus locales no tienen reportes con este estado." />
      {drw && <DetalleDrawer d={drw} onClose={() => setDrw(null)} />}
    </>
  );
}

/* ───────── Cotizaciones y despachos ───────── */
export function PCotizaciones() {
  const { db, isM, sucN } = useP();
  const [drw, setDrw] = useState<Drw>(null);
  return (
    <>
      <PageHead title="Cotizaciones y despachos" />
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h3 className="!m-0">Cotizaciones</h3><span className="border border-neutral-500 px-2 py-[3px] text-[11px]">Fuente: Sistema de cotizaciones</span></div>
          <DataTable cols={[{ l: "N°", w: "100px" }, { l: "Fecha", w: "100px" }, { l: "Sucursal" }, { l: "Detalle" }, { l: "Monto", w: "120px" }, { l: "Estado", w: "110px" }]}
            rows={db.cotizaciones.filter(isM).map((c) => ({ onClick: () => setDrw({ t: "cot", id: c.id }), cells: [{ t: c.id, b: true }, fd(c.f), sucN(c.suc), c.desc, c.monto, tg(c.estado)] }))} emptyTitle="Sin cotizaciones" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h3 className="!m-0">Despachos</h3><span className="border border-neutral-500 px-2 py-[3px] text-[11px]">Fuente: Bodega</span></div>
          <DataTable cols={[{ l: "N°", w: "100px" }, { l: "Fecha", w: "100px" }, { l: "Sucursal" }, { l: "Contenido" }, { l: "Estado", w: "110px" }]}
            rows={db.despachos.filter(isM).map((c) => ({ onClick: () => setDrw({ t: "des", id: c.id }), cells: [{ t: c.id, b: true }, fd(c.f), sucN(c.suc), c.items, tg(c.estado)] }))} emptyTitle="Sin despachos" />
        </div>
      </div>
      {drw && <DetalleDrawer d={drw} onClose={() => setDrw(null)} />}
    </>
  );
}

/* ───────── Trabajos planificados ───────── */
export function PTrabajos() {
  const { db, isM, sucN } = useP();
  const [mode, setMode] = useState<"Calendario" | "Lista">("Calendario");
  const pl = db.plan.filter(isM).sort((a, b) => a.f.localeCompare(b.f));
  const cells: { d: number | ""; out: boolean; today?: boolean; ev: typeof pl }[] = [];
  for (let i = 0; i < 3; i++) cells.push({ d: "", out: true, ev: [] });
  for (let d = 1; d <= 31; d++) { const iso = `2026-10-${String(d).padStart(2, "0")}`; cells.push({ d, out: false, today: d === 5, ev: pl.filter((p) => p.f === iso) }); }
  while (cells.length % 7) cells.push({ d: "", out: true, ev: [] });
  return (
    <>
      <PageHead kicker="Fuente: Sistema de planificación" title="Trabajos planificados" actions={<Seg opts={["Calendario", "Lista"] as const} value={mode} onChange={setMode} />} />
      {mode === "Calendario" ? (
        <>
          <div className="mb-[10px] flex items-center justify-between"><h3 className="!m-0 !text-[22px]">Octubre 2026</h3>
            <div className="flex gap-4 text-xs"><span className="flex items-center gap-[6px]"><span className="h-[10px] w-[10px] bg-text" />Confirmado</span><span className="flex items-center gap-[6px]"><span className="h-[10px] w-[10px] border" style={{ background: "var(--color-accent-100)", borderColor: "var(--color-accent-300)" }} />Por confirmar</span></div></div>
          <div className="overflow-x-auto"><div className="grid border-l border-t-2 border-l-neutral-300 border-t-text" style={{ gridTemplateColumns: "repeat(7, minmax(110px,1fr))", minWidth: 770 }}>
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (<div key={d} className="border-b-2 border-r border-r-neutral-300 p-[6px] text-[11px] font-bold uppercase tracking-[.08em]" style={{ borderBottomColor: "var(--color-divider)" }}>{d}</div>))}
            {cells.map((c, i) => (
              <div key={i} className="flex min-h-[110px] flex-col gap-1 border-b border-r border-neutral-300 p-[6px]" style={{ background: c.out ? "transparent" : "var(--color-bg)" }}>
                <span className="text-[13px]" style={{ fontWeight: c.today ? 800 : 600, color: c.today ? "var(--color-accent-700)" : undefined }}>{c.d}</span>
                {c.ev.map((e) => (<div key={e.suc + e.f} className="px-[5px] py-[3px] text-[11px] leading-[1.25]" style={{ background: e.estado === "Confirmado" ? "var(--color-text)" : "var(--color-accent-100)", color: e.estado === "Confirmado" ? "var(--color-bg)" : "var(--color-accent-800)" }}><strong>{sucN(e.suc)}</strong><br />{e.trabajo}</div>))}
              </div>
            ))}
          </div></div>
        </>
      ) : (
        <DataTable cols={[{ l: "Fecha", w: "120px" }, { l: "Sucursal" }, { l: "Trabajo" }, { l: "Técnico", w: "160px" }, { l: "Estado", w: "120px" }]} rows={pl.map((p) => ({ cells: [{ t: fl(p.f), b: true }, sucN(p.suc), p.trabajo, p.tec, tg(p.estado)] }))} emptyTitle="Sin trabajos planificados" />
      )}
    </>
  );
}

/* ───────── Credenciales de locales ───────── */
export function PCredenciales() {
  const { mine, mut, toast } = useP();
  const [modal, setModal] = useState<null | { t: "clave"; id: string; n: string; mode: "asignar" | "restablecer" } | { t: "bloquear"; id: string; n: string }>(null);
  const rows: Row[] = mine.map((s) => ({
    cells: [{ t: s.n, b: true, sub: s.marca }, s.cod, tg(s.cred), s.ultimoAcceso ? fd(s.ultimoAcceso) : "—",
      { actions: s.cred === "Sin clave" ? [{ t: "Asignar clave", on: () => setModal({ t: "clave", id: s.id, n: s.n, mode: "asignar" }) }]
        : s.cred === "Bloqueado" ? [{ t: "Desbloquear", on: () => mut((d) => { d.sucursales.find((x) => x.id === s.id)!.cred = "Activo"; }, "Acceso desbloqueado. La clave anterior vuelve a funcionar.") }, { t: "Restablecer", on: () => setModal({ t: "clave", id: s.id, n: s.n, mode: "restablecer" }) }]
        : [{ t: "Restablecer", on: () => setModal({ t: "clave", id: s.id, n: s.n, mode: "restablecer" }) }, { t: "Bloquear", on: () => setModal({ t: "bloquear", id: s.id, n: s.n }) }] }],
  }));
  void toast;
  return (
    <>
      <div className="border-b-2 border-text pb-5"><div className="kicker mb-[6px]">Portal del local</div><h1 className="!m-0">Credenciales de locales</h1></div>
      <div className="mb-6 grid border-b-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", borderColor: "var(--color-divider)" }}>
        {(["Activo", "Sin clave", "Bloqueado"] as const).map((t) => (
          <div key={t} className="border-r border-neutral-300 py-[18px] pr-4"><div className="text-xs font-semibold text-neutral-700">{t}</div><div className="text-[40px] font-extrabold leading-[1.1]" style={{ color: t === "Activo" ? undefined : alertColor }}>{mine.filter((s) => s.cred === t).length}</div></div>
        ))}
        <div className="flex items-start gap-[10px] px-4 py-[18px] text-sm"><QrIcon size={22} aria-hidden /><span>Cada local entra al portal escaneando el QR pegado en tienda y la clave que tú le asignas. <strong>Comparte esta clave con el personal del local.</strong></span></div>
      </div>
      <DataTable cols={[{ l: "Sucursal" }, { l: "Código", w: "100px" }, { l: "Estado de acceso", w: "140px" }, { l: "Último ingreso", w: "130px" }, { l: "", w: "300px" }]} rows={rows} emptyTitle="Sin sucursales" />
      {modal?.t === "clave" && <ClaveModal id={modal.id} n={modal.n} mode={modal.mode} onClose={() => setModal(null)} />}
      {modal?.t === "bloquear" && (
        <Modal title={`Bloquear acceso · ${modal.n}`} w={500} onClose={() => setModal(null)}>
          <p className="!m-0 text-[15px]">El personal del local no podrá ingresar al portal ni hacer reportes hasta que lo desbloquees.</p>
          <ModalActions><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={() => { mut((d) => { d.sucursales.find((x) => x.id === modal.id)!.cred = "Bloqueado"; }, `Acceso bloqueado para ${modal.n}`); setModal(null); }}>Bloquear acceso</button></ModalActions>
        </Modal>
      )}
    </>
  );
}

function ClaveModal({ id, n, mode, onClose }: { id: string; n: string; mode: "asignar" | "restablecer"; onClose: () => void }) {
  const { mut } = useStore();
  const toast = useToast();
  const [pass, setPass] = useState(""), [show, setShow] = useState(false), [done, setDone] = useState(false);
  const req: [string, boolean][] = [["Al menos 8 caracteres", pass.length >= 8], ["Una letra mayúscula", /[A-ZÑ]/.test(pass)], ["Un número", /\d/.test(pass)], ["Sin espacios", pass.length > 0 && !/\s/.test(pass)]];
  const ok = clientKeySchema.safeParse(pass).success;
  const gen = () => {
    const w = ["Andes", "Local", "Tienda", "Caja"][crypto.getRandomValues(new Uint32Array(1))[0] % 4];
    setPass(`${w}-${1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000)}`); setShow(true);
  };
  return (
    <Modal title={`${mode === "asignar" ? "Asignar clave" : "Restablecer clave"} · ${n}`} w={500} onClose={onClose}>
      {!done ? (
        <>
          {mode === "restablecer" && <Banner tone="accent">La clave anterior dejará de funcionar de inmediato.</Banner>}
          <Field label="Nueva clave del local">
            <div className="flex gap-[6px]"><input className="input !text-base !tracking-[.04em]" type={show ? "text" : "password"} autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} maxLength={64} /><button className="btn btn-secondary" onClick={() => setShow(!show)}>{show ? "Ocultar" : "Mostrar"}</button></div>
          </Field>
          <button className="btn btn-ghost self-start" onClick={gen}><Wand2 size={15} aria-hidden />Generar clave segura</button>
          <div className="border-t-2 border-text">{req.map(([t, g]) => (<div key={t} className="flex items-center gap-[10px] border-b border-neutral-300 py-[7px] text-sm" style={{ color: g ? "var(--color-text)" : "var(--color-neutral-600)" }}>{g ? <Check size={15} aria-hidden /> : <Circle size={15} aria-hidden />}{t}</div>))}</div>
          <ModalActions><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!ok} onClick={() => { mut((d) => { d.sucursales.find((x) => x.id === id)!.cred = "Activo"; }); setDone(true); }}>Guardar clave</button></ModalActions>
        </>
      ) : (
        <>
          <div className="kicker">Clave activa</div>
          <div className="bg-surface p-[14px] text-[30px] font-extrabold tracking-[.04em]">{pass}</div>
          <div className="text-[15px] font-bold">Comparte esta clave con el personal del local.</div>
          <div className="text-[13px] text-neutral-700">El personal entra escaneando el QR de la tienda. Por seguridad, no volveremos a mostrar esta clave.</div>
          <ModalActions><button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(pass).catch(() => {}); toast("Clave copiada al portapapeles"); }}><Copy size={15} aria-hidden />Copiar</button><button className="btn btn-primary" onClick={onClose}>Listo</button></ModalActions>
        </>
      )}
    </Modal>
  );
}

/* ───────── Usuarios y roles ───────── */
const ROLES: [string, string][] = [["Administrador cliente", "Ve todo, gestiona usuarios, credenciales y notificaciones."], ["Supervisor", "Ve su alcance, crea tickets y gestiona credenciales de sus locales."], ["Consulta", "Solo lectura de sucursales, visitas y tickets de su alcance."]];
export function PUsuarios() {
  const { db, mut, isAdmin, cli, toast } = useP();
  const [inact, setInact] = useState(false), [modal, setModal] = useState(false);
  const fa = (a: string, v: string) => (a === "Todo el cliente" ? a : a === "Zona" ? v : `${a} ${v}`);
  const rows: Row[] = db.usuariosPortal.filter((u) => u.cli === "c1" && (inact || u.activo)).map((u) => ({
    dim: !u.activo,
    cells: [{ t: u.n, b: true, sub: u.m }, u.rol, { chips: [{ t: fa(u.alc, u.val), k: u.alc === "Todo el cliente" ? "dark" : "neutral" }] }, fd(u.ult), tg(u.activo ? "Activo" : "Inactivo"),
      { actions: !isAdmin ? [] : u.activo ? [{ t: "Desactivar", on: () => mut((d) => { d.usuariosPortal.find((x) => x.id === u.id)!.activo = false; }, `${u.n} desactivado`) }] : [{ t: "Reactivar", on: () => mut((d) => { d.usuariosPortal.find((x) => x.id === u.id)!.activo = true; }, `${u.n} reactivado`) }] }],
  }));
  void cli; void toast;
  return (
    <>
      <PageHead kicker="Roles definidos por DMC" title="Usuarios y roles" actions={<><Check16 checked={inact} onChange={setInact} label="Mostrar inactivos" />{isAdmin && <button className="btn btn-primary" onClick={() => setModal(true)}><UserPlus size={15} aria-hidden />Nuevo usuario</button>}</>} />
      {!isAdmin && <div className="mb-4"><Banner icon={<Lock size={16} aria-hidden />} tone="surface">Tu rol permite ver los usuarios, pero solo un Administrador cliente puede crearlos o desactivarlos.</Banner></div>}
      <DataTable cols={[{ l: "Usuario" }, { l: "Rol", w: "170px" }, { l: "Alcance", w: "200px" }, { l: "Último acceso", w: "120px" }, { l: "Estado", w: "90px" }, { l: "", w: "110px" }]} rows={rows} emptyTitle="Sin usuarios" />
      {modal && <NuevoUsuario onClose={() => setModal(false)} />}
    </>
  );
}

function NuevoUsuario({ onClose }: { onClose: () => void }) {
  const { mut, cli, toast } = useP();
  const [f, setF] = useState({ n: "", m: "", rol: "Supervisor", alc: "Zona", val: "Zona Norte" });
  const vals = (a: string) => (a === "Marca" ? cli.marcas : a === "Zona" ? cli.zonas.map((z) => z.n) : a === "Región" ? REGIONES : []);
  const save = () => {
    if (!f.n.trim() || !/^\S+@\S+\.\S+$/.test(f.m)) return toast("Completa nombre y un correo válido");
    mut((d) => { d.usuariosPortal.push({ id: "p" + Date.now(), cli: "c1", n: f.n.trim(), m: f.m.trim(), rol: f.rol, alc: f.alc, val: f.val, activo: true, ult: null }); }, `Invitación enviada a ${f.m}`);
    onClose();
  };
  return (
    <Modal title="Nuevo usuario" w={500} onClose={onClose}>
      <Field label="Nombre"><input className="input" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} maxLength={100} /></Field>
      <Field label="Correo"><input className="input" type="email" value={f.m} onChange={(e) => setF({ ...f, m: e.target.value })} maxLength={120} /></Field>
      <Field label="Rol">
        <div className="border-t" style={{ borderColor: "var(--color-divider)" }}>
          {ROLES.map(([n, d]) => (
            <label key={n} className="flex cursor-pointer items-start gap-2 border-b border-neutral-300 py-2"><input type="radio" name="rol" className="chk mt-[2px] !rounded-full" checked={f.rol === n} onChange={() => setF({ ...f, rol: n })} /><span><strong>{n}</strong><br /><span className="text-xs text-neutral-700">{d}</span></span></label>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Alcance"><Select value={f.alc} onChange={(a) => setF({ ...f, alc: a, val: vals(a)[0] ?? "" })} opts={["Todo el cliente", "Marca", "Zona", "Región"]} /></Field>
        <Field label="Aplica a"><Select value={f.val} disabled={f.alc === "Todo el cliente"} onChange={(v) => setF({ ...f, val: v })} opts={vals(f.alc).length ? vals(f.alc) : [""]} /></Field>
      </div>
      <ModalActions><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save}>Enviar invitación</button></ModalActions>
    </Modal>
  );
}

/* ───────── Notificaciones ───────── */
const EVS: [string, string][] = [["tn", "Ticket nuevo"], ["tc", "Ticket cerrado"], ["vr", "Visita realizada"], ["gv", "Garantía por vencer"], ["cv", "Calibración por vencer"]];
export function PNotificaciones() {
  const { toast } = useP();
  const [drw, setDrw] = useState<Drw>(null);
  const router = useRouter();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ tn: true, tc: true, vr: true, gv: true, cv: true });
  const inbox = [
    { f: "4 oct, 18:42", t: "Ticket nuevo TK-4831", d: "Andes Kids Vespucio reportó “Antena suena sin motivo”. Prioridad alta.", I: Ticket, on: () => setDrw({ t: "ticket", id: "TK-4831" }) },
    { f: "3 oct, 11:05", t: "Ticket en curso TK-4827", d: "Técnico asignado: Javier Tapia.", I: Ticket, on: () => setDrw({ t: "ticket", id: "TK-4827" }) },
    { f: "2 oct, 17:10", t: "Visita realizada V-20961", d: "Mantención preventiva en Andes Moda Costanera.", I: ClipboardCheck, on: () => setDrw({ t: "visita", id: "V-20961" }) },
    { f: "28 sep, 09:00", t: "Calibración remota por vencer", d: "La calibración anual de tus 8 sucursales vence el 28-10-2026.", I: Gauge, on: () => router.push("/portal/trabajos") },
  ];
  return (
    <>
      <PageHead title="Notificaciones" />
      <div className="grid items-start gap-x-10 gap-y-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%), 1fr))" }}>
        <div className="border-t-2 border-text">
          {inbox.map((n) => (
            <button key={n.t} onClick={n.on} className="hover-surface grid w-full cursor-pointer gap-3 border-0 border-b border-neutral-300 bg-transparent px-1 py-[14px] text-left text-inherit" style={{ gridTemplateColumns: "28px minmax(0,1fr) auto" }}>
              <n.I size={18} className="mt-[2px]" aria-hidden /><span><span className="block font-bold">{n.t}</span><span className="text-[13px] text-neutral-800">{n.d}</span></span><span className="whitespace-nowrap text-xs text-neutral-700">{n.f}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-[10px] border-t-2 border-text bg-surface p-4">
          <h3 className="!m-0 !text-lg">Recibir por correo</h3><div className="text-[13px] text-neutral-700">Solo para las sucursales de tu alcance.</div>
          {EVS.map(([k, l]) => (<label key={k} className="flex cursor-pointer items-center gap-[10px] border-b border-neutral-300 py-[6px] text-sm"><input type="checkbox" className="chk" checked={prefs[k]} onChange={() => setPrefs((p) => ({ ...p, [k]: !p[k] }))} />{l}</label>))}
          <button className="btn btn-primary self-start" onClick={() => toast("Preferencias guardadas")}>Guardar</button>
        </div>
      </div>
      {drw && <DetalleDrawer d={drw} onClose={() => setDrw(null)} />}
    </>
  );
}
void X; void Info; void MES_UP; void REGIONES;
