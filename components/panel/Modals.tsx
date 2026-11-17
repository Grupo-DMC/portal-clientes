"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Catalogos, Cliente, Contacto, Direccion, Equipo, Persona } from "@/lib/data";
import { checkRut, COMUNAS, REGIONES } from "@/lib/format";
import { ipSchema } from "@/lib/schemas";
import { useStore } from "@/components/store";
import { Field, Modal, ModalActions, Seg, Select, Switch, useToast } from "@/components/ui";

/** Desplegable de un catálogo con «+ Agregar…» (no pierde lo que lleva el formulario). */
export function CatSelect({ cat, label, value, onChange, keep }: { cat: keyof Catalogos; label: string; value: string; onChange: (v: string) => void; keep?: string }) {
  const { db, mut, ask } = useStore();
  const opts = db.cat[cat].filter((x) => x.activo || x.n === keep).map((x) => x.n);
  return (
    <select className="input" aria-label={label} value={value} onChange={(e) => {
      const v = e.target.value;
      if (v === "__add") ask(`Agregar ${label}`, `Nombre del ${label}`, (n) => { mut((d) => d.cat[cat].push({ n, activo: true }), `“${n}” agregado al catálogo`); onChange(n); });
      else onChange(v);
    }}>
      {value === "" && <option value="">Seleccionar…</option>}
      {opts.map((o) => (<option key={o} value={o}>{o}</option>))}
      <option value="__add">+ Agregar {label}</option>
    </select>
  );
}

const Actions = ({ onClose, onSave, label }: { onClose: () => void; onSave: () => void; label: string }) => (
  <ModalActions><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={onSave}>{label}</button></ModalActions>
);

/* ───────── Nuevo cliente ───────── */
export function NewClienteModal({ onClose }: { onClose: () => void }) {
  const { mut } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState({ tipo: "Empresa" as Cliente["tipo"], rs: "", rut: "", marca: "" });
  const rc = checkRut(f.rut);
  const save = () => {
    if (!f.rs.trim() || rc !== true) return toast(rc === false ? "El dígito verificador del RUT no corresponde" : "Completa razón social y RUT");
    const id = "c" + Date.now(), marca = f.marca.trim() || f.rs.trim();
    mut((d) => { d.clients.push({ id, tipo: f.tipo, rs: f.rs.trim(), rutStr: f.rut.trim(), giro: "", dte: "", pago: "30 días", marcas: [marca], activo: true, plan: false, planMeses: 12, planDesde: "2026-10-05", calTodas: false, calSuc: [], calVence: "2027-10-05", zonas: [], dirs: [] }); }, `Cliente creado con la marca “${marca}”`);
    onClose(); router.push(`/panel/clientes/${id}`);
  };
  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <Field label="Tipo de cliente"><Seg opts={["Empresa", "Persona natural"] as const} value={f.tipo} onChange={(t) => setF({ ...f, tipo: t })} /></Field>
      <Field label={f.tipo === "Empresa" ? "Razón social" : "Nombre completo"}><input className="input" value={f.rs} onChange={(e) => setF({ ...f, rs: e.target.value })} maxLength={120} /></Field>
      <Field label="RUT">
        <input className="input tabular-nums" value={f.rut} placeholder="76.123.456-7" maxLength={12} aria-invalid={rc === false} onChange={(e) => setF({ ...f, rut: e.target.value })} />
        {rc === true && <div className="mt-1 text-xs text-neutral-700">✓ Dígito verificador válido</div>}
        {rc === false && <div className="mt-1 text-xs" style={{ color: "var(--color-danger-700)" }}>El dígito verificador no corresponde a este RUT</div>}
      </Field>
      <Field label="Primera marca"><input className="input" value={f.marca} placeholder="Si se deja vacío, se usa la razón social" onChange={(e) => setF({ ...f, marca: e.target.value })} maxLength={80} /></Field>
      <div className="text-xs text-neutral-700">Todo cliente tiene al menos una marca. Podrás completar facturación, direcciones y contactos en la ficha.</div>
      <Actions onClose={onClose} onSave={save} label="Crear cliente" />
    </Modal>
  );
}

