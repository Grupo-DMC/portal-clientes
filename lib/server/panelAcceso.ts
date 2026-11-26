import "server-only";
import { notFound } from "next/navigation";
import { exigirSesionPanel, type SesionPanel } from "@/lib/server/portalSesion";

// Módulos del panel interno y qué rol ve cada uno.
//
// Entran al panel ADMIN y COORDINADOR (lib/server/cuentas.ts → ROLES_PANEL).
// Las cuentas, los roles y la auditoría tocan seguridad.* (correos, accesos,
// IPs): solo ADMIN. El resto lo ven ambos roles. Todo es de solo lectura,
// salvo los logos (que ya existían y siguen igual).

export type Modulo =
  | "dashboard"
  | "clientes"
  | "sucursales"
  | "malls"
  | "logos"
  | "visitas"
  | "problemas"
  | "garantias"
  | "actividad"
  | "catalogos"
  | "usuarios"
  | "auditoria";

const SOLO_ADMIN: ReadonlySet<Modulo> = new Set(["usuarios", "auditoria"]);

export function puedeVer(roles: readonly string[], modulo: Modulo): boolean {
  if (roles.includes("ADMIN")) return true;
  return roles.includes("COORDINADOR") && !SOLO_ADMIN.has(modulo);
}

export interface ItemMenu {
  href: string;
  label: string;
  icon: string;
}
export interface GrupoMenu {
  label?: string;
  items: ItemMenu[];
}

const MENU: { label?: string; items: (ItemMenu & { modulo: Modulo })[] }[] = [
  { items: [{ modulo: "dashboard", href: "/panel", label: "Dashboard", icon: "dashboard" }] },
  {
    label: "Gestión",
    items: [
      { modulo: "clientes", href: "/panel/clientes", label: "Clientes", icon: "building" },
      { modulo: "sucursales", href: "/panel/sucursales", label: "Sucursales", icon: "store" },
      { modulo: "malls", href: "/panel/malls", label: "Malls", icon: "pin" },
      { modulo: "logos", href: "/panel/logos", label: "Logos de clientes", icon: "image" },
    ],
  },
  {
    label: "Operación",
    items: [
      { modulo: "visitas", href: "/panel/visitas", label: "Visitas", icon: "visit" },
      { modulo: "problemas", href: "/panel/problemas", label: "Problemas", icon: "flag" },
      { modulo: "garantias", href: "/panel/garantias", label: "Garantías y calibraciones", icon: "shieldOk" },
      { modulo: "actividad", href: "/panel/actividad", label: "Actividad", icon: "bell" },
    ],
  },
  {
    label: "Administración",
    items: [
      { modulo: "catalogos", href: "/panel/catalogos", label: "Catálogos", icon: "list" },
      { modulo: "usuarios", href: "/panel/usuarios", label: "Usuarios y permisos", icon: "users" },
      { modulo: "auditoria", href: "/panel/auditoria", label: "Auditoría", icon: "history" },
    ],
  },
];

/** Menú lateral con solo los módulos que el rol puede ver (datos planos, para el cliente). */
export function menuPara(roles: readonly string[]): GrupoMenu[] {
  return MENU.map((g) => ({
    label: g.label,
    items: g.items.filter((it) => puedeVer(roles, it.modulo)).map(({ href, label, icon }) => ({ href, label, icon })),
  })).filter((g) => g.items.length > 0);
}

/** Id numérico de un segmento [id] de la URL; cualquier otra cosa es 404. */
export function idDeRuta(valor: string): number {
  const n = /^\d{1,15}$/.test(valor) ? Number(valor) : NaN;
  if (!Number.isSafeInteger(n) || n <= 0) notFound();
  return n;
}

/**
 * Puerta de cada página del panel: sesión válida (si no, /login) y rol con
 * acceso al módulo. Sin acceso responde 404, igual que una ruta inexistente,
 * para no confirmar qué hay detrás.
 */
export async function exigirModulo(modulo: Modulo): Promise<SesionPanel> {
  const s = await exigirSesionPanel();
  if (!puedeVer(s.cuenta.roles, modulo)) notFound();
  return s;
}
