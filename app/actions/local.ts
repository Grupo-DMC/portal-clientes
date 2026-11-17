"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { seed, type Ticket } from "@/lib/data";
import { localLoginSchema, reporteSchema } from "@/lib/schemas";
import { rt } from "@/lib/server/runtime";
import { clearSession, getSession, setSession } from "@/lib/server/session";

/* Portal del local: el personal entra con QR (código de sucursal) y la clave
   que asigna el cliente. Sin cuenta personal. */
const DEMO_KEY = "Andes-4821";
const MAX_TRIES = 3;
const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export type LocalResult =
  | { ok: true }
  | { ok: false; kind: "error"; error: string }
  | { ok: false; kind: "bloqueado"; why: "tries" | "admin" }
  | { ok: false; kind: "sinclave" };

export async function ingresarLocal(input: unknown): Promise<LocalResult> {
  const p = localLoginSchema.safeParse(input);
  if (!p.success) return { ok: false, kind: "error", error: p.error.issues[0]?.message ?? "Datos no válidos." };
  const { cod, clave } = p.data;
  const suc = seed().sucursales.find((s) => s.cod.toUpperCase() === cod);
  if (!suc) return { ok: false, kind: "error", error: "No encontramos esa sucursal. Revisa el código impreso junto al QR." };
  if (suc.cred === "Sin clave") return { ok: false, kind: "sinclave" };
  const key = `local:${cod}`;
  if (suc.cred === "Bloqueado") return { ok: false, kind: "bloqueado", why: "admin" };
  if (rt.locked.has(key)) return { ok: false, kind: "bloqueado", why: "tries" };

  if (!same(clave, DEMO_KEY)) {
    const t = (rt.tries.get(key) ?? 0) + 1;
    if (t >= MAX_TRIES) {
      rt.locked.add(key);
      rt.tries.delete(key);
      return { ok: false, kind: "bloqueado", why: "tries" };
    }
    rt.tries.set(key, t);
    const left = MAX_TRIES - t;
    return { ok: false, kind: "error", error: `Clave incorrecta. Te quedan ${left} ${left === 1 ? "intento" : "intentos"}.` };
  }
  rt.tries.delete(key);
  if (suc.id !== "s1") return { ok: false, kind: "error", error: "Demostración: solo AM-012 tiene datos de ejemplo." };
  await setSession({ k: "local", id: suc.id });
  return { ok: true };
}

export type ReporteResult = { ok: true; id: string } | { ok: false; error: string };

export async function crearReporte(input: unknown): Promise<ReporteResult> {
  const ses = await getSession();
  if (!ses || ses.k !== "local") return { ok: false, error: "Tu sesión venció. Escanea el QR del local para volver a entrar." };
  const p = reporteSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa el formulario." };
  const id = `TK-${rt.seq++}`;
  const t: Ticket = {
    id, suc: ses.id, f: "2026-10-05", prob: p.data.tipo, estado: "Abierto", prio: p.data.urg,
    desc: `${p.data.acc}: ${p.data.desc || p.data.tipo}`, nom: p.data.nom, isNew: true,
  };
  rt.tickets.push(t);
  return { ok: true, id };
}

export async function avisarJefatura(): Promise<{ ok: true }> {
  return { ok: true };
}

export async function cerrarSesionLocal(): Promise<void> {
  await clearSession();
  redirect("/local?salio=1");
}