/* ───────── Nueva sucursal ───────── */
export function NewSucursalModal({ cli, onClose }: { cli: Cliente; onClose: () => void }) {
  const { db, mut } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState({ marca: cli.marcas[0], n: "", cod: "", mall: "m1" });
  const save = () => {
    if (!f.n.trim() || !f.cod.trim()) return toast("Completa nombre y código de tienda");
    const id = "s" + Date.now(), m = db.malls.find((x) => x.id === f.mall)!;
    mut((d) => {
      d.sucursales.push({ id, cli: cli.id, marca: f.marca, cod: f.cod.trim().toUpperCase(), n: f.n.trim(), mall: f.mall, calle: "", reg: m.reg, com: m.com, local: "", inst: "2026-10-05", meses: 12, cred: "Sin clave", activo: true, zona: "", ultimoAcceso: null });
      d.inst[id] = [{ id: id + "a1", n: "Entrada principal", eq: [] }]; d.personal[id] = [];
    }, "Sucursal creada");
    onClose(); router.push(`/panel/sucursales/${id}`);
  };
  return (
    <Modal title="Nueva sucursal" onClose={onClose}>
      <Field label="Marca"><Select value={f.marca} onChange={(v) => setF({ ...f, marca: v })} opts={cli.marcas} /></Field>
      <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,1fr) 140px" }}>
        <Field label="Nombre de la sucursal"><input className="input" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} maxLength={100} /></Field>
        <Field label="Código de tienda"><input className="input" value={f.cod} placeholder="AM-050" onChange={(e) => setF({ ...f, cod: e.target.value })} maxLength={12} /></Field>
      </div>
      <Field label="Mall (puedes cambiar a calle en la ficha)"><Select value={f.mall} onChange={(v) => setF({ ...f, mall: v })} opts={db.malls.map((m) => ({ v: m.id, l: m.n }))} /></Field>
      <Actions onClose={onClose} onSave={save} label="Crear sucursal" />
    </Modal>
  );
}

/* ───────── Dirección ───────── */
export function DireccionModal({ cli, init, onClose }: { cli: Cliente; init?: Direccion; onClose: () => void }) {
  const { db, mut } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Partial<Direccion>>(init ?? { tipo: "Despacho", dir: "", reg: "Metropolitana", com: "Santiago", principal: false });
  const tipos = db.cat.tiposDir.filter((x) => x.activo).map((x) => x.n);
  const save = () => {
    if (!f.dir?.trim()) return toast("Ingresa la dirección");
    mut((d) => {
      const c = d.clients.find((x) => x.id === cli.id)!;
      if (f.principal) c.dirs.forEach((o) => { if (o.tipo === f.tipo) o.principal = false; });
      if (init) Object.assign(c.dirs.find((x) => x.id === init.id)!, f);
      else c.dirs.push({ ...(f as Direccion), id: "d" + Date.now(), activo: true });
    }, "Dirección guardada");
    onClose();
  };
  return (
    <Modal title={init ? "Editar dirección" : "Nueva dirección"} onClose={onClose}>
      <Field label="Tipo de dirección *"><CatSelect cat="tiposDir" label="tipo de dirección" value={tipos.includes(f.tipo ?? "") ? f.tipo! : tipos[0]} onChange={(v) => setF({ ...f, tipo: v })} /></Field>
      <Field label="Dirección"><input className="input" value={f.dir} placeholder="Calle, número, oficina" onChange={(e) => setF({ ...f, dir: e.target.value })} maxLength={160} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Región"><Select value={f.reg!} onChange={(v) => setF({ ...f, reg: v, com: COMUNAS[v][0] })} opts={REGIONES} /></Field>
        <Field label="Comuna"><Select value={f.com!} onChange={(v) => setF({ ...f, com: v })} opts={COMUNAS[f.reg!] ?? []} /></Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="chk" checked={!!f.principal} onChange={(e) => setF({ ...f, principal: e.target.checked })} />Marcar como principal para este tipo</label>
      <Actions onClose={onClose} onSave={save} label="Guardar dirección" />
    </Modal>
  );
}

