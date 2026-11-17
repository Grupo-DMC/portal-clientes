"use client";

import { AlertTriangle, ExternalLink, Inbox, Link2, RotateCw, X, Check } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { kindOf, type TagKind } from "@/lib/format";

/* ───────── Etiquetas ───────── */
const TAG: Record<TagKind, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: "var(--color-neutral-200)", fg: "var(--color-neutral-800)", bd: "var(--color-neutral-200)" },
  accent: { bg: "var(--color-accent-100)", fg: "var(--color-accent-800)", bd: "var(--color-accent-300)" },
  solid: { bg: "var(--color-danger)", fg: "#fff", bd: "var(--color-danger)" },
  outline: { bg: "transparent", fg: "var(--color-neutral-700)", bd: "var(--color-neutral-500)" },
  dark: { bg: "var(--color-text)", fg: "var(--color-bg)", bd: "var(--color-text)" },
};
export const tagStyle = (k: TagKind) => TAG[k];

export function Tag({ t, k, size = 11 }: { t: string; k?: TagKind; size?: number }) {
  const s = TAG[k ?? kindOf(t)];
  return (
    <span
      className="inline-flex whitespace-nowrap px-2 py-[2px] tracking-[.02em]"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.bd}`, fontSize: size }}
    >
      {t}
    </span>
  );
}

/* ───────── Tabla (DmcTabla) ───────── */
export type Cell =
  | string
  | number
  | null
  | { t?: string | number; sub?: string; b?: boolean; mono?: boolean; tag?: string; k?: TagKind; chips?: { t: string; k?: TagKind }[]; actions?: { t: string; on: () => void }[] };
export type Row = { cells: Cell[]; onClick?: () => void; dim?: boolean; key?: string };
export type Col = { l: string; w?: string };
export type TableState = "ok" | "loading" | "empty" | "error";

/** Permite probar los estados de lista con ?estado=cargando|vacío|error. */
export function useDemoState(): TableState {
  const q = useSearchParams().get("estado");
  return q === "cargando" ? "loading" : q === "vacío" || q === "vacio" ? "empty" : q === "error" ? "error" : "ok";
}

const tpl = (cols: Col[]) => cols.map((c) => (!c.w ? "minmax(140px,1fr)" : c.w.replace(/minmax\(0,/g, "minmax(120px,"))).join(" ");
const minW = (cols: Col[]) =>
  cols.reduce((s, c) => {
    const m = (c.w || "").match(/^(\d+)px$/);
    return s + (m ? +m[1] : c.w ? 120 : 140);
  }, 0);

export function DataTable({
  cols, rows, state, emptyTitle = "Sin registros", emptyText = "No hay datos para mostrar con los filtros actuales.", onRetry,
}: { cols: Col[]; rows: Row[]; state?: TableState; emptyTitle?: string; emptyText?: string; onRetry?: () => void }) {
  const demo = useDemoState();
  const [retried, setRetried] = useState(false);
  const st: TableState = state ?? (demo === "error" && retried ? "ok" : demo);
  const isEmpty = st === "empty" || (st === "ok" && rows.length === 0);
  const g = tpl(cols);
  const W = ["70%", "45%", "60%", "35%", "55%", "40%"];
  return (
    <div className="w-full overflow-x-auto border-t-2 border-text">
      <div style={{ minWidth: minW(cols) }} className="text-[13.5px]">
        <div className="grid border-b-2" style={{ gridTemplateColumns: g, borderColor: "var(--color-divider)" }} role="row">
          {cols.map((c, i) => (
            <div key={i} className="th" role="columnheader">{c.l}</div>
          ))}
        </div>
        {st === "loading" &&
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="grid border-b border-neutral-300" style={{ gridTemplateColumns: g }}>
              {cols.map((_, j) => (
                <div key={j} className="px-2 py-[15px]">
                  <div className="h-[10px] bg-neutral-300" style={{ width: W[(i + j) % W.length], animation: "dmcPulse 1.2s ease-in-out infinite" }} />
                </div>
              ))}
            </div>
          ))}
        {isEmpty && (
          <div className="flex items-start gap-4 border-b border-neutral-300 px-2 py-8">
            <Inbox size={28} className="text-neutral-500" aria-hidden />
            <div className="flex flex-col gap-1">
              <div className="text-base font-extrabold">{emptyTitle}</div>
              <div className="max-w-[520px] text-neutral-700">{emptyText}</div>
            </div>
          </div>
        )}
        {st === "error" && (
          <div role="alert" className="flex items-start gap-4 border-b border-neutral-300 px-2 py-8" style={{ background: "var(--color-danger-100)" }}>
            <AlertTriangle size={28} style={{ color: "var(--color-danger-700)" }} aria-hidden />
            <div className="flex flex-col items-start gap-2" style={{ color: "var(--color-danger-800)" }}>
              <div className="text-base font-extrabold">No pudimos cargar la información</div>
              <div className="max-w-[520px]">El servicio no respondió a tiempo. Revisa tu conexión e inténtalo de nuevo.</div>
              <button className="btn btn-secondary" onClick={() => { setRetried(true); onRetry?.(); }}>
                <RotateCw size={14} aria-hidden /> Reintentar
              </button>
            </div>
          </div>
        )}
        {st === "ok" &&
          rows.map((r, ri) => (
            <div
              key={r.key ?? ri}
              role="row"
              tabIndex={r.onClick ? 0 : undefined}
              onClick={r.onClick}
              onKeyDown={r.onClick ? (e) => { if (e.key === "Enter") r.onClick?.(); } : undefined}
              className="hover-row grid border-b border-neutral-300"
              style={{ gridTemplateColumns: g, cursor: r.onClick ? "pointer" : "default", opacity: r.dim ? 0.55 : 1 }}
            >
              {r.cells.map((raw, ci) => {
                const c = raw == null || typeof raw !== "object" ? { t: raw ?? "" } : raw;
                const chips = c.chips ?? (c.tag ? [{ t: c.tag, k: c.k }] : []);
                const acts = c.actions ?? [];
                const hasT = c.t != null && c.t !== "";
                return (
                  <div key={ci} className="flex min-w-0 flex-col justify-center gap-1 px-2 py-[10px]" style={{ alignItems: acts.length ? "flex-end" : "stretch" }}>
                    {hasT && (
                      <div className="[overflow-wrap:anywhere]" style={{ fontWeight: c.b ? 700 : 400, fontSize: c.mono ? "12.5px" : undefined, letterSpacing: c.mono ? ".02em" : undefined }}>
                        {c.t}
                      </div>
                    )}
                    {c.sub && <div className="text-xs text-neutral-700 [overflow-wrap:anywhere]">{c.sub}</div>}
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {chips.map((ch, i) => (<Tag key={i} t={ch.t} k={ch.k ?? "neutral"} />))}
                      </div>
                    )}
                    {acts.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-[2px]">
                        {acts.map((a, i) => (
                          <button key={i} className="btn btn-ghost !px-[6px] !py-1 !text-[13px]" onClick={(e) => { e.stopPropagation(); a.on(); }}>{a.t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}

/* ───────── Controles ───────── */
export function Seg<T extends string>({ opts, value, onChange, small, name }: { opts: readonly T[]; value: T; onChange: (v: T) => void; small?: boolean; name?: string }) {
  const id = useId();
  return (
    <div className="seg" role="radiogroup">
      {opts.map((o) => (
        <label key={o} className="seg-opt" style={small ? { padding: "2px 6px", fontSize: 11 } : undefined}>
          <input type="radio" name={name ?? id} checked={o === value} onChange={() => onChange(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className="flex h-6 w-11 flex-none cursor-pointer border-0 p-[3px]"
      style={{ background: on ? "var(--color-accent)" : "var(--color-neutral-400)", justifyContent: on ? "flex-end" : "flex-start", transition: "background-color 150ms var(--ease-out)" }}
    >
      <span className="block h-[18px] w-[18px]" style={{ background: "var(--color-bg)" }} />
    </button>
  );
}

export function Check16({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-[13px]">
      <input type="checkbox" className="chk" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Field({ label, children, className = "", span }: { label: string; children: ReactNode; className?: string; span?: boolean }) {
  return (
    <div className={`field ${className}`} style={span ? { gridColumn: "1 / -1" } : undefined}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Select({ value, onChange, opts, disabled, label }: { value: string; onChange: (v: string) => void; opts: (string | { v: string; l: string })[]; disabled?: boolean; label?: string }) {
  return (
    <select className="input" value={value} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => {
        const v = typeof o === "string" ? o : o.v;
        const l = typeof o === "string" ? o : o.l;
        return (<option key={v} value={v}>{l}</option>);
      })}
    </select>
  );
}

/* ───────── Encabezados, KPI, fuentes ───────── */
export function PageHead({ kicker, title, actions, rule = true }: { kicker?: string; title: string; actions?: ReactNode; rule?: boolean }) {
  return (
    <div className={`mb-5 flex flex-wrap items-end justify-between gap-6 pb-5 ${rule ? "border-b-2 border-text" : ""}`}>
      <div>
        {kicker && <div className="kicker mb-[6px]">{kicker}</div>}
        <h1 className="!m-0">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Heading({ title, hint, actions }: { title: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <h3 className="!mb-1 !mt-0">{title}</h3>
        {hint && <p className="!m-0 max-w-[620px] text-[13px] text-neutral-700">{hint}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function SourceBadge({ name, onOpen }: { name: string; onOpen?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-[6px] border border-neutral-500 px-2 py-[3px] text-[11px] text-neutral-800">
        <Link2 size={12} aria-hidden /> Fuente: {name}
      </span>
      {onOpen && (
        <a href="#" onClick={(e) => { e.preventDefault(); onOpen(); }} className="inline-flex items-center gap-1 text-[13px] font-semibold">
          Ver en sistema de origen <ExternalLink size={13} aria-hidden />
        </a>
      )}
    </div>
  );
}

export function Kpi({ l, v, s, c, onClick }: { l: string; v: ReactNode; s?: string; c?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="pl-[2px] text-xs font-semibold text-neutral-700">{l}</span>
      <span className="text-[44px] font-extrabold leading-none tracking-[-0.03em]" style={{ color: c ?? "var(--color-text)" }}>{v}</span>
      {s && <span className="text-xs text-neutral-700">{s}</span>}
    </>
  );
  const cls = "flex flex-col items-start gap-[6px] border-0 border-r border-neutral-300 bg-transparent px-4 pb-[18px] pt-5 text-left";
  return onClick ? (
    <button onClick={onClick} className={`${cls} hover-surface cursor-pointer`}>{inner}</button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export const alertColor = "var(--color-danger-700)";

export function Timeline({ items }: { items: { a: string; f: string; d: string; u?: string }[] }) {
  return (
    <div>
      {items.map((h, i) => (
        <div key={i} className="grid grid-cols-[14px_minmax(0,1fr)] gap-[14px]">
          <div className="flex flex-col items-center">
            <div className="mt-1 h-3 w-3 flex-none" style={{ background: i === 0 ? "var(--color-accent)" : "var(--color-text)" }} />
            {i < items.length - 1 && <div className="w-[2px] flex-1 bg-neutral-300" />}
          </div>
          <div className="pb-5">
            <div className="font-extrabold">{h.a}</div>
            <div className="text-xs text-neutral-700">{h.f}{h.u ? ` · ${h.u}` : ""}</div>
            <div className="mt-1 text-sm">{h.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Banner({ icon, children, tone = "surface" }: { icon?: ReactNode; children: ReactNode; tone?: "surface" | "accent" | "danger" | "dark" }) {
  const t = {
    surface: { background: "var(--color-surface)", borderTop: "2px solid var(--color-text)" },
    accent: { background: "var(--color-accent-100)", color: "var(--color-accent-800)" },
    danger: { background: "var(--color-danger-100)", color: "var(--color-danger-800)" },
    dark: { background: "var(--color-text)", color: "var(--color-bg)" },
  }[tone];
  return (
    <div className="flex items-start gap-3 px-[14px] py-3 text-sm" style={t}>
      {icon && <span className="mt-[2px] flex-none">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

/* ───────── Modal / Drawer / Toast ───────── */
function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

export function Modal({ title, w = 480, onClose, children, z = 50 }: { title: string; w?: number; onClose: () => void; children: ReactNode; z?: number }) {
  useEsc(onClose);
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("input,select,textarea,button:not([aria-label='Cerrar'])");
    el?.focus();
  }, []);
  return (
    <div className="fixed inset-0 flex items-start justify-center overflow-auto px-4 py-14" style={{ zIndex: z, background: "color-mix(in srgb, var(--color-neutral-900) 55%, transparent)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} className="anim-in bg-bg" style={{ width: `min(${w}px, 100%)`, boxShadow: "var(--shadow-lg)", borderTop: "4px solid var(--color-accent)" }}>
        <div className="flex items-center justify-between border-b-2 px-[22px] py-[18px]" style={{ borderColor: "var(--color-divider)" }}>
          <div id={tid} className="text-[21px] font-extrabold">{title}</div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Cerrar"><X size={18} aria-hidden /></button>
        </div>
        <div className="flex flex-col gap-4 px-[22px] py-5">{children}</div>
      </div>
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-2">{children}</div>;
}

export function Drawer({ kicker, title, sub, w = 520, onClose, children }: { kicker: string; title: string; sub?: string; w?: number; onClose: () => void; children: ReactNode }) {
  useEsc(onClose);
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40" style={{ background: "color-mix(in srgb, var(--color-neutral-900) 35%, transparent)" }} />
      <aside role="dialog" aria-modal="true" aria-label={title} className="anim-slide fixed bottom-0 right-0 top-0 z-[41] flex flex-col bg-bg" style={{ width: `min(${w}px, 100%)`, boxShadow: "var(--shadow-lg)" }}>
        <div className="flex justify-between gap-3 border-b-2 border-text px-[22px] py-5">
          <div>
            <div className="kicker">{kicker}</div>
            <div className="mt-1 text-[22px] font-extrabold">{title}</div>
            {sub && <div className="mt-[2px] text-[13px] text-neutral-700">{sub}</div>}
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Cerrar"><X size={18} aria-hidden /></button>
        </div>
        <div className="flex flex-1 flex-col gap-[18px] overflow-auto px-[22px] py-5">{children}</div>
      </aside>
    </>
  );
}

type ToastCtx = (msg: string) => void;
const ToastC = createContext<ToastCtx>(() => {});
export const useToast = () => useContext(ToastC);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((m: string) => {
    clearTimeout(t.current);
    setMsg(m);
    t.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  const v = useMemo(() => show, [show]);
  return (
    <ToastC.Provider value={v}>
      {children}
      <div aria-live="polite" role="status">
        {msg && (
          <div className="anim-in fixed bottom-6 right-6 z-[90] flex max-w-[420px] items-center gap-[10px] bg-text px-4 py-3 text-sm text-bg" style={{ boxShadow: "var(--shadow-md)" }}>
            <Check size={16} style={{ color: "var(--color-accent-400)" }} aria-hidden /> {msg}
          </div>
        )}
      </div>
    </ToastC.Provider>
  );
}

/* ───────── Diálogos pequeños (confirmar / pedir un texto) ───────── */
export type Ask = { title: string; label: string; val?: string; cb: (v: string) => void } | null;
export function MiniAsk({ ask, onClose }: { ask: NonNullable<Ask>; onClose: () => void }) {
  const [v, setV] = useState(ask.val ?? "");
  useEsc(onClose);
  const go = () => { const t = v.trim(); if (!t) return; onClose(); ask.cb(t); };
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ background: "color-mix(in srgb, var(--color-neutral-900) 35%, transparent)" }}>
      <div role="dialog" aria-modal="true" className="anim-in flex flex-col gap-[14px] bg-bg px-5 py-[18px]" style={{ width: "min(400px,100%)", boxShadow: "var(--shadow-lg)", borderTop: "4px solid var(--color-text)" }}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold">{ask.title}</div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Cerrar"><X size={16} aria-hidden /></button>
        </div>
        <Field label={ask.label}>
          <input className="input" autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }} />
        </Field>
        <div className="text-xs text-neutral-700">Se agrega al catálogo y queda seleccionado. No pierdes lo que llevas del formulario.</div>
        <ModalActions>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={go}>Agregar</button>
        </ModalActions>
      </div>
    </div>
  );
}

export function Confirm({ title, body, cta, onOk, onClose }: { title: string; body: string; cta: string; onOk: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="!m-0 text-[15px]">{body}</p>
      <ModalActions>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { onOk(); onClose(); }}>{cta}</button>
      </ModalActions>
    </Modal>
  );
}

export function Meta({ items }: { items: { l: string; v: string }[] }) {
  return (
    <div className="grid grid-cols-2 border-t-2 border-text">
      {items.map((m) => (
        <div key={m.l} className="border-b border-neutral-300 py-[10px]">
          <div className="text-xs text-neutral-700">{m.l}</div>
          <div className="font-bold">{m.v}</div>
        </div>
      ))}
    </div>
  );
}

export function Stat({ items }: { items: { v: number | string; l: string }[] }) {
  return (
    <div className="flex border-l border-neutral-300">
      {items.map((k) => (
        <div key={k.l} className="border-r border-neutral-300 px-4">
          <div className="text-[26px] font-extrabold leading-none">{k.v}</div>
          <div className="text-[11px] text-neutral-700">{k.l}</div>
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ pct, dark = true }: { pct: number; dark?: boolean }) {
  return (
    <div className="h-[10px] bg-neutral-300" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full" style={{ width: `${pct}%`, background: dark ? "var(--color-text)" : "var(--color-accent)" }} />
    </div>
  );
}

/** Pestañas planas del diseño (borde inferior de 4px en la activa). */
export function Tabs({ tabs, value, onChange }: { tabs: { id: string; l: string; ro?: boolean }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="mb-7 flex overflow-x-auto border-b-2 border-text">
      {tabs.map((t) => {
        const a = t.id === value;
        return (
          <button
            key={t.id} role="tab" aria-selected={a} onClick={() => onChange(t.id)}
            className="flex cursor-pointer items-center gap-[6px] whitespace-nowrap border-0 bg-transparent px-[14px] py-[10px] text-sm font-bold hover:bg-surface"
            style={{ borderBottom: `4px solid ${a ? "var(--color-accent)" : "transparent"}`, color: a ? "var(--color-text)" : "var(--color-neutral-700)" }}
          >
            {t.l}
            {t.ro && <Link2 size={12} className="text-neutral-500" aria-label="Solo lectura" />}
          </button>
        );
      })}
    </div>
  );
}
