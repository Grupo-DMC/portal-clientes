import "server-only";
import { consultaCon, num, sql, type Parametro } from "@/lib/data/sql";
import {
  ISO_FECHA,
  ISO_FECHA_HORA,
  SQL_ESTADO_GARANTIA,
  SQL_GARANTIA_VENCE,
  SQL_PROBLEMAS_ABIERTOS,
  txt,
  type EstadoGarantia,
} from "./comun";

// Clientes (empresas), sus marcas, sucursales y cuentas del portal. Solo lectura.

export interface ClienteFila {
  id: number;
  nombre: string;
  razonSocial: string;
  rut: string;
  activo: boolean;
  marcas: number;
  sucursales: number;
  cuentas: number;
  visitasAnio: number;
  ultimaVisita: string;
}

export async function listarClientes(): Promise<ClienteFila[]> {
  const filas = await consultaCon<{
    id: string; nombre: string | null; razon: string; rut: string; activo: boolean;
    marcas: number; sucursales: number; cuentas: number; visitas_anio: number; ultima: string | null;
  }>(
    `SELECT c.id, c.nombre_fantasia AS nombre, c.razon_social AS razon, c.rut, c.activo,
            (SELECT COUNT(*) FROM clientes.marca m WHERE m.cliente_id = c.id AND m.activo = 1) AS marcas,
            (SELECT COUNT(*) FROM clientes.sucursal s WHERE s.cliente_id = c.id AND s.activo = 1) AS sucursales,
            (SELECT COUNT(*) FROM seguridad.usuario_cliente u WHERE u.cliente_id = c.id AND u.activo = 1) AS cuentas,
            (SELECT COUNT(*) FROM tecnico.visita v WHERE v.cliente_id = c.id AND v.activo = 1 AND v.estado = 'COMPLETADA'
                AND v.fecha_programada >= DATEFROMPARTS(YEAR(SYSDATETIME()), 1, 1)) AS visitas_anio,
            (SELECT ${ISO_FECHA("MAX(v.fecha_programada)")} FROM tecnico.visita v
              WHERE v.cliente_id = c.id AND v.activo = 1 AND v.estado = 'COMPLETADA') AS ultima
       FROM clientes.cliente c
      ORDER BY c.activo DESC, c.nombre_fantasia`,
    []
  );
  return filas.map((f) => ({
    id: num(f.id),
    nombre: f.nombre || f.razon,
    razonSocial: f.razon,
    rut: f.rut,
    activo: Boolean(f.activo),
    marcas: num(f.marcas),
    sucursales: num(f.sucursales),
    cuentas: num(f.cuentas),
    visitasAnio: num(f.visitas_anio),
    ultimaVisita: txt(f.ultima),
  }));
}

export interface ClienteDetalle {
  id: number;
  nombre: string;
  razonSocial: string;
  rut: string;
  activo: boolean;
  motivoInactivo: string;
  notas: string;
  garantiaMeses: number | null;
  planCalibracion: boolean | null;
  creadoEn: string;
  marcas: { id: number; nombre: string; activo: boolean; sucursales: number }[];
  sucursales: SucursalDeCliente[];
  cuentas: CuentaPortal[];
  visitas: { estado: string; n: number }[];
}

export interface SucursalDeCliente {
  id: number;
  nombre: string;
  codigo: string;
  marca: string;
  mall: string;
  comuna: string;
  region: string;
  activo: boolean;
  problemas: number;
  ultimaVisita: string;
  garantia: EstadoGarantia;
}

export interface CuentaPortal {
  id: number;
  clienteId: number;
  cliente: string;
  nombre: string;
  email: string;
  activo: boolean;
  debeCambiarPassword: boolean;
  ultimoAcceso: string;
  creadoEn: string;
}

/** Cuentas del portal (seguridad.usuario_cliente). Sin password_hash. */
export async function listarCuentasPortal(clienteId?: number): Promise<CuentaPortal[]> {
  const filas = await consultaCon<{
    id: string; cliente_id: string; cliente: string; nombre: string; email: string; activo: boolean;
    debe: boolean; acceso: string | null; creado: string;
  }>(
    `SELECT u.id, u.cliente_id, COALESCE(c.nombre_fantasia, c.razon_social) AS cliente, u.nombre, u.email, u.activo,
            u.debe_cambiar_password AS debe, ${ISO_FECHA_HORA("u.ultimo_acceso_en")} AS acceso, ${ISO_FECHA_HORA("u.creado_en")} AS creado
       FROM seguridad.usuario_cliente u
       JOIN clientes.cliente c ON c.id = u.cliente_id
      WHERE @cliente IS NULL OR u.cliente_id = @cliente
      ORDER BY u.activo DESC, u.nombre`,
    [["cliente", sql.BigInt, clienteId ?? null]]
  );
  return filas.map((f) => ({
    id: num(f.id),
    clienteId: num(f.cliente_id),
    cliente: f.cliente,
    nombre: f.nombre,
    email: f.email,
    activo: Boolean(f.activo),
    debeCambiarPassword: Boolean(f.debe),
    ultimoAcceso: txt(f.acceso),
    creadoEn: f.creado,
  }));
}

