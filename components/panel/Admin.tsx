"use client";

import { Info, Plus, UserPlus, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { garOf, calOf } from "@/lib/calc";
import { ACC, MOD_IN, MOD_PO, type Catalogos } from "@/lib/data";
import { fd, kindOf, TODAY_ISO } from "@/lib/format";
import { useLookups, useStore } from "@/components/store";
import { Check16, Confirm, DataTable, Field, Heading, PageHead, Seg, Select, Tag, useToast, type Row } from "@/components/ui";
import { tg } from "./Lists";
import { RolesPortal, UsuariosPortal } from "./UsuariosPortal";

/* ───────── Catálogos ───────── */
const CATS: [keyof Catalogos, string, string][] = [
  ["cargos", "Cargos", "cargo"], ["tiposDir", "Tipos de dirección", "tipo de dirección"], ["modAntena", "Modelos de antena", "modelo de antena"],
  ["modContador", "Modelos de contador", "modelo de contador"], ["tiposDisp", "Tipos de dispositivo", "tipo de dispositivo"], ["modOtro", "Modelos de alarmas y otros", "modelo"],
];
export function Catalogos() {
  const { db, mut, ask } = useStore();
  const [sel, setSel] = useState<keyof Catalogos>("cargos");
  const [inact, setInact] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; ok: () => void }>(null);
  const cat = CATS.find((c) => c[0] === sel)!;
  const usage = (n: string) => sel === "cargos" ? db.contacts.filter((k) => k.cargos.some((c) => c.cargo === n)).length
    : sel === "tiposDir" ? db.clients.reduce((s, c) => s + c.dirs.filter((d) => d.tipo === n).length, 0)
    : Object.values(db.inst).flat().flatMap((a) => a.eq).filter((e) => e.modelo === n || e.tipo === n).length;
  const upd = (i: number, fn: (o: { n: string; activo: boolean }) => void, msg: string) => () => mut((d) => fn(d.cat[sel][i]), msg);
  const rows: Row[] = db.cat[sel].map((x, i) => ({ x, i })).filter((o) => inact || o.x.activo).map(({ x, i }) => ({
    dim: !x.activo,
    cells: [{ t: x.n, b: true }, `${usage(x.n)} registros`, tg(x.activo ? "Activo" : "Inactivo"),
      { actions: x.activo
        ? [{ t: "Editar", on: () => ask(`Editar ${cat[2]}`, "Nombre", (v) => mut((d) => { d.cat[sel][i].n = v; }, "Catálogo actualizado"), x.n) },
           { t: "Desactivar", on: () => setConfirm({ title: `Desactivar “${x.n}”`, body: "Dejará de aparecer en los desplegables. Los registros que ya lo usan lo conservan.", ok: upd(i, (o) => { o.activo = false; }, "Elemento desactivado") }) }]
        : [{ t: "Reactivar", on: upd(i, (o) => { o.activo = true; }, "Elemento reactivado") }] }],
  }));
  return (
    <>
      <PageHead kicker="Listas editables" title="Catálogos" />
      <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%), 1fr))" }}>
        <div className="flex flex-col border-t-2 border-text">
          {CATS.map(([id, l]) => (
            <button key={id} onClick={() => setSel(id)} aria-current={id === sel} className="hover-surface flex cursor-pointer items-center justify-between border-0 border-b border-neutral-300 px-3 py-3 text-left text-sm text-inherit"
              style={{ background: id === sel ? "var(--color-surface)" : "transparent", fontWeight: id === sel ? 800 : 600 }}>
              <span className="flex items-center gap-2"><span aria-hidden className="h-2 w-2" style={{ background: id === sel ? "var(--color-accent)" : "transparent" }} />{l}</span><span className="text-xs font-normal text-neutral-700">{db.cat[id].filter((x) => x.activo).length}</span>
            </button>
          ))}
          <p className="mt-4 text-xs text-neutral-700">Las zonas son propias de cada cliente y se editan en su ficha. Todos los catálogos también se pueden ampliar desde los formularios con “+ Agregar”.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="!m-0 !text-[22px]">{cat[1]}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Check16 checked={inact} onChange={setInact} label="Mostrar inactivos" />
              <button className="btn btn-primary" onClick={() => ask(`Agregar ${cat[2]}`, "Nombre", (n) => mut((d) => { d.cat[sel].push({ n, activo: true }); }, `“${n}” agregado`))}><Plus size={15} aria-hidden />Agregar</button>
            </div>
          </div>
          <DataTable cols={[{ l: "Nombre" }, { l: "En uso", w: "110px" }, { l: "Estado", w: "100px" }, { l: "", w: "180px" }]} rows={rows} emptyTitle="Catálogo vacío" />
        </div>
      </div>
      {confirm && <Confirm title={confirm.title} body={confirm.body} cta="Desactivar" onOk={confirm.ok} onClose={() => setConfirm(null)} />}
    </>
  );
}

