/* Contrato del portal cliente y del acceso de local: catálogos (estados, roles, permisos, avisos),
   alcance por rol, permisos efectivos, validaciones y helpers puros sobre `Db`.
   Sin estado ni efectos: se usa igual en Server Components, Server Actions y componentes de cliente.
   Datos de demostración (ver lib/data.ts). */
import type { Db, Sucursal, UsuarioPortal, Reporte, AvisoPortal, PrefsAvisos, Visita, Zona } from "./data";
import { zonaId, zonaIdOf } from "./calc";
import { norm, slug, type TagKind } from "./format";

/** Prefijo de las rutas del portal cliente (para enlaces `href` de avisos y detalles). */
export const PORTAL_BASE = "/portal";

/* ---------------------------------------------------------------- Estados */

export type EstadoSucursal = "operativa" | "observaciones" | "critica";
export const ESTADOS_SUCURSAL: Record<EstadoSucursal, { label: string; kind: TagKind }> = {
  operativa: { label: "Operativa", kind: "neutral" },
  observaciones: { label: "Con observaciones", kind: "accent" },
  critica: { label: "Fuera de servicio", kind: "solid" },
};

export type EstadoVisita = "programada" | "completada" | "cancelada" | "cancelada_admin";
export const ESTADOS_VISITA: Record<EstadoVisita, { label: string; kind: TagKind }> = {
  programada: { label: "Programada", kind: "accent" },
  completada: { label: "Completada", kind: "neutral" },
  cancelada: { label: "Cancelada", kind: "outline" },
  cancelada_admin: { label: "Cancelada por admin", kind: "outline" },
};

export type EstadoReporte = "nuevo" | "revision" | "ticket" | "resuelto";
export const ESTADOS_REPORTE: Record<EstadoReporte, { label: string; kind: TagKind }> = {
  nuevo: { label: "Nuevo", kind: "solid" },
  revision: { label: "En revisión", kind: "accent" },
  ticket: { label: "Ticket creado", kind: "dark" },
  resuelto: { label: "Resuelto", kind: "neutral" },
};
/** Un reporte está pendiente mientras nadie lo resuelva ni lo convierta en ticket. */
export const reportePendiente = (r: Pick<Reporte, "estado">): boolean => r.estado === "nuevo" || r.estado === "revision";

export type NivelPrioridad = "alta" | "urgente";
export const PRIORIDADES: Record<NivelPrioridad, string> = { alta: "Alta", urgente: "Urgente" };

export type EstadoCuentaLocal = "activa" | "suspendida";
/** Estado de la cuenta de un local en la ficha: `sin_cuenta` cuando aún no se le creó usuario. */
export type EstadoCuentaVista = EstadoCuentaLocal | "sin_cuenta";
export const ESTADOS_CUENTA: Record<EstadoCuentaVista, { label: string; kind: TagKind }> = {
  activa: { label: "Activa", kind: "neutral" },
  suspendida: { label: "Suspendida", kind: "solid" },
  sin_cuenta: { label: "Sin cuenta", kind: "outline" },
};

export type EstadoUsuarioPortal = "activo" | "invitado" | "suspendido";
export const ESTADOS_USUARIO: Record<EstadoUsuarioPortal, { label: string; kind: TagKind }> = {
  activo: { label: "Activo", kind: "neutral" },
  invitado: { label: "Invitado", kind: "accent" },
  suspendido: { label: "Suspendido", kind: "solid" },
};

/* ------------------------------------------------------- Roles y permisos */

export type PermisoId = "ver" | "visitas" | "tickets" | "reportes" | "cuentas" | "usuarios";
export const PERMISOS: { id: PermisoId; label: string }[] = [
  { id: "ver", label: "Ver dashboard y sucursales" },
  { id: "visitas", label: "Ver visitas y descargar informes" },
  { id: "tickets", label: "Ver tickets" },
  { id: "reportes", label: "Revisar reportes de locales" },
  { id: "cuentas", label: "Gestionar cuentas de locales" },
  { id: "usuarios", label: "Asignar usuarios y roles" },
];

