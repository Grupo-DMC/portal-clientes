"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { log } from "@/lib/log";
import {
  actualizarDatosCliente,
  bloqueadoPorIntentos,
  cambiarPassword,
  correoEnUso,
  esClaveActual,
  registrarIntento,
} from "@/lib/server/cuentas";
import { sesionPortalActiva } from "@/lib/server/portalSesion";
import { setSessionHasta } from "@/lib/server/session";
import { emailSchema } from "@/lib/schemas";

// Perfil de la cuenta del portal: nombre, correo y contraseña, guardados en
// seguridad.usuario_cliente. La cuenta sale SIEMPRE de la sesión (cookie firmada
// + validación contra la base), nunca del formulario.
//
// Seguridad:
// - Cambiar el correo (que es el usuario de ingreso) o la contraseña exige la
//   contraseña actual. Los fallos se anotan en seguridad.intento_login y cuentan
//   para el mismo límite que el login (5 por correo en 15 min).
// - El correo no puede repetirse con otra cuenta de cliente ni del equipo DMC.
// - Cambiar la contraseña sube sesion_version: cierra las demás sesiones y esta
//   se reemite con la versión nueva.

type Campo = "nombre" | "correo" | "actual" | "nueva" | "confirmar";
export type ResultadoPerfil =
  | { ok: true; nombre: string; correo: string; mensaje: string }
  | { ok: false; error: string; campo?: Campo };

const SESION = "Tu sesión expiró. Vuelve a ingresar.";
const FALLA = "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.";
const MUCHOS = "Demasiados intentos con una contraseña incorrecta. Espera unos minutos e inténtalo de nuevo.";

/** Mismas reglas que muestra el formulario (PASSWORD_RULES). 72: límite de bcrypt. */
const claveNueva = z
  .string()
  .min(8, "Usa al menos 8 caracteres.")
  .max(72, "Usa como máximo 72 caracteres.")
  .regex(/[A-ZÁÉÍÓÚÑ]/, "Incluye al menos una mayúscula.")
  .regex(/\d/, "Incluye al menos un número.")
  .regex(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/, "Incluye al menos un símbolo.");

const datosSchema = z.object({
  nombre: z.string().trim().min(3, "Escribe tu nombre y apellido.").max(120, "Usa como máximo 120 caracteres."),
  correo: emailSchema,
  actual: z.string().max(128).default(""),
});

const claveSchema = z
  .object({ actual: z.string().min(1, "Escribe tu contraseña actual.").max(128), nueva: claveNueva, confirmar: z.string() })
  .refine((d) => d.nueva === d.confirmar, { message: "Las contraseñas no coinciden.", path: ["confirmar"] })
  .refine((d) => d.nueva !== d.actual, { message: "Debe ser distinta a la actual.", path: ["nueva"] });

async function ip(): Promise<string | null> {
  const h = await headers();
  const v = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "";
  return v ? v.slice(0, 64) : null;
}

async function sesion() {
  const s = await sesionPortalActiva().catch(() => null);
  return s?.cookie.uc && s.cookie.sv !== undefined ? s : null;
}

/** Verifica la contraseña actual con límite de intentos. null = correcta; texto = error para el campo «actual». */
async function verificarActual(email: string, id: number, actual: string): Promise<string | null> {
  const dir = await ip();
  if (await bloqueadoPorIntentos(email, dir)) return MUCHOS;
  const ok = await esClaveActual("cliente", id, actual);
  if (!ok) {
    await registrarIntento(email, dir, false);
    return (await bloqueadoPorIntentos(email, dir)) ? MUCHOS : "La contraseña actual no es correcta.";
  }
  return null;
}

/** Guarda nombre y correo. Si el correo cambia, pide la contraseña actual. */
export async function guardarDatosPerfil(input: unknown): Promise<ResultadoPerfil> {
  const s = await sesion();
  if (!s) return { ok: false, error: SESION };
  const p = datosSchema.safeParse(input);
  if (!p.success) {
    const i = p.error.issues[0];
    return { ok: false, error: i?.message ?? "Datos no válidos.", campo: i?.path[0] === "correo" ? "correo" : "nombre" };
  }
  const { nombre, correo, actual } = p.data;
  const id = s.cookie.uc!;
  const cambiaCorreo = correo !== s.ctx.email.toLowerCase();

  try {
    if (cambiaCorreo) {
      if (!actual) return { ok: false, error: "Para cambiar el correo, escribe tu contraseña actual.", campo: "actual" };
      const e = await verificarActual(s.ctx.email, id, actual);
      if (e) return { ok: false, error: e, campo: "actual" };
      if (await correoEnUso(correo, id)) return { ok: false, error: "Ese correo ya lo usa otra cuenta.", campo: "correo" };
    }
    const r = await actualizarDatosCliente(id, s.cookie.sv!, nombre, correo);
    if (r === "sesion") return { ok: false, error: SESION };
    if (r === "correo_en_uso") return { ok: false, error: "Ese correo ya lo usa otra cuenta.", campo: "correo" };

    // La cookie guarda el correo como identificador: se reemite con el nuevo, mismo vencimiento.
    if (cambiaCorreo) {
      const { exp, ...resto } = s.cookie;
      await setSessionHasta({ ...resto, id: correo }, exp, !!resto.r);
    }
    log.info("perfil.datos", { usuarioId: id, cambioCorreo: cambiaCorreo });
    return {
      ok: true,
      nombre,
      correo,
      mensaje: cambiaCorreo ? `Datos guardados. Desde ahora ingresas con ${correo}.` : "Datos guardados.",
    };
  } catch (err) {
    log.error("perfil.datos", { err, usuarioId: id });
    return { ok: false, error: FALLA };
  }
}

/** Cambia la contraseña desde el perfil (con la actual). Cierra las demás sesiones. */
export async function cambiarClavePerfil(input: unknown): Promise<ResultadoPerfil> {
  const s = await sesion();
  if (!s) return { ok: false, error: SESION };
  const p = claveSchema.safeParse(input);
  if (!p.success) {
    const i = p.error.issues[0];
    const campo = (["actual", "nueva", "confirmar"] as const).find((c) => c === i?.path[0]) ?? "nueva";
    return { ok: false, error: i?.message ?? "Datos no válidos.", campo };
  }
  const id = s.cookie.uc!;
  try {
    const e = await verificarActual(s.ctx.email, id, p.data.actual);
    if (e) return { ok: false, error: e, campo: "actual" };
    const version = await cambiarPassword("cliente", id, s.cookie.sv!, p.data.nueva);
    if (version === null) return { ok: false, error: SESION };
    const { exp, ...resto } = s.cookie;
    await setSessionHasta({ ...resto, sv: version }, exp, !!resto.r);
    log.info("perfil.clave", { usuarioId: id });
    return { ok: true, nombre: s.ctx.nombre, correo: s.ctx.email, mensaje: "Contraseña actualizada. Cerramos tus otras sesiones abiertas." };
  } catch (err) {
    log.error("perfil.clave", { err, usuarioId: id });
    return { ok: false, error: FALLA };
  }
}