/* ───────── Garantías y calibraciones ───────── */
export function Garantias() {
  const { db } = useStore();
  const { cliOf } = useLookups();
  const router = useRouter();
  const sp = useSearchParams();
  const [seg, setSeg] = useState<"Garantías" | "Calibraciones">(sp.get("seg") === "Calibraciones" ? "Calibraciones" : "Garantías");
  const [est, setEst] = useState<"Todos" | "Vigente" | "Por vencer" | "Vencida">("Todos");
  const act = db.sucursales.filter((s) => s.activo && cliOf(s.cli).activo);
  const g = act.map((s) => ({ s, g: garOf(db, s), c: calOf(db, s) }));
  const open = (id: string) => () => router.push(`/panel/sucursales/${id}`);
  const rows: Row[] = seg === "Garantías"
    ? g.filter((o) => est === "Todos" || o.g.st === est).sort((a, b) => a.g.end.localeCompare(b.g.end)).map(({ s, g: x }) => ({ onClick: open(s.id), cells: [{ t: s.n, b: true, sub: s.cod }, cliOf(s.cli).rs, x.plan ? tg("Plan del cliente", "dark") : "Por instalación", fd(x.ini), { t: fd(x.end), sub: `${x.m} meses` }, tg(x.st!)] }))
    : g.filter((o) => o.c.v && (est === "Todos" || o.c.st === est)).sort((a, b) => a.c.v!.localeCompare(b.c.v!)).map(({ s, c }) => ({ onClick: open(s.id), cells: [{ t: s.n, b: true, sub: s.cod }, cliOf(s.cli).rs, c.modo, fd(c.v), tg(c.st!)] }));
  const cols = seg === "Garantías"
    ? [{ l: "Sucursal" }, { l: "Cliente" }, { l: "Cobertura", w: "170px" }, { l: "Inicio", w: "110px" }, { l: "Fin", w: "110px" }, { l: "Estado", w: "110px" }]
    : [{ l: "Sucursal" }, { l: "Cliente" }, { l: "Modalidad" }, { l: "Vencimiento", w: "120px" }, { l: "Estado", w: "110px" }];
  return (
    <>
      <PageHead kicker="Vencimientos" title="Garantías y Calibraciones" rule actions={<Seg opts={["Garantías", "Calibraciones"] as const} value={seg} onChange={setSeg} />} />
      <div className="mb-6 grid grid-cols-3 border-b-2" style={{ borderColor: "var(--color-divider)" }}>
        {(["Vigente", "Por vencer", "Vencida"] as const).map((t) => {
          const n = g.filter((o) => (seg === "Garantías" ? o.g.st : o.c.st) === t).length;
          return (<div key={t} className="border-r border-neutral-300 py-[18px]"><div className="text-xs font-semibold text-neutral-700">{t}</div><div className="text-[40px] font-extrabold leading-[1.1]" style={{ color: t === "Vigente" ? undefined : "var(--color-danger-700)" }}>{n}</div></div>);
        })}
      </div>
      <div className="mb-4 flex items-center gap-3"><span className="text-[13px] text-neutral-700">Estado</span><Seg opts={["Todos", "Vigente", "Por vencer", "Vencida"] as const} value={est} onChange={setEst} /></div>
      <DataTable cols={cols} rows={rows} emptyTitle="Nada que mostrar" emptyText="No hay sucursales con este estado." />
    </>
  );
}

