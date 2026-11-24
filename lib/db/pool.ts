import "server-only";
import sql from "mssql";
import { getSqlConfig } from "./config";

// Pool perezoso (réplica de sys_tecnicos/lib/db/pool.ts): no se conecta a nada
// hasta la primera llamada a getPool(). Si la conexión falla se descarta la
// promesa para que el siguiente intento reconecte en vez de quedar clavado.
//
// Diferencia con la referencia: CADA conexión se reinicia al salir del pool.
//
// El portal fija el cliente de la sesión con sp_set_session_context
// (@read_only = 1) para el Row-Level Security de la base (ver
// lib/data/sql.ts → consultaDeCliente). mssql no reinicia la conexión al
// devolverla al pool, así que sin esto una conexión usada por el cliente A
// volvería a salir con el contexto de A: o fallaría al fijar el de B (la clave
// es de solo lectura) o, peor, consultaría como A. tedious.Connection#reset()
// manda el pedido con RESETCONNECTION (sp_reset_connection), que borra el
// SESSION_CONTEXT, y recién entonces se entrega la conexión.

type TediousConnection = { reset(callback: (err?: Error | null) => void): void };
type Callback = (err: Error | null, connection?: TediousConnection, config?: unknown) => void;

function reiniciar(conexion: TediousConnection): Promise<TediousConnection> {
  return new Promise((resolver, rechazar) => {
    conexion.reset((err) => (err ? rechazar(err) : resolver(conexion)));
  });
}

/** ConnectionPool que entrega cada conexión recién reiniciada (sin estado de sesión previo). */
class PoolConReinicio extends sql.ConnectionPool {
  // `acquire` es la puerta por la que Request y Transaction toman una conexión
  // (API pública de mssql, en modo promesa o con callback).
  acquire(requester: unknown, callback?: Callback): unknown {
    const base = sql.ConnectionPool.prototype as unknown as {
      acquire(this: sql.ConnectionPool, r: unknown): Promise<TediousConnection>;
      release(this: sql.ConnectionPool, c: TediousConnection): unknown;
    };
    const promesa = base.acquire.call(this, requester).then((conexion) =>
      reiniciar(conexion).catch((err) => {
        base.release.call(this, conexion);
        throw err;
      })
    );
    if (typeof callback === "function") {
      promesa.then(
        (conexion) => process.nextTick(callback, null, conexion, (this as unknown as { config: unknown }).config),
        (err) => process.nextTick(callback, err)
      );
      return this;
    }
    return promesa;
  }
}

let poolPromesa: Promise<sql.ConnectionPool> | null = null;
let poolEscrituraPromesa: Promise<sql.ConnectionPool> | null = null;

/**
 * Pool aparte, SOLO para las cuentas (lib/server/cuentas.ts):
 * registrar intentos, último acceso y cambio de clave en seguridad.*. Va sin
 * ApplicationIntent=ReadOnly (en un Availability Group la réplica de lectura
 * rechazaría la escritura) y con pocas conexiones. No fija session_context:
 * esas sentencias no leen datos de clientes.
 */
export function getPoolEscritura(): Promise<sql.ConnectionPool> {
  if (!poolEscrituraPromesa) {
    const base = getSqlConfig();
    poolEscrituraPromesa = new sql.ConnectionPool({
      ...base,
      options: { ...base.options, readOnlyIntent: false, appName: "sys_clientes-login" },
      pool: { ...base.pool, max: 2 },
    })
      .connect()
      .then((pool) => {
        pool.on("error", () => {
          poolEscrituraPromesa = null;
        });
        return pool;
      })
      .catch((err) => {
        poolEscrituraPromesa = null;
        throw err;
      });
  }
  return poolEscrituraPromesa;
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromesa) {
    poolPromesa = new PoolConReinicio(getSqlConfig())
      .connect()
      .then((pool) => {
        // Una desconexión del servidor deja el pool inservible.
        pool.on("error", () => {
          poolPromesa = null;
        });
        return pool;
      })
      .catch((err) => {
        poolPromesa = null;
        throw err;
      });
  }
  return poolPromesa;
}
