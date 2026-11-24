// Errores de la capa de datos del portal que la UI sabe explicar.

/**
 * DATA_SOURCE=db pero el mapeo de alguna sección obligatoria sigue sin
 * confirmar (lib/data/portal/mapeo.ts). No es un fallo de conexión: falta
 * decir de qué tablas o vistas sale cada dato (docs/DATOS_PENDIENTES.md).
 */
export class DatosPendientesError extends Error {
  constructor(public readonly secciones: readonly string[]) {
    super(`Mapeo de datos sin confirmar para: ${secciones.join(", ")}. Ver docs/DATOS_PENDIENTES.md.`);
    this.name = "DatosPendientesError";
  }
}
