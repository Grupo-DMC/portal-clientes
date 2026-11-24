import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* Sesión en cookie httpOnly firmada con HMAC-SHA256. No guarda datos
   sensibles: solo superficie e identidad; el resto se resuelve en servidor. */
export type Kind = "panel" | "portal";
export type Payload = {
  k: Kind;
  /** email de la cuenta */
  id: string;
  exp: number;
  /** id de la cuenta: seguridad.usuario.id (panel) o seguridad.usuario_cliente.id (portal). */
  uc?: number;
  /** Solo portal: cliente_id de la cuenta (el único filtro de datos; nunca sale de la URL ni del body). */
  c?: number;
  /** sesion_version al iniciar sesión. Si cambia en la base, la sesión deja de valer. */
  sv?: number;
  /** «Recordarme»: la cookie es persistente. */
  r?: boolean;
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
const LEGACY_PENDING = "dmc_pending";
const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function setSession(p: Omit<Payload, "exp">, remember = false) {
  const ttl = remember ? 1000 * 60 * 60 * 24 * 14 : 1000 * 60 * 60 * 8;
  await setSessionHasta({ ...p, r: remember || undefined }, Date.now() + ttl, remember);
}

/** Reemite la sesión con el mismo vencimiento (p. ej. tras cambiar la clave, con la nueva sesion_version). */
export async function setSessionHasta(p: Omit<Payload, "exp">, exp: number, persistente: boolean) {
  const jar = await cookies();
  const maxAge = Math.max(0, Math.floor((exp - Date.now()) / 1000));
  jar.set(SESSION_COOKIE, encode({ ...p, exp }), { ...base, ...(persistente ? { maxAge } : {}) });
  // Restos del flujo anterior de varios pasos.
  jar.delete(LEGACY_PENDING);
}
export async function getSession(): Promise<Payload | null> {
  const p = decode((await cookies()).get(SESSION_COOKIE)?.value);
  return p && (p.k === "panel" || p.k === "portal") ? p : null;
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(LEGACY_PENDING);
}