export type RolPortal = "admin" | "zona" | "locales" | "encargado";
export type Alcance = "todo" | "zona" | "locales" | "local";
export const ROLES: Record<RolPortal, { label: string; desc: string; alcance: Alcance; base: PermisoId[] }> = {
  admin: { label: "Administrador cliente", desc: "Todo el cliente y la administración del portal.", alcance: "todo", base: ["ver", "visitas", "tickets", "reportes", "cuentas", "usuarios"] },
  zona: { label: "Jefe de zona", desc: "Todas las sucursales de una zona.", alcance: "zona", base: ["ver", "visitas", "tickets", "reportes"] },
  locales: { label: "Jefe de locales", desc: "Varias sucursales elegidas una a una.", alcance: "locales", base: ["ver", "visitas", "tickets"] },
  encargado: { label: "Encargado de local", desc: "Solo su sucursal.", alcance: "local", base: ["ver", "visitas"] },
};
export const ROL_IDS = Object.keys(ROLES) as RolPortal[];
export const ALCANCE_LABEL: Record<Alcance, string> = { todo: "Todo el cliente", zona: "Una zona", locales: "Varias sucursales", local: "Una sucursal" };

/** Perfil de la cuenta de sesión (lib/server/accounts.ts) → rol del portal. */
export type PerfilCuenta = "admin" | "zona" | "marca";
export const PERFIL_ROL: Record<PerfilCuenta, RolPortal> = { admin: "admin", zona: "zona", marca: "locales" };
/** Usuario de demostración que representa a cada perfil de cuenta (ids de `db.usuariosPortal`). */
export const PERFIL_DEMO: Record<PerfilCuenta, string> = { admin: "p1", zona: "p2", marca: "p3" };

/* --------------------------------------------------------------- Avisos */

export type TipoAviso = "ticket_nuevo" | "ticket_cerrado" | "visita_programada" | "visita_realizada" | "reporte_nuevo" | "garantia" | "calibracion";
/** `icon` es un identificador sugerido (ticket, ticketOk, calendar, visitOk, flag, shield, gauge); la UI elige el ícono lucide. */
export const TIPOS_AVISO: { id: TipoAviso; label: string; icon: string }[] = [
  { id: "ticket_nuevo", label: "Ticket nuevo", icon: "ticket" },
  { id: "ticket_cerrado", label: "Ticket cerrado", icon: "ticketOk" },
  { id: "visita_programada", label: "Visita programada", icon: "calendar" },
  { id: "visita_realizada", label: "Visita realizada", icon: "visitOk" },
  { id: "reporte_nuevo", label: "Reporte nuevo de un local", icon: "flag" },
  { id: "garantia", label: "Garantía por vencer", icon: "shield" },
  { id: "calibracion", label: "Calibración por vencer", icon: "gauge" },
];
export const TIPO_AVISO_LABEL = Object.fromEntries(TIPOS_AVISO.map((t) => [t.id, t.label])) as Record<TipoAviso, string>;

export type FrecuenciaAviso = "inmediato" | "diario" | "semanal";
export const FRECUENCIAS: Record<FrecuenciaAviso, string> = { inmediato: "Inmediato", diario: "Resumen diario", semanal: "Resumen semanal" };

/** Preferencias iniciales: todo por el portal; por correo todo salvo «visita programada». */
export const prefsPorDefecto = (): PrefsAvisos => ({
  tipos: Object.fromEntries(TIPOS_AVISO.map((t) => [t.id, { portal: true, correo: t.id !== "visita_programada" }])) as PrefsAvisos["tipos"],
  frecuencia: "inmediato",
  silencio: true,
});

/* ------------------------------------------- Claves, rutas y nombres */

