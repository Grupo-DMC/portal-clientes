import "server-only";
import sql from "mssql";
import { getPool } from "@/lib/db/pool";

// Utilidades comunes de la capa de datos (subconjunto de sys_tecnicos/lib/data/sql.ts).
//
// SOLO LECTURA. A diferencia de la referencia, aquí no existen `ejecutar`,
// `enTransaccion` ni `conTransaccion`: el portal no escribe en la base por
// ahora. Toda sentencia pasa por `asegurarSoloLectura` antes de salir.
//
// Mismas decisiones que la referencia:
// 1. Los `bigint` llegan como string desde tedious: los ids pasan por `num()`.
// 2. Las fechas se convierten a texto EN SQL (CONVERT), no en JS, para que el
//    huso del servidor no corra un día.

/** Fecha como 'YYYY-MM-DD'. */
export const F_FECHA = (col: string) => `CONVERT(varchar(10), ${col}, 23)`;
/** Fecha como 'DD-MM-YYYY' (el formato que muestra el portal). */
export const F_FECHA_DMY = (col: string) => `CONVERT(varchar(10), ${col}, 105)`;
/** Hora como 'HH:mm'. */
export const F_HORA = (col: string) => `CONVERT(varchar(5), ${col}, 108)`;
/** Marca de tiempo como 'DD-MM-YYYY HH:mm'. */
export const F_FECHA_HORA_DMY = (col: string) => `CONCAT(CONVERT(varchar(10), ${col}, 105), ' ', CONVERT(varchar(5), ${col}, 108))`;

export function num(valor: unknown): number {
  return typeof valor === "number" ? valor : Number(valor);
}

export function numONull(valor: unknown): number | null {
  return valor === null || valor === undefined ? null : num(valor);
}

export class SentenciaNoPermitida extends Error {
  constructor(motivo: string) {
    super(`Sentencia rechazada por la regla de solo lectura: ${motivo}`);
    this.name = "SentenciaNoPermitida";
  }
}

// Palabras que no pueden aparecer en ninguna sentencia del portal. `INTO`
// cubre SELECT … INTO (crea una tabla). Mejor un falso positivo que una escritura.
const PROHIBIDAS =
  /\b(INSERT|UPDATE|DELETE|MERGE|UPSERT|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE|DENY|BACKUP|RESTORE|DBCC|INTO|OPENROWSET|OPENDATASOURCE|BULK|SHUTDOWN|KILL|RECONFIGURE|DECLARE|SET)\b|\bsp_|\bxp_/i;

/**
 * Rechaza todo lo que no sea una consulta. Es una red de seguridad sobre la
 * garantía real (la cuenta SQL de solo lectura), no un parser de T-SQL.
 */
export function asegurarSoloLectura(texto: string): void {
  // Se ignoran comentarios y literales de texto ('…', con '' escapado) para que
  // no escondan nada ni den falsos positivos (p. ej. HAS_PERMS_BY_NAME(…, 'INSERT')).
  const sinComentarios = texto
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim();
  if (!/^(SELECT|WITH)\b/i.test(sinComentarios)) throw new SentenciaNoPermitida("debe empezar con SELECT o WITH");
  if (sinComentarios.includes(";")) throw new SentenciaNoPermitida("no se permiten varias sentencias");
  const prohibida = sinComentarios.match(PROHIBIDAS);
  if (prohibida) throw new SentenciaNoPermitida(`contiene «${prohibida[0]}»`);
}

/** Identificador SQL (tabla o columna, opcionalmente con esquema) entre corchetes. */
export function ident(nombre: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(nombre)) {
    throw new Error(`Identificador SQL no válido en el mapeo: "${nombre}".`);
  }
  return nombre
    .split(".")
    .map((parte) => `[${parte}]`)
    .join(".");
}

export type Parametro = [nombre: string, tipo: sql.ISqlType | (() => sql.ISqlType), valor: unknown];

/** Ejecuta una consulta sin parámetros y devuelve las filas tipadas. */
export async function consulta<T>(texto: string): Promise<T[]> {
  return consultaCon<T>(texto, []);
}

/** Ejecuta una consulta parametrizada. Nunca interpoles valores en el texto. */
export async function consultaCon<T>(texto: string, params: Parametro[]): Promise<T[]> {
  asegurarSoloLectura(texto);
  const pool = await getPool();
  const req = pool.request();
  for (const [nombre, tipo, valor] of params) req.input(nombre, tipo, valor);
  const r = await req.query<T>(texto);
  return r.recordset ?? [];
}

/** Agrupa filas hijas por la clave de su padre. */
export function agrupar<T, K>(filas: T[], clave: (fila: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const fila of filas) {
    const k = clave(fila);
    const lista = mapa.get(k);
    if (lista) lista.push(fila);
    else mapa.set(k, [fila]);
  }
  return mapa;
}

export { sql };
