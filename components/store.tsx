"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { seed, seedPerms, seedRoles, type Db, type Perms, type PrefsAvisos, type Sucursal, type UsuarioPortal } from "@/lib/data";
import { zonaId, zonaIdOf } from "@/lib/calc";
import {
  alcanceLabel, avisosSinLeer, avisosVisibles, legacyDe, normUsuario, permisosDe, reportePendiente, reportesVisibles, resolverUsuarioPortal,
  sucursalesVisibles, usuarioCuentaDe, type EstadoUsuarioPortal, type NivelPrioridad, type PerfilCuenta, type PermisoId, type RolPortal, type UsuarioPortalN,
} from "@/lib/portal";
import type { Ask } from "@/components/ui";
import { MiniAsk, useToast } from "@/components/ui";

/* Estado de la demostración: datos estáticos (lib/data.ts) copiados a memoria
   para que las ediciones se vean al instante mientras se navega. Al conectar
   SQL Server, `mut` pasa a llamar Server Actions y deja de existir. */
type Roles = ReturnType<typeof seedRoles>;

/** Cambios permitidos de una sucursal desde el portal (todo menos su id y su cliente). */
export type SucursalCambios = Partial<Omit<Sucursal, "id" | "cli">>;
/** Datos del formulario de usuario del portal (invitar o editar). `locales` = ids de sucursal. */
export type UsuarioValores = { n: string; m: string; rolKey: RolPortal; zonaId: string | null; locales: string[]; extras: PermisoId[]; cargo?: string; tel?: string };
export type PerfilValores = Partial<Pick<UsuarioPortal, "n" | "m" | "cargo" | "tel" | "foto">>;

/** Acciones del portal cliente. Hoy mutan la copia en memoria; cada una indica la ruta API que las reemplazará.
    `usuarioId` por omisión es el usuario de la sesión (`me`). */
export type PortalActions = {
  /** PATCH /api/sucursales/:id */
  updateSucursal: (id: string, changes: SucursalCambios, msg?: string) => void;
  /** POST /api/reportes/:id/prioridad */
  requestPriority: (reporteId: string, nivel: NivelPrioridad, motivo: string) => void;
  /** POST /api/locales/:id/cuenta — crea la cuenta (activa, sin ingresos) y devuelve el usuario generado. */
  createCuenta: (suc: Pick<Sucursal, "id" | "n" | "marca">) => string;
  /** POST /api/locales/:id/cuenta/suspender */
  suspenderCuenta: (sucId: string) => void;
  /** POST /api/locales/:id/cuenta/reactivar */
  reactivarCuenta: (sucId: string) => void;
  /** POST /api/usuarios (invitar, `id` = null) o PATCH /api/usuarios/:id — devuelve el id del usuario. */
  saveUsuario: (id: string | null, values: UsuarioValores, cli?: string) => string;
  /** PATCH /api/usuarios/:id/estado — suspender o reactivar un usuario del portal. */
  setUsuarioEstado: (id: string, estado: EstadoUsuarioPortal) => void;
  /** PATCH /api/notificaciones/:id */
  setAvisoLeido: (avisoId: string, leida?: boolean, usuarioId?: string) => void;
  /** POST /api/notificaciones/leer-todas */
  marcarTodoLeido: (usuarioId?: string) => void;
  /** PUT /api/notificaciones/preferencias */
  savePrefs: (prefs: PrefsAvisos, usuarioId?: string) => void;
  /** PATCH /api/perfil */
  updateProfile: (values: PerfilValores, usuarioId?: string) => void;
};

type Store = {
  db: Db; perms: Perms; roles: Roles;
  mut: (fn: (d: Db) => void, msg?: string) => void;
  setPerms: (fn: (p: Perms) => void) => void;
  setRoles: (fn: (r: Roles, p: Perms) => void) => void;
  ask: (title: string, label: string, cb: (v: string) => void, val?: string) => void;
  extra: { serverTickets: Db["tickets"] };
  /** Usuario del portal que tiene la sesión (null en el panel o si no se le pasó identidad al provider). */
  me: UsuarioPortalN | null;
  portal: PortalActions;
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fuera de StoreProvider");
  return s;
};

/** Cliente al que pertenece el usuario de la sesión (por omisión «c1», el cliente de la demostración). */
const meCli = (d: Db, meId?: string) => d.usuariosPortal.find((u) => u.id === meId)?.cli ?? "c1";