/** Clave estable de una sucursal en reportes, cuentas y `UsuarioPortal.locales`: su id (`db.sucursales[].id`). */
export const sucKey = (s: Pick<Sucursal, "id">): string => s.id;
/** Segmento de URL: el código en minúsculas («pu-005») o, sin código, el nombre en slug. */
export const branchSlug = (s: Pick<Sucursal, "cod" | "n">): string => (s.cod ? s.cod.toLowerCase() : slug(s.n));
export const branchHref = (s: Pick<Sucursal, "cod" | "n">): string => `${PORTAL_BASE}/sucursales/${branchSlug(s)}`;
export const sucPorSlug = <T extends Pick<Sucursal, "cod" | "n">>(list: T[], sl: string): T | undefined =>
  list.find((s) => branchSlug(s) === sl.toLowerCase());
/** Segmento de URL de una visita: «V-2026-01064» → «v-2026-01064». */
export const visitSlug = (folio: string): string => folio.toLowerCase();
export const visitHref = (folio: string): string => `${PORTAL_BASE}/visitas/${visitSlug(folio)}`;
export const visitaPorSlug = (visitas: Visita[], sl: string): Visita | undefined => visitas.find((v) => visitSlug(v.id) === sl.toLowerCase());
/** «Puma Mall Plaza Vespucio» → «Vespucio» (quita la marca y «Mall Plaza»). */
export const shortName = (n: string, marca?: string): string => {
  const first = (marca ?? n).split(" ")[0];
  return (n.startsWith(first + " ") ? n.slice(first.length + 1) : n).replace(/^Mall Plaza /, "");
};
/** Usuario propuesto para la cuenta de un local: «puma.vespucio». */
export const usuarioCuentaDe = (s: Pick<Sucursal, "n" | "marca">): string =>
  `${norm(s.marca.split(" ")[0])}.${norm(shortName(s.n, s.marca)).replace(/[^a-z0-9]+/g, "")}`;

/* ------------------------------------------------- Usuarios del portal */

/** `UsuarioPortal` con los campos del modelo nuevo ya completos (los antiguos siguen presentes y sincronizados). */
export type UsuarioPortalN = UsuarioPortal & {
  rolKey: RolPortal; zonaId: string | null; locales: string[]; extras: PermisoId[]; estado: EstadoUsuarioPortal;
  cargo: string; tel: string; foto: string | null;
};

/** Texto legado `rol/alc/val` (lo usan panel y listados antiguos) a partir del rol nuevo. */
export function legacyDe(rolKey: RolPortal, zonaNombre: string | null, localesNombres: string[]): Pick<UsuarioPortal, "rol" | "alc" | "val"> {
  switch (rolKey) {
    case "admin": return { rol: "Administrador cliente", alc: "Todo el cliente", val: "" };
    case "zona": return { rol: "Supervisor", alc: "Zona", val: zonaNombre ?? "" };
    case "locales": return { rol: "Supervisor", alc: "Sucursal", val: localesNombres.length > 3 ? `${localesNombres.length} sucursales` : localesNombres.join(", ") };
    case "encargado": return { rol: "Consulta", alc: "Sucursal", val: localesNombres[0] ?? "" };
  }
}

/** Completa un usuario (también uno creado con el formato antiguo rol/alc/val). */
export function normUsuario(u: UsuarioPortal): UsuarioPortalN {
  const rolKey: RolPortal = u.rolKey ?? (u.rol === "Administrador cliente" ? "admin" : u.alc === "Zona" ? "zona" : u.rol === "Consulta" ? "encargado" : "locales");
  return {
    ...u, rolKey, zonaId: u.zonaId ?? null, locales: u.locales ?? [], extras: u.extras ?? [],
    estado: u.estado ?? (u.activo ? "activo" : "suspendido"), cargo: u.cargo ?? "", tel: u.tel ?? "", foto: u.foto ?? null,
  };
}

