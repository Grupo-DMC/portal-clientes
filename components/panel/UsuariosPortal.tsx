"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import type { UsuarioPortal } from "@/lib/data";
import { fd } from "@/lib/format";
import {
  ALCANCE_LABEL, ESTADOS_USUARIO, PERMISOS, ROL_IDS, ROLES, alcanceLabel, normUsuario, zonasPortal,
  type PermisoId, type RolPortal,
} from "@/lib/portal";
import { usuarioPortalSchema } from "@/lib/schemas";
import { useStore } from "@/components/store";
import { Check16, Confirm, DataTable, Field, Heading, Modal, ModalActions, Select, type Row } from "@/components/ui";
import { logAudit, usePanelUser } from "./PanelUser";

/* ───────── Usuarios del portal cliente: rol nuevo (admin / zona / locales / encargado) y su alcance ───────── */

function UsuarioPortalModal({ cliId, init, onClose }: { cliId: string; init?: UsuarioPortal; onClose: () => void }) {
  const { db, portal, mut } = useStore();
  const user = usePanelUser();
  const base = init ? normUsuario(init) : null;
  const [f, setF] = useState({
    n: base?.n ?? "", m: base?.m ?? "", rolKey: (base?.rolKey ?? "encargado") as RolPortal, zonaId: base?.zonaId ?? "",
    locales: base?.locales ?? ([] as string[]), extras: base?.extras ?? ([] as PermisoId[]), cargo: base?.cargo ?? "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const zonas = zonasPortal(db, cliId);
  const sucs = db.sucursales.filter((s) => s.cli === cliId);
  const rol = ROLES[f.rolKey];
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((s) => ({ ...s, [k]: v })); setErr({}); };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = () => {
    const p = usuarioPortalSchema.safeParse({ n: f.n, m: f.m, rolKey: f.rolKey, zonaId: f.zonaId || null, locales: f.locales, extras: f.extras.filter((e) => !rol.base.includes(e)) });
    if (!p.success) {
      const e: Record<string, string> = {};
      p.error.issues.forEach((i) => { const k = String(i.path[0] ?? "n"); e[k] ??= i.message; });
      return setErr(e);
    }
    if (db.usuariosPortal.some((u) => u.id !== init?.id && u.m.toLowerCase() === p.data.m)) return setErr({ m: "Ya existe un usuario con ese correo." });
    const id = portal.saveUsuario(init?.id ?? null, { ...p.data, cargo: f.cargo.trim() }, cliId);
    mut((d) => logAudit(d, user, "Usuario portal", p.data.n, init ? "Editar" : "Crear", `${ROLES[p.data.rolKey].label} · ${ALCANCE_LABEL[ROLES[p.data.rolKey].alcance]}${init ? "" : " (invitación enviada)"}`));
    void id;
    onClose();
  };
  const msg = (k: string) => err[k] && <div role="alert" className="mt-1 text-xs" style={{ color: "var(--color-danger-700)" }}>{err[k]}</div>;

  return (
    <Modal title={init ? "Editar usuario del portal" : "Invitar usuario al portal"} w={620} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre completo"><input className="input" value={f.n} maxLength={80} onChange={(e) => set("n", e.target.value)} />{msg("n")}</Field>
        <Field label="Correo"><input className="input" type="email" value={f.m} maxLength={120} onChange={(e) => set("m", e.target.value)} />{msg("m")}</Field>
      </div>
      <Field label="Cargo (opcional)"><input className="input" value={f.cargo} maxLength={80} onChange={(e) => set("cargo", e.target.value)} /></Field>
      <Field label="Rol">
        <Select value={f.rolKey} onChange={(v) => setF((s) => ({ ...s, rolKey: v as RolPortal, extras: s.extras.filter((e) => !ROLES[v as RolPortal].base.includes(e)), locales: v === "encargado" ? s.locales.slice(0, 1) : s.locales }))} opts={ROL_IDS.map((k) => ({ v: k, l: ROLES[k].label }))} />
        {msg("rolKey")}
        <div className="mt-1 text-xs text-neutral-700">{rol.desc} Alcance: <strong>{ALCANCE_LABEL[rol.alcance]}</strong>.</div>
      </Field>
      {f.rolKey === "zona" && (
        <Field label="Zona">
          <Select value={f.zonaId} onChange={(v) => set("zonaId", v)} opts={[{ v: "", l: "Elegir zona…" }, ...zonas.map((z) => ({ v: z.id, l: `${z.nombre} · ${z.total} sucursales` }))]} />
          {msg("zonaId")}
        </Field>
      )}
      {f.rolKey === "encargado" && (
        <Field label="Sucursal">
          <Select value={f.locales[0] ?? ""} onChange={(v) => set("locales", v ? [v] : [])} opts={[{ v: "", l: "Elegir sucursal…" }, ...sucs.map((s) => ({ v: s.id, l: `${s.n} (${s.cod})` }))]} />
          {msg("locales")}
        </Field>
      )}
      {f.rolKey === "locales" && (
        <Field label={`Sucursales (${f.locales.length} elegidas)`}>
          <div className="flex max-h-[200px] flex-col overflow-auto border-t" style={{ borderColor: "var(--color-divider)" }}>
            {sucs.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-[10px] border-b border-neutral-300 px-1 py-2 text-sm">
                <input type="checkbox" className="chk" checked={f.locales.includes(s.id)} onChange={() => set("locales", toggle(f.locales, s.id))} />
                <span className="flex-1">{s.n}</span><span className="text-xs text-neutral-700">{s.cod}</span>
              </label>
            ))}
          </div>
          {msg("locales")}
        </Field>
      )}
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-bold uppercase tracking-[.1em]">Permisos</div>
        <div className="grid grid-cols-2 gap-x-4 border-t border-[var(--color-divider)]">
          {PERMISOS.map((p) => {
            const incl = rol.base.includes(p.id);
            return (
              <label key={p.id} className="flex items-center gap-2 border-b border-neutral-300 py-2 text-[13px]" style={{ opacity: incl ? 0.7 : 1, cursor: incl ? "default" : "pointer" }}>
                <input type="checkbox" className="chk" checked={incl || f.extras.includes(p.id)} disabled={incl} onChange={() => set("extras", toggle(f.extras, p.id))} />
                <span className="flex-1">{p.label}</span>{incl && <span className="text-[11px] text-neutral-700">del rol</span>}
              </label>
            );
          })}
        </div>
      </div>
      <ModalActions>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save}>{init ? "Guardar cambios" : "Enviar invitación"}</button>
      </ModalActions>
    </Modal>
  );
}