export function StoreProvider({ children, serverTickets = [], portalEmail, portalName, portalPerfil }: {
  children: ReactNode; serverTickets?: Db["tickets"];
  /** Identidad de la sesión del portal (para resolver `me`): se prueba por correo, luego por nombre y luego por perfil de la cuenta. */
  portalEmail?: string; portalName?: string; portalPerfil?: PerfilCuenta;
}) {
  const toast = useToast();
  const [db, setDb] = useState<Db>(() => { const d = seed(); d.tickets.push(...serverTickets); return d; });
  const [perms, setP] = useState<Perms>(() => seedPerms());
  const [roles, setR] = useState<Roles>(() => seedRoles());
  const [asking, setAsking] = useState<Ask>(null);

  const mut = useCallback((fn: (d: Db) => void, msg?: string) => {
    setDb((s) => { const d = structuredClone(s); fn(d); return d; });
    if (msg) toast(msg);
  }, [toast]);
  const setPerms = useCallback((fn: (p: Perms) => void) => setP((s) => { const p = structuredClone(s); fn(p); return p; }), []);
  const setRoles = useCallback((fn: (r: Roles, p: Perms) => void) => {
    const r = structuredClone(roles), p = structuredClone(perms);
    fn(r, p); setR(r); setP(p);
  }, [roles, perms]);
  const ask = useCallback((title: string, label: string, cb: (v: string) => void, val?: string) => setAsking({ title, label, cb, val }), []);

  const me = useMemo(
    () => (portalEmail || portalName || portalPerfil ? resolverUsuarioPortal(db, { email: portalEmail, name: portalName, perfil: portalPerfil }) : null),
    [db, portalEmail, portalName, portalPerfil],
  );
  const meId = me?.id;

  const portal = useMemo<PortalActions>(() => {
    const uid = (u?: string) => u ?? meId ?? "";
    return {
      updateSucursal: (id, changes, msg) => mut((d) => { const s = d.sucursales.find((x) => x.id === id); if (s) Object.assign(s, changes); }, msg),
      requestPriority: (reporteId, nivel, motivo) =>
        mut((d) => { const r = d.reportes.find((x) => x.id === reporteId); if (r) r.prioridad = { nivel, motivo: motivo.trim() }; }, "Prioridad solicitada. El equipo de DMC la revisará."),
      createCuenta: (suc) => {
        const usuario = usuarioCuentaDe(suc);
        mut((d) => {
          d.cuentas[suc.id] = { usuario, estado: "activa", ultimo: null };
          const s = d.sucursales.find((x) => x.id === suc.id);
          if (s) { s.cred = "Activo"; s.ultimoAcceso = null; }
        }, `Cuenta creada para ${suc.n}`);
        return usuario;
      },
      suspenderCuenta: (sucId) => mut((d) => {
        const c = d.cuentas[sucId], s = d.sucursales.find((x) => x.id === sucId);
        if (c) c.estado = "suspendida";
        if (s) s.cred = "Bloqueado";
      }, "Cuenta suspendida. El local ya no puede ingresar."),
      reactivarCuenta: (sucId) => mut((d) => {
        const c = d.cuentas[sucId], s = d.sucursales.find((x) => x.id === sucId);
        if (c) c.estado = "activa";
        if (s) s.cred = "Activo";
      }, "Cuenta reactivada. La clave anterior vuelve a funcionar."),
      saveUsuario: (id, v, cli) => {
        const nuevo = id ?? "p" + Date.now().toString(36);
        mut((d) => {
          const base = id ? d.usuariosPortal.find((x) => x.id === id) : undefined;
          const cliId = base?.cli ?? cli ?? meCli(d, meId);
          // El alcance se limpia según el rol: un administrador no guarda zona ni locales, etc.
          const zona = v.rolKey === "zona" ? v.zonaId : null;
          const locales = v.rolKey === "locales" ? v.locales : v.rolKey === "encargado" ? v.locales.slice(0, 1) : [];
          const zn = d.clients.find((c) => c.id === cliId)?.zonas.find((z) => zonaId(z) === zona)?.n ?? null;
          const campos = {
            n: v.n.trim(), m: v.m.trim().toLowerCase(), rolKey: v.rolKey, zonaId: zona, locales, extras: v.extras,
            ...legacyDe(v.rolKey, zn, locales.map((l) => d.sucursales.find((x) => x.id === l)?.n ?? l)),
            ...(v.cargo !== undefined ? { cargo: v.cargo } : {}), ...(v.tel !== undefined ? { tel: v.tel } : {}),
          };
          if (base) Object.assign(base, campos);
          else d.usuariosPortal.push({ id: nuevo, cli: cliId, activo: true, ult: null, estado: "invitado", foto: null, cargo: "", tel: "", ...campos });
        }, id ? "Usuario actualizado" : `Invitación enviada a ${v.m.trim()}`);
        return nuevo;
      },
      setUsuarioEstado: (id, estado) => mut((d) => {
        const u = d.usuariosPortal.find((x) => x.id === id);
        if (u) { u.estado = estado; u.activo = estado !== "suspendido"; }
      }, estado === "suspendido" ? "Usuario suspendido" : "Usuario reactivado"),
      setAvisoLeido: (avisoId, leida = true, usuarioId) => mut((d) => {
        const a = d.avisos[uid(usuarioId)]?.find((x) => x.id === avisoId);
        if (a) a.leida = leida;
      }),
      marcarTodoLeido: (usuarioId) => mut((d) => {
        const k = uid(usuarioId);
        const pr = d.prefs[k];
        d.avisos[k]?.forEach((a) => { if (pr?.tipos[a.tipo]?.portal !== false) a.leida = true; });
      }),
      savePrefs: (prefs, usuarioId) => mut((d) => { const k = uid(usuarioId); if (k) d.prefs[k] = structuredClone(prefs); }, "Preferencias guardadas"),
      updateProfile: (values, usuarioId) => mut((d) => {
        const u = d.usuariosPortal.find((x) => x.id === uid(usuarioId));
        if (u) Object.assign(u, values);
      }, "Perfil actualizado"),
    };
  }, [mut, meId]);

  const value = useMemo(
    () => ({ db, perms, roles, mut, setPerms, setRoles, ask, extra: { serverTickets }, me, portal }),
    [db, perms, roles, mut, setPerms, setRoles, ask, serverTickets, me, portal],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {asking && <MiniAsk ask={asking} onClose={() => setAsking(null)} />}
    </Ctx.Provider>
  );
}

