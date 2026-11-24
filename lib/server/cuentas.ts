import "server-only";
import bcrypt from "bcryptjs";
import sql from "mssql";
import { getPoolEscritura } from "@/lib/db/pool";
import { num } from "@/lib/data/sql";
import { mantenimientoDmc } from "@/lib/mantenimiento";

// Cuentas de DMC_Core. Son las únicas cuentas de la app: no hay directorio en el código.
//   equipo  → seguridad.usuario (+ seguridad.usuario_rol), entra al panel /panel
//             solo con rol ADMIN o COORDINADOR.
//   cliente → seguridad.usuario_cliente, entra al portal /portal.
//
// Es el ÚNICO lugar de la app que escribe en la base, y solo en seguridad.*:
//   - INSERT seguridad.intento_login (cada intento de login)
//   - UPDATE ultimo_acceso_en (login correcto)
//   - UPDATE password_hash / debe_cambiar_password / sesion_version (cambio de clave obligatorio)
// Todas las sentencias son texto fijo con parámetros: nunca se concatena un valor.

export type TipoCuenta = "equipo" | "cliente";

/** Roles de seguridad.usuario_rol que pueden entrar al panel. */
export const ROLES_PANEL = ["ADMIN", "COORDINADOR"] as const;

/** Tabla de cada tipo de cuenta (texto fijo, nunca viene del usuario). */
const TABLA: Record<TipoCuenta, string> = {
  equipo: "seguridad.usuario",
  cliente: "seguridad.usuario_cliente",
};

/** Costo de bcrypt al guardar claves nuevas ($2b$12$). */
export const BCRYPT_COSTO = 12;

/** Hash bcrypt de relleno (costo 12): se compara contra él cuando la cuenta no existe, para que el tiempo no la delate. */
const HASH_RELLENO = "$2b$12$YorzfKXH8cCrBR3DXX2c5eiktyrzE7uEw2AGRoIfbCkxCSplXILSy";

/** Ventana y topes del límite de intentos (seguridad.intento_login). */
export const LIMITE = { ventanaMin: 15, fallosPorEmail: 5, fallosPorIp: 20 } as const;

export interface Cuenta {
  tipo: TipoCuenta;
  id: number;
  email: string;
  nombre: string;
  activo: boolean;
  debeCambiarPassword: boolean;
  sesionVersion: number;
  /** Solo cliente. */
  clienteId: number | null;
  /** Solo equipo: roles de seguridad.usuario_rol. */
  roles: string[];
}

interface FilaCuenta {
  id: string | number;
  email: string;
  nombre: string | null;
  password_hash: string;
  activo: boolean;
  debe_cambiar_password: boolean;
  sesion_version: number;
  cliente_id?: string | number | null;
  roles?: string | null;
}

function aCuenta(tipo: TipoCuenta, f: FilaCuenta): Cuenta {
  return {
    tipo,
    id: num(f.id),
    email: f.email,
    nombre: f.nombre ?? f.email,
    activo: Boolean(f.activo),
    debeCambiarPassword: Boolean(f.debe_cambiar_password),
    sesionVersion: num(f.sesion_version),
    clienteId: f.cliente_id == null ? null : num(f.cliente_id),
    roles: f.roles ? f.roles.split(",") : [],
  };
}

/**
 * ¿La cuenta del equipo puede iniciar sesión? Normalmente solo ADMIN/COORDINADOR (el panel).
 * En mantenimiento (MAINTENANCE_DMC_USERS) entra cualquier cuenta de seguridad.usuario, pero
 * solo llega a la pantalla /mantenimiento: así nadie de DMC confunde el portal con su sistema.
 */
const puedeEntrarAlPanel = (c: Cuenta) => mantenimientoDmc() || c.roles.some((r) => (ROLES_PANEL as readonly string[]).includes(r));

async function pedido() {
  return (await getPoolEscritura()).request();
}

const SELECT_EQUIPO = `SELECT u.id, u.email, u.nombre, u.password_hash, u.activo, u.debe_cambiar_password, u.sesion_version,
       (SELECT STRING_AGG(r.rol, ',') FROM seguridad.usuario_rol r WHERE r.usuario_id = u.id) AS roles
  FROM seguridad.usuario u`;
const SELECT_CLIENTE = `SELECT u.id, u.cliente_id, u.email, u.nombre, u.password_hash, u.activo, u.debe_cambiar_password, u.sesion_version
  FROM seguridad.usuario_cliente u`;