/** Usuarios del portal de un cliente (`cliId`) o de todos los clientes (sin `cliId`). */
export function UsuariosPortal({ cliId, titulo = "Usuarios del portal cliente", hint }: { cliId?: string; titulo?: string; hint?: string }) {
  const { db, portal, mut } = useStore();
  const user = usePanelUser();
  const [inact, setInact] = useState(false);
  const [modal, setModal] = useState<null | { v?: UsuarioPortal }>(null);
  const [conf, setConf] = useState<null | UsuarioPortal>(null);
  const lista = db.usuariosPortal.filter((u) => (!cliId || u.cli === cliId) && (inact || normUsuario(u).estado !== "suspendido"));
  const estado = (u: UsuarioPortal, e: "activo" | "suspendido") => {
    portal.setUsuarioEstado(u.id, e);
    mut((d) => logAudit(d, user, "Usuario portal", u.n, e === "suspendido" ? "Desactivar" : "Reactivar", e === "suspendido" ? "Usuario suspendido: no puede ingresar al portal" : "Usuario reactivado"));
  };
  const rows: Row[] = lista.map((raw) => {
    const u = normUsuario(raw), r = ROLES[u.rolKey], ex = u.extras.filter((e) => !r.base.includes(e));
    const cli = db.clients.find((c) => c.id === u.cli);
    return {
      key: u.id, dim: u.estado === "suspendido",
      cells: [
        { t: u.n, b: true, sub: u.m },
        ...(cliId ? [] : [cli?.rs ?? u.cli]),
        { t: r.label, sub: ex.length ? `+ ${ex.length} permiso${ex.length === 1 ? "" : "s"} extra` : u.cargo },
        { chips: [{ t: ALCANCE_LABEL[r.alcance], k: r.alcance === "todo" ? "dark" : "neutral" }], sub: alcanceLabel(db, u) },
        fd(u.ult), { tag: ESTADOS_USUARIO[u.estado].label, k: ESTADOS_USUARIO[u.estado].kind },
        { actions: [{ t: "Editar", on: () => setModal({ v: raw }) }, u.estado === "suspendido" ? { t: "Reactivar", on: () => estado(raw, "activo") } : { t: "Suspender", on: () => setConf(raw) }] },
      ],
    };
  });
  return (
    <>
      <Heading title={titulo} hint={hint ?? "El cliente administra sus usuarios desde su portal. Desde DMC se pueden revisar, editar su rol y alcance, y suspender."} actions={<>
        <Check16 checked={inact} onChange={setInact} label="Mostrar suspendidos" />
        {cliId && <button className="btn btn-primary" onClick={() => setModal({})}><UserPlus size={15} aria-hidden />Invitar usuario</button>}
      </>} />
      <DataTable cols={[{ l: "Usuario" }, ...(cliId ? [] : [{ l: "Cliente", w: "minmax(0,.8fr)" }]), { l: "Rol", w: "minmax(0,.9fr)" }, { l: "Alcance", w: "minmax(0,1fr)" }, { l: "Último acceso", w: "110px" }, { l: "Estado", w: "100px" }, { l: "", w: "150px" }]}
        rows={rows} emptyTitle="Sin usuarios del portal" emptyText="El cliente aún no crea usuarios en su portal." />
      {modal && <UsuarioPortalModal cliId={modal.v?.cli ?? cliId ?? "c1"} init={modal.v} onClose={() => setModal(null)} />}
      {conf && <Confirm title="Suspender usuario" body={`${conf.n} no podrá ingresar al portal cliente hasta que se reactive.`} cta="Suspender" onOk={() => estado(conf, "suspendido")} onClose={() => setConf(null)} />}
    </>
  );
}

