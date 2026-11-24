import "server-only";

/* Directorio de cuentas. El tipo de cuenta (equipo DMC → panel, cliente → portal)
   lo decide el servidor a partir del correo y de este directorio; el navegador
   nunca lo elige. Solo se guardan hashes scrypt (ver lib/server/password.ts). */
export type Surface = "panel" | "portal";
export type AcctTipo = "equipo" | "cliente";
export type AcctStatus = "ok" | "inactivo" | "bloqueado";
export type Acct = {
  email: string;
  name: string;
  role: string;
  tipo: AcctTipo;
  passHash: string;
  status: AcctStatus;
  /** rol interno (solo equipo) */
  rol?: string;
  /** perfil dentro del cliente (solo cliente) */
  perfil?: "admin" | "zona" | "marca";
  /** cliente al que pertenece (solo cliente) */
  clienteId?: string;
};

export const DMC_DOMAIN = "grupodmc.cl";

const ACCTS: Acct[] = [
  {
    email: "pcontreras@grupodmc.cl", name: "Paula Contreras", role: "Administradora", tipo: "equipo", rol: "r1", status: "ok",
    passHash: "scrypt:au9UCJ8Qdn7uQxC1qHs13Q:55VKODB8Mf1vFGgy_KPGh2ZykHxNhE6ehl_O4bMl5hEiHGEVFPJ9dCzOMq8RIjgT_AQF4TE2AUoUZ7FOzXjCdg",
  },
  {
    email: "sayala@retailandes.cl", name: "Sofia Ayala", role: "Administrador cliente", tipo: "cliente", perfil: "admin", clienteId: "c1", status: "ok",
    passHash: "scrypt:GAzZ3CFGtOiaMaZ03McqPQ:U_OpYS21sb_DkBm85wdQBI2brQmDS4DTeChKJZehtlwvMEzvEK2hGmuEE0XAa4pbAVcRr1N1qUY4nVn9zu0BTg",
  },
];

const norm = (email: string) => email.trim().toLowerCase();
const domainOf = (email: string) => norm(email).split("@")[1] ?? "";

/** Equipo solo con dominio DMC; cliente solo fuera del dominio DMC y asociado a un cliente. */
const consistent = (a: Acct) =>
  a.tipo === "equipo" ? domainOf(a.email) === DMC_DOMAIN : domainOf(a.email) !== DMC_DOMAIN && !!a.clienteId;

/** Busca la cuenta por correo. Una cuenta inconsistente se trata como inexistente.
    Cuando se conecte la BD, esta es la ÚNICA función a reemplazar por la consulta SQL (lib/db.ts). */
export function findAcctByEmail(email: string): Acct | undefined {
  const e = norm(email);
  const a = ACCTS.find((x) => x.email.toLowerCase() === e);
  return a && consistent(a) ? a : undefined;
}

export const surfaceOf = (a: Acct): Surface => (a.tipo === "equipo" ? "panel" : "portal");

/** Cuenta del correo, solo si pertenece a esa superficie. */
export const findAcct = (s: Surface, email: string): Acct | undefined => {
  const a = findAcctByEmail(email);
  return a && surfaceOf(a) === s ? a : undefined;
};

/** Cuenta que puede tener sesión abierta: existe en esa superficie y está activa. */
export const activeAcct = (s: Surface, email: string): Acct | undefined => {
  const a = findAcct(s, email);
  return a?.status === "ok" ? a : undefined;
};