/** Sucursales que ve el usuario: admin = todas, zona = su zona, locales = su lista, encargado = una. */
export function sucursalesVisibles(db: Db, u: UsuarioPortal): Sucursal[] {
  const n = normUsuario(u);
  const all = db.sucursales.filter((s) => s.cli === n.cli);
  switch (ROLES[n.rolKey].alcance) {
    case "todo": return all;
    case "zona": return all.filter((s) => n.zonaId !== null && zonaIdOf(db, s) === n.zonaId);
    case "locales": return all.filter((s) => n.locales.includes(sucKey(s)));
    case "local": return all.filter((s) => n.locales.includes(sucKey(s))).slice(0, 1);
  }
}
/** Texto del alcance: «Todo el cliente», «Zona Norte», «2 sucursales» o el nombre del local. */
export function alcanceLabel(db: Db, u: UsuarioPortal): string {
  const n = normUsuario(u);
  const cli = db.clients.find((c) => c.id === n.cli);
  switch (ROLES[n.rolKey].alcance) {
    case "todo": return "Todo el cliente";
    case "zona": return cli?.zonas.find((z) => zonaId(z) === n.zonaId)?.n ?? "Sin zona";
    case "locales": return n.locales.length === 1 ? (db.sucursales.find((s) => s.id === n.locales[0])?.n ?? "1 sucursal") : `${n.locales.length} sucursales`;
    case "local": return db.sucursales.find((s) => s.id === n.locales[0])?.n ?? "Sin local";
  }
}

/** Permisos efectivos = base del rol + permisos extra, en el orden del catálogo. */
export function permisosDe(u: UsuarioPortal): PermisoId[] {
  const n = normUsuario(u);
  const set = new Set<PermisoId>([...ROLES[n.rolKey].base, ...n.extras]);
  return PERMISOS.map((p) => p.id).filter((id) => set.has(id));
}
export const puede = (u: UsuarioPortal, p: PermisoId): boolean => permisosDe(u).includes(p);

export type AccesoVia = "Todo el cliente" | "Zona" | "Asignado a este local";
/** Personas con acceso a una sucursal según su rol y alcance (`zonaId` = `zonaIdOf(db, s)`). */
export function accesoA(usuarios: UsuarioPortal[], s: Sucursal, zonaIdDeS: string | null): { u: UsuarioPortalN; via: AccesoVia }[] {
  const k = sucKey(s);
  return usuarios.map(normUsuario).flatMap((u): { u: UsuarioPortalN; via: AccesoVia }[] => {
    if (u.cli !== s.cli) return [];
    if (u.rolKey === "admin") return [{ u, via: "Todo el cliente" }];
    if (u.rolKey === "zona") return zonaIdDeS !== null && u.zonaId === zonaIdDeS ? [{ u, via: "Zona" }] : [];
    return u.locales.includes(k) ? [{ u, via: "Asignado a este local" }] : [];
  });
}
/** `accesoA` resolviendo la zona desde `db`. */
export const accesoDe = (db: Db, s: Sucursal) => accesoA(db.usuariosPortal, s, zonaIdOf(db, s));

/** Resuelve quién es el usuario de la sesión: por correo, por nombre o por el perfil de la cuenta (demo). */
export function resolverUsuarioPortal(db: Db, q: { email?: string; name?: string; perfil?: PerfilCuenta }): UsuarioPortalN | null {
  const l = db.usuariosPortal;
  const e = q.email?.trim().toLowerCase();
  const u = (e && l.find((x) => x.m.toLowerCase() === e)) || (q.name && l.find((x) => x.n === q.name)) || (q.perfil && l.find((x) => x.id === PERFIL_DEMO[q.perfil!])) || null;
  return u ? normUsuario(u) : null;
}

