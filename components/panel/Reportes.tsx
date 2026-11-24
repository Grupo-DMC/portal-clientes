"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { zonaOf } from "@/lib/calc";
import type { Db, Reporte } from "@/lib/data";
import { fdt, TODAY_ISO } from "@/lib/format";
import { ESTADOS_REPORTE, PORTAL_BASE, PRIORIDADES, normUsuario, reportePendiente, sucursalesVisibles, type EstadoReporte } from "@/lib/portal";
import { useStore } from "@/components/store";
import { alertColor, Banner, Check16, DataTable, Drawer, Field, Kpi, Meta, Modal, ModalActions, PageHead, Select, Tag, Timeline, type Row } from "@/components/ui";
import { ahoraStamp, logAudit, usePanelUser } from "./PanelUser";

/* ───────── Reportes de los locales: cola del equipo DMC ───────── */

export type PrioTicket = "Baja" | "Media" | "Alta";
const ESTADOS: EstadoReporte[] = ["nuevo", "revision", "ticket", "resuelto"];

/** Ticket que se creó desde el reporte (su descripción empieza con «Reporte R-0148: …»). */
export const ticketDeReporte = (db: Db, r: Reporte) => db.tickets.find((t) => t.suc === r.suc && t.desc.startsWith(`Reporte ${r.id}:`));
const nextTicketId = (db: Db) => "TK-" + (Math.max(0, ...db.tickets.map((t) => +(/^TK-(\d+)$/.exec(t.id)?.[1] ?? 0))) + 1);
/** Prioridad con la que el equipo parte el ticket: la que pidió el cliente (alta o urgente) o media. */
const prioInicial = (r: Reporte): PrioTicket => (r.prioridad ? "Alta" : "Media");

/** Acciones del equipo DMC sobre un reporte. Cada una queda en la auditoría; hoy mutan la copia en memoria (ver store.tsx). */
export function useReporteActions() {
  const { db, mut } = useStore();
  const user = usePanelUser();
  const regDe = (d: Db, r: Reporte) => `${r.id} · ${d.sucursales.find((s) => s.id === r.suc)?.n ?? r.suc}`;
  const mover = (r: Reporte, estado: EstadoReporte, msg: string) => mut((d) => {
    const x = d.reportes.find((q) => q.id === r.id);
    if (!x || x.estado === estado) return;
    const antes = x.estado;
    x.estado = estado;
    logAudit(d, user, "Reporte", regDe(d, x), "Editar", `Estado: ${ESTADOS_REPORTE[antes].label} → ${ESTADOS_REPORTE[estado].label}`);
  }, msg);
  return {
    revision: (r: Reporte) => mover(r, "revision", `${r.id} pasó a revisión`),
    resolver: (r: Reporte) => mover(r, "resuelto", `${r.id} marcado como resuelto`),
    reabrir: (r: Reporte) => mover(r, "revision", `${r.id} reabierto: vuelve a revisión`),
    /** Crea el ticket (Abierto), pasa el reporte a «Ticket creado» y avisa a los usuarios del portal con alcance sobre el local. */
    crearTicket: (r: Reporte, prio: PrioTicket): string => {
      const id = nextTicketId(db);
      mut((d) => {
        const x = d.reportes.find((q) => q.id === r.id);
        if (!x) return;
        const suc = d.sucursales.find((s) => s.id === x.suc);
        const antes = x.estado;
        x.estado = "ticket";
        d.tickets.push({ id, suc: x.suc, f: TODAY_ISO, prob: x.tipo, estado: "Abierto", prio, desc: `Reporte ${x.id}: ${x.detalle}`, nom: "Personal del local" });
        logAudit(d, user, "Ticket", `${id} · ${suc?.n ?? x.suc}`, "Crear", `Ticket creado desde el reporte ${x.id}. Prioridad ${prio.toLowerCase()}.`);
        logAudit(d, user, "Reporte", regDe(d, x), "Editar", `Estado: ${ESTADOS_REPORTE[antes].label} → Ticket creado (${id})`);
        const f = ahoraStamp();
        d.usuariosPortal.forEach((u) => {
          if (normUsuario(u).estado === "suspendido" || !suc || !sucursalesVisibles(d, u).some((s) => s.id === suc.id)) return;
          (d.avisos[u.id] ??= []).push({
            id: `tk-${id}`, tipo: "ticket_nuevo", titulo: `Ticket nuevo ${id}`,
            texto: `${suc.n}: ${x.tipo.toLowerCase()}. Prioridad ${prio.toLowerCase()}.`, f, leida: false, href: `${PORTAL_BASE}/tickets`, suc: suc.id,
          });
        });
      }, `Ticket ${id} creado desde ${r.id}`);
      return id;
    },
  };
}

