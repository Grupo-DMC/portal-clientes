import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ClientePortalDto, ContextoPortal } from "@/lib/contratos/portal";
import { log } from "@/lib/log";
import { RUTA_MANTENIMIENTO, mantenimientoDmc } from "@/lib/mantenimiento";
import { estadoCliente, estadoEquipo, type Cuenta } from "@/lib/server/cuentas";
import { getSession, type Payload } from "@/lib/server/session";

// Sesiones validadas contra DMC_Core en CADA request.
//
// La cookie (firmada) trae el id de la cuenta y su sesion_version (y, en el
// portal, el cliente_id). Aquí se comparan con seguridad.usuario /
// seguridad.usuario_cliente: si la cuenta se desactivó, perdió su rol, cambió
// de cliente o subió su sesion_version (cambio de clave, cierre forzado), la
// sesión deja de valer. El cliente_id de los datos sale SOLO de aquí: nunca de
// la URL ni del body.

export interface SesionPortal {
  ctx: ContextoPortal;
  /** La cuenta debe cambiar la clave antes de entrar. */
  debeCambiarPassword: boolean;
  /** Datos del cliente para la cabecera. */
  cliente: ClientePortalDto;
  /** La cookie vigente, para reemitirla. */
  cookie: Payload;
}

export interface SesionPanel {
  cuenta: Cuenta;
  cookie: Payload;
}

async function resolverPortal(): Promise<SesionPortal | null> {
  const ses = await getSession();
  if (ses?.k !== "portal" || !ses.uc || !ses.c || ses.sv === undefined) return null;
  const cuenta = await estadoCliente(ses.uc);
  if (!cuenta || !cuenta.activo || cuenta.clienteId !== ses.c || cuenta.sesionVersion !== ses.sv) {
    log.info("sesion.portal", { usuarioId: ses.uc, aviso: "sesión invalidada (cuenta inactiva, otro cliente o sesion_version distinta)" });
    return null;
  }
  return {
    ctx: {
      email: cuenta.email,
      clienteId: String(cuenta.clienteId),
      clienteIdBd: cuenta.clienteId,
      nombre: cuenta.nombre,
      rol: "Cliente",
    },
    debeCambiarPassword: cuenta.debeCambiarPassword,
    cliente: { ...cuenta.cliente, logo: null },
    cookie: ses,
  };
}

async function resolverPanel(): Promise<SesionPanel | null> {
  const ses = await getSession();
  if (ses?.k !== "panel" || !ses.uc || ses.sv === undefined) return null;
  const cuenta = await estadoEquipo(ses.uc);
  if (!cuenta || !cuenta.activo || cuenta.sesionVersion !== ses.sv) {
    log.info("sesion.panel", { usuarioId: ses.uc, aviso: "sesión invalidada (cuenta inactiva, sin rol de panel o sesion_version distinta)" });
    return null;
  }
  return { cuenta, cookie: ses };
}

/** Una consulta por request aunque la pidan el layout, la página y el título. */
export const sesionPortal = cache(resolverPortal);
export const sesionPanel = cache(resolverPanel);

/** Sesión del portal lista para leer datos: válida y sin cambio de clave pendiente. */
export async function sesionPortalActiva(): Promise<SesionPortal | null> {
  const s = await sesionPortal();
  return s && !s.debeCambiarPassword ? s : null;
}

/**
 * Para páginas del portal: sin sesión válida → /login; con cambio de clave
 * pendiente → /cambiar-clave. Las páginas lo llaman además del layout porque
 * en una navegación interna Next puede no volver a renderizar el layout.
 */
export async function exigirSesionPortal(): Promise<SesionPortal> {
  const s = await sesionPortal();
  if (!s) redirect("/login");
  if (s.debeCambiarPassword) redirect("/cambiar-clave");
  return s;
}

export async function exigirSesionPanel(): Promise<SesionPanel> {
  const s = await sesionPanel();
  if (!s) redirect("/login");
  if (mantenimientoDmc()) redirect(RUTA_MANTENIMIENTO);
  if (s.cuenta.debeCambiarPassword) redirect("/cambiar-clave");
  return s;
}

/** La sesión vigente de cualquier tipo (para el cambio de clave y las redirecciones del login). */
export async function sesionVigente(): Promise<
  { tipo: "portal"; nombre: string; debeCambiar: boolean; cookie: Payload } | { tipo: "panel"; nombre: string; debeCambiar: boolean; cookie: Payload } | null
> {
  const ses = await getSession();
  if (ses?.k === "portal") {
    const s = await sesionPortal();
    return s ? { tipo: "portal", nombre: s.ctx.nombre, debeCambiar: s.debeCambiarPassword, cookie: s.cookie } : null;
  }
  if (ses?.k === "panel") {
    const s = await sesionPanel();
    return s ? { tipo: "panel", nombre: s.cuenta.nombre, debeCambiar: s.cuenta.debeCambiarPassword, cookie: s.cookie } : null;
  }
  return null;
}
