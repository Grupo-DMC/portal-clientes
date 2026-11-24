"use client";

import { ArrowLeft, ArrowRight, BellRing, Cable, CalendarClock, Camera, Check, ChevronRight, CircleHelp, ClipboardCheck, Clipboard, Hammer, Flag, LoaderCircle, LogOut, Megaphone, MapPin, Power, ScanLine, Send, WifiOff, Download, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { cerrarSesionLocal, crearReporte } from "@/app/actions/local";
import type { Reporte, Visita } from "@/lib/data";
import { fd, fdt, fl, MES_UP } from "@/lib/format";
import { ESTADOS_REPORTE, PRIORIDADES } from "@/lib/portal";
import { tagStyle } from "@/components/ui";
import { TIPOS_REPORTE_LOCAL, type TipoReporteLocal } from "./reporte";

export type LocalData = { suc: { n: string; cod: string; marca: string; dir: string }; visitas: Visita[]; reportes: Reporte[]; accesos: string[]; personal: string };
type View = "home" | "trabajos" | "trabajo" | "reporte" | "ok" | "reportes" | "rep";

const TIPOS: Record<TipoReporteLocal, [LucideIcon, string]> = {
  "Falsa alarma": [BellRing, "Suena sin motivo"],
  "Antena no detecta": [ScanLine, "Pasa una prenda y no suena"],
  "Antena dañada": [Hammer, "Golpeada o rota"],
  "Cable suelto": [Cable, "Cable expuesto o desconectado"],
  "Desactivador no funciona": [Power, "No quita la alarma"],
  Otro: [CircleHelp, "Algo distinto"],
};
const TITLES: Record<View, string> = { home: "Inicio", trabajos: "Trabajos realizados", trabajo: "Detalle del trabajo", reporte: "Hacer reporte", ok: "Reporte enviado", reportes: "Mis reportes", rep: "Detalle del reporte" };
const RESP: Record<Reporte["estado"], string> = {
  nuevo: "",
  revision: "El equipo de DMC está revisando tu reporte. Te contactaremos si necesitamos más datos.",
  ticket: "Creamos un ticket para coordinar la visita de un técnico a tu local.",
  resuelto: "El problema quedó resuelto. Si vuelve a ocurrir, haz un nuevo reporte.",
};

const Badge = ({ t, k }: { t: string; k: Parameters<typeof tagStyle>[0] }) => { const s = tagStyle(k); return <span className="self-start px-2 py-[3px] text-[11px]" style={{ background: s.bg, color: s.fg }}>{t}</span>; };
const EstadoBadge = ({ e }: { e: Reporte["estado"] }) => <Badge t={ESTADOS_REPORTE[e].label} k={ESTADOS_REPORTE[e].kind} />;

export default function LocalApp({ data }: { data: LocalData }) {
  const [pending, start] = useTransition();
  const [view, setView] = useState<View>("home");
  const [hist, setHist] = useState<View[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportes, setReportes] = useState<Reporte[]>(data.reportes);
  const [visId, setVisId] = useState<string | null>(null);
  const [repId, setRepId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [f, setF] = useState({ tipo: "" as "" | TipoReporteLocal, acc: "", desc: "" });
  const [fErr, setFErr] = useState("");
  const [sending, setSending] = useState(false);
  const [exiting, startExit] = useTransition();

  const go = (v: View, extra?: () => void) => {
    setHist((h) => [...h, view]); setView(v); extra?.(); window.scrollTo(0, 0);
    if (v === "trabajos" || v === "reportes") { setLoading(true); setTimeout(() => setLoading(false), 500); }
  };
  const back = () => { const h = [...hist]; const p = h.pop() ?? "home"; setHist(h); setView(p); };
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((s) => ({ ...s, [k]: v })); setFErr(""); };

  // «Trabajos realizados» son solo las visitas completadas; la programada se avisa aparte.
  const hechas = data.visitas.filter((v) => v.estado === "completada");
  const proxima = data.visitas.filter((v) => v.estado === "programada").sort((a, b) => a.f.localeCompare(b.f))[0];
  const vd = hechas.find((v) => v.id === visId);
  const rp = reportes.find((r) => r.id === repId);
  const nAb = reportes.filter((r) => r.estado !== "resuelto").length;

  const send = () => {
    if (sending || pending) return;
    if (!f.tipo) return setFErr("Elige qué está pasando.");
    if (f.tipo === "Otro" && f.desc.trim().length < 5) return setFErr("Describe el problema.");
    setSending(true);
    start(async () => {
      const r = await crearReporte({ tipo: f.tipo, acc: f.acc, detalle: f.desc });
      setSending(false);
      if (!r.ok) return setFErr(r.error);
      setReportes((L) => [r.reporte, ...L]);
      setNewId(r.reporte.id); setHist([]); setView("ok");
      setF({ tipo: "", acc: "", desc: "" });
    });
  };

  const rd = rp && (() => {
    const e = rp.estado;
    const ev: { f?: string; a: string; d: string }[] = [{ f: fdt(rp.f), a: "Reporte recibido", d: `Enviado por ${data.personal} desde el portal del local.` }];
    if (e !== "nuevo") ev.push({ a: "En revisión", d: "El equipo de DMC tomó tu reporte." });
    if (e === "ticket") ev.push({ a: "Ticket creado", d: "Se coordina la visita de un técnico." });
    if (e === "resuelto") ev.push({ a: "Resuelto", d: "Problema resuelto." });
    return { ev: ev.reverse(), resp: RESP[e] };
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
            {proxima && (
              <div className="flex items-start gap-3 border-t-2 border-text bg-surface px-[14px] py-3 text-sm"><CalendarClock size={18} className="mt-[1px] flex-none" aria-hidden /><span><strong>Visita programada el {fd(proxima.f)}.</strong> {proxima.tipo}. El informe estará disponible al terminar.</span></div>
            )}
            <button onClick={() => go("trabajos")} className="flex min-h-[170px] cursor-pointer flex-col gap-7 border-0 bg-text p-5 text-left text-bg active:bg-neutral-800">
              <ClipboardCheck size={32} style={{ color: "var(--color-accent-400)" }} aria-hidden />
              <span className="flex items-end justify-between gap-3"><span><span className="block text-2xl font-extrabold leading-[1.1]">Ver trabajos realizados</span><span className="text-sm text-neutral-300">{hechas.length} visitas · última {hechas[0] ? fl(hechas[0].f) : "—"}</span></span><ArrowRight size={22} aria-hidden /></span>
            </button>
            <button onClick={() => go("reporte")} className="flex min-h-[170px] cursor-pointer flex-col gap-7 border-0 p-5 text-left text-bg active:bg-[var(--color-accent-700)]" style={{ background: "var(--color-accent)" }}>
              <Megaphone size={32} aria-hidden />
              <span className="flex items-end justify-between gap-3"><span><span className="block text-2xl font-extrabold leading-[1.1]">Hacer reporte</span><span className="text-sm">Falsa alarma, antena que no detecta, cable suelto…</span></span><ArrowRight size={22} aria-hidden /></span>
            </button>
            <button onClick={() => go("reportes")} className="flex min-h-[60px] cursor-pointer items-center justify-between gap-3 border-0 border-b border-t-2 bg-transparent px-1 text-left text-inherit" style={{ borderTopColor: "var(--color-text)", borderBottomColor: "var(--color-divider)" }}>
              <span className="flex items-center gap-3"><Flag size={20} aria-hidden /><span><span className="block text-base font-extrabold">Mis reportes</span><span className="text-[13px] text-neutral-700">{nAb} sin resolver</span></span></span><ChevronRight size={18} aria-hidden />
            </button>
          </div>
        )}

        {view === "trabajos" && (
          <div className="px-5 pb-6 pt-2">
            {loading ? <div className="flex flex-col gap-3 pt-3">{[0, 1, 2].map((i) => (<div key={i} className="h-[84px] bg-neutral-200" style={{ animation: "dmcPulse 1.2s infinite" }} />))}</div>
              : hechas.length === 0 ? <div className="py-7"><Clipboard size={28} className="text-neutral-500" aria-hidden /><div className="mt-2 text-lg font-extrabold">Aún no hay trabajos registrados</div><div className="text-sm text-neutral-700">Aquí verás cada visita del técnico DMC a tu local.</div></div>
              : hechas.map((x) => (
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
              {vd.detalle && <div className="border-b border-neutral-300 py-[10px]"><div className="text-xs text-neutral-700">Horario</div><div className="font-bold">{vd.detalle.inicio} a {vd.detalle.fin}</div></div>}
              {vd.detalle?.firma && <div className="border-b border-neutral-300 py-[10px]"><div className="text-xs text-neutral-700">Recibió</div><div className="font-bold">{vd.detalle.firma.nombre}</div></div>}
            </div>
            <div><h3 className="!mb-[6px] !text-base">Trabajo realizado</h3><p className="!m-0 text-[15px]">{vd.res}</p></div>
            {vd.detalle && vd.detalle.trabajos.length > 0 && (
              <div className="flex flex-col gap-2">
                {vd.detalle.trabajos.map((t, i) => (
                  <div key={i} className="border-t border-neutral-300 pt-2"><div className="text-sm font-bold">{t.titulo}</div><div className="text-[13px] text-neutral-700">{t.items.map((it) => `${it.c} × ${it.n}`).join(" · ")}</div></div>
                ))}
              </div>
            )}
            {vd.detalle && vd.detalle.problemas.length > 0 && (
              <div><h3 className="!mb-[6px] !text-base">Problemas registrados</h3>
                {vd.detalle.problemas.map((p, i) => (<div key={i} className="border-t border-neutral-300 py-2 text-sm"><span className="font-bold">{p.titulo}</span> · {p.resuelto ? "Resuelto" : "Pendiente"}{p.detalle ? <div className="text-[13px] text-neutral-700">{p.detalle}</div> : null}</div>))}
              </div>
            )}
            {vd.detalle && vd.detalle.fotos.length > 0 && (
              <div><h3 className="!mb-2 !text-base">Fotos ({vd.detalle.fotos.length})</h3><div className="grid grid-cols-2 gap-2">{vd.detalle.fotos.slice(0, 4).map((p, i) => (<div key={i} className="flex aspect-[4/3] flex-col justify-end bg-neutral-300 p-2 text-xs"><Camera size={18} aria-hidden />{p.tema === "tienda" ? "Tienda" : "Módulo"} · {p.hora}</div>))}</div></div>
            )}
            <a className="btn btn-secondary !min-h-12 justify-between no-underline" href={`/api/visita/acta/${vd.id}`} target="_blank" rel="noopener">Descargar acta de la visita (PDF)<Download size={16} aria-hidden /></a>
            <button className="btn btn-secondary !min-h-12 justify-between" onClick={() => go("reporte")}>¿Sigue el problema? Hacer reporte<ArrowRight size={16} aria-hidden /></button>
          </div>
        )}

        {view === "reporte" && (
          <div className="flex flex-col gap-5 p-5">
            <div className="field"><label className="!text-[13px] !font-bold !text-text">1. ¿Qué está pasando? *</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_REPORTE_LOCAL.map((t) => { const [I, sub] = TIPOS[t]; const on = f.tipo === t; return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => set("tipo", t)} className="flex min-h-[96px] cursor-pointer flex-col gap-[6px] p-3 text-left text-sm font-bold" style={{ border: `2px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`, background: on ? "var(--color-accent-100)" : "transparent", color: on ? "var(--color-accent-800)" : "var(--color-text)" }}><I size={20} aria-hidden />{t}<span className="text-xs font-normal">{sub}</span></button>
                ); })}
              </div>
            </div>
            <div className="field"><label htmlFor="r-acc" className="!text-[13px] !font-bold !text-text">2. Acceso afectado (opcional)</label>
              <select id="r-acc" className="input !min-h-12 !text-base" value={f.acc} onChange={(e) => set("acc", e.target.value)}><option value="">Seleccionar…</option>{data.accesos.map((o) => (<option key={o} value={o}>{o}</option>))}<option value="No sé">No sé / todo el local</option></select></div>
            <div className="field"><label htmlFor="r-desc" className="!text-[13px] !font-bold !text-text">3. Detalle{f.tipo === "Otro" ? " *" : " (opcional)"}</label>
              <textarea id="r-desc" className="input !min-h-[110px] !text-base" maxLength={500} value={f.desc} placeholder="Ej: suena cada vez que pasa gente, aunque no lleven productos." onChange={(e) => set("desc", e.target.value)} /></div>
            {fErr && <div role="alert" className="px-3 py-[10px] text-sm" style={{ background: "var(--color-danger-100)", color: "var(--color-danger-800)" }}>{fErr}</div>}
            <button className={`${primary} !min-h-14 !text-[17px]`} onClick={send} disabled={sending}>{sending ? "Enviando…" : "Enviar reporte"}{sending ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <Send size={18} aria-hidden />}</button>
            <div className="text-xs text-neutral-700">Tu reporte le llega al equipo de DMC y a la jefatura de tu empresa en el portal cliente.</div>
          </div>
        )}

        {view === "ok" && (
          <div className="flex flex-1 flex-col gap-[18px] px-5 py-8">
            <div className="grid h-14 w-14 place-items-center text-bg" style={{ background: "var(--color-accent)" }}><Check size={28} aria-hidden /></div>
            <h1 className="!m-0 !text-[30px]">Reporte enviado</h1>
            <div className="border-b border-t-2 py-[14px]" style={{ borderTopColor: "var(--color-text)", borderBottomColor: "var(--color-divider)" }}><div className="text-[13px] text-neutral-700">N° de reporte</div><div className="text-[40px] font-extrabold tracking-[-0.02em]">{newId}</div></div>
            <div className="text-[15px]">DMC ya recibió tu reporte y avisamos a la jefatura de tu empresa. Puedes seguir el estado en “Mis reportes”.</div>
            <button className={primary} onClick={() => { setRepId(newId); setHist(["home", "reportes"]); setView("rep"); }}>Ver mi reporte<ArrowRight size={18} aria-hidden /></button>
            <button className="btn btn-secondary !min-h-[52px] !justify-start !px-4" onClick={() => { setHist([]); setView("home"); }}>Volver al inicio</button>
          </div>
        )}

        {view === "reportes" && (
          <div className="px-5 pb-6 pt-2">
            {loading ? <div className="flex flex-col gap-3 pt-3">{[0, 1].map((i) => (<div key={i} className="h-[72px] bg-neutral-200" style={{ animation: "dmcPulse 1.2s infinite" }} />))}</div>
              : reportes.length === 0 ? <div className="py-7"><div className="text-lg font-extrabold">Sin reportes</div><div className="text-sm text-neutral-700">Cuando hagas un reporte, aparecerá aquí con su estado.</div></div>
              : reportes.map((r) => (
                <button key={r.id} onClick={() => go("rep", () => setRepId(r.id))} className="grid min-h-[72px] w-full cursor-pointer gap-x-3 gap-y-1 border-0 border-b border-neutral-300 bg-transparent py-[14px] text-left text-inherit" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                  <span className="font-extrabold">{r.tipo}</span><EstadoBadge e={r.estado} /><span className="text-[13px] text-neutral-700">{r.id} · {fdt(r.f)}</span>
                </button>
              ))}
          </div>
        )}

        {view === "rep" && rp && rd && (
          <div className="flex flex-col gap-[18px] p-5">
            <div><div className="kicker !font-semibold">{rp.id} · {fdt(rp.f)}</div><h1 className="!mb-2 !mt-1 !text-[26px]">{rp.tipo}</h1>
              <div className="flex flex-wrap gap-[6px]"><EstadoBadge e={rp.estado} />{rp.prioridad && <Badge t={`Prioridad ${PRIORIDADES[rp.prioridad.nivel].toLowerCase()} solicitada`} k="accent" />}</div></div>
            <div className="bg-surface px-[14px] py-3 text-[15px]">“{rp.detalle || "Sin detalle."}”</div>
            {rd.resp && <div className="border-t-2 border-text pt-[10px]"><div className="mb-1 text-xs font-bold uppercase tracking-[.08em]">Respuesta de DMC</div><div className="text-[15px]">{rd.resp}</div></div>}
            <div><h3 className="!mb-[10px] !text-base">Seguimiento</h3>
              {rd.ev.map((h, i) => (
                <div key={i} className="grid gap-[14px]" style={{ gridTemplateColumns: "14px minmax(0,1fr)" }}>
                  <div className="flex flex-col items-center"><div className="mt-1 h-3 w-3" style={{ background: i === 0 ? "var(--color-accent)" : "var(--color-text)" }} />{i < rd.ev.length - 1 && <div className="w-[2px] flex-1 bg-neutral-300" />}</div>
                  <div className="pb-4"><div className="font-extrabold">{h.a}</div>{h.f && <div className="text-xs text-neutral-700">{h.f}</div>}<div className="text-sm">{h.d}</div></div>
                </div>
              ))}</div>
          </div>
        )}
        {(view === "trabajo" && !vd) || (view === "rep" && !rp) ? <div className="p-5"><WifiOff size={22} aria-hidden /> No encontramos este registro.</div> : null}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-5 pb-4 text-[11px] text-neutral-700"><MapPin size={12} aria-hidden />{data.suc.cod} · {data.suc.n}</div>
      </div>
    </div>
  );
}