function TicketDesdeReporteModal({ r, onClose }: { r: Reporte; onClose: () => void }) {
  const { db } = useStore();
  const act = useReporteActions();
  const suc = db.sucursales.find((s) => s.id === r.suc);
  const [prio, setPrio] = useState<PrioTicket>(prioInicial(r));
  return (
    <Modal title={`Crear ticket desde ${r.id}`} onClose={onClose}>
      <div className="flex flex-col gap-1 border-t-2 border-text pt-3 text-sm"><span className="font-extrabold">{r.tipo} · {suc?.n}</span><span>{r.detalle || "Sin detalle."}</span></div>
      {r.prioridad && <Banner tone="accent">El cliente pidió prioridad <strong>{PRIORIDADES[r.prioridad.nivel].toLowerCase()}</strong>: “{r.prioridad.motivo}”. La prioridad final la decide DMC.</Banner>}
      <Field label="Prioridad del ticket"><Select value={prio} onChange={(v) => setPrio(v as PrioTicket)} opts={["Baja", "Media", "Alta"]} /></Field>
      <div className="text-xs text-neutral-700">Se crea un ticket abierto con el detalle del reporte y se avisa a los usuarios del portal con alcance sobre este local.</div>
      <ModalActions>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { act.crearTicket(r, prio); onClose(); }}>Crear ticket</button>
      </ModalActions>
    </Modal>
  );
}

const EstadoTag = ({ e }: { e: EstadoReporte }) => <Tag t={ESTADOS_REPORTE[e].label} k={ESTADOS_REPORTE[e].kind} />;
const PrioTag = ({ r }: { r: Reporte }) => (r.prioridad ? <Tag t={`Prioridad ${PRIORIDADES[r.prioridad.nivel].toLowerCase()}`} k={r.prioridad.nivel === "urgente" ? "solid" : "accent"} /> : null);

function ReporteDrawer({ id, onClose, onTicket, enSucursal }: { id: string; onClose: () => void; onTicket: (r: Reporte) => void; enSucursal?: boolean }) {
  const { db } = useStore();
  const router = useRouter();
  const act = useReporteActions();
  const r = db.reportes.find((x) => x.id === id);
  if (!r) return null;
  const suc = db.sucursales.find((s) => s.id === r.suc);
  const cli = db.clients.find((c) => c.id === suc?.cli);
  const tk = ticketDeReporte(db, r);
  const hist = db.audit.filter((a) => a.ent === "Reporte" && a.reg.startsWith(r.id + " "));
  const items = [...hist.map((a) => ({ a: a.det, f: fdt(a.f), u: a.u, d: "" })), { a: "Reporte recibido", f: fdt(r.f), d: `Enviado por el personal de ${suc?.n ?? "la sucursal"} desde el acceso de local.` }];
  return (
    <Drawer kicker="Reporte de local" title={`${r.id} · ${r.tipo}`} sub={`${suc?.n ?? r.suc} · ${cli?.rs ?? ""}`} w={520} onClose={onClose}>
      <div className="flex flex-wrap gap-2"><EstadoTag e={r.estado} /><PrioTag r={r} /></div>
      <div className="bg-surface px-[14px] py-3 text-[15px]">“{r.detalle || "Sin detalle."}”</div>
      {r.prioridad && (
        <div className="border-t-2 border-text pt-[10px]">
          <div className="mb-1 text-xs font-bold uppercase tracking-[.08em]">Prioridad solicitada por el cliente</div>
          <div className="text-sm"><strong>{PRIORIDADES[r.prioridad.nivel]}</strong> · {r.prioridad.motivo}</div>
        </div>
      )}
      <Meta items={[{ l: "Recibido", v: fdt(r.f) }, { l: "Sucursal", v: suc ? `${suc.n} (${suc.cod})` : r.suc }, { l: "Cliente", v: cli?.rs ?? "—" }, { l: "Zona", v: suc ? zonaOf(db, suc) : "—" }]} />
      {tk && <div className="flex items-center justify-between gap-3 border-b border-neutral-300 pb-3 text-sm"><span>Ticket vinculado: <strong>{tk.id}</strong> · {tk.estado} · prioridad {tk.prio.toLowerCase()}</span></div>}
      <div className="flex flex-wrap gap-2">
        {r.estado === "nuevo" && <button className="btn btn-primary" onClick={() => act.revision(r)}>Pasar a revisión</button>}
        {(r.estado === "nuevo" || r.estado === "revision") && <button className="btn btn-secondary" onClick={() => onTicket(r)}>Crear ticket</button>}
        {r.estado !== "resuelto" && <button className="btn btn-secondary" onClick={() => act.resolver(r)}>Marcar resuelto</button>}
        {r.estado === "resuelto" && <button className="btn btn-secondary" onClick={() => act.reabrir(r)}>Reabrir (en revisión)</button>}
        {suc && !enSucursal && <button className="btn btn-ghost" onClick={() => router.push(`/panel/sucursales/${suc.id}?tab=reportes`)}>Ver sucursal →</button>}
      </div>
      <div><h3 className="!mb-[10px] !text-base">Seguimiento</h3><Timeline items={items} /></div>
    </Drawer>
  );
}

