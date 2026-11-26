import "server-only";
import { consultaCon, num, numONull, sql, type Parametro } from "@/lib/data/sql";
import {
  ISO_FECHA,
  ISO_FECHA_HORA,
  SQL_ESTADO_GARANTIA,
  SQL_GARANTIA_MESES,
  SQL_GARANTIA_VENCE,
  SQL_PROBLEMAS_ABIERTOS,
  txt,
  type EstadoGarantia,
} from "./comun";
import { type VisitaFila, listarVisitas } from "./operacion";

// Sucursales, malls y garantías de todos los clientes. Solo lectura.

export interface SucursalFila {
  id: number;
  nombre: string;
  codigo: string;
  clienteId: number;
  cliente: string;
  marca: string;
  mall: string;
  comuna: string;
  region: string;
  activo: boolean;
  remota: boolean;
  problemas: number;
  visitas: number;
  ultimaVisita: string;
  fechaInstalacion: string;
  garantiaMeses: number | null;
  garantiaVence: string;
  garantia: EstadoGarantia;
  enGarantia: boolean | null;
  planCalibracion: boolean;
}

const SELECT_SUCURSAL = `SELECT s.id, s.nombre, s.codigo, s.cliente_id, COALESCE(c.nombre_fantasia, c.razon_social) AS cliente,
       m.nombre AS marca, ml.nombre AS mall, s.comuna, s.region, s.activo, s.remota,
       ${SQL_PROBLEMAS_ABIERTOS} AS problemas,
       (SELECT COUNT(*) FROM tecnico.visita v WHERE v.sucursal_id = s.id AND v.activo = 1 AND v.estado = 'COMPLETADA') AS visitas,
       (SELECT ${ISO_FECHA("MAX(v.fecha_programada)")} FROM tecnico.visita v
         WHERE v.sucursal_id = s.id AND v.activo = 1 AND v.estado = 'COMPLETADA') AS ultima,
       ${ISO_FECHA("s.fecha_instalacion")} AS instalacion, ${SQL_GARANTIA_MESES} AS garantia_meses,
       ${ISO_FECHA("g.vence")} AS vence, ${SQL_ESTADO_GARANTIA("g.vence")} AS garantia, s.en_garantia,
       COALESCE(s.plan_calibracion, c.plan_calibracion, 0) AS calibracion
  FROM clientes.sucursal s
  JOIN clientes.cliente c ON c.id = s.cliente_id
  JOIN clientes.marca m ON m.id = s.marca_id
  LEFT JOIN clientes.mall ml ON ml.id = s.mall_id
 CROSS APPLY (SELECT ${SQL_GARANTIA_VENCE} AS vence) g`;

interface FilaSucursal {
  id: string; nombre: string; codigo: string | null; cliente_id: string; cliente: string; marca: string; mall: string | null;
  comuna: string; region: string; activo: boolean; remota: boolean | null; problemas: number; visitas: number; ultima: string | null;
  instalacion: string | null; garantia_meses: number | null; vence: string | null; garantia: EstadoGarantia; en_garantia: boolean | null;
  calibracion: boolean;
}

function aSucursal(f: FilaSucursal): SucursalFila {
  return {
    id: num(f.id),
    nombre: f.nombre,
    codigo: txt(f.codigo),
    clienteId: num(f.cliente_id),
    cliente: f.cliente,
    marca: f.marca,
    mall: txt(f.mall),
    comuna: f.comuna,
    region: f.region,
    activo: Boolean(f.activo),
    remota: Boolean(f.remota),
    problemas: num(f.problemas),
    visitas: num(f.visitas),
    ultimaVisita: txt(f.ultima),
    fechaInstalacion: txt(f.instalacion),
    garantiaMeses: f.garantia_meses,
    garantiaVence: txt(f.vence),
    garantia: f.garantia,
    enGarantia: f.en_garantia,
    planCalibracion: Boolean(f.calibracion),
  };
}

export async function listarSucursales(filtro: { mallId?: number } = {}): Promise<SucursalFila[]> {
  const filas = await consultaCon<FilaSucursal>(
    `${SELECT_SUCURSAL}
      WHERE @mall IS NULL OR s.mall_id = @mall
      ORDER BY s.activo DESC, cliente, s.nombre`,
    [["mall", sql.BigInt, filtro.mallId ?? null]]
  );
  return filas.map(aSucursal);
}

export interface SucursalDetalle extends SucursalFila {
  direccion: string;
  telefono: string;
  notas: string;
  motivoInactivo: string;
  mallId: number | null;
  creadoEn: string;
  visitasLista: VisitaFila[];
  problemasLista: { id: number; visitaId: number; folio: string; tipo: string; estado: string; estadoCodigo: string; descripcion: string; creadoEn: string; resueltoEn: string }[];
  personas: { id: number; nombre: string; cargo: string; telefono: string; email: string; ultimaVez: string }[];
  nombresAnteriores: { nombre: string; cambiadoEn: string }[];
}

