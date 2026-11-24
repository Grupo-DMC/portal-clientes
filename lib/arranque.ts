import { describirDestinoSql, getSqlConfig } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import { enProduccion, env, fuenteDeDatos } from "@/lib/env";
import { log } from "@/lib/log";

// Validación al arrancar el servidor (la llama instrumentation.ts una vez por
// instancia). Lo que falta en la configuración se ve aquí, con un mensaje
// claro, y no como una pantalla vacía en la primera petición.
//
// - Una variable obligatoria ausente o inválida: el arranque FALLA.
// - La base caída: solo se registra. La app arranca y /api/salud lo informa,
//   para que un corte de la base no deje el sitio entero sin responder.

export async function validarArranque(): Promise<void> {
  const fuente = fuenteDeDatos(); // lanza si DATA_SOURCE no es mock|db

  if (enProduccion) {
    const secreto = env("SESSION_SECRET");
    if (!secreto || secreto.length < 32) {
      throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres). Genéralo con `npm run secreto`.");
    }
    if (!env("DATA_SOURCE")) {
      log.warn("arranque", { aviso: "DATA_SOURCE sin definir en producción: se usan los datos de ejemplo (mock)" });
    }
  }

  if (fuente === "mock") {
    log.info("arranque", { fuente });
    return;
  }

  // DATA_SOURCE=db: sin credenciales completas no se arranca.
  getSqlConfig();
  log.info("arranque", { fuente, destino: describirDestinoSql() });

  // Prueba de conexión sin bloquear el arranque.
  getPool()
    .then(() => log.info("arranque", { bd: "conectada", destino: describirDestinoSql() }))
    .catch((err) => log.error("arranque: no se pudo conectar a SQL Server", { destino: describirDestinoSql(), err }));
}