/** Tabla de reportes con detalle y acciones del equipo. `ambito` decide qué columnas de ubicación se muestran. */
export function ReportesTabla({ reportes, ambito, emptyTitle = "Sin reportes", emptyText = "Cuando un local envíe un reporte, aparecerá aquí." }: {
  reportes: Reporte[]; ambito: "todo" | "cliente" | "sucursal"; emptyTitle?: string; emptyText?: string;
}) {
  const { db } = useStore();
  const act = useReporteActions();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Reporte | null>(null);
  const cols = [
    { l: "Reporte", w: "130px" },
    ...(ambito === "sucursal" ? [] : [{ l: "Sucursal" }]),
    { l: "Tipo y detalle", w: "minmax(0,1.5fr)" }, { l: "Prioridad solicitada", w: "minmax(0,.9fr)" }, { l: "Estado", w: "120px" }, { l: "", w: "200px" },
  ];
  const rows: Row[] = reportes.map((r) => {
    const s = db.sucursales.find((x) => x.id === r.suc);
    const siguiente = r.estado === "nuevo" ? { t: "Revisar", on: () => act.revision(r) } : r.estado === "revision" ? { t: "Crear ticket", on: () => setTicket(r) }
      : r.estado === "ticket" ? { t: "Resolver", on: () => act.resolver(r) } : { t: "Reabrir", on: () => act.reabrir(r) };
    return {
      key: r.id, onClick: () => setAbierto(r.id), dim: r.estado === "resuelto",
      cells: [
        { t: r.id, b: true, sub: fdt(r.f) },
        ...(ambito === "sucursal" ? [] : [{ t: s?.n ?? r.suc, sub: ambito === "todo" ? db.clients.find((c) => c.id === s?.cli)?.rs : s?.cod }]),
        { t: r.tipo, b: true, sub: r.detalle },
        r.prioridad ? { tag: PRIORIDADES[r.prioridad.nivel], k: r.prioridad.nivel === "urgente" ? "solid" : "accent", sub: r.prioridad.motivo } : { t: "—" },
        { tag: ESTADOS_REPORTE[r.estado].label, k: ESTADOS_REPORTE[r.estado].kind },
        { actions: [siguiente, { t: "Ver", on: () => setAbierto(r.id) }] },
      ],
    };
  });
  return (
    <>
      <DataTable cols={cols} rows={rows} emptyTitle={emptyTitle} emptyText={emptyText} />
      {abierto && <ReporteDrawer id={abierto} onClose={() => setAbierto(null)} onTicket={(r) => setTicket(r)} enSucursal={ambito === "sucursal"} />}
      {ticket && <TicketDesdeReporteModal r={ticket} onClose={() => setTicket(null)} />}
    </>
  );
}

