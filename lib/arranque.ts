import { describirDestinoSql, getSqlConfig } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import { enProduccion, env } from "@/lib/env";
import { log } from "@/lib/log";

// Validación al arrancar el servidor (la llama instrumentation.ts una vez por
// instancia). Lo que falta en la configuración se ve aquí, con un mensaje
// claro, y no como una pantalla vacía en la primera petición.
//
// - Una variable obligatoria ausente o inválida: el arranque FALLA.
// - La base caída: solo se registra. La app arranca y /api/salud lo informa,
//   para que un corte de la base no deje el sitio entero sin responder.

export async function validarArranque(): Promise<void> {
  if (enProduccion) {
    const secreto = env("SESSION_SECRET");
    if (!secreto || secreto.length < 32) {
      throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres). Genéralo con `npm run secreto`.");
    }
  }

  // Todo sale de DMC_Core: sin credenciales completas no se arranca.
  getSqlConfig();
  log.info("arranque", { destino: describirDestinoSql() });

  // Prueba de conexión sin bloquear el arranque.
  getPool()
    .then(() => log.info("arranque", { bd: "conectada", destino: describirDestinoSql() }))
    .catch((err) => log.error("arranque: no se pudo conectar a SQL Server", { destino: describirDestinoSql(), err }));
}