/* ───────── Contacto ───────── */
const ALC = ["Todo el cliente", "Marca", "Zona", "Región", "Sucursal"];
export function ContactoModal({ cli, init, onClose }: { cli: Cliente; init?: Contacto; onClose: () => void }) {
  const { db, mut } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Contacto>(structuredClone(init ?? { id: "", cli: cli.id, n: "", tel: "", mail: "", activo: true, cargos: [{ cargo: "", alc: "Todo el cliente", val: "" }] }));
  const cs = db.sucursales.filter((s) => s.cli === cli.id);
  const vals = (a: string) => (a === "Marca" ? cli.marcas : a === "Zona" ? cli.zonas.map((z) => z.n) : a === "Región" ? REGIONES : a === "Sucursal" ? cs.map((s) => s.n) : []);
  const row = (i: number, patch: Partial<Contacto["cargos"][number]>) => setF((s) => { const c = structuredClone(s); Object.assign(c.cargos[i], patch); return c; });
  const save = () => {
    if (!f.n.trim()) return toast("Ingresa el nombre del contacto");
    if (f.mail && !/^\S+@\S+\.\S+$/.test(f.mail)) return toast("El correo no es válido");
    if (f.cargos.some((c) => !c.cargo)) return toast("Cada fila necesita un cargo");
    mut((d) => { if (init) Object.assign(d.contacts.find((k) => k.id === init.id)!, f); else d.contacts.push({ ...f, id: "k" + Date.now(), cli: cli.id, activo: true }); }, "Contacto guardado");
    onClose();
  };
  return (
    <Modal title={init ? "Editar contacto" : "Nuevo contacto"} w={760} onClose={onClose}>
      <Field label="Nombre completo"><input className="input" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} maxLength={100} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teléfono"><input className="input" value={f.tel} placeholder="+56 9 1234 5678" onChange={(e) => setF({ ...f, tel: e.target.value })} maxLength={24} /></Field>
        <Field label="Correo"><input className="input" type="email" value={f.mail} onChange={(e) => setF({ ...f, mail: e.target.value })} maxLength={120} /></Field>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-bold uppercase tracking-[.1em]">Cargos y alcance</div>
        <div className="border-t-2 border-text">
          {f.cargos.map((r, i) => (
            <div key={i} className="grid items-end gap-[10px] border-b border-neutral-300 py-[10px]" style={{ gridTemplateColumns: "24px minmax(0,1.2fr) minmax(0,.9fr) minmax(0,1.1fr) 36px" }}>
              <div className="pb-2 font-extrabold" style={{ color: "var(--color-accent-700)" }}>{i + 1}</div>
              <Field label="Cargo"><CatSelect cat="cargos" label="cargo" value={r.cargo} onChange={(v) => row(i, { cargo: v })} /></Field>
              <Field label="Alcance"><Select value={r.alc} onChange={(a) => row(i, { alc: a, val: vals(a)[0] ?? "" })} opts={ALC} /></Field>
              <Field label="Aplica a">
                <select className="input" value={r.val} disabled={r.alc === "Todo el cliente"} onChange={(e) => row(i, { val: e.target.value })}>
                  {r.alc === "Todo el cliente" && <option value="">Todo el cliente</option>}
                  {vals(r.alc).map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </Field>
              <button className="btn btn-icon" disabled={f.cargos.length < 2} aria-label="Quitar cargo" onClick={() => setF((s) => { const c = structuredClone(s); c.cargos.splice(i, 1); return c; })}><X size={16} aria-hidden /></button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost self-start" onClick={() => setF((s) => ({ ...s, cargos: [...s.cargos, { cargo: "", alc: "Todo el cliente", val: "" }] }))}><Plus size={15} aria-hidden />Agregar otro cargo</button>
      </div>
      <Actions onClose={onClose} onSave={save} label="Guardar contacto" />
    </Modal>
  );
}

/* ───────── Zona ───────── */
export function ZonaModal({ cli, idx, onClose }: { cli: Cliente; idx: number; onClose: () => void }) {
  const { mut } = useStore();
  const toast = useToast();
  const cur = idx >= 0 ? cli.zonas[idx] : { n: "", regs: [] as string[] };
  const [n, setN] = useState(cur.n);
  const [regs, setRegs] = useState<string[]>([...cur.regs]);
  const others = cli.zonas.filter((_, i) => i !== idx).flatMap((z) => z.regs.map((r) => [r, z.n] as const));
  const save = () => {
    if (!n.trim()) return toast("Ingresa el nombre de la zona");
    mut((d) => { const c = d.clients.find((x) => x.id === cli.id)!; if (idx >= 0) c.zonas[idx] = { n: n.trim(), regs }; else c.zonas.push({ n: n.trim(), regs }); }, "Zona guardada");
    onClose();
  };
  return (
    <Modal title={idx >= 0 ? "Editar zona" : "Nueva zona"} w={640} onClose={onClose}>
      <Field label="Nombre de la zona"><input className="input" value={n} placeholder="Zona Norte" onChange={(e) => setN(e.target.value)} maxLength={60} /></Field>
      <div className="flex justify-between text-xs text-neutral-700"><span>Regiones (de norte a sur)</span><span>{regs.length} regiones seleccionadas</span></div>
      <div className="grid grid-cols-2 gap-x-4 border-t border-[var(--color-divider)]">
        {REGIONES.map((r) => {
          const o = others.find((x) => x[0] === r);
          return (
            <label key={r} className="flex cursor-pointer items-center gap-2 border-b border-neutral-300 px-[2px] py-2 text-sm" style={{ opacity: o ? 0.45 : 1 }}>
              <input type="checkbox" className="chk" checked={regs.includes(r)} disabled={!!o} onChange={() => setRegs((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]))} />
              <span className="flex-1">{r}</span><span className="text-[11px] text-neutral-700">{o?.[1]}</span>
            </label>
          );
        })}
      </div>
      <div className="flex justify-between gap-2">
        {idx >= 0 && <button className="btn btn-ghost" onClick={() => { mut((d) => { d.clients.find((x) => x.id === cli.id)!.zonas.splice(idx, 1); }, "Zona desactivada"); onClose(); }}>Desactivar zona</button>}
        <div className="flex-1" />
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save}>Guardar zona</button>
      </div>
    </Modal>
  );
}

/* ───────── Persona del local ───────── */
export function PersonaModal({ sucId, idx, onClose }: { sucId: string; idx: number; onClose: () => void }) {
  const { db, mut } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Persona>(idx >= 0 ? { ...db.personal[sucId][idx] } : { n: "", c: "", t: "", m: "" });
  const save = () => {
    if (!f.n.trim()) return toast("Ingresa el nombre");
    if (f.m && !/^\S+@\S+\.\S+$/.test(f.m)) return toast("El correo no es válido");
    mut((d) => { const L = (d.personal[sucId] ??= []); if (idx >= 0) L[idx] = f; else L.push(f); }, "Persona guardada");
    onClose();
  };
  return (
    <Modal title={idx >= 0 ? "Editar persona" : "Agregar persona del local"} onClose={onClose}>
      <Field label="Nombre"><input className="input" value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} maxLength={100} /></Field>
      <Field label="Cargo"><input className="input" value={f.c} placeholder="Jefa de tienda" onChange={(e) => setF({ ...f, c: e.target.value })} maxLength={80} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teléfono"><input className="input" value={f.t} onChange={(e) => setF({ ...f, t: e.target.value })} maxLength={24} /></Field>
        <Field label="Correo"><input className="input" type="email" value={f.m} onChange={(e) => setF({ ...f, m: e.target.value })} maxLength={120} /></Field>
      </div>
      <Actions onClose={onClose} onSave={save} label="Guardar" />
    </Modal>
  );
}