export async function detalleCliente(id: number): Promise<ClienteDetalle | null> {
  const p: Parametro[] = [["id", sql.BigInt, id]];
  const [cli, marcas, sucursales, cuentas, visitas] = await Promise.all([
    consultaCon<{
      id: string; nombre: string | null; razon: string; rut: string; activo: boolean; motivo: string | null; notas: string | null;
      garantia_meses: number | null; calibracion: boolean | null; creado: string;
    }>(
      `SELECT c.id, c.nombre_fantasia AS nombre, c.razon_social AS razon, c.rut, c.activo, c.motivo_inactivo AS motivo, c.notas,
              c.garantia_meses, c.plan_calibracion AS calibracion, ${ISO_FECHA("c.creado_en")} AS creado
         FROM clientes.cliente c WHERE c.id = @id`,
      p
    ),
    consultaCon<{ id: string; nombre: string; activo: boolean; sucursales: number }>(
      `SELECT m.id, m.nombre, m.activo,
              (SELECT COUNT(*) FROM clientes.sucursal s WHERE s.marca_id = m.id AND s.activo = 1) AS sucursales
         FROM clientes.marca m WHERE m.cliente_id = @id ORDER BY m.activo DESC, m.nombre`,
      p
    ),
    consultaCon<{
      id: string; nombre: string; codigo: string | null; marca: string; mall: string | null; comuna: string; region: string;
      activo: boolean; problemas: number; ultima: string | null; garantia: EstadoGarantia;
    }>(
      `SELECT s.id, s.nombre, s.codigo, m.nombre AS marca, ml.nombre AS mall, s.comuna, s.region, s.activo,
              ${SQL_PROBLEMAS_ABIERTOS} AS problemas,
              (SELECT ${ISO_FECHA("MAX(v.fecha_programada)")} FROM tecnico.visita v
                WHERE v.sucursal_id = s.id AND v.activo = 1 AND v.estado = 'COMPLETADA') AS ultima,
              ${SQL_ESTADO_GARANTIA("g.vence")} AS garantia
         FROM clientes.sucursal s
         JOIN clientes.cliente c ON c.id = s.cliente_id
         JOIN clientes.marca m ON m.id = s.marca_id
         LEFT JOIN clientes.mall ml ON ml.id = s.mall_id
        CROSS APPLY (SELECT ${SQL_GARANTIA_VENCE} AS vence) g
        WHERE s.cliente_id = @id
        ORDER BY s.activo DESC, s.nombre`,
      p
    ),
    listarCuentasPortal(id),
    consultaCon<{ estado: string; n: number }>(
      `SELECT v.estado, COUNT(*) AS n FROM tecnico.visita v WHERE v.cliente_id = @id AND v.activo = 1 GROUP BY v.estado`,
      p
    ),
  ]);
  const c = cli[0];
  if (!c) return null;
  return {
    id: num(c.id),
    nombre: c.nombre || c.razon,
    razonSocial: c.razon,
    rut: c.rut,
    activo: Boolean(c.activo),
    motivoInactivo: txt(c.motivo),
    notas: txt(c.notas),
    garantiaMeses: c.garantia_meses,
    planCalibracion: c.calibracion,
    creadoEn: c.creado,
    marcas: marcas.map((m) => ({ id: num(m.id), nombre: m.nombre, activo: Boolean(m.activo), sucursales: num(m.sucursales) })),
    sucursales: sucursales.map((s) => ({
      id: num(s.id),
      nombre: s.nombre,
      codigo: txt(s.codigo),
      marca: s.marca,
      mall: txt(s.mall),
      comuna: s.comuna,
      region: s.region,
      activo: Boolean(s.activo),
      problemas: num(s.problemas),
      ultimaVisita: txt(s.ultima),
      garantia: s.garantia,
    })),
    cuentas,
    visitas: visitas.map((v) => ({ estado: v.estado, n: num(v.n) })),
  };
}
