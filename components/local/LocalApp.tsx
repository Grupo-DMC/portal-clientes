"use client";

import { ArrowLeft, ArrowRight, BellRing, Camera, Check, ChevronRight, CircleHelp, ClipboardCheck, Clipboard, Hammer, Image as ImageIcon, ChartNoAxesColumn, LoaderCircle, LogOut, Megaphone, MapPin, Power, ScanLine, Send, Ticket as TicketIcon, WifiOff, X, Download, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { cerrarSesionLocal, crearReporte } from "@/app/actions/local";
import type { Ticket, Visita } from "@/lib/data";
import { fd, fl, kindOf, MES_UP } from "@/lib/format";
import { TIPOS_REPORTE } from "@/lib/schemas";
import { tagStyle } from "@/components/ui";

export type LocalData = { suc: { n: string; cod: string; marca: string; dir: string }; visitas: Visita[]; tickets: Ticket[]; accesos: string[]; personal: string };
type View = "home" | "trabajos" | "trabajo" | "reporte" | "ok" | "reportes" | "rep";
type Urg = "Baja" | "Media" | "Alta";

const TIPOS: [(typeof TIPOS_REPORTE)[number], LucideIcon][] = [
  ["Antena suena sin motivo", BellRing], ["No detecta", ScanLine], ["Equipo apagado", Power], ["Daño físico", Hammer], ["Contador sin datos", ChartNoAxesColumn], ["Otro", CircleHelp],
];
const URG_TXT: Record<Urg, string> = { Baja: "Puede esperar a la próxima visita.", Media: "Afecta la operación, pero el local funciona.", Alta: "El local está desprotegido o no puede operar." };
const TITLES: Record<View, string> = { home: "Inicio", trabajos: "Trabajos realizados", trabajo: "Detalle del trabajo", reporte: "Hacer reporte", ok: "Reporte enviado", reportes: "Mis reportes", rep: "Detalle del reporte" };

const Badge = ({ t, k }: { t: string; k?: Parameters<typeof tagStyle>[0] }) => { const s = tagStyle(k ?? kindOf(t)); return <span className="self-start px-2 py-[3px] text-[11px]" style={{ background: s.bg, color: s.fg }}>{t}</span>; };

export default function LocalApp({ data }: { data: LocalData }) {
  const [pending, start] = useTransition();
  const [view, setView] = useState<View>("home");
  const [hist, setHist] = useState<View[]>([]);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>(data.tickets);
  const [visId, setVisId] = useState<string | null>(null);
  const [repId, setRepId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [f, setF] = useState({ tipo: "" as string, acc: "", desc: "", fotos: 0, urg: "Media" as Urg, nom: "" });
  const [fErr, setFErr] = useState("");
  const [sending, setSending] = useState(false);
  const [exiting, startExit] = useTransition();

  const go = (v: View, extra?: () => void) => {
    setHist((h) => [...h, view]); setView(v); extra?.(); window.scrollTo(0, 0);
    if (v === "trabajos" || v === "reportes") { setLoading(true); setTimeout(() => setLoading(false), 500); }
  };
  const back = () => { const h = [...hist]; const p = h.pop() ?? "home"; setHist(h); setView(p); };
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((s) => ({ ...s, [k]: v })); setFErr(""); };

  const vd = data.visitas.find((v) => v.id === visId);
  const td = tickets.find((t) => t.id === repId);
  const nAb = tickets.filter((t) => t.estado !== "Cerrado").length;

  const send = () => {
    if (sending || pending) return;
    if (!f.tipo) return setFErr("Elige qué está pasando.");
    if (!f.acc) return setFErr("Indica el acceso afectado.");
    if (f.tipo === "Otro" && !f.desc.trim()) return setFErr("Describe el problema.");
    if (f.nom.trim().length < 2) return setFErr("Ingresa tu nombre.");
    setSending(true);
    start(async () => {
      const r = await crearReporte({ tipo: f.tipo, acc: f.acc, desc: f.desc, urg: f.urg, nom: f.nom, fotos: f.fotos });
      setSending(false);
      if (!r.ok) return setFErr(r.error);
      setTickets((L) => [{ id: r.id, suc: "s1", f: "2026-10-05", prob: f.tipo, estado: "Abierto", prio: f.urg, desc: `${f.acc}: ${f.desc || f.tipo}`, nom: f.nom, isNew: true }, ...L]);
      setNewId(r.id); setHist([]); setView("ok");
      setF({ tipo: "", acc: "", desc: "", fotos: 0, urg: "Media", nom: "" });
    });
  };

  const rd = td && (() => {
    const ev = [{ f: fd(td.f), a: "Reporte recibido", d: `Enviado por ${td.nom ?? data.personal} desde el portal del local.` }];
    if (td.estado !== "Abierto" || td.isNew) ev.push({ f: fd(td.f), a: "Asignado a técnico", d: "Javier Tapia revisará el caso." });
    if (td.estado === "Cerrado") ev.push({ f: fd(td.f), a: "Cerrado", d: "Problema resuelto." });
    return { ev: ev.reverse(), resp: td.estado === "Cerrado" ? "Se ajustó la sensibilidad y se probó con etiquetas. Equipo operativo." : td.estado !== "Abierto" ? "Revisaremos el contador en la próxima visita. Por ahora no es necesario apagarlo." : "" };
  })();

  const canBack = view !== "home" && view !== "ok";
  const primary = "btn btn-primary !min-h-[52px] justify-between !px-4";

  return (
    <div className="flex min-h-screen justify-center bg-surface text-text">
      <div className="flex min-h-screen w-full max-w-[440px] flex-col bg-bg" style={{ boxShadow: "var(--shadow-md)" }}>
        <header className="sticky top-0 z-[5] flex min-h-[60px] items-center gap-[10px] border-b-2 border-text bg-bg py-[10px] pl-2 pr-3">
          {canBack ? <button onClick={back} aria-label="Volver" className="grid h-11 w-11 cursor-pointer place-items-center border-0 bg-transparent text-inherit"><ArrowLeft size={22} aria-hidden /></button>
            : <Image src="/DMC-logo.png" alt="Grupo dMC" width={76} height={36} priority className="ml-2 h-9 w-auto" />}
          <div className="min-w-0 flex-1"><div className="truncate text-base font-extrabold">{TITLES[view]}</div><div className="text-xs text-neutral-700">{data.suc.n}</div></div>
          <button onClick={() => startExit(() => { void cerrarSesionLocal(); })} disabled={exiting} aria-label="Salir" className="grid h-11 w-11 cursor-pointer place-items-center border-0 bg-transparent text-neutral-700"><LogOut size={18} aria-hidden /></button>
        </header>

        {view === "home" && (
          <div className="anim-in flex flex-col gap-4 p-5">
            <div><div className="text-[13px] text-neutral-700">{data.suc.marca} · {data.suc.dir}</div><h1 className="!mb-0 !mt-1 !text-[28px]">¿Qué necesitas hacer?</h1></div>
            <button onClick={() => go("trabajos")} className="flex min-h-[170px] cursor-pointer flex-col gap-7 border-0 bg-text p-5 text-left text-bg active:bg-neutral-800">
              <ClipboardCheck size={32} style={{ color: "var(--color-accent-400)" }} aria-hidden />
              <span className="flex items-end justify-between gap-3"><span><span className="block text-2xl font-extrabold leading-[1.1]">Ver trabajos realizados</span><span className="text-sm text-neutral-300">{data.visitas.length} visitas · última {data.visitas[0] ? fl(data.visitas[0].f) : "—"}</span></span><ArrowRight size={22} aria-hidden /></span>
            </button>
            <button onClick={() => go("reporte")} className="flex min-h-[170px] cursor-pointer flex-col gap-7 border-0 p-5 text-left text-bg active:bg-[var(--color-accent-700)]" style={{ background: "var(--color-accent)" }}>
              <Megaphone size={32} aria-hidden />
              <span className="flex items-end justify-between gap-3"><span><span className="block text-2xl font-extrabold leading-[1.1]">Hacer reporte</span><span className="text-sm">Antena que suena, no detecta, equipo apagado…</span></span><ArrowRight size={22} aria-hidden /></span>
            </button>
            <button onClick={() => go("reportes")} className="flex min-h-[60px] cursor-pointer items-center justify-between gap-3 border-0 border-b border-t-2 bg-transparent px-1 text-left text-inherit" style={{ borderTopColor: "var(--color-text)", borderBottomColor: "var(--color-divider)" }}>
              <span className="flex items-center gap-3"><TicketIcon size={20} aria-hidden /><span><span className="block text-base font-extrabold">Mis reportes</span><span className="text-[13px] text-neutral-700">{nAb} abiertos</span></span></span><ChevronRight size={18} aria-hidden />
            </button>
          </div>
        )}

        {view === "trabajos" && (
          <div className="px-5 pb-6 pt-2">
            {loading ? <div className="flex flex-col gap-3 pt-3">{[0, 1, 2].map((i) => (<div key={i} className="h-[84px] bg-neutral-200" style={{ animation: "dmcPulse 1.2s infinite" }} />))}</div>
              : data.visitas.length === 0 ? <div className="py-7"><Clipboard size={28} className="text-neutral-500" aria-hidden /><div className="mt-2 text-lg font-extrabold">Aún no hay trabajos registrados</div><div className="text-sm text-neutral-700">Aquí verás cada visita del técnico DMC a tu local.</div></div>
              : data.visitas.map((x) => (
                <button key={x.id} onClick={() => go("trabajo", () => setVisId(x.id))} className="grid min-h-[72px] w-full cursor-pointer items-center gap-3 border-0 border-b border-neutral-300 bg-transparent py-[14px] text-left text-inherit" style={{ gridTemplateColumns: "56px minmax(0,1fr) 20px" }}>
                  <span><span className="block text-[26px] font-extrabold leading-none">{x.f.slice(8)}</span><span className="text-[11px] text-neutral-700">{MES_UP[+x.f.slice(5, 7) - 1]} {x.f.slice(0, 4)}</span></span>
                  <span><span className="block font-bold">{x.tipo}</span><span className="line-clamp-2 text-[13px] text-neutral-800">{x.res}</span></span><ChevronRight size={18} aria-hidden />
                </button>
              ))}
          </div>
        )}

        {view === "trabajo" && vd && (
          <div className="flex flex-col gap-[18px] p-5">
            <div><div className="kicker !font-semibold">{vd.id}</div><h1 className="!mb-0 !mt-1 !text-[26px]">{vd.tipo}</h1></div>
            <div className="grid grid-cols-2 border-t-2 border-text">
              <div className="border-b border-neutral-300 py-[10px]"><div className="text-xs text-neutral-700">Fecha</div><div className="font-bold">{fl(vd.f)}</div></div>
              <div className="border-b border-neutral-300 py-[10px]"><div className="text-xs text-neutral-700">Técnico</div><div className="font-bold">{vd.tec}</div></div>
            </div>
            <div><h3 className="!mb-[6px] !text-base">Trabajo realizado</h3><p className="!m-0 text-[15px]">{vd.res}</p></div>
            <div><h3 className="!mb-2 !text-base">Fotos</h3><div className="grid grid-cols-2 gap-2">{["Antes", "Después", "Antena", "Panel"].map((p) => (<div key={p} className="flex aspect-[4/3] flex-col justify-end bg-neutral-300 p-2 text-xs"><Camera size={18} aria-hidden />{p}</div>))}</div></div>
            <a className="btn btn-secondary !min-h-12 justify-between no-underline" href={`/api/visita/acta/${vd.id}`} target="_blank" rel="noopener">Descargar acta de la visita (PDF)<Download size={16} aria-hidden /></a>
            <button className="btn btn-secondary !min-h-12 justify-between" onClick={() => go("reporte")}>¿Sigue el problema? Hacer reporte<ArrowRight size={16} aria-hidden /></button>
          </div>
        )}

        {view === "reporte" && (
          <div className="flex flex-col gap-5 p-5">
            <div className="field"><label className="!text-[13px] !font-bold !text-text">1. ¿Qué está pasando? *</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(([t, I]) => { const on = f.tipo === t; return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => set("tipo", t)} className="flex min-h-[84px] cursor-pointer flex-col gap-[10px] p-3 text-left text-sm font-bold" style={{ border: `2px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`, background: on ? "var(--color-accent-100)" : "transparent", color: on ? "var(--color-accent-800)" : "var(--color-text)" }}><I size={20} aria-hidden />{t}</button>
                ); })}
              </div>
            </div>
            <div className="field"><label htmlFor="r-acc" className="!text-[13px] !font-bold !text-text">2. Acceso afectado *</label>
              <select id="r-acc" className="input !min-h-12 !text-base" value={f.acc} onChange={(e) => set("acc", e.target.value)}><option value="">Seleccionar…</option>{data.accesos.map((o) => (<option key={o} value={o}>{o}</option>))}<option value="No sé">No sé / todo el local</option></select></div>
            <div className="field"><label htmlFor="r-desc" className="!text-[13px] !font-bold !text-text">3. Descripción{f.tipo === "Otro" ? " *" : " (opcional)"}</label>
              <textarea id="r-desc" className="input !min-h-[110px] !text-base" maxLength={1000} value={f.desc} placeholder="Ej: suena cada vez que pasa gente, aunque no lleven productos." onChange={(e) => set("desc", e.target.value)} /></div>
            <div className="field"><label className="!text-[13px] !font-bold !text-text">4. Fotos (opcional)</label>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: f.fotos }).map((_, i) => (
                  <div key={i} className="relative flex aspect-square items-end bg-neutral-300 p-[6px] text-[11px]"><ImageIcon size={16} aria-hidden /><button onClick={() => set("fotos", f.fotos - 1)} aria-label="Quitar foto" className="absolute right-0 top-0 grid h-8 w-8 cursor-pointer place-items-center border-0 bg-text text-bg"><X size={14} aria-hidden /></button></div>
                ))}
                {f.fotos < 3 && <button type="button" onClick={() => set("fotos", f.fotos + 1)} className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-[6px] border-2 border-dashed border-neutral-500 bg-transparent text-xs text-inherit"><Camera size={22} aria-hidden />Agregar</button>}
              </div></div>
            <div className="field"><label className="!text-[13px] !font-bold !text-text">5. Urgencia</label>
              <div className="grid grid-cols-3 border" style={{ borderColor: "var(--color-divider)" }}>
                {(["Baja", "Media", "Alta"] as Urg[]).map((u) => (<button key={u} type="button" aria-pressed={f.urg === u} onClick={() => set("urg", u)} className="min-h-12 cursor-pointer border-0 border-r font-bold" style={{ borderColor: "var(--color-divider)", background: f.urg === u ? "var(--color-text)" : "transparent", color: f.urg === u ? "var(--color-bg)" : "var(--color-text)" }}>{u}</button>))}
              </div><div className="mt-[6px] text-xs text-neutral-700">{URG_TXT[f.urg]}</div></div>
            <div className="field"><label htmlFor="r-nom" className="!text-[13px] !font-bold !text-text">6. Tu nombre *</label><input id="r-nom" className="input !min-h-12 !text-base" value={f.nom} maxLength={80} placeholder="Nombre y apellido" onChange={(e) => set("nom", e.target.value)} /></div>
            {fErr && <div role="alert" className="px-3 py-[10px] text-sm" style={{ background: "var(--color-danger-100)", color: "var(--color-danger-800)" }}>{fErr}</div>}
            <button className={`${primary} !min-h-14 !text-[17px]`} onClick={send} disabled={sending}>{sending ? "Enviando…" : "Enviar reporte"}{sending ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Send size={18} aria-hidden />}</button>
            <div className="text-xs text-neutral-700">Se crea un ticket en el Sistema de tickets de DMC.</div>
          </div>
        )}

        {view === "ok" && (
          <div className="flex flex-1 flex-col gap-[18px] px-5 py-8">
            <div className="grid h-14 w-14 place-items-center text-bg" style={{ background: "var(--color-accent)" }}><Check size={28} aria-hidden /></div>
            <h1 className="!m-0 !text-[30px]">Reporte enviado</h1>
            <div className="border-b border-t-2 py-[14px]" style={{ borderTopColor: "var(--color-text)", borderBottomColor: "var(--color-divider)" }}><div className="text-[13px] text-neutral-700">N° de ticket</div><div className="text-[40px] font-extrabold tracking-[-0.02em]">{newId}</div></div>
            <div className="text-[15px]">DMC ya recibió tu reporte. Te contactaremos en el local para coordinar la revisión. Puedes seguir el estado en “Mis reportes”.</div>
            <button className={primary} onClick={() => { setRepId(newId); setHist(["home", "reportes"]); setView("rep"); }}>Ver mi reporte<ArrowRight size={18} aria-hidden /></button>
            <button className="btn btn-secondary !min-h-[52px] !justify-start !px-4" onClick={() => { setHist([]); setView("home"); }}>Volver al inicio</button>
          </div>
        )}

        {view === "reportes" && (
          <div className="px-5 pb-6 pt-2">
            {loading ? <div className="flex flex-col gap-3 pt-3">{[0, 1].map((i) => (<div key={i} className="h-[72px] bg-neutral-200" style={{ animation: "dmcPulse 1.2s infinite" }} />))}</div>
              : tickets.length === 0 ? <div className="py-7"><div className="text-lg font-extrabold">Sin reportes</div><div className="text-sm text-neutral-700">Cuando hagas un reporte, aparecerá aquí con su estado.</div></div>
              : tickets.map((r) => (
                <button key={r.id} onClick={() => go("rep", () => setRepId(r.id))} className="grid min-h-[72px] w-full cursor-pointer gap-x-3 gap-y-1 border-0 border-b border-neutral-300 bg-transparent py-[14px] text-left text-inherit" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                  <span className="font-extrabold">{r.prob}</span><Badge t={r.estado} /><span className="text-[13px] text-neutral-700">{r.id} · {fl(r.f)}</span>
                </button>
              ))}
          </div>
        )}

        {view === "rep" && td && rd && (
          <div className="flex flex-col gap-[18px] p-5">
            <div><div className="kicker !font-semibold">{td.id} · {fl(td.f)}</div><h1 className="!mb-2 !mt-1 !text-[26px]">{td.prob}</h1><div className="flex gap-[6px]"><Badge t={td.estado} /><Badge t={`Urgencia ${td.prio.toLowerCase()}`} k={kindOf(td.prio)} /></div></div>
            <div className="bg-surface px-[14px] py-3 text-[15px]">“{td.desc || "Sin descripción."}”</div>
            {rd.resp && <div className="border-t-2 border-text pt-[10px]"><div className="mb-1 text-xs font-bold uppercase tracking-[.08em]">Respuesta del técnico</div><div className="text-[15px]">{rd.resp}</div></div>}
            <div><h3 className="!mb-[10px] !text-base">Seguimiento</h3>
              {rd.ev.map((h, i) => (
                <div key={i} className="grid gap-[14px]" style={{ gridTemplateColumns: "14px minmax(0,1fr)" }}>
                  <div className="flex flex-col items-center"><div className="mt-1 h-3 w-3" style={{ background: i === 0 ? "var(--color-accent)" : "var(--color-text)" }} />{i < rd.ev.length - 1 && <div className="w-[2px] flex-1 bg-neutral-300" />}</div>
                  <div className="pb-4"><div className="font-extrabold">{h.a}</div><div className="text-xs text-neutral-700">{h.f}</div><div className="text-sm">{h.d}</div></div>
                </div>
              ))}</div>
          </div>
        )}
        {(view === "trabajo" && !vd) || (view === "rep" && !td) ? <div className="p-5"><WifiOff size={22} aria-hidden /> No encontramos este registro.</div> : null}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-5 pb-4 text-[11px] text-neutral-700"><MapPin size={12} aria-hidden />{data.suc.cod} · {data.suc.n}</div>
      </div>
    </div>
  );
}
