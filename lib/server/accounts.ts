import "server-only";

/* Cuentas de demostración. Las contraseñas están visibles a propósito en la
   pantalla de login (cuentas de demostración); en producción vienen de SQL
   Server como hash (bcrypt/scrypt), nunca en claro. */
export type Surface = "panel" | "portal";
export type AcctStatus = "ok" | "primer" | "bloqueado" | "inactivo";
export type Acct = {
  email: string; pass: string; name: string; role: string; status: AcctStatus; mfa: boolean; caso: string;
  rol?: string; perfil?: "admin" | "zona" | "marca";
};

export const PANEL_ACCTS: Acct[] = [
  { email: "pcontreras@grupodmc.cl", pass: "Dmc-2026", name: "Paula Contreras", role: "Administradora", rol: "r1", status: "ok", mfa: false, caso: "Administradora" },
  { email: "crojas@grupodmc.cl", pass: "Dmc-2026", name: "Camilo Rojas", role: "Coordinador de operaciones", rol: "r2", status: "ok", mfa: true, caso: "Coordinador · 2 pasos" },
  { email: "cmorales@grupodmc.cl", pass: "Dmc-2026", name: "Cristián Morales", role: "Técnico", rol: "r3", status: "ok", mfa: false, caso: "Técnico" },
  { email: "dsoto@grupodmc.cl", pass: "Dmc-2026", name: "Daniela Soto", role: "Comercial", rol: "r4", status: "ok", mfa: false, caso: "Comercial" },
  { email: "tvera@grupodmc.cl", pass: "Temporal-01", name: "Tomás Vera", role: "Coordinador de operaciones", rol: "r2", status: "primer", mfa: false, caso: "Primer ingreso" },
  { email: "mibanez@grupodmc.cl", pass: "Dmc-2026", name: "Marcelo Ibáñez", role: "Comercial", rol: "r4", status: "bloqueado", mfa: false, caso: "Bloqueada" },
  { email: "apizarro@grupodmc.cl", pass: "Dmc-2026", name: "Andrea Pizarro", role: "Técnico", rol: "r3", status: "inactivo", mfa: false, caso: "Desactivada" },
];

export const PORTAL_ACCTS: Acct[] = [
  { email: "mjfuentes@retailandes.cl", pass: "Andes-2026", name: "María José Fuentes", role: "Administrador cliente", perfil: "admin", status: "ok", mfa: true, caso: "Administrador · 2 pasos" },
  { email: "rsaavedra@retailandes.cl", pass: "Andes-2026", name: "Rodrigo Saavedra", role: "Supervisor Zona Norte", perfil: "zona", status: "ok", mfa: false, caso: "Supervisor zona" },
  { email: "ilagos@retailandes.cl", pass: "Andes-2026", name: "Ignacio Lagos", role: "Supervisor Andes Home", perfil: "marca", status: "ok", mfa: false, caso: "Supervisor marca" },
  { email: "nparedes@retailandes.cl", pass: "Temporal-01", name: "Natalia Paredes", role: "Supervisor Zona Norte", perfil: "zona", status: "primer", mfa: false, caso: "Primer ingreso" },
  { email: "cmunoz@retailandes.cl", pass: "Andes-2026", name: "Camila Muñoz", role: "Supervisor Andes Home", perfil: "marca", status: "bloqueado", mfa: false, caso: "Bloqueada" },
  { email: "fgarrido@retailandes.cl", pass: "Andes-2026", name: "Felipe Garrido", role: "Supervisor Zona Norte", perfil: "zona", status: "inactivo", mfa: false, caso: "Desactivada" },
];

export const accountsOf = (s: Surface): Acct[] => (s === "panel" ? PANEL_ACCTS : PORTAL_ACCTS);
export const findAcct = (s: Surface, email: string): Acct | undefined => {
  const e = email.trim().toLowerCase();
  return accountsOf(s).find((a) => a.email.toLowerCase() === e);
};

export type PublicAcct = { email: string; name: string; status: AcctStatus; mfa: boolean; caso: string; hint: string };
/** Cuentas para los chips de demostración (incluye la clave de prueba a propósito). */
export const publicAccts = (s: Surface): PublicAcct[] =>
  accountsOf(s).map((a) => ({ email: a.email, name: a.name, status: a.status, mfa: a.mfa, caso: a.caso, hint: a.pass }));