/* ───────── Notificaciones ───────── */
const EVENTOS = ["Ticket nuevo", "Ticket cerrado", "Visita realizada", "Garantía por vencer", "Calibración por vencer"];
export function Notificaciones() {
  const { db } = useStore();
  const { cliOf } = useLookups();
  const router = useRouter();
  const [ev, setEv] = useState("Todos");
  const rows: Row[] = db.envios.filter((e) => ev === "Todos" || e.ev === ev).map((e) => ({ cells: [{ t: e.f, b: true }, tg(e.ev, "neutral"), cliOf(e.cli).rs, e.dest, tg(e.estado)] }));
  return (
    <>
      <PageHead kicker="Correos automáticos" title="Notificaciones" />
      <div className="grid gap-x-10 gap-y-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px,100%), 1fr))" }}>
        <div className="flex flex-col">
          <h3 className="!mb-[10px] !text-lg">Configuración por cliente</h3>
          <div className="border-t-2 border-text">
            {db.clients.filter((c) => c.activo).map((c) => {
              const L = db.notif[c.id] ?? [];
              return (
                <button key={c.id} onClick={() => router.push(`/panel/clientes/${c.id}?tab=notificaciones`)} className="hover-surface flex w-full cursor-pointer justify-between gap-2 border-0 border-b border-neutral-300 bg-transparent px-1 py-[11px] text-left text-sm text-inherit">
                  <span className="font-semibold">{c.rs}</span>
                  <span className="whitespace-nowrap text-xs" style={{ color: L.length ? "var(--color-text)" : "var(--color-danger-700)" }}>{L.length ? `${L.length} destinatarios` : "Sin configurar"}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3"><h3 className="!m-0 !text-lg">Registro de envíos</h3><Field label="Evento" className="min-w-[240px]"><Select value={ev} onChange={setEv} opts={["Todos", ...EVENTOS]} /></Field></div>
          <DataTable cols={[{ l: "Fecha", w: "150px" }, { l: "Evento", w: "190px" }, { l: "Cliente" }, { l: "Destinatario" }, { l: "Estado", w: "100px" }]} rows={rows} emptyTitle="Sin envíos" />
        </div>
      </div>
    </>
  );
}

/* ───────── Usuarios y permisos ───────── */
export function Usuarios() {
  const { db, mut, ask, perms, roles, setPerms, setRoles } = useStore();
  const toast = useToast();
  const [scope, setScope] = useState<"Panel interno DMC" | "Portal cliente">("Panel interno DMC");
  const [pRol, setPRol] = useState("r1");
  const [inact, setInact] = useState(false);
  const isIn = scope === "Panel interno DMC";
  const list = isIn ? roles.rolesIn : roles.rolesPo, mods = isIn ? MOD_IN : MOD_PO;
  const rid = list.some((r) => r.id === pRol) ? pRol : list[0].id, rol = list.find((r) => r.id === rid)!;
  const pr = perms[rid];
  const tog = (m: string, a: string) => () => setPerms((p) => { p[rid][m][a] = !p[rid][m][a]; });
  return (
    <>
      <PageHead kicker="Acceso y roles" title="Usuarios y Permisos" actions={<Seg opts={["Panel interno DMC", "Portal cliente"] as const} value={scope} onChange={(t) => { setScope(t); setPRol(t === "Panel interno DMC" ? "r1" : "q1"); }} />} />
      {!isIn && <div className="mb-5 flex gap-[10px] bg-surface px-[14px] py-3 text-sm"><Info size={16} className="mt-[3px] flex-none" aria-hidden /><span>Roles predefinidos por DMC para el <strong>portal cliente</strong>: administrador, jefe de zona, jefe de locales y encargado de local. El cliente asigna cada rol con su alcance (todo el cliente, una zona, varias sucursales o una sucursal).</span></div>}
      {isIn ? (
        <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%), 1fr))" }}>
          <div className="flex flex-col">
            <div className="mb-[10px] flex items-center justify-between"><h3 className="!m-0 !text-lg">Roles</h3>
              <button className="btn btn-ghost" onClick={() => ask(isIn ? "Nuevo rol interno" : "Nuevo rol del portal", "Nombre del rol", (n) => setRoles((r, p) => { const id = (isIn ? "r" : "q") + Date.now(); (isIn ? r.rolesIn : r.rolesPo).push({ id, n }); p[id] = Object.fromEntries(mods.map((m) => [m, Object.fromEntries(ACC.map((a) => [a, a === "Ver"]))])); setPRol(id); }))}><Plus size={15} aria-hidden />Nuevo rol</button></div>
            <div className="border-t-2 border-text">
              {list.map((r) => {
                const cnt = isIn ? db.usuariosDmc.filter((u) => u.rol === r.id && u.activo).length : db.usuariosPortal.filter((u) => u.rol === r.n && u.activo).length;
                return (
                  <button key={r.id} onClick={() => setPRol(r.id)} aria-current={r.id === rid} className="hover-surface flex w-full cursor-pointer flex-col gap-[2px] border-0 border-b border-neutral-300 px-3 py-[11px] text-left text-inherit"
                    style={{ background: r.id === rid ? "var(--color-surface)" : "transparent" }}>
                    <span className="flex items-center gap-2 text-sm" style={{ fontWeight: r.id === rid ? 800 : 600 }}><span aria-hidden className="h-2 w-2" style={{ background: r.id === rid ? "var(--color-accent)" : "transparent" }} />{r.n}</span><span className="text-xs text-neutral-700">{cnt} usuarios</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="!m-0 !text-[22px]">Permisos de “{rol.n}”</h3><button className="btn btn-primary" onClick={() => toast(`Permisos de “${rol.n}” guardados`)}>Guardar permisos</button></div>
            <div className="overflow-x-auto border-t-2 border-text">
              <div className="grid border-b-2" style={{ gridTemplateColumns: "minmax(160px,1.6fr) repeat(5, minmax(56px,1fr)) 60px", borderColor: "var(--color-divider)", minWidth: 560 }}>
                <div className="th">Módulo</div>{ACC.map((a) => (<div key={a} className="th">{a}</div>))}<div />
              </div>
              {mods.map((m) => (
                <div key={m} className="hover-row grid items-center border-b border-neutral-300" style={{ gridTemplateColumns: "minmax(160px,1.6fr) repeat(5, minmax(56px,1fr)) 60px", minWidth: 560 }}>
                  <div className="px-2 py-[10px] text-sm font-bold">{m}</div>
                  {ACC.map((a) => (<div key={a} className="px-2 py-[10px]"><input type="checkbox" className="chk !h-[18px] !w-[18px]" aria-label={`${m}: ${a}`} checked={!!pr?.[m]?.[a]} onChange={tog(m, a)} /></div>))}
                  <div className="flex justify-end"><button className="btn btn-ghost !text-xs" onClick={() => setPerms((p) => { const v = !ACC.every((a) => p[rid][m][a]); ACC.forEach((a) => { p[rid][m][a] = v; }); })}>Todo</button></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <RolesPortal />
          <UsuariosPortal titulo="Usuarios del portal (todos los clientes)" hint="Cada cliente administra sus usuarios; aquí el equipo DMC puede revisar su rol y alcance, editarlos o suspenderlos. Para invitar a alguien nuevo, abre la ficha del cliente." />
        </div>
      )}
      {isIn && (
        <div className="mt-10 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="!m-0 !text-[22px]">Usuarios DMC</h3>
            <div className="flex flex-wrap items-center gap-3"><Check16 checked={inact} onChange={setInact} label="Mostrar inactivos" />
              <button className="btn btn-primary" onClick={() => ask("Invitar usuario DMC", "Correo @grupodmc.cl", (m) => { if (!/^[^\s@]+@grupodmc\.cl$/i.test(m)) return toast("Usa un correo @grupodmc.cl"); mut((d) => { d.usuariosDmc.push({ id: "u" + Date.now(), n: m.split("@")[0], m, rol: "r3", activo: true, ult: TODAY_ISO }); }, `Invitación enviada a ${m}`); })}><UserPlus size={15} aria-hidden />Invitar usuario</button></div></div>
          <div className="overflow-x-auto border-t-2 border-text">
            <div className="grid border-b-2" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(160px,1fr) 100px 90px 100px", borderColor: "var(--color-divider)", minWidth: 640 }}>
              <div className="th">Usuario</div><div className="th">Rol</div><div className="th">Último acceso</div><div className="th">Estado</div><div />
            </div>
            {db.usuariosDmc.filter((u) => inact || u.activo).map((u) => (
              <div key={u.id} className="grid items-center border-b border-neutral-300" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(160px,1fr) 100px 90px 100px", minWidth: 640, opacity: u.activo ? 1 : 0.55 }}>
                <div className="px-2 py-[10px]"><div className="font-bold">{u.n}</div><div className="text-xs text-neutral-700">{u.m}</div></div>
                <div className="px-2 py-[6px]"><Select label={`Rol de ${u.n}`} value={u.rol} onChange={(v) => mut((d) => { d.usuariosDmc.find((x) => x.id === u.id)!.rol = v; }, `Rol asignado a ${u.n}`)} opts={roles.rolesIn.map((r) => ({ v: r.id, l: r.n }))} /></div>
                <div className="px-2 text-[13px]">{fd(u.ult)}</div>
                <div className="px-2"><Tag t={u.activo ? "Activo" : "Inactivo"} /></div>
                <div className="flex justify-end pr-1"><button className="btn btn-ghost !text-[13px]" onClick={() => mut((d) => { const x = d.usuariosDmc.find((z) => z.id === u.id)!; x.activo = !x.activo; }, u.activo ? "Usuario desactivado" : "Usuario reactivado")}>{u.activo ? "Desactivar" : "Reactivar"}</button></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ───────── Auditoría ───────── */
export function Auditoria() {
  const { db } = useStore();
  const toast = useToast();
  const [ent, setEnt] = useState("Todas"), [usr, setUsr] = useState("Todos"), [desde, setDesde] = useState(""), [hasta, setHasta] = useState("");
  const rows: Row[] = db.audit.filter((a) => (ent === "Todas" || a.ent === ent) && (usr === "Todos" || a.u === usr) && (!desde || a.f.slice(0, 10) >= desde) && (!hasta || a.f.slice(0, 10) <= hasta))
    .map((a) => ({ cells: [{ t: a.f, b: true }, a.u, tg(a.ent, "neutral"), a.reg, tg(a.acc, a.acc === "Desactivar" ? "accent" : "outline"), a.det] }));
  return (
    <>
      <PageHead kicker="Registro global de cambios" title="Auditoría" actions={<button className="btn btn-secondary" onClick={() => toast("Exportando auditoria.csv…")}><Download size={16} aria-hidden />Exportar CSV</button>} />
      <div className="mb-5 grid max-w-[960px] items-end gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <Field label="Entidad"><Select value={ent} onChange={setEnt} opts={["Todas", ...new Set(db.audit.map((a) => a.ent))]} /></Field>
        <Field label="Usuario"><Select value={usr} onChange={setUsr} opts={["Todos", ...new Set(db.audit.map((a) => a.u))]} /></Field>
        <Field label="Desde"><input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="Hasta"><input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Field>
      </div>
      <DataTable cols={[{ l: "Fecha y hora", w: "150px" }, { l: "Usuario", w: "160px" }, { l: "Entidad", w: "110px" }, { l: "Registro" }, { l: "Acción", w: "110px" }, { l: "Detalle", w: "minmax(0,1.3fr)" }]} rows={rows} emptyTitle="Sin movimientos" emptyText="No hay cambios registrados con estos filtros." />
    </>
  );
}
void Heading; void kindOf;