/** Helpers de lectura frecuentes. */
export function useLookups() {
  const { db } = useStore();
  return useMemo(() => {
    const cliOf = (id: string) => db.clients.find((c) => c.id === id)!;
    const mallOf = (id: string) => db.malls.find((m) => m.id === id);
    const sucOf = (id: string) => db.sucursales.find((s) => s.id === id)!;
    const sucN = (id: string) => db.sucursales.find((s) => s.id === id)?.n ?? "—";
    const ubic = (s: Db["sucursales"][number]) => (s.mall ? mallOf(s.mall)?.n ?? "" : s.calle);
    return { cliOf, mallOf, sucOf, sucN, ubic };
  }, [db]);
}

/** Datos del portal ya filtrados por el alcance del usuario de la sesión (`me`), o de `usuarioId` si se indica.
    Úsalo solo dentro del portal. Si no hay usuario (provider sin identidad), todo viene vacío. */
export function usePortalData(usuarioId?: string) {
  const { db, me: sesion, portal } = useStore();
  const me = useMemo(() => {
    const u = usuarioId ? db.usuariosPortal.find((x) => x.id === usuarioId) : undefined;
    return u ? normUsuario(u) : usuarioId ? null : sesion;
  }, [db, usuarioId, sesion]);
  return useMemo(() => {
    const cliente = me ? db.clients.find((c) => c.id === me.cli) ?? null : null;
    const sucursales = me ? sucursalesVisibles(db, me) : [];
    const reportes = me ? reportesVisibles(db, me) : [];
    const permisos = me ? permisosDe(me) : [];
    return {
      me, cliente, portal,
      /** Todas las personas del cliente con acceso al portal (normalizadas). */
      usuarios: me ? db.usuariosPortal.filter((u) => u.cli === me.cli).map(normUsuario) : [],
      sucursales, esAdmin: me?.rolKey === "admin", alcance: me ? alcanceLabel(db, me) : "",
      /** true si la sucursal (o algo con `suc`) está dentro del alcance del usuario. */
      enAlcance: (x: { id: string } | { suc: string }) => sucursales.some((s) => s.id === ("suc" in x ? x.suc : x.id)),
      zonaIdDe: (s: Sucursal) => zonaIdOf(db, s),
      permisos, puede: (p: PermisoId) => permisos.includes(p),
      reportes, reportesPendientes: reportes.filter(reportePendiente),
      cuentas: db.cuentas,
      avisos: me ? avisosVisibles(db, me.id) : [], avisosSinLeer: me ? avisosSinLeer(db, me.id) : 0,
      prefs: me ? db.prefs[me.id] ?? null : null,
    };
  }, [db, me, portal]);
}
