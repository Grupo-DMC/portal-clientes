import "server-only";
import bcrypt from "bcryptjs";
import sql from "mssql";
import { getPoolEscritura } from "@/lib/db/pool";
import { num } from "@/lib/data/sql";

// Cuentas del portal en DMC_Core: seguridad.usuario_cliente (+ seguridad.intento_login).
//
// Es el ÚNICO lugar del portal que escribe en la base, y solo en seguridad.*:
//   - INSERT seguridad.intento_login (cada intento de login)
//   - UPDATE seguridad.usuario_cliente.ultimo_acceso_en (login correcto)
//   - UPDATE seguridad.usuario_cliente.password_hash (cambio de clave obligatorio)
// Todas las sentencias son texto fijo con parámetros: nunca se concatena un valor.

/** Costo de bcrypt al guardar claves nuevas ($2b$12$). */
export const BCRYPT_COSTO = 12;

/** Hash bcrypt de relleno (costo 12): se compara contra él cuando la cuenta no existe, para que el tiempo no la delate. */
const HASH_RELLENO = "$2b$12$YorzfKXH8cCrBR3DXX2c5eiktyrzE7uEw2AGRoIfbCkxCSplXILSy";

/** Ventana y topes del límite de intentos (seguridad.intento_login). */
export const LIMITE = { ventanaMin: 15, fallosPorEmail: 5, fallosPorIp: 20 } as const;

export interface UsuarioCliente {
  id: number;
  clienteId: number;
  email: string;
  nombre: string;
  activo: boolean;
  debeCambiarPassword: boolean;
  sesionVersion: number;
}

interface FilaUsuario {
  id: string | number;
  cliente_id: string | number;
  email: string;
  nombre: string;
  password_hash: string;
  activo: boolean;
  debe_cambiar_password: boolean;
  sesion_version: number;
}

function aUsuario(f: FilaUsuario): UsuarioCliente {
  return {
    id: num(f.id),
    clienteId: num(f.cliente_id),
    email: f.email,
    nombre: f.nombre,
    activo: Boolean(f.activo),
    debeCambiarPassword: Boolean(f.debe_cambiar_password),
    sesionVersion: num(f.sesion_version),
  };
}

async function pedido() {
  return (await getPoolEscritura()).request();
}

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
 * Verifica correo y clave. Devuelve la cuenta solo si existe, la clave calza y
 * está activa; en cualquier otro caso null (quien llama da el mismo mensaje).
 * Siempre corre bcrypt, exista o no la cuenta, para que el tiempo sea parejo.
 */
export async function verificarCredenciales(email: string, password: string): Promise<UsuarioCliente | null> {
  const r = await (await pedido())
    .input("email", sql.NVarChar(254), email)
    .query<FilaUsuario>(
      `SELECT id, cliente_id, email, nombre, password_hash, activo, debe_cambiar_password, sesion_version
         FROM seguridad.usuario_cliente WHERE email = @email`
    );
  const fila = r.recordset[0];
  const ok = await bcrypt.compare(password, fila?.password_hash ?? HASH_RELLENO);
  if (!fila || !ok || !fila.activo) return null;
  return aUsuario(fila);
}

/** ¿Existe una cuenta de cliente con este correo? (para decidir si el login va por la base o por el directorio interno). */
export async function existeCuentaCliente(email: string): Promise<boolean> {
  const r = await (await pedido())
    .input("email", sql.NVarChar(254), email)
    .query<{ n: number }>(`SELECT COUNT(*) AS n FROM seguridad.usuario_cliente WHERE email = @email`);
  return (r.recordset[0]?.n ?? 0) > 0;
}

export async function marcarAcceso(id: number): Promise<void> {
  await (await pedido())
    .input("id", sql.BigInt, id)
    .query(`UPDATE seguridad.usuario_cliente SET ultimo_acceso_en = SYSDATETIME() WHERE id = @id`);
}

export interface EstadoCuenta extends UsuarioCliente {
  cliente: { nombre: string; razonSocial: string; rut: string };
}

/**
 * Estado vigente de la cuenta, para validar la sesión en cada request
 * (activo, sesion_version, cliente). Trae además el nombre del cliente para la cabecera.
 */
export async function estadoCuenta(id: number): Promise<EstadoCuenta | null> {
  const r = await (await pedido())
    .input("id", sql.BigInt, id)
    .query<FilaUsuario & { cli_nombre: string | null; cli_razon: string | null; cli_rut: string | null }>(
      `SELECT u.id, u.cliente_id, u.email, u.nombre, u.password_hash, u.activo, u.debe_cambiar_password, u.sesion_version,
              c.nombre_fantasia AS cli_nombre, c.razon_social AS cli_razon, c.rut AS cli_rut
         FROM seguridad.usuario_cliente u
         JOIN clientes.cliente c ON c.id = u.cliente_id
        WHERE u.id = @id`
    );
  const f = r.recordset[0];
  if (!f) return null;
  return {
    ...aUsuario(f),
    cliente: { nombre: f.cli_nombre ?? f.cli_razon ?? "", razonSocial: f.cli_razon ?? "", rut: f.cli_rut ?? "" },
  };
}

/**
 * Cambia la clave (bcrypt, costo 12), apaga debe_cambiar_password y sube
 * sesion_version (cierra cualquier otra sesión abierta). Solo si la versión
 * leída sigue vigente. Devuelve la nueva versión, o null si no se pudo.
 */
export async function cambiarPassword(id: number, versionActual: number, nueva: string): Promise<number | null> {
  const hash = await bcrypt.hash(nueva, BCRYPT_COSTO);
  const r = await (await pedido())
    .input("id", sql.BigInt, id)
    .input("version", sql.Int, versionActual)
    .input("hash", sql.NVarChar(255), hash)
    // Sin OUTPUT: la tabla tiene trigger (tg_usuario_cliente_actualizado) y SQL Server
    // no admite OUTPUT sin INTO en ese caso.
    .query<{ sesion_version: number | null }>(
      `DECLARE @n int;
       UPDATE seguridad.usuario_cliente
          SET password_hash = @hash, debe_cambiar_password = 0, sesion_version = sesion_version + 1
        WHERE id = @id AND sesion_version = @version AND activo = 1;
       SET @n = @@ROWCOUNT;
       SELECT CASE WHEN @n = 1 THEN (SELECT sesion_version FROM seguridad.usuario_cliente WHERE id = @id) END AS sesion_version;`
    );
  const fila = r.recordset[0];
  return fila?.sesion_version == null ? null : num(fila.sesion_version);
}

/** ¿La clave nueva es igual a la vigente? */
export async function esClaveActual(id: number, password: string): Promise<boolean> {
  const r = await (await pedido())
    .input("id", sql.BigInt, id)
    .query<{ password_hash: string }>(`SELECT password_hash FROM seguridad.usuario_cliente WHERE id = @id`);
  const h = r.recordset[0]?.password_hash;
  return h ? bcrypt.compare(password, h) : false;
}
