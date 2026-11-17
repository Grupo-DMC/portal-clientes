"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { findAcct, type Surface } from "@/lib/server/accounts";
import { rt } from "@/lib/server/runtime";
import { clearSession, getPending, setPending, setSession } from "@/lib/server/session";
import { codeSchema, emailSchema, loginSchema, newPasswordSchema } from "@/lib/schemas";

/* Ingreso al panel interno y al portal cliente. Toda decisión se toma aquí:
   el navegador nunca recibe contraseñas ni decide si una cuenta está activa. */
export type LoginResult =
  | { step: "error"; error: string }
  | { step: "locked"; why: "tries" | "admin" }
  | { step: "inactive" }
  | { step: "first"; reset?: boolean }
  | { step: "mfa" }
  | { step: "done"; to: string }
  | { step: "login"; notice: string };

const DEMO_CODE = "123456";
const MAX_TRIES = 3;
const HOME: Record<Surface, string> = { panel: "/panel", portal: "/portal" };

const same = (a: string, b: string) => {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
};
const keyOf = (s: Surface, email: string) => `${s}:${email.trim().toLowerCase()}`;
const surfaceSchema = z.enum(["panel", "portal"]);

export async function iniciarSesion(input: unknown): Promise<LoginResult> {
  const p = loginSchema.safeParse(input);
  if (!p.success) return { step: "error", error: p.error.issues[0]?.message ?? "Datos no válidos." };
  const { surface, email, password, remember } = p.data;
  const key = keyOf(surface, email);
  const acct = findAcct(surface, email);

  if (rt.locked.has(key) || acct?.status === "bloqueado") return { step: "locked", why: rt.locked.has(key) ? "tries" : "admin" };

  const good = !!acct && same(rt.pw.get(key) ?? acct.pass, password);
  if (!good) {
    const t = (rt.tries.get(key) ?? 0) + 1;
    if (t >= MAX_TRIES) {
      rt.locked.add(key);
      rt.tries.delete(key);
      return { step: "locked", why: "tries" };
    }
    rt.tries.set(key, t);
    const left = MAX_TRIES - t;
    return { step: "error", error: `Correo o contraseña incorrectos. Te quedan ${left} ${left === 1 ? "intento" : "intentos"}.` };
  }
  rt.tries.delete(key);

  if (acct.status === "inactivo") return { step: "inactive" };
  if (acct.status === "primer" && !rt.pw.has(key)) {
    await setPending({ id: acct.email, surface, need: "first", remember });
    return { step: "first" };
  }
  if (acct.mfa) {
    await setPending({ id: acct.email, surface, need: "mfa", remember });
    return { step: "mfa" };
  }
  await setSession({ k: surface, id: acct.email }, remember);
  return { step: "done", to: HOME[surface] };
}

export async function verificarMfa(code: unknown): Promise<LoginResult> {
  const c = codeSchema.safeParse(code);
  if (!c.success) return { step: "error", error: c.error.issues[0]?.message ?? "Código no válido." };
  const pend = await getPending();
  if (!pend || pend.need !== "mfa" || !pend.surface) return { step: "login", notice: "Tu verificación venció. Ingresa de nuevo." };
  if (!same(c.data, DEMO_CODE)) return { step: "error", error: "El código es incorrecto o venció. Revisa el último mensaje recibido." };
  await setSession({ k: pend.surface, id: pend.id }, pend.remember);
  return { step: "done", to: HOME[pend.surface] };
}

export async function definirPassword(input: unknown): Promise<LoginResult> {
  const p = newPasswordSchema.safeParse(input);
  if (!p.success) return { step: "error", error: p.error.issues[0]?.message ?? "Contraseña no válida." };
  const pend = await getPending();
  if (!pend || !pend.surface || (pend.need !== "first" && pend.need !== "reset")) {
    return { step: "login", notice: "El enlace venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?»." };
  }
  const key = keyOf(pend.surface, pend.id);
  if (findAcct(pend.surface, pend.id)) {
    rt.pw.set(key, p.data.np);
    rt.locked.delete(key);
    rt.tries.delete(key);
  }
  if (pend.need === "reset") {
    await clearSession();
    return { step: "login", notice: "Contraseña actualizada. Ingresa con tu nueva contraseña." };
  }
  const acct = findAcct(pend.surface, pend.id);
  if (acct?.mfa) {
    await setPending({ id: pend.id, surface: pend.surface, need: "mfa", remember: pend.remember });
    return { step: "mfa" };
  }
  await setSession({ k: pend.surface, id: pend.id }, pend.remember);
  return { step: "done", to: HOME[pend.surface] };
}

/** Siempre responde igual, exista o no la cuenta (no se puede enumerar usuarios). */
export async function solicitarRecuperacion(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const e = emailSchema.safeParse((input as { email?: string })?.email);
  if (!e.success) return { ok: false, error: e.error.issues[0]?.message ?? "Correo no válido." };
  return { ok: true };
}

/** Solo demostración: simula abrir el enlace que llegaría por correo. */
export async function abrirEnlaceDemo(input: unknown): Promise<LoginResult> {
  const o = z.object({ surface: surfaceSchema, email: emailSchema }).safeParse(input);
  if (!o.success) return { step: "error", error: "Correo no válido." };
  await setPending({ id: o.data.email, surface: o.data.surface, need: "reset" });
  return { step: "first", reset: true };
}

export async function solicitarDesbloqueo(): Promise<{ ok: true }> {
  return { ok: true };
}

export async function cerrarSesion(surface: Surface): Promise<void> {
  const s = surfaceSchema.parse(surface);
  await clearSession();
  redirect(`/${s}/login?salio=1`);
}