/** Orden de la cola: primero lo pendiente con prioridad solicitada, luego lo pendiente, luego lo ya atendido; más recientes arriba. */
export const ordenCola = (a: Reporte, b: Reporte): number => {
  const rank = (r: Reporte) => (reportePendiente(r) ? (r.prioridad?.nivel === "urgente" ? 0 : r.prioridad ? 1 : 2) : 3);
  return rank(a) - rank(b) || b.f.localeCompare(a.f) || b.id.localeCompare(a.id);
};

type FiltroEstado = "Pendientes" | "Todos" | EstadoReporte;
const FILTRO_OPTS: { v: FiltroEstado; l: string }[] = [
  { v: "Pendientes", l: "Pendientes (nuevos y en revisión)" }, { v: "Todos", l: "Todos" },
  ...ESTADOS.map((e) => ({ v: e as FiltroEstado, l: ESTADOS_REPORTE[e].label })),
];

export function Reportes() {
  const { db } = useStore();
  const [est, setEst] = useState<FiltroEstado>("Pendientes");
  const [cli, setCli] = useState("Todos"), [q, setQ] = useState(""), [soloPrio, setSoloPrio] = useState(false);
  const cuenta = (e: EstadoReporte) => db.reportes.filter((r) => r.estado === e).length;
  const nPrio = db.reportes.filter((r) => reportePendiente(r) && r.prioridad).length;
  const lista = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return db.reportes.filter((r) => {
      const s = db.sucursales.find((x) => x.id === r.suc);
      return (est === "Todos" || (est === "Pendientes" ? reportePendiente(r) : r.estado === est))
        && (cli === "Todos" || s?.cli === cli) && (!soloPrio || (r.prioridad && reportePendiente(r)))
        && (!qq || `${r.id} ${r.tipo} ${r.detalle} ${s?.n ?? ""} ${s?.cod ?? ""}`.toLowerCase().includes(qq));
    }).sort(ordenCola);
  }, [db, est, cli, q, soloPrio]);
  const clientes = db.clients.filter((c) => db.sucursales.some((s) => s.cli === c.id));

  return (
    <>
      <PageHead kicker="Cola de reportes de todos los clientes" title="Reportes de locales" />
      <div className="mb-6 grid border-b-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", borderColor: "var(--color-divider)" }}>
        <Kpi l="Nuevos" v={cuenta("nuevo")} s="sin revisar" c={cuenta("nuevo") ? alertColor : undefined} onClick={() => setEst("nuevo")} />
        <Kpi l="En revisión" v={cuenta("revision")} s="DMC los está revisando" onClick={() => setEst("revision")} />
        <Kpi l="Ticket creado" v={cuenta("ticket")} s="en el sistema de tickets" onClick={() => setEst("ticket")} />
        <Kpi l="Resueltos" v={cuenta("resuelto")} onClick={() => setEst("resuelto")} />
        <Kpi l="Con prioridad solicitada" v={nPrio} s="pendientes que el cliente pidió priorizar" c={nPrio ? alertColor : undefined} onClick={() => { setEst("Pendientes"); setSoloPrio(true); }} />
      </div>
      <div className="mb-5 grid items-end gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <div className="field col-span-2 min-w-0">
          <label htmlFor="rq">Buscar</label>
          <div className="relative"><Search size={15} className="absolute left-[10px] top-[10px] text-neutral-600" aria-hidden /><input id="rq" className="input !pl-8" placeholder="N° de reporte, sucursal, código o detalle" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <Field label="Estado"><Select value={est} onChange={(v) => setEst(v as FiltroEstado)} opts={FILTRO_OPTS} /></Field>
        <Field label="Cliente"><Select value={cli} onChange={setCli} opts={[{ v: "Todos", l: "Todos" }, ...clientes.map((c) => ({ v: c.id, l: c.rs }))]} /></Field>
        <Check16 checked={soloPrio} onChange={setSoloPrio} label="Solo con prioridad solicitada" />
      </div>
      <div className="mb-3 text-[13px] text-neutral-700">{lista.length} {lista.length === 1 ? "reporte" : "reportes"}</div>
      <ReportesTabla reportes={lista} ambito="todo" emptyTitle="Sin reportes con estos filtros" emptyText="Cambia el estado o el cliente para ver otros reportes." />
    </>
  );
}
