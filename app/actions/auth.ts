"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { log } from "@/lib/log";
import { inicioEquipo, mantenimientoDmc } from "@/lib/mantenimiento";
import {
  bloqueadoPorIntentos,
  cambiarPassword,
  esClaveActual,
  marcarAcceso,
  registrarIntento,
  verificarCredenciales,
  type TipoCuenta,
} from "@/lib/server/cuentas";
import { sesionVigente } from "@/lib/server/portalSesion";
import { clearSession, setSession, setSessionHasta } from "@/lib/server/session";
import { cambioClaveSchema, emailSchema, loginSchema } from "@/lib/schemas";

/* Login único contra DMC_Core. El servidor decide por la cuenta encontrada:
   equipo DMC con rol ADMIN o COORDINADOR (seguridad.usuario) → /panel;
   cliente (seguridad.usuario_cliente) → /portal. El navegador nunca lo elige. */
export type LoginResult = { step: "error"; error: string } | { step: "done"; to: string };

const BAD = "Correo o contraseña incorrectos.";
const TOO_MANY = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
const FALLA_BD = "No pudimos validar tu acceso. Inténtalo de nuevo en unos minutos.";

const destino = (tipo: TipoCuenta) => (tipo === "equipo" ? inicioEquipo() : "/portal");

/** IP del cliente según el proxy de delante. Es falsificable sin un proxy de confianza: por eso el límite también va por correo. */
async function ipDelCliente(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "";
  return ip ? ip.slice(0, 64) : null;
}

/**
 * Límite por correo e IP (seguridad.intento_login) → bcrypt.compare → activo →
 * registro del intento → último acceso → sesión con id de cuenta, cliente_id
 * (portal) y sesion_version. Mismo mensaje si el correo no existe, la clave no
 * calza, la cuenta está inactiva o no tiene rol para el panel.
 */
export async function iniciarSesion(input: unknown): Promise<LoginResult> {
  const p = loginSchema.safeParse(input);
  if (!p.success) return { step: "error", error: p.error.issues[0]?.message ?? "Datos no válidos." };
  const { email, password, remember } = p.data;

  try {
    const ip = await ipDelCliente();
    if (await bloqueadoPorIntentos(email, ip)) return { step: "error", error: TOO_MANY };

    const cuenta = await verificarCredenciales(email, password);
    await registrarIntento(email, ip, !!cuenta);
    if (!cuenta) {
      return { step: "error", error: (await bloqueadoPorIntentos(email, ip)) ? TOO_MANY : BAD };
    }

    await marcarAcceso(cuenta.tipo, cuenta.id);
    if (cuenta.tipo === "cliente") {
      await setSession({ k: "portal", id: cuenta.email, uc: cuenta.id, c: cuenta.clienteId ?? undefined, sv: cuenta.sesionVersion }, remember);
    } else {
      await setSession({ k: "panel", id: cuenta.email, uc: cuenta.id, sv: cuenta.sesionVersion }, remember);
    }
    log.info("login", { usuarioId: cuenta.id, tipo: cuenta.tipo, cambioClave: cuenta.debeCambiarPassword });
    // En mantenimiento la cuenta DMC va directo a /mantenimiento (no se le pide cambiar la clave en el portal).
    const enMantenimiento = cuenta.tipo === "equipo" && mantenimientoDmc();
    return { step: "done", to: cuenta.debeCambiarPassword && !enMantenimiento ? "/cambiar-clave" : destino(cuenta.tipo) };
  } catch (err) {
    log.error("login", { err });
    return { step: "error", error: FALLA_BD };
  }
}

export type CambioClaveResult = { ok: true; to: string } | { ok: false; error: string; campo?: "nueva" | "confirmar" };

/** Cambio de clave obligatorio (debe_cambiar_password = 1). La cuenta sale de la sesión, nunca del formulario. */
export async function cambiarClave(input: unknown): Promise<CambioClaveResult> {
  const ses = await sesionVigente().catch(() => null);
  if (!ses?.cookie.uc || ses.cookie.sv === undefined) return { ok: false, error: "Tu sesión expiró. Vuelve a ingresar." };

  const p = cambioClaveSchema.safeParse(input);
  if (!p.success) {
    const issue = p.error.issues[0];
    return { ok: false, error: issue?.message ?? "Datos no válidos.", campo: issue?.path[0] === "confirmar" ? "confirmar" : "nueva" };
  }

  const tipo: TipoCuenta = ses.tipo === "panel" ? "equipo" : "cliente";
  const { uc, sv } = ses.cookie;
  try {
    if (await esClaveActual(tipo, uc, p.data.nueva)) {
      return { ok: false, error: "La nueva clave debe ser distinta de la actual.", campo: "nueva" };
    }
    const version = await cambiarPassword(tipo, uc, sv, p.data.nueva);
    if (version === null) return { ok: false, error: "Tu sesión expiró. Vuelve a ingresar." };
    // La nueva sesion_version invalida las demás sesiones; esta se reemite con ella.
    const { exp, ...resto } = ses.cookie;
    await setSessionHasta({ ...resto, sv: version }, exp, !!resto.r);
    log.info("login.cambioClave", { usuarioId: uc, tipo });
    return { ok: true, to: destino(tipo) };
  } catch (err) {
    log.error("login.cambioClave", { err, usuarioId: uc });
    return { ok: false, error: FALLA_BD };
  }
}

/** Siempre responde igual, exista o no la cuenta (no se puede enumerar usuarios). */
export async function solicitarRecuperacion(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const e = emailSchema.safeParse((input as { email?: unknown } | null)?.email);
  if (!e.success) return { ok: false, error: e.error.issues[0]?.message ?? "Correo no válido." };
  // PENDIENTE: integrar el mailer (enlace de recuperación de un solo uso con
  // vencimiento). Hasta entonces no se envía nada. No registrar el correo ni tokens.
  return { ok: true };
}

export async function cerrarSesion(): Promise<void> {
  await clearSession();
  redirect("/login?salio=1");
}