/** ¿Hay demasiados fallos recientes para este correo o esta IP? */
export async function bloqueadoPorIntentos(email: string, ip: string | null): Promise<boolean> {
  const r = await (await pedido())
    .input("email", sql.NVarChar(254), email)
    .input("ip", sql.VarChar(64), ip)
    .input("min", sql.Int, LIMITE.ventanaMin)
    .query<{ porEmail: number; porIp: number }>(
      `SELECT
         (SELECT COUNT(*) FROM seguridad.intento_login
           WHERE email = @email AND exito = 0 AND creado_en >= DATEADD(minute, -@min, SYSDATETIME())) AS porEmail,
         (SELECT COUNT(*) FROM seguridad.intento_login
           WHERE @ip IS NOT NULL AND ip = @ip AND exito = 0 AND creado_en >= DATEADD(minute, -@min, SYSDATETIME())) AS porIp`
    );
  const fila = r.recordset[0];
  return (fila?.porEmail ?? 0) >= LIMITE.fallosPorEmail || (fila?.porIp ?? 0) >= LIMITE.fallosPorIp;
}

export async function registrarIntento(email: string, ip: string | null, exito: boolean): Promise<void> {
  await (await pedido())
    .input("email", sql.NVarChar(254), email)
    .input("ip", sql.VarChar(64), ip)
    .input("exito", sql.Bit, exito)
    .query(`INSERT INTO seguridad.intento_login (email, ip, exito) VALUES (@email, @ip, @exito)`);
}

/**
 * Verifica correo y clave. Busca primero en el equipo (solo ADMIN/COORDINADOR)
 * y después en las cuentas de clientes. Devuelve la cuenta solo si existe, la
 * clave calza y está activa; si no, null (quien llama da siempre el mismo mensaje).
 * Siempre corre un bcrypt, exista o no la cuenta, para que el tiempo sea parejo.
 */
export async function verificarCredenciales(email: string, password: string): Promise<Cuenta | null> {
  const eq = await (await pedido()).input("email", sql.NVarChar(254), email).query<FilaCuenta>(`${SELECT_EQUIPO} WHERE u.email = @email`);
  let fila: FilaCuenta | undefined;
  let tipo: TipoCuenta = "equipo";
  const equipo = eq.recordset[0] ? aCuenta("equipo", eq.recordset[0]) : null;
  if (equipo && puedeEntrarAlPanel(equipo)) {
    fila = eq.recordset[0];
  } else {
    const cl = await (await pedido()).input("email", sql.NVarChar(254), email).query<FilaCuenta>(`${SELECT_CLIENTE} WHERE u.email = @email`);
    fila = cl.recordset[0];
    tipo = "cliente";
  }
  const ok = await bcrypt.compare(password, fila?.password_hash ?? HASH_RELLENO);
  if (!fila || !ok || !fila.activo) return null;
  return aCuenta(tipo, fila);
}

export async function marcarAcceso(tipo: TipoCuenta, id: number): Promise<void> {
  await (await pedido())
    .input("id", sql.BigInt, id)
    .query(`UPDATE ${TABLA[tipo]} SET ultimo_acceso_en = SYSDATETIME() WHERE id = @id`);
}

export interface ClienteCabecera {
  nombre: string;
  razonSocial: string;
  rut: string;
}

/** Estado vigente de una cuenta de cliente, más la cabecera del cliente. Para validar la sesión del portal en cada request. */
export async function estadoCliente(id: number): Promise<(Cuenta & { cliente: ClienteCabecera }) | null> {
  const r = await (await pedido())
    .input("id", sql.BigInt, id)
    .query<FilaCuenta & { cli_nombre: string | null; cli_razon: string | null; cli_rut: string | null }>(
      `SELECT u.id, u.cliente_id, u.email, u.nombre, u.password_hash, u.activo, u.debe_cambiar_password, u.sesion_version,
              c.nombre_fantasia AS cli_nombre, c.razon_social AS cli_razon, c.rut AS cli_rut
         FROM seguridad.usuario_cliente u
         JOIN clientes.cliente c ON c.id = u.cliente_id
        WHERE u.id = @id`
    );
  const f = r.recordset[0];
  if (!f) return null;
  return {
    ...aCuenta("cliente", f),
    cliente: { nombre: f.cli_nombre ?? f.cli_razon ?? "", razonSocial: f.cli_razon ?? "", rut: f.cli_rut ?? "" },
  };
}

