"use server";

import { redirect } from "next/navigation";
import { findAcctByEmail, surfaceOf } from "@/lib/server/accounts";
import { DUMMY_HASH, verifyPassword } from "@/lib/server/password";
import { rt } from "@/lib/server/runtime";
import { clearSession, setSession } from "@/lib/server/session";
import { emailSchema, loginSchema } from "@/lib/schemas";

/* Login único. El servidor decide, por correo + directorio de cuentas, si la
   cuenta entra al panel interno (equipo DMC) o al portal cliente. */
export type LoginResult = { step: "error"; error: string } | { step: "done"; to: string };

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const BAD = "Correo o contraseña incorrectos.";
const TOO_MANY = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";

/* Clave del límite: solo el correo normalizado. No se usa la IP porque
   x-forwarded-for es falsificable sin un proxy de confianza delante. */
const keyOf = (email: string) => `login:${email.trim().toLowerCase()}`;

export async function iniciarSesion(input: unknown): Promise<LoginResult> {
  const p = loginSchema.safeParse(input);
  if (!p.success) return { step: "error", error: p.error.issues[0]?.message ?? "Datos no válidos." };
  const { email, password, remember } = p.data;
  const key = keyOf(email);
  const now = Date.now();

  const f = rt.fails.get(key);
  if (f && f.until > now) return { step: "error", error: TOO_MANY };
  if (f && f.until && f.until <= now) rt.fails.delete(key);

  const acct = findAcctByEmail(email);
  const usable = acct?.status === "ok" ? acct : undefined;
  // Siempre se verifica (con hash de relleno si no hay cuenta usable) para tiempo constante.
  const good = (await verifyPassword(password, usable?.passHash ?? DUMMY_HASH)) && !!usable;

  if (!good) {
    const count = (rt.fails.get(key)?.count ?? 0) + 1;
    if (count >= MAX_FAILS) {
      rt.fails.set(key, { count: 0, until: now + LOCK_MS });
      return { step: "error", error: TOO_MANY };
    }
    rt.fails.set(key, { count, until: 0 });
    return { step: "error", error: BAD };
  }

  rt.fails.delete(key);
  const surface = surfaceOf(usable);
  await setSession({ k: surface, id: usable.email }, remember);
  return { step: "done", to: surface === "panel" ? "/panel" : "/portal" };
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