export async function detalleSucursal(id: number): Promise<SucursalDetalle | null> {
  const p: Parametro[] = [["id", sql.BigInt, id]];
  const [base, extra, visitas, problemas, personas, anteriores] = await Promise.all([
    consultaCon<FilaSucursal>(`${SELECT_SUCURSAL} WHERE s.id = @id`, p),
    consultaCon<{ direccion: string; telefono: string | null; notas: string | null; motivo: string | null; mall_id: string | null; creado: string }>(
      `SELECT s.direccion, s.telefono, s.notas, s.motivo_inactivo AS motivo, s.mall_id, ${ISO_FECHA("s.creado_en")} AS creado
         FROM clientes.sucursal s WHERE s.id = @id`,
      p
    ),
    listarVisitas({ sucursalId: id }),
    consultaCon<{
      id: string; visita_id: string; folio: string; tipo: string; estado: string; estado_codigo: string;
      descripcion: string | null; creado: string; resuelto: string | null;
    }>(
      `SELECT p.id, p.visita_id, v.folio, cp.nombre AS tipo, COALESCE(ce.nombre, p.estado) AS estado, p.estado AS estado_codigo,
              p.descripcion, ${ISO_FECHA("p.creado_en")} AS creado, ${ISO_FECHA("p.resuelto_en")} AS resuelto
         FROM tecnico.problema p
         JOIN tecnico.visita v ON v.id = p.visita_id
         JOIN tecnico.catalogo_problema cp ON cp.codigo = p.tipo_codigo
         LEFT JOIN tecnico.catalogo_problema_estado ce ON ce.codigo = p.estado
        WHERE v.sucursal_id = @id AND v.activo = 1
        ORDER BY CASE WHEN p.estado = 'RESUELTO' THEN 1 ELSE 0 END, p.creado_en DESC`,
      p
    ),
    consultaCon<{ id: string; nombre: string; cargo: string | null; telefono: string | null; email: string | null; ultima: string }>(
      `SELECT pl.id, pl.nombre, pl.cargo, pl.telefono, pl.email, ${ISO_FECHA("pl.ultima_vez")} AS ultima
         FROM clientes.persona_local pl WHERE pl.sucursal_id = @id ORDER BY pl.ultima_vez DESC`,
      p
    ),
    consultaCon<{ nombre: string; cambiado: string }>(
      `SELECT a.nombre_anterior AS nombre, ${ISO_FECHA("a.cambiado_en")} AS cambiado
         FROM clientes.sucursal_nombre_anterior a WHERE a.sucursal_id = @id ORDER BY a.cambiado_en DESC`,
      p
    ),
  ]);
  const b = base[0];
  const e = extra[0];
  if (!b || !e) return null;
  return {
    ...aSucursal(b),
    direccion: e.direccion,
    telefono: txt(e.telefono),
    notas: txt(e.notas),
    motivoInactivo: txt(e.motivo),
    mallId: numONull(e.mall_id),
    creadoEn: e.creado,
    visitasLista: visitas,
    problemasLista: problemas.map((f) => ({
      id: num(f.id),
      visitaId: num(f.visita_id),
      folio: f.folio,
      tipo: f.tipo,
      estado: f.estado,
      estadoCodigo: f.estado_codigo,
      descripcion: txt(f.descripcion),
      creadoEn: f.creado,
      resueltoEn: txt(f.resuelto),
    })),
    personas: personas.map((f) => ({
      id: num(f.id),
      nombre: f.nombre,
      cargo: txt(f.cargo),
      telefono: txt(f.telefono),
      email: txt(f.email),
      ultimaVez: f.ultima,
    })),
    nombresAnteriores: anteriores.map((f) => ({ nombre: f.nombre, cambiadoEn: f.cambiado })),
  };
}

// ── Malls ────────────────────────────────────────────────────────────────────

export interface MallFila {
  id: number;
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  activo: boolean;
  motivoInactivo: string;
  sucursales: number;
  clientes: number;
  actualizadoEn: string;
}

const SELECT_MALL = `SELECT ml.id, ml.nombre, ml.direccion, ml.comuna, ml.region, ml.activo, ml.motivo_inactivo AS motivo,
       (SELECT COUNT(*) FROM clientes.sucursal s WHERE s.mall_id = ml.id AND s.activo = 1) AS sucursales,
       (SELECT COUNT(DISTINCT s.cliente_id) FROM clientes.sucursal s WHERE s.mall_id = ml.id AND s.activo = 1) AS clientes,
       ${ISO_FECHA_HORA("ml.actualizado_en")} AS actualizado
  FROM clientes.mall ml`;

type FilaMall = {
  id: string; nombre: string; direccion: string; comuna: string; region: string; activo: boolean; motivo: string | null;
  sucursales: number; clientes: number; actualizado: string;
};

const aMall = (f: FilaMall): MallFila => ({
  id: num(f.id),
  nombre: f.nombre,
  direccion: f.direccion,
  comuna: f.comuna,
  region: f.region,
  activo: Boolean(f.activo),
  motivoInactivo: txt(f.motivo),
  sucursales: num(f.sucursales),
  clientes: num(f.clientes),
  actualizadoEn: f.actualizado,
});

export async function listarMalls(): Promise<MallFila[]> {
  const filas = await consultaCon<FilaMall>(`${SELECT_MALL} ORDER BY ml.activo DESC, ml.nombre`, []);
  return filas.map(aMall);
}

export async function detalleMall(id: number): Promise<(MallFila & { sucursalesLista: SucursalFila[] }) | null> {
  const [m, sucursales] = await Promise.all([
    consultaCon<FilaMall>(`${SELECT_MALL} WHERE ml.id = @id`, [["id", sql.BigInt, id]]),
    listarSucursales({ mallId: id }),
  ]);
  return m[0] ? { ...aMall(m[0]), sucursalesLista: sucursales } : null;
}