/* ───────── Equipo ───────── */
type EqForm = Equipo & { acc: string; isNew: boolean };
const KINDS = ["Antena", "Contador de personas", "Alarma u otro"] as const;
const K2: Record<string, Equipo["kind"]> = { Antena: "antena", "Contador de personas": "contador", "Alarma u otro": "otro" };
const KM = { antena: "EVO-AM 58 kHz Dual", contador: "Vision 3D Count v2", otro: "Sirena SX-110" };

export function EquipoModal({ sucId, accId, init, onClose }: { sucId: string; accId: string; init?: Equipo; onClose: () => void }) {
  const { mut } = useStore();
  const toast = useToast();
  const [f, setF] = useState<EqForm>(init ? { ...structuredClone(init), acc: accId, isNew: false } : {
    id: "", acc: accId, isNew: true, kind: "antena", modelo: KM.antena, cant: 1, remota: true, uuid: "", mac: "", serie: "", fecha: "2026-10-05", ip: "192.168.", dhcp: false, destino: "Plataforma", url: "", tipo: "Alarma sonora", hist: [],
  });
  const set = <K extends keyof EqForm>(k: K, v: EqForm[K]) => setF((s) => ({ ...s, [k]: v }));
  const kc = ({ antena: "modAntena", contador: "modContador", otro: "modOtro" } as const)[f.kind];
  const kindLabel = ({ antena: "Antena", contador: "Contador de personas", otro: "Alarma u otro" } as const)[f.kind];

  const save = () => {
    const now = "2026-10-05";
    if (f.kind === "contador" && !f.dhcp && !ipSchema.safeParse(f.ip ?? "").success) return toast("IP no válida. Usa el formato 192.168.x.x o activa DHCP");
    if (!(+f.cant >= 1)) return toast("La cantidad debe ser al menos 1");
    mut((d) => {
      const a = d.inst[sucId].find((x) => x.id === accId)!;
      const { acc: _a, isNew, ...e } = f; void _a;
      if (isNew) { e.id = sucId + "e" + Date.now(); e.hist = [{ f: now, u: "Paula Contreras", a: "Instalado", d: `Equipo registrado en ${a.n}.` }]; a.eq.push(e); }
      else {
        const o = a.eq.find((x) => x.id === f.id)!;
        const h = [];
        if (o.ip !== e.ip || o.dhcp !== e.dhcp) h.push({ f: now, u: "Paula Contreras", a: "Cambio de IP", d: `${o.dhcp ? "DHCP" : o.ip || "—"} → ${e.dhcp ? "DHCP" : e.ip}` });
        if ((o.mac || "") !== (e.mac || "")) h.push({ f: now, u: "Paula Contreras", a: "Cambio de MAC", d: `${o.mac || "—"} → ${e.mac || "—"}` });
        if (!h.length) h.push({ f: now, u: "Paula Contreras", a: "Editado", d: "Datos del equipo actualizados." });
        Object.assign(o, e); o.hist = [...o.hist, ...h];
      }
    }, "Equipo guardado");
    onClose();
  };
  const desact = () => {
    mut((d) => { const e = d.inst[sucId].find((a) => a.id === accId)!.eq.find((x) => x.id === f.id)!; e.inactivo = true; e.hist.push({ f: "2026-10-05", u: "Paula Contreras", a: "Desactivado", d: "Equipo desactivado desde el panel interno." }); }, "Equipo desactivado");
    onClose();
  };

  return (
    <Modal title={f.isNew ? "Agregar equipo" : "Editar equipo"} w={720} onClose={onClose}>
      <Field label="Tipo de equipo">
        <div className={`seg ${!f.isNew ? "opacity-60" : ""}`}>
          {KINDS.map((t) => (
            <label key={t} className="seg-opt"><input type="radio" name="kind" disabled={!f.isNew} checked={kindLabel === t} onChange={() => { const k = K2[t]; setF((s) => ({ ...s, kind: k, modelo: KM[k] })); }} />{t}</label>
          ))}
        </div>
      </Field>
      {f.kind === "otro" && <Field label="Tipo de dispositivo"><CatSelect cat="tiposDisp" label="tipo de dispositivo" value={f.tipo ?? ""} onChange={(v) => set("tipo", v)} /></Field>}
      <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,1fr) 120px" }}>
        <Field label="Modelo"><CatSelect cat={kc} label="modelo" value={f.modelo} keep={f.modelo} onChange={(v) => set("modelo", v)} /></Field>
        <Field label="Cantidad"><input className="input" type="number" min={1} value={f.cant} onChange={(e) => set("cant", +e.target.value)} /></Field>
      </div>
      {f.kind === "antena" && (
        <>
          <div className="grid items-end gap-3" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
            <Field label="¿Quedó remota?"><Seg opts={["Sí", "No"] as const} value={f.remota ? "Sí" : "No"} onChange={(t) => set("remota", t === "Sí")} /></Field>
            <Field label="UUID"><input className="input" value={f.uuid} placeholder="xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx" onChange={(e) => set("uuid", e.target.value)} maxLength={36} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="MAC (opcional)"><input className="input" value={f.mac} placeholder="00:1A:3F:00:00:00" onChange={(e) => set("mac", e.target.value)} maxLength={17} /></Field>
            <Field label="N° de serie"><input className="input" value={f.serie} onChange={(e) => set("serie", e.target.value)} maxLength={40} /></Field>
            <Field label="Fecha de instalación"><input className="input" type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
          </div>
        </>
      )}
      {f.kind === "contador" && (
        <>
          <div className="grid items-end gap-4" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
            <Field label="DHCP"><div className="flex min-h-9 items-center"><Switch on={!!f.dhcp} onChange={() => set("dhcp", !f.dhcp)} label="DHCP" /></div></Field>
            <Field label="Dirección IP"><input className="input" value={f.dhcp ? "" : f.ip ?? ""} disabled={!!f.dhcp} placeholder={f.dhcp ? "Asignada por DHCP" : "192.168.0.0"} onChange={(e) => set("ip", e.target.value)} maxLength={15} /></Field>
          </div>
          <div className="grid items-end gap-4" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
            <Field label="Destino"><Seg opts={["Plataforma", "Servidor"] as const} value={(f.destino as "Plataforma" | "Servidor") ?? "Plataforma"} onChange={(t) => set("destino", t)} /></Field>
            <Field label={f.destino === "Servidor" ? "IP o URL del servidor" : "URL de la plataforma"}><input className="input" value={f.url} placeholder={f.destino === "Servidor" ? "192.168.10.20:8080" : "https://conteo.dmc.cl/t/…"} onChange={(e) => set("url", e.target.value)} maxLength={200} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="MAC (opcional)"><input className="input" value={f.mac} onChange={(e) => set("mac", e.target.value)} maxLength={17} /></Field>
            <Field label="N° de serie"><input className="input" value={f.serie} onChange={(e) => set("serie", e.target.value)} maxLength={40} /></Field>
            <Field label="Fecha de instalación"><input className="input" type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></Field>
          </div>
        </>
      )}
      {f.kind === "otro" && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="N° de serie"><input className="input" value={f.serie} onChange={(e) => set("serie", e.target.value)} maxLength={40} /></Field>
          <Field label="MAC (opcional)"><input className="input" value={f.mac} onChange={(e) => set("mac", e.target.value)} maxLength={17} /></Field>
          <Field label="UUID (opcional)"><input className="input" value={f.uuid} onChange={(e) => set("uuid", e.target.value)} maxLength={36} /></Field>
        </div>
      )}
      <div className="flex gap-2">
        {!f.isNew && !f.inactivo && <button className="btn btn-ghost" onClick={desact}>Desactivar equipo</button>}
        <div className="flex-1" />
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save}>Guardar equipo</button>
      </div>
    </Modal>
  );
}
