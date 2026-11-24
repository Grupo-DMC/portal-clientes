"use client";

import { Info, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Sucursal } from "@/lib/data";
import { fdt } from "@/lib/format";
import { ESTADOS_CUENTA, estadoCuenta } from "@/lib/portal";
import { useStore } from "@/components/store";
import { Confirm, DataTable, Tag, type Row } from "@/components/ui";
import { usePanelUser, logAudit } from "./PanelUser";

/* ───────── Cuenta de acceso de cada local ─────────
   El equipo DMC crea, suspende y reactiva la cuenta con que el personal entra a /local. La contraseña NUNCA se muestra:
   la define y la restablece el cliente desde su portal. */

export function useCuentaActions() {
  const { portal, mut } = useStore();
  const user = usePanelUser();
  const log = (s: Pick<Sucursal, "n">, acc: string, det: string) => mut((d) => logAudit(d, user, "Cuenta local", s.n, acc, det));
  return {
    crear: (s: Pick<Sucursal, "id" | "n" | "marca">) => { const u = portal.createCuenta(s); log(s, "Crear", `Cuenta creada (usuario ${u})`); },
    suspender: (s: Pick<Sucursal, "id" | "n">) => { portal.suspenderCuenta(s.id); log(s, "Desactivar", "Cuenta suspendida: el local ya no puede ingresar"); },
    reactivar: (s: Pick<Sucursal, "id" | "n">) => { portal.reactivarCuenta(s.id); log(s, "Reactivar", "Cuenta reactivada"); },
  };
}

type ConfirmState = null | { s: Sucursal };
const SuspenderConfirm = ({ c, onOk, onClose }: { c: NonNullable<ConfirmState>; onOk: () => void; onClose: () => void }) => (
  <Confirm title={`Suspender la cuenta de ${c.s.n}`} body="El personal del local no podrá ingresar a su portal hasta que se reactive la cuenta. La clave actual se conserva." cta="Suspender" onOk={onOk} onClose={onClose} />
);

/** Ficha de la cuenta de un local (pestaña «Acceso del local» de la sucursal). */
export function CuentaLocal({ suc }: { suc: Sucursal }) {
  const { db } = useStore();
  const act = useCuentaActions();
  const [conf, setConf] = useState<ConfirmState>(null);
  const cuenta = db.cuentas[suc.id];
  const est = estadoCuenta(db, suc);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="!mb-[6px]">Cuenta de acceso del local</h3>
        <p className="!m-0 max-w-[560px] text-sm">Con esta cuenta el personal entra al portal del local (QR o código de sucursal). La clave la define y la restablece el cliente desde su portal; DMC nunca la ve.</p>
      </div>
      <div className="grid grid-cols-2 border-b border-t-2 border-b-[var(--color-divider)] border-t-text sm:grid-cols-4">
        <div className="border-r border-neutral-300 py-[14px] pr-3"><div className="mb-[6px] text-xs text-neutral-700">Estado</div><Tag t={ESTADOS_CUENTA[est].label} k={ESTADOS_CUENTA[est].kind} size={12} /></div>
        <div className="border-r border-neutral-300 px-3 py-[14px]"><div className="mb-[6px] text-xs text-neutral-700">Usuario</div><div className="font-bold">{cuenta?.usuario ?? "—"}</div></div>
        <div className="border-r border-neutral-300 px-3 py-[14px]"><div className="mb-[6px] text-xs text-neutral-700">Último ingreso</div><div className="font-bold">{cuenta?.ultimo ? fdt(cuenta.ultimo) : "Sin ingresos"}</div></div>
        <div className="px-3 py-[14px]"><div className="mb-[6px] text-xs text-neutral-700">Código de sucursal</div><div className="font-bold">{suc.cod}</div></div>
      </div>
      <div className="flex items-start gap-[10px] text-sm"><Info size={16} className="mt-[3px] flex-none" aria-hidden />
        {est === "sin_cuenta" ? "Este local aún no tiene cuenta: el personal no puede ingresar. Créala para que el cliente defina su clave."
          : est === "suspendida" ? "La cuenta está suspendida: el personal del local no puede ingresar. Al reactivarla vuelve a funcionar la clave anterior."
          : "La cuenta está activa: el personal puede ingresar y enviar reportes desde el portal del local."}
      </div>
      <div className="flex flex-wrap gap-2">
        {est === "sin_cuenta" && <button className="btn btn-primary" onClick={() => act.crear(suc)}><KeyRound size={15} aria-hidden />Crear cuenta</button>}
        {est === "activa" && <button className="btn btn-secondary" onClick={() => setConf({ s: suc })}>Suspender cuenta</button>}
        {est === "suspendida" && <button className="btn btn-primary" onClick={() => act.reactivar(suc)}>Reactivar cuenta</button>}
      </div>
      {conf && <SuspenderConfirm c={conf} onOk={() => act.suspender(conf.s)} onClose={() => setConf(null)} />}
    </div>
  );
}

/** Cuentas de todos los locales de un cliente (pestaña «Cuentas de locales» del cliente). */
export function CuentasTabla({ cliId }: { cliId: string }) {
  const { db } = useStore();
  const router = useRouter();
  const act = useCuentaActions();
  const [conf, setConf] = useState<ConfirmState>(null);
  const ss = db.sucursales.filter((s) => s.cli === cliId);
  const n = (e: ReturnType<typeof estadoCuenta>) => ss.filter((s) => estadoCuenta(db, s) === e).length;
  const rows: Row[] = ss.map((s) => {
    const c = db.cuentas[s.id], e = estadoCuenta(db, s);
    return {
      key: s.id, onClick: () => router.push(`/panel/sucursales/${s.id}?tab=acceso`), dim: !s.activo,
      cells: [
        { t: s.n, b: true, sub: s.cod }, c?.usuario ?? "—", { tag: ESTADOS_CUENTA[e].label, k: ESTADOS_CUENTA[e].kind }, c?.ultimo ? fdt(c.ultimo) : "Sin ingresos",
        { actions: e === "sin_cuenta" ? [{ t: "Crear cuenta", on: () => act.crear(s) }] : e === "activa" ? [{ t: "Suspender", on: () => setConf({ s }) }] : [{ t: "Reactivar", on: () => act.reactivar(s) }] },
      ],
    };
  });
  return (
    <>
      <div className="mb-3 text-[13px] text-neutral-700">{n("activa")} activas · {n("suspendida")} suspendidas · {n("sin_cuenta")} sin cuenta. La clave la administra el cliente desde su portal: aquí nunca se muestra.</div>
      <DataTable cols={[{ l: "Sucursal" }, { l: "Usuario", w: "minmax(0,.8fr)" }, { l: "Estado", w: "110px" }, { l: "Último ingreso", w: "150px" }, { l: "", w: "130px" }]} rows={rows} emptyTitle="Sin sucursales" emptyText="Este cliente aún no tiene sucursales." />
      {conf && <SuspenderConfirm c={conf} onOk={() => act.suspender(conf.s)} onClose={() => setConf(null)} />}
    </>
  );
}
