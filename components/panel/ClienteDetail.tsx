"use client";

import { Building2, ChevronDown, ChevronRight, Map as MapIcon, Plus, Power, ShoppingBag, MapPin, Store, BellOff, CalendarX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { calOf, garOf } from "@/lib/calc";
import type { Cliente, Contacto, Direccion } from "@/lib/data";
import { addM, checkRut, fd, fmtAlc, kindOf, MES_UP, REGIONES, stOf } from "@/lib/format";
import { useLookups, useStore } from "@/components/store";
import { Confirm, DataTable, Field, Heading, PageHead, Select, Seg, SourceBadge, Stat, Switch, Tabs, Tag, useDemoState, useToast, Check16, type Row } from "@/components/ui";
import { ContactoModal, DireccionModal, NewSucursalModal, ZonaModal } from "./Modals";
import { TK_COLS, tg } from "./Lists";

const TABS = [
  { id: "facturacion", l: "Facturación" }, { id: "contactos", l: "Contactos" }, { id: "zonas", l: "Zonas" }, { id: "marcas", l: "Marcas y sucursales" },
  { id: "garantia", l: "Garantía y calibración" }, { id: "visitas", l: "Visitas", ro: true }, { id: "cotizaciones", l: "Cotizaciones y despachos", ro: true },
  { id: "planificacion", l: "Planificación", ro: true }, { id: "tickets", l: "Tickets", ro: true }, { id: "notificaciones", l: "Notificaciones" }, { id: "usuarios", l: "Usuarios del portal" },
];
const EVS: [string, string][] = [["tn", "Ticket nuevo"], ["tc", "Ticket cerrado"], ["vr", "Visita realizada"], ["gv", "Garantía por vencer"], ["cv", "Calibración por vencer"]];

export default function ClienteDetail({ id }: { id: string }) {
  const { db, mut, ask } = useStore();
  const { sucN, sucOf, cliOf, ubic } = useLookups();
  const router = useRouter();
  const toast = useToast();
  const sp = useSearchParams();
  const demo = useDemoState();
  const cli = db.clients.find((c) => c.id === id);
  const [tab, setTab] = useState(sp.get("tab") ?? "facturacion");
  const [exp, setExp] = useState<Record<string, boolean>>({ "Andes Moda": true });
  const [dirInact, setDirInact] = useState(false), [conInact, setConInact] = useState(false), [uInact, setUInact] = useState(false);
  const [vSuc, setVSuc] = useState("Todas"), [vTec, setVTec] = useState("Todos"), [vDesde, setVDesde] = useState("2026-01-01"), [vHasta, setVHasta] = useState("2026-12-31");
  const [modal, setModal] = useState<null | { t: "dir"; v?: Direccion } | { t: "con"; v?: Contacto } | { t: "zona"; idx: number } | { t: "suc" }>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; cta: string; ok: () => void }>(null);
  if (!cli) return <p>No encontramos este cliente.</p>;

  const cs = db.sucursales.filter((s) => s.cli === cli.id);
  const up = <K extends keyof Cliente>(k: K, v: Cliente[K]) => mut((d) => { (d.clients.find((c) => c.id === cli.id)!)[k] = v; });
  const ext = (s: string) => () => toast(`Abriendo ${s} en una pestaña nueva…`);
  const rc = checkRut(cli.rutStr);
  const inCs = (x: { suc: string }) => cs.some((s) => s.id === x.suc);
  const dirUp = (did: string, fn: (c: Cliente, d: Direccion) => void, msg: string) => () => mut((d) => { const c = d.clients.find((x) => x.id === cli.id)!; fn(c, c.dirs.find((x) => x.id === did)!); }, msg);
  const pe = addM(cli.planDesde, cli.planMeses);
  const tecs = [...new Set(db.visitas.map((v) => v.tec))];
  const used = cli.zonas.flatMap((z) => z.regs);
  const sinZona = REGIONES.filter((r) => !used.includes(r));

  const kicker = `Cliente · ${cli.tipo}`;
  const stat = [
    { v: cli.marcas.length, l: "Marcas" }, { v: cs.length, l: "Sucursales" }, { v: db.contacts.filter((k) => k.cli === cli.id && k.activo).length, l: "Contactos" },
    { v: db.tickets.filter((t) => cs.some((s) => s.id === t.suc) && t.estado !== "Cerrado").length, l: "Tickets abiertos" },
  ];

  const toggleActivo = () => cli.activo
    ? setConfirm({ title: `Desactivar ${cli.rs}`, body: "El cliente y sus sucursales dejarán de aparecer en los listados (puedes verlos con “Mostrar inactivos”). Los datos y el historial se conservan.", cta: "Desactivar", ok: () => mut((d) => { d.clients.find((c) => c.id === cli.id)!.activo = false; }, "Cliente desactivado") })
    : mut((d) => { d.clients.find((c) => c.id === cli.id)!.activo = true; }, "Cliente reactivado");

  /* ── tablas ── */
  const dirs = cli.dirs.filter((d) => dirInact || d.activo);
  const dirRows: Row[] = dirs.map((x) => ({
    dim: !x.activo,
    cells: [tg(x.tipo, "neutral"), { t: x.dir, b: true, sub: x.activo ? "" : "Inactiva" }, { t: x.com, sub: "Región " + x.reg },
      x.principal ? tg("Principal · " + x.tipo, "dark") : { actions: x.activo ? [{ t: "Marcar principal", on: dirUp(x.id, (c, dd) => { c.dirs.forEach((o) => { if (o.tipo === dd.tipo) o.principal = false; }); dd.principal = true; }, "Dirección marcada como principal de " + x.tipo) }] : [] },
      { actions: x.activo
        ? [{ t: "Editar", on: () => setModal({ t: "dir", v: x }) }, { t: "Desactivar", on: () => setConfirm({ title: "Desactivar dirección", body: x.dir + " dejará de usarse en nuevos documentos.", cta: "Desactivar", ok: dirUp(x.id, (_c, dd) => { dd.activo = false; dd.principal = false; }, "Dirección desactivada") }) }]
        : [{ t: "Reactivar", on: dirUp(x.id, (_c, dd) => { dd.activo = true; }, "Dirección reactivada") }] }],
  }));
  const cons = db.contacts.filter((k) => k.cli === cli.id && (conInact || k.activo));
  const conRows: Row[] = cons.map((k) => ({
    dim: !k.activo,
    cells: [{ t: k.n, b: true, sub: k.activo ? "" : "Inactivo" }, { chips: k.cargos.map((c) => ({ t: `${c.cargo} · ${fmtAlc(c.alc, c.val)}`, k: c.alc === "Todo el cliente" ? "dark" : "neutral" })) }, k.tel, k.mail,
      { actions: k.activo
        ? [{ t: "Editar", on: () => setModal({ t: "con", v: k }) }, { t: "Desactivar", on: () => setConfirm({ title: "Desactivar contacto", body: k.n + " dejará de recibir notificaciones y no aparecerá en los listados.", cta: "Desactivar", ok: () => mut((d) => { d.contacts.find((x) => x.id === k.id)!.activo = false; }, "Contacto desactivado") }) }]
        : [{ t: "Reactivar", on: () => mut((d) => { d.contacts.find((x) => x.id === k.id)!.activo = true; }, "Contacto reactivado") }] }],
  }));
  const resRows: Row[] = cs.map((s) => {
    const g = garOf(db, s), c = calOf(db, s);
    return { onClick: () => router.push(`/panel/sucursales/${s.id}`), cells: [{ t: s.n, b: true, sub: s.cod }, g.plan ? "Plan del cliente" : `Por instalación (${s.meses} m)`, fd(g.end), tg(g.st!), c.modo, c.v ? { t: fd(c.v), sub: c.st ?? "" } : "—"] };
  });
  const vis = db.visitas.filter((v) => inCs(v) && (vSuc === "Todas" || sucN(v.suc) === vSuc) && (vTec === "Todos" || v.tec === vTec) && (!vDesde || v.f >= vDesde) && (!vHasta || v.f <= vHasta)).sort((a, b) => b.f.localeCompare(a.f));
  const cotRows: Row[] = db.cotizaciones.filter(inCs).map((c) => ({ cells: [{ t: c.id, b: true }, fd(c.f), sucN(c.suc), c.desc, c.monto, tg(c.estado)] }));
  const desRows: Row[] = db.despachos.filter(inCs).map((c) => ({ cells: [{ t: c.id, b: true }, fd(c.f), sucN(c.suc), c.items, tg(c.estado)] }));
  const planRows: Row[] = db.plan.filter(inCs).sort((a, b) => a.f.localeCompare(b.f)).map((p) => ({ cells: [{ t: fd(p.f), b: true }, sucN(p.suc), p.trabajo, p.tec, tg(p.estado)] }));
  const tkRows: Row[] = db.tickets.filter(inCs).map((t) => ({ onClick: () => toast(`Abriendo ${t.id} en Sistema de tickets…`), cells: [{ t: t.id, b: true, sub: fd(t.f) }, { t: sucN(t.suc), sub: cliOf(sucOf(t.suc).cli).rs }, t.prob, tg(t.estado), tg(t.prio)] }));
  const nl = db.notif[cli.id] ?? [];
  const updN = (fn: (l: typeof nl) => void) => mut((d) => { d.notif[cli.id] ??= []; fn(d.notif[cli.id]); });
  const cands = [...db.contacts.filter((k) => k.cli === cli.id && k.activo).map((k) => ({ n: k.n, tipo: "Contacto", m: k.mail })), ...db.usuariosDmc.filter((u) => u.activo).map((u) => ({ n: u.n, tipo: "Usuario DMC", m: u.m }))].filter((c) => !nl.some((r) => r.m === c.m));
  const puRows: Row[] = db.usuariosPortal.filter((u) => u.cli === cli.id && (uInact || u.activo)).map((u) => ({
    dim: !u.activo,
    cells: [{ t: u.n, b: true, sub: u.m }, u.rol, { chips: [{ t: fmtAlc(u.alc, u.val), k: u.alc === "Todo el cliente" ? "dark" : "neutral" }] }, fd(u.ult), tg(u.activo ? "Activo" : "Inactivo"),
      { actions: u.activo ? [{ t: "Desactivar", on: () => setConfirm({ title: "Desactivar usuario", body: u.n + " no podrá ingresar al portal cliente.", cta: "Desactivar", ok: () => mut((d) => { d.usuariosPortal.find((x) => x.id === u.id)!.activo = false; }, "Usuario desactivado") }) }] : [{ t: "Reactivar", on: () => mut((d) => { d.usuariosPortal.find((x) => x.id === u.id)!.activo = true; }, "Usuario reactivado") }] }],
  }));


  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 pb-5">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2">
          <div className="kicker">{kicker}</div>
          <h1 className="!m-0">{cli.rs}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">RUT {cli.rutStr}</span>
            <Tag t={cli.activo ? "Activo" : "Inactivo"} size={11} />
            <Tag t={cli.plan ? "Plan de garantía" : "Sin plan de garantía"} k={cli.plan ? "dark" : "outline"} />
            <Tag t={cli.calTodas ? "Calibración remota: todas" : cli.calSuc.length ? `Calibración: ${cli.calSuc.length} sucursal(es)` : "Sin calibración remota"} k={cli.calTodas || cli.calSuc.length ? "neutral" : "outline"} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Stat items={stat} />
          <button className="btn btn-secondary" onClick={toggleActivo}><Power size={15} aria-hidden />{cli.activo ? "Desactivar cliente" : "Reactivar cliente"}</button>
        </div>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "facturacion" && (
        <>
          <div className="grid gap-x-10 gap-y-6 border-b-2 pb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))", borderColor: "var(--color-divider)" }}>
            <div><h3 className="!mb-[6px]">Datos de facturación</h3><p className="!m-0 text-[13px] text-neutral-700">Se usan para emitir DTE. La mayoría de los clientes son empresas.</p></div>
            <div className="grid max-w-[820px] gap-x-5 gap-y-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              <Field label="Tipo de cliente" span><Seg opts={["Empresa", "Persona natural"] as const} value={cli.tipo} onChange={(t) => up("tipo", t)} /></Field>
              <Field label={cli.tipo === "Empresa" ? "Razón social" : "Nombre completo"}><input className="input" value={cli.rs} onChange={(e) => up("rs", e.target.value)} maxLength={120} /></Field>
              <Field label="RUT">
                <input className="input tabular-nums" value={cli.rutStr} placeholder="76.123.456-7" aria-invalid={rc === false} onChange={(e) => up("rutStr", e.target.value)} maxLength={12} />
                {rc === true && <div className="mt-1 flex items-center gap-1 text-xs text-neutral-700">✓ Dígito verificador válido</div>}
                {rc === false && <div className="mt-1 text-xs" style={{ color: "var(--color-danger-700)" }}>El dígito verificador no corresponde a este RUT</div>}
              </Field>
              <Field label={cli.tipo === "Empresa" ? "Giro" : "Giro (opcional)"} span><input className="input" value={cli.giro} onChange={(e) => up("giro", e.target.value)} maxLength={160} /></Field>
              <Field label="Correo DTE"><input className="input" type="email" value={cli.dte} onChange={(e) => up("dte", e.target.value)} maxLength={120} /></Field>
              <Field label="Condición de pago"><Select value={cli.pago} onChange={(v) => up("pago", v)} opts={["Contado", "30 días", "45 días", "60 días", "90 días"]} /></Field>
              <div style={{ gridColumn: "1 / -1" }}><button className="btn btn-primary" onClick={() => (rc === false ? toast("Revisa el RUT: el dígito verificador no corresponde") : toast("Datos de facturación guardados"))}>Guardar cambios</button></div>
            </div>
          </div>
          <div className="grid gap-x-10 gap-y-6 pt-7" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))" }}>
            <div><h3 className="!mb-[6px]">Direcciones</h3><p className="!m-0 text-[13px] text-neutral-700">Cada dirección tiene un tipo. Solo una puede ser principal por tipo.</p></div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Check16 checked={dirInact} onChange={setDirInact} label="Mostrar inactivas" />
                <button className="btn btn-secondary" onClick={() => setModal({ t: "dir" })}><Plus size={15} aria-hidden />Agregar dirección</button>
              </div>
              <DataTable cols={[{ l: "Tipo", w: "130px" }, { l: "Dirección" }, { l: "Comuna / región", w: "minmax(0,.7fr)" }, { l: "Principal", w: "150px" }, { l: "", w: "190px" }]} rows={dirRows} emptyTitle="Sin direcciones" emptyText="Agrega al menos una dirección de facturación." />
            </div>
          </div>
        </>
      )}

      {tab === "contactos" && (
        <>
          <Heading title="Contactos" hint="Una persona puede tener varios cargos; cada cargo tiene su propio alcance." actions={<>
            <Check16 checked={conInact} onChange={setConInact} label="Mostrar inactivos" />
            <button className="btn btn-primary" onClick={() => setModal({ t: "con" })}><Plus size={15} aria-hidden />Nuevo contacto</button></>} />
          <DataTable cols={[{ l: "Persona", w: "minmax(0,.9fr)" }, { l: "Cargos y alcance", w: "minmax(0,1.6fr)" }, { l: "Teléfono", w: "140px" }, { l: "Correo", w: "minmax(0,1fr)" }, { l: "", w: "170px" }]} rows={conRows} emptyTitle="Sin contactos" emptyText="Este cliente aún no tiene contactos registrados." />
        </>
      )}

      {tab === "zonas" && (
        <>
          <Heading title="Zonas del cliente" hint="Agrupaciones propias de regiones. Se usan como alcance de contactos y usuarios del portal. Una región pertenece a una sola zona." actions={<button className="btn btn-primary" onClick={() => setModal({ t: "zona", idx: -1 })}><Plus size={15} aria-hidden />Nueva zona</button>} />
          {cli.zonas.length > 0 ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(280px,100%), 1fr))" }}>
              {cli.zonas.map((z, i) => (
                <div key={z.n} className="flex flex-col gap-3 border-t-2 border-text bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-lg font-extrabold">{z.n}</div><div className="text-xs text-neutral-700">{z.regs.length} regiones · {cs.filter((s) => z.regs.includes(s.reg)).length} sucursales</div></div>
                    <button className="btn btn-ghost" onClick={() => setModal({ t: "zona", idx: i })}>Editar</button>
                  </div>
                  <div className="flex flex-wrap gap-1">{z.regs.map((r) => (<span key={r} className="border border-neutral-300 bg-bg px-2 py-[2px] text-[11px]">{r}</span>))}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-3 border-b border-t-2 border-b-neutral-300 border-t-text py-7">
              <MapIcon size={24} className="text-neutral-500" aria-hidden />
              <div><div className="font-extrabold">Este cliente no tiene zonas</div><div className="text-[13px] text-neutral-700">Los alcances se pueden definir por región, marca o sucursal mientras tanto.</div></div>
            </div>
          )}
          {sinZona.length > 0 && cli.zonas.length > 0 && <div className="mt-5 text-[13px] text-neutral-700"><strong className="text-text">Regiones sin zona:</strong> {sinZona.join(" · ")}</div>}
        </>
      )}

      {tab === "marcas" && (
        <>
          <Heading title="Marcas y sucursales" hint="Cliente → Marca → Sucursal → Ubicación. Siempre existe al menos una marca." actions={<>
            <button className="btn btn-secondary" onClick={() => ask("Nueva marca", "Nombre de la marca", (n) => mut((d) => { d.clients.find((c) => c.id === cli.id)!.marcas.push(n); }, `Marca “${n}” creada`))}><Plus size={15} aria-hidden />Nueva marca</button>
            <button className="btn btn-primary" onClick={() => setModal({ t: "suc" })}><Plus size={15} aria-hidden />Nueva sucursal</button></>} />
          <div className="border-t-2 border-text">
            <div className="flex items-center gap-3 border-b-2 px-2 py-[14px]" style={{ borderColor: "var(--color-divider)" }}>
              <Building2 size={18} aria-hidden /><span className="text-base font-extrabold">{cli.rs}</span>
              <span className="text-xs text-neutral-700">{cli.marcas.length} marcas · {cs.length} sucursales · {new Set(cs.filter((s) => s.mall).map((s) => s.mall)).size} malls</span>
            </div>
            {cli.marcas.map((m) => {
              const ss = cs.filter((s) => s.marca === m), o = !!exp[m];
              return (
                <div key={m} className="border-b border-neutral-300">
                  <button aria-expanded={o} onClick={() => setExp((e) => ({ ...e, [m]: !e[m] }))} className="hover-surface flex w-full cursor-pointer items-center gap-[10px] border-0 bg-transparent py-3 pl-7 pr-2 text-left text-inherit">
                    {o ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                    <span style={{ color: "var(--color-accent-700)" }}>●</span><span className="font-bold">{m}</span>
                    <span className="text-xs text-neutral-700">{ss.length} {ss.length === 1 ? "sucursal" : "sucursales"}</span>
                  </button>
                  {o && ss.map((s) => (
                    <div key={s.id} role="link" tabIndex={0} onClick={() => router.push(`/panel/sucursales/${s.id}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/panel/sucursales/${s.id}`); }}
                      className="hover-surface grid cursor-pointer items-center gap-3 border-t border-neutral-200 py-[10px] pl-[76px] pr-2" style={{ gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,.8fr) 100px 24px" }}>
                      <div><div className="flex items-center gap-2 font-semibold"><Store size={15} className="text-neutral-600" aria-hidden />{s.n}</div><div className="pl-[22px] text-xs text-neutral-700">{s.cod}</div></div>
                      <div className="flex items-center gap-2 text-[13px]">{s.mall ? <ShoppingBag size={15} className="text-neutral-600" aria-hidden /> : <MapPin size={15} className="text-neutral-600" aria-hidden />}<span><span className="text-[11px] uppercase tracking-[.06em] text-neutral-700">{s.mall ? "Mall" : "Calle"}</span> {ubic(s)}</span></div>
                      <div className="text-[13px] text-neutral-700">{s.com}, {s.reg}</div>
                      <div className="text-xs text-neutral-700">{(db.inst[s.id] ?? []).length} accesos</div>
                      <ChevronRight size={16} className="text-neutral-600" aria-hidden />
                    </div>
                  ))}
                  {o && ss.length === 0 && <div className="py-[10px] pb-[14px] pl-[76px] pr-2 text-[13px] text-neutral-700">Esta marca aún no tiene sucursales.</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "garantia" && (
        <>
          <div className="mb-8 grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(340px,100%), 1fr))" }}>
            <div className="flex flex-col gap-4 border-t-2 border-text bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div><div className="kicker">Nivel cliente</div><h3 className="!mb-0 !mt-1">Plan de garantía</h3></div>
                <Switch on={cli.plan} label="Plan de garantía" onChange={() => mut((d) => { const c = d.clients.find((x) => x.id === cli.id)!; c.plan = !c.plan; }, cli.plan ? "Plan de garantía desactivado" : "Plan de garantía activado: todas las sucursales quedan en garantía")} />
              </div>
              {cli.plan ? (
                <>
                  <div className="text-sm">Todas las sucursales del cliente ({cs.length}) quedan en garantía mientras el plan esté vigente.</div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                    <Field label="Inicio del plan"><input className="input" type="date" value={cli.planDesde} onChange={(e) => up("planDesde", e.target.value)} /></Field>
                    <Field label="Duración (meses)"><input className="input" type="number" min={1} value={cli.planMeses} onChange={(e) => up("planMeses", Math.max(1, +e.target.value))} /></Field>
                    <Field label="Fin calculado"><div className="flex min-h-9 items-center gap-2 font-bold">{fd(pe)}<Tag t={stOf(pe)!} /></div></Field>
                  </div>
                </>
              ) : <div className="text-sm text-neutral-700">Sin plan. Cada sucursal usa su propia garantía por instalación (12 meses por defecto, editable en la ficha de la sucursal).</div>}
            </div>
            <div className="flex flex-col gap-4 border-t-2 border-text bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div><div className="kicker">Anual</div><h3 className="!mb-0 !mt-1">Calibración remota</h3></div>
                <div className="flex items-center gap-[10px]"><span className="text-xs text-neutral-700">Todas las sucursales</span><Switch on={cli.calTodas} label="Calibración remota para todas" onChange={() => mut((d) => { const c = d.clients.find((x) => x.id === cli.id)!; c.calTodas = !c.calTodas; })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vencimiento"><input className="input" type="date" value={cli.calVence} onChange={(e) => up("calVence", e.target.value)} /></Field>
                <Field label="Estado"><div className="flex min-h-9 items-center"><Tag t={cli.calTodas || cli.calSuc.length ? stOf(cli.calVence)! : "No contratada"} /></div></Field>
              </div>
              {cli.calTodas ? <div className="text-sm">Aplica a las {cs.length} sucursales del cliente.</div> : (
                <div className="flex flex-col gap-[6px]">
                  <div className="flex justify-between text-xs text-neutral-700"><span>Sucursales específicas</span><span>{cli.calSuc.length} de {cs.length} sucursales seleccionadas</span></div>
                  <div className="flex max-h-[220px] flex-col overflow-auto border-t" style={{ borderColor: "var(--color-divider)" }}>
                    {cs.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-[10px] border-b border-neutral-300 px-1 py-2 text-sm">
                        <input type="checkbox" className="chk" checked={cli.calSuc.includes(s.id)} onChange={() => mut((d) => { const c = d.clients.find((x) => x.id === cli.id)!; c.calSuc = c.calSuc.includes(s.id) ? c.calSuc.filter((x) => x !== s.id) : [...c.calSuc, s.id]; })} />
                        <span className="flex-1">{s.n}</span><span className="text-xs text-neutral-700">{s.cod} · {s.com}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <h3 className="!mb-3">Cobertura por sucursal</h3>
          <DataTable cols={[{ l: "Sucursal" }, { l: "Garantía", w: "minmax(0,.9fr)" }, { l: "Fin garantía", w: "110px" }, { l: "Estado", w: "100px" }, { l: "Calibración remota", w: "minmax(0,1fr)" }, { l: "Vence", w: "110px" }]} rows={resRows} emptyTitle="Sin sucursales" />
        </>
      )}

      {tab === "visitas" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3"><SourceBadge name="Sistema de técnicos" onOpen={ext("Sistema de técnicos")} /><span className="text-xs text-neutral-700">Solo lectura</span></div>
          <div className="mb-5 grid items-end gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Field label="Sucursal"><Select value={vSuc} onChange={setVSuc} opts={["Todas", ...cs.map((s) => s.n)]} /></Field>
            <Field label="Desde"><input className="input" type="date" value={vDesde} onChange={(e) => setVDesde(e.target.value)} /></Field>
            <Field label="Hasta"><input className="input" type="date" value={vHasta} onChange={(e) => setVHasta(e.target.value)} /></Field>
            <Field label="Técnico"><Select value={vTec} onChange={setVTec} opts={["Todos", ...tecs]} /></Field>
            <div className="flex min-h-9 items-center text-[13px] text-neutral-700">{vis.length} visitas</div>
          </div>
          <div className="border-t-2 border-text">
            {demo === "loading" ? <div className="flex flex-col gap-[14px] py-5">{[0, 1, 2].map((i) => (<div key={i} className="h-14 bg-neutral-200" style={{ animation: "dmcPulse 1.2s infinite" }} />))}</div>
              : vis.length === 0 ? (
                <div className="flex gap-3 py-7"><CalendarX size={24} className="text-neutral-500" aria-hidden /><div><div className="font-extrabold">Sin visitas en este rango</div><div className="text-[13px] text-neutral-700">Ajusta la sucursal, el técnico o las fechas.</div></div></div>
              ) : vis.map((v) => (
                <div key={v.id} className="grid gap-4 border-b border-neutral-300 py-4" style={{ gridTemplateColumns: "90px 20px minmax(0,1fr) auto" }}>
                  <div><div className="text-[30px] font-extrabold leading-none">{v.f.slice(8)}</div><div className="text-[11px] tracking-[.08em] text-neutral-700">{MES_UP[+v.f.slice(5, 7) - 1]} {v.f.slice(0, 4)}</div></div>
                  <div className="flex justify-center"><div className="relative w-[2px] bg-neutral-300"><div className="absolute -left-[5px] top-[6px] h-3 w-3" style={{ background: "var(--color-accent)" }} /></div></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-extrabold">{sucN(v.suc)}</span><span className="bg-neutral-200 px-2 py-[2px] text-[11px]">{v.tipo}</span></div>
                    <div className="text-sm">{v.res}</div>
                    <div className="text-xs text-neutral-700">{v.id} · Técnico: {v.tec}</div>
                  </div>
                  <a href={`/api/visita/acta/${v.id}`} target="_blank" rel="noopener" className="whitespace-nowrap text-[13px] font-semibold">Ver informe</a>
                </div>
              ))}
          </div>
        </>
      )}

      {tab === "cotizaciones" && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Heading title="Cotizaciones" actions={<SourceBadge name="Sistema de cotizaciones" onOpen={ext("Sistema de cotizaciones")} />} />
            <DataTable cols={[{ l: "N°", w: "100px" }, { l: "Fecha", w: "100px" }, { l: "Sucursal" }, { l: "Detalle" }, { l: "Monto", w: "120px" }, { l: "Estado", w: "110px" }]} rows={cotRows} emptyTitle="Sin cotizaciones" />
          </div>
          <div className="flex flex-col gap-3">
            <Heading title="Despachos" actions={<SourceBadge name="Bodega" onOpen={ext("Bodega")} />} />
            <DataTable cols={[{ l: "N°", w: "100px" }, { l: "Fecha", w: "100px" }, { l: "Sucursal" }, { l: "Contenido" }, { l: "Estado", w: "110px" }]} rows={desRows} emptyTitle="Sin despachos" />
          </div>
        </div>
      )}

      {tab === "planificacion" && (
        <>
          <Heading title="Próximos trabajos" actions={<SourceBadge name="Sistema de planificación" onOpen={ext("Sistema de planificación")} />} />
          <DataTable cols={[{ l: "Fecha", w: "110px" }, { l: "Sucursal" }, { l: "Trabajo" }, { l: "Técnico", w: "160px" }, { l: "Estado", w: "120px" }]} rows={planRows} emptyTitle="Sin trabajos planificados" />
        </>
      )}

      {tab === "tickets" && (
        <>
          <Heading title="Tickets por sucursal" actions={<SourceBadge name="Sistema de tickets" onOpen={ext("Sistema de tickets")} />} />
          <DataTable cols={TK_COLS} rows={tkRows} emptyTitle="Sin tickets" />
        </>
      )}

      {tab === "notificaciones" && (
        <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div><h3 className="!mb-1">Notificaciones por correo</h3><p className="!m-0 text-[13px] text-neutral-700">Elige quién recibe cada evento: contactos del cliente o usuarios DMC.</p></div>
            <div className="flex items-end gap-2">
              <Field label="Agregar destinatario" className="min-w-[300px]">
                <select className="input" value="" onChange={(e) => { const c = cands.find((x) => x.m === e.target.value); if (c) updN((L) => { L.push({ ...c, ev: { tn: true, tc: true, vr: false, gv: true, cv: true } }); }); }}>
                  <option value="">Seleccionar contacto o usuario DMC…</option>
                  {cands.map((c) => (<option key={c.m} value={c.m}>{c.n} — {c.tipo}</option>))}
                </select>
              </Field>
              <button className="btn btn-primary" onClick={() => toast("Configuración de notificaciones guardada")}>Guardar</button>
            </div>
          </div>
          <div className="overflow-x-auto border-t-2 border-text">
            <div className="grid border-b-2" style={{ gridTemplateColumns: "minmax(160px,1.6fr) repeat(5, minmax(64px,1fr)) 64px", borderColor: "var(--color-divider)", minWidth: 640 }}>
              <div className="th">Destinatario</div>{EVS.map((e) => (<div key={e[0]} className="th">{e[1]}</div>))}<div />
            </div>
            {nl.map((r, i) => (
              <div key={r.m} className="grid items-center border-b border-neutral-300" style={{ gridTemplateColumns: "minmax(160px,1.6fr) repeat(5, minmax(64px,1fr)) 64px", minWidth: 640 }}>
                <div className="px-2 py-[10px]"><div className="flex items-center gap-2"><span className="font-bold">{r.n}</span><Tag t={r.tipo} k={r.tipo === "Usuario DMC" ? "dark" : "neutral"} size={10} /></div><div className="text-xs text-neutral-700">{r.m}</div></div>
                {EVS.map(([k, l]) => (<div key={k} className="px-2 py-[10px]"><input type="checkbox" className="chk !h-[18px] !w-[18px]" aria-label={`${r.n}: ${l}`} checked={!!r.ev[k]} onChange={() => updN((L) => { L[i].ev[k] = !L[i].ev[k]; })} /></div>))}
                <div className="flex justify-end pr-1"><button className="btn btn-ghost !text-[13px]" onClick={() => updN((L) => { L.splice(i, 1); })}>Quitar</button></div>
              </div>
            ))}
            {nl.length === 0 && (
              <div className="flex gap-3 px-2 py-7"><BellOff size={24} className="text-neutral-500" aria-hidden /><div><div className="font-extrabold">Nadie recibe notificaciones de este cliente</div><div className="text-[13px] text-neutral-700">Agrega un contacto o usuario DMC desde el desplegable.</div></div></div>
            )}
          </div>
        </>
      )}

      {tab === "usuarios" && (
        <>
          <Heading title="Usuarios del portal cliente" hint="El cliente crea sus usuarios desde su portal. Desde DMC se pueden revisar y desactivar." actions={<Check16 checked={uInact} onChange={setUInact} label="Mostrar inactivos" />} />
          <DataTable cols={[{ l: "Usuario" }, { l: "Rol", w: "170px" }, { l: "Alcance", w: "minmax(0,.9fr)" }, { l: "Último acceso", w: "120px" }, { l: "Estado", w: "90px" }, { l: "", w: "110px" }]} rows={puRows} emptyTitle="Sin usuarios del portal" emptyText="El cliente aún no crea usuarios en su portal." />
        </>
      )}

      {modal?.t === "dir" && <DireccionModal cli={cli} init={modal.v} onClose={() => setModal(null)} />}
      {modal?.t === "con" && <ContactoModal cli={cli} init={modal.v} onClose={() => setModal(null)} />}
      {modal?.t === "zona" && <ZonaModal cli={cli} idx={modal.idx} onClose={() => setModal(null)} />}
      {modal?.t === "suc" && <NewSucursalModal cli={cli} onClose={() => setModal(null)} />}
      {confirm && <Confirm title={confirm.title} body={confirm.body} cta={confirm.cta} onOk={confirm.ok} onClose={() => setConfirm(null)} />}
    </>
  );
}
void kindOf; void PageHead;
