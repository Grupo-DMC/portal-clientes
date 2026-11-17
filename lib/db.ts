import "server-only";
import sql from "mssql";

/* Conexión a SQL Server lista para cuando se reemplacen los datos estáticos
   de lib/data.ts. Siempre consultas parametrizadas (`request.input`), nunca
   concatenación de texto. */
let pool: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = new sql.ConnectionPool({
      server: process.env.DB_SERVER ?? "",
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: { encrypt: process.env.DB_ENCRYPT !== "false", trustServerCertificate: false },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    })
      .connect()
      .catch((e) => {
        pool = null;
        throw e;
      });
  }
  return pool;
}