/** Zonas del cliente con su id, para selectores y filtros. */
export const zonasPortal = (db: Db, cliId: string): { id: string; nombre: string; total: number }[] => {
  const cli = db.clients.find((c) => c.id === cliId);
  return (cli?.zonas ?? []).map((z: Zona) => ({ id: zonaId(z), nombre: z.n, total: db.sucursales.filter((s) => s.cli === cliId && zonaIdOf(db, s) === zonaId(z)).length }));
};
export const zonaNombre = (db: Db, cliId: string, id: string | null): string =>
  db.clients.find((c) => c.id === cliId)?.zonas.find((z) => zonaId(z) === id)?.n ?? "Sin zona";

/* ------------------------------------- Sucursales, reportes, cuentas, avisos */

/** Estado derivado: crítica con un ticket alto abierto; con observaciones si hay tickets abiertos o reportes pendientes. */
export function estadoSucursal(db: Db, s: Sucursal): EstadoSucursal {
  const tk = db.tickets.filter((t) => t.suc === s.id && t.estado !== "Cerrado");
  if (tk.some((t) => t.prio === "Alta")) return "critica";
  if (tk.length || db.reportes.some((r) => r.suc === s.id && reportePendiente(r))) return "observaciones";
  return "operativa";
}

/** Reportes de los locales que el usuario puede ver, del más nuevo al más antiguo (ISO ordena como texto). */
export function reportesVisibles(db: Db, u: UsuarioPortal): Reporte[] {
  const ids = new Set(sucursalesVisibles(db, u).map(sucKey));
  return db.reportes.filter((r) => ids.has(r.suc)).sort((a, b) => b.f.localeCompare(a.f) || b.id.localeCompare(a.id));
}
export const reportesPendientes = (db: Db, u: UsuarioPortal): Reporte[] => reportesVisibles(db, u).filter(reportePendiente);

export const estadoCuenta = (db: Db, s: Pick<Sucursal, "id">): EstadoCuentaVista => db.cuentas[sucKey(s)]?.estado ?? "sin_cuenta";

/** Avisos del usuario que su preferencia deja ver en el portal, del más reciente al más antiguo. */
export function avisosVisibles(db: Db, usuarioId: string): AvisoPortal[] {
  const pr = db.prefs[usuarioId] ?? prefsPorDefecto();
  return (db.avisos[usuarioId] ?? []).filter((a) => pr.tipos[a.tipo]?.portal !== false).sort((a, b) => b.f.localeCompare(a.f) || b.id.localeCompare(a.id));
}
export const avisosSinLeer = (db: Db, usuarioId: string): number => avisosVisibles(db, usuarioId).filter((a) => !a.leida).length;

/* ------------------------------------------------------------ Validaciones */

export const emailValid = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const phoneValid = (v: string): boolean => /^\+?[\d\s]{8,15}$/.test(v.trim());
/** Campo numérico opcional: vacío o hasta 5 dígitos. */
export const optionalIntValid = (v: string | number): boolean => String(v).trim() === "" || /^\d{1,5}$/.test(String(v).trim());
export const intOrNull = (v: string | number): number | null => (String(v).trim() === "" ? null : Number(v));

export const PASSWORD_RULES: { id: string; label: string; test: (v: string) => boolean }[] = [
  { id: "len", label: "Al menos 8 caracteres", test: (v) => v.length >= 8 },
  { id: "up", label: "Una mayúscula", test: (v) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { id: "num", label: "Un número", test: (v) => /\d/.test(v) },
  { id: "sym", label: "Un símbolo", test: (v) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(v) },
];
/** Reglas de contraseña que aún no se cumplen. */
export const passwordFaltantes = (v: string): string[] => PASSWORD_RULES.filter((r) => !r.test(v)).map((r) => r.label);
export const passwordValid = (v: string): boolean => PASSWORD_RULES.every((r) => r.test(v));

/* Conveniencia: fechas dd-mm-aaaa y RUT enmascarado viven en lib/format.ts. */
export { maskRut, parseDMY, parseDMYHM, dmyToIso, fdt } from "./format";
