import "server-only";
import type { config as MssqlConfig } from "mssql";
import { enProduccion, env, envBooleana, envNumero, envObligatoria, exigirConexionSql } from "@/lib/env";

// Configuración del driver a partir del entorno (réplica de
// sys_tecnicos/lib/db/config.ts). Se evalúa en cada llamada a getPool(), así
// que un error aquí se ve en el log del despliegue y no rompe el build.
//
// Diferencia con la referencia: el portal se conecta SOLO PARA LEER. Además de
// la cuenta SQL con permisos de lectura (db_datareader), se declara
// ApplicationIntent=ReadOnly (readOnlyIntent) y lib/data/sql.ts rechaza toda
// sentencia que no sea una consulta.

export function getSqlConfig(): MssqlConfig {
  exigirConexionSql();

  if (envBooleana("DB_TRUSTED_CONNECTION", false)) {
    // options.trustedConnection es exclusiva del driver msnodesqlv8. Con mssql
    // sobre tedious se ignora en silencio y el driver intenta conectar sin
    // credenciales, con un error de login desconcertante.
    throw new Error(
      "DB_TRUSTED_CONNECTION=true no está soportado: este proyecto usa mssql sobre el driver tedious, que ignora la autenticación integrada de Windows. Usa autenticación SQL (DB_USER / DB_PASSWORD)."
    );
  }

  const encrypt = envBooleana("DB_ENCRYPT", true);
  const trustServerCertificate = envBooleana("DB_TRUST_SERVER_CERT", false);

  if (enProduccion && !encrypt) {
    throw new Error(
      "DB_ENCRYPT=false en producción: la contraseña y los datos viajarían en claro. Habilita TLS en el SQL Server y quita esa variable."
    );
  }

  if (enProduccion && trustServerCertificate) {
    // Igual que en la referencia: se avisa pero no se bloquea.
    console.warn(
      "[dmc] DB_TRUST_SERVER_CERT=true en producción: el canal va cifrado pero no se valida el certificado del servidor. Instala un certificado de una CA de confianza y pon la variable en false."
    );
  }

  return {
    server: envObligatoria("DB_SERVER", "Host o IP de la instancia de SQL Server."),
    port: envNumero("DB_PORT", 1433),
    database: envObligatoria("DB_NAME", "Nombre de la base de datos en SQL Server."),
    user: envObligatoria("DB_USER", "Usuario SQL de solo lectura."),
    password: envObligatoria("DB_PASSWORD", "Contraseña del usuario SQL. Nunca la escribas en un archivo del repositorio."),
    options: {
      encrypt,
      trustServerCertificate,
      // ApplicationIntent=ReadOnly: en un Availability Group enruta a una
      // réplica de lectura; en una instancia simple no cambia nada, pero deja
      // declarada la intención. La garantía real es la cuenta de solo lectura.
      readOnlyIntent: true,
      appName: "sys_clientes",
    },
    // Tiempos cortos: en serverless una conexión colgada consume la invocación
    // entera y el usuario se queda mirando una pantalla en blanco.
    connectionTimeout: envNumero("DB_CONNECT_TIMEOUT_MS", 15_000),
    requestTimeout: envNumero("DB_REQUEST_TIMEOUT_MS", 15_000),
    pool: {
      // Cada instancia serverless abre su propio pool: mantener DB_POOL_MAX bajo (2-4).
      max: envNumero("DB_POOL_MAX", 4),
      min: 0,
      idleTimeoutMillis: envNumero("DB_POOL_IDLE_MS", 30_000),
    },
  };
}

/** Descripción del destino, sin credenciales. Para logs y diagnóstico. */
export function describirDestinoSql(): string {
  return `${env("DB_SERVER") ?? "?"}:${env("DB_PORT") ?? "1433"}/${env("DB_NAME") ?? "?"}`;
}
