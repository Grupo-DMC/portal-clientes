// CORS de las rutas /api/*.
//
// sys_tecnicos no define CORS: todo es del mismo origen (páginas + Server
// Actions), y el navegador ya bloquea lo demás. Aquí se mantiene ese criterio
// por defecto —sin CORS_ORIGENES no se agrega ninguna cabecera— y solo se abre
// a los orígenes listados, por si otra app (p. ej. el sistema de técnicos)
// necesita leer alguna ruta de la API desde el navegador.
//
// Sin "server-only": lo usa proxy.ts.

const METODOS = "GET, OPTIONS";
const CABECERAS = "Authorization, Content-Type";

/** Orígenes permitidos, de CORS_ORIGENES (separados por coma, sin barra final). */
export function origenesPermitidos(valor = process.env.CORS_ORIGENES): Set<string> {
  return new Set(
    (valor ?? "")
      .split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  );
}

/** Las cabeceras CORS para ese origen, o null si no está permitido. */
export function cabecerasCors(origen: string | null, permitidos = origenesPermitidos()): Record<string, string> | null {
  if (!origen || !permitidos.has(origen)) return null;
  return {
    "Access-Control-Allow-Origin": origen,
    "Access-Control-Allow-Methods": METODOS,
    "Access-Control-Allow-Headers": CABECERAS,
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}
