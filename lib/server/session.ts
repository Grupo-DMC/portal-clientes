import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* Sesión en cookie httpOnly firmada con HMAC-SHA256. No guarda datos
   sensibles: solo superficie e identidad; el resto se resuelve en servidor. */
export type Kind = "panel" | "portal" | "local" | "pending";
export type Payload = {
  k: Kind;
  /** email (panel/portal) o id de sucursal (local) */
  id: string;
  exp: number;
  /** pendiente: qué falta para completar el ingreso */
  need?: "mfa" | "first" | "reset";
  surface?: "panel" | "portal";
  remember?: boolean;
};

const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret";
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET no configurado (mínimo 32 caracteres).");
  return DEV_SECRET;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function encode(p: Payload): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}
export function decode(token: string | undefined): Payload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const good = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (good.length !== got.length || !timingSafeEqual(good, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "dmc_session";
const PENDING = "dmc_pending";
const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function setSession(p: Omit<Payload, "exp">, remember = false) {
  const ttl = remember ? 1000 * 60 * 60 * 24 * 14 : 1000 * 60 * 60 * 8;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encode({ ...p, exp: Date.now() + ttl }), { ...base, ...(remember ? { maxAge: ttl / 1000 } : {}) });
  jar.delete(PENDING);
}
export async function setPending(p: Omit<Payload, "exp" | "k">) {
  const jar = await cookies();
  jar.set(PENDING, encode({ ...p, k: "pending", exp: Date.now() + 1000 * 60 * 10 }), { ...base, maxAge: 600 });
}
export async function getSession(): Promise<Payload | null> {
  const p = decode((await cookies()).get(SESSION_COOKIE)?.value);
  return p && p.k !== "pending" ? p : null;
}
export async function getPending(): Promise<Payload | null> {
  const p = decode((await cookies()).get(PENDING)?.value);
  return p && p.k === "pending" ? p : null;
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING);
}