/** Catálogo de roles del portal cliente (fijos: los define DMC) con sus permisos base y cuántos usuarios tiene cada uno. */
export function RolesPortal() {
  const { db } = useStore();
  const [sel, setSel] = useState<RolPortal>("admin");
  const cuenta = (k: RolPortal) => db.usuariosPortal.map(normUsuario).filter((u) => u.rolKey === k && u.estado !== "suspendido").length;
  const r = ROLES[sel];
  return (
    <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%), 1fr))" }}>
      <div className="flex flex-col">
        <h3 className="!mb-[10px] !mt-0 !text-lg">Roles</h3>
        <div className="border-t-2 border-text">
          {ROL_IDS.map((k) => (
            <button key={k} onClick={() => setSel(k)} aria-current={k === sel} className="hover-surface flex w-full cursor-pointer flex-col gap-[2px] border-0 border-b border-neutral-300 px-3 py-[11px] text-left text-inherit" style={{ background: k === sel ? "var(--color-surface)" : "transparent" }}>
              <span className="flex items-center gap-2 text-sm" style={{ fontWeight: k === sel ? 800 : 600 }}><span aria-hidden className="h-2 w-2" style={{ background: k === sel ? "var(--color-accent)" : "transparent" }} />{ROLES[k].label}</span>
              <span className="text-xs text-neutral-700">{cuenta(k)} usuarios activos · {ALCANCE_LABEL[ROLES[k].alcance]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="!m-0 !text-[22px]">{r.label}</h3>
        <p className="!m-0 text-sm">{r.desc} Alcance: <strong>{ALCANCE_LABEL[r.alcance]}</strong>.</p>
        <div className="border-t-2 border-text">
          {PERMISOS.map((p) => {
            const on = r.base.includes(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 border-b border-neutral-300 px-2 py-[10px] text-sm" style={{ opacity: on ? 1 : 0.5 }}>
                <input type="checkbox" className="chk !h-[18px] !w-[18px]" checked={on} readOnly disabled aria-label={p.label} />
                <span className="flex-1 font-semibold">{p.label}</span><span className="text-xs text-neutral-700">{on ? "incluido en el rol" : "se puede agregar por usuario"}</span>
              </div>
            );
          })}
        </div>
        <p className="!m-0 text-xs text-neutral-700">Los roles son fijos. Los permisos que el rol no incluye se agregan a cada usuario al invitarlo o editarlo.</p>
      </div>
    </div>
  );
}