/** Estado vigente de una cuenta del equipo. null si no existe o ya no tiene rol de panel. */
export async function estadoEquipo(id: number): Promise<Cuenta | null> {
  const r = await (await pedido()).input("id", sql.BigInt, id).query<FilaCuenta>(`${SELECT_EQUIPO} WHERE u.id = @id`);
  const f = r.recordset[0];
  if (!f) return null;
  const c = aCuenta("equipo", f);
  return puedeEntrarAlPanel(c) ? c : null;
}

/**
 * Cambia la clave (bcrypt, costo 12), apaga debe_cambiar_password y sube
 * sesion_version (cierra cualquier otra sesión abierta). Solo si la versión
 * leída sigue vigente. Devuelve la nueva versión, o null si no se pudo.
 */
export async function cambiarPassword(tipo: TipoCuenta, id: number, versionActual: number, nueva: string): Promise<number | null> {
  const hash = await bcrypt.hash(nueva, BCRYPT_COSTO);
  const r = await (await pedido())
    .input("id", sql.BigInt, id)
    .input("version", sql.Int, versionActual)
    .input("hash", sql.NVarChar(255), hash)
    // Sin OUTPUT: ambas tablas tienen trigger y SQL Server no admite OUTPUT sin INTO en ese caso.
    .query<{ sesion_version: number | null }>(
      `DECLARE @n int;
       UPDATE ${TABLA[tipo]}
          SET password_hash = @hash, debe_cambiar_password = 0, sesion_version = sesion_version + 1
        WHERE id = @id AND sesion_version = @version AND activo = 1;
       SET @n = @@ROWCOUNT;
       SELECT CASE WHEN @n = 1 THEN (SELECT sesion_version FROM ${TABLA[tipo]} WHERE id = @id) END AS sesion_version;`
    );
  const fila = r.recordset[0];
  return fila?.sesion_version == null ? null : num(fila.sesion_version);
}

/** ¿La clave nueva es igual a la vigente? */
export async function esClaveActual(tipo: TipoCuenta, id: number, password: string): Promise<boolean> {
  const r = await (await pedido())
    .input("id", sql.BigInt, id)
    .query<{ password_hash: string }>(`SELECT password_hash FROM ${TABLA[tipo]} WHERE id = @id`);
  const h = r.recordset[0]?.password_hash;
  return h ? bcrypt.compare(password, h) : false;
}

// ── Perfil de la cuenta del portal (nombre y correo) ─────────────────────────

/** ¿Ese correo ya lo usa otra cuenta (cliente o equipo DMC)? El login busca en ambas. */
export async function correoEnUso(email: string, exceptoClienteId: number): Promise<boolean> {
  const r = await (await pedido())
    .input("email", sql.NVarChar(254), email)
    .input("id", sql.BigInt, exceptoClienteId)
    .query<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM seguridad.usuario_cliente WHERE email = @email AND id <> @id)
            + (SELECT COUNT(*) FROM seguridad.usuario WHERE email = @email) AS n`
    );
  return (r.recordset[0]?.n ?? 0) > 0;
}

export type ResultadoDatos = "ok" | "correo_en_uso" | "sesion";

/**
 * Cambia nombre y correo de la cuenta de cliente, solo si la sesión sigue
 * vigente (misma sesion_version, activa). El correo es único (uq_usuario_cliente_email).
 */
export async function actualizarDatosCliente(id: number, version: number, nombre: string, email: string): Promise<ResultadoDatos> {
  try {
    const r = await (await pedido())
      .input("id", sql.BigInt, id)
      .input("version", sql.Int, version)
      .input("nombre", sql.NVarChar(120), nombre)
      .input("email", sql.NVarChar(254), email)
      .query(
        `UPDATE seguridad.usuario_cliente SET nombre = @nombre, email = @email
          WHERE id = @id AND sesion_version = @version AND activo = 1`
      );
    return r.rowsAffected[0] === 1 ? "ok" : "sesion";
  } catch (err) {
    // 2601/2627: choca con el índice único del correo.
    const n = (err as { number?: number })?.number;
    if (n === 2601 || n === 2627) return "correo_en_uso";
    throw err;
  }
}
