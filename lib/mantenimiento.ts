// Modo mantenimiento para las cuentas del equipo DMC (seguridad.usuario, cualquier rol).
//
// Con MAINTENANCE_DMC_USERS=true, una cuenta interna que inicia sesión no ve el
// portal ni el panel: solo /mantenimiento, con el botón de cerrar sesión. Los
// clientes (seguridad.usuario_cliente) siguen normal. Se apaga quitando la
// variable o dejándola en false; no hace falta tocar código.
//
// Se aplica en tres capas: el login (adónde se envía), proxy.ts (páginas y
// /api/*) y los layouts/rutas en el servidor (exigirSesionPanel, apis).
//
// Sin "server-only": lo importa proxy.ts. Solo lee process.env.

/** Ruta de la pantalla de mantenimiento. */
export const RUTA_MANTENIMIENTO = "/mantenimiento";

/** Adónde va una cuenta del equipo DMC al entrar: el panel, o la pantalla de mantenimiento. */
export function inicioEquipo(): string {
  return mantenimientoDmc() ? RUTA_MANTENIMIENTO : "/panel";
}

/** Código con que la API rechaza a una cuenta DMC mientras dura el mantenimiento. */
export const CODIGO_MANTENIMIENTO = "MANTENIMIENTO_DMC";

/** ¿Está activo el mantenimiento para las cuentas internas de DMC? */
export function mantenimientoDmc(): boolean {
  const v = process.env.MAINTENANCE_DMC_USERS?.trim().toLowerCase();
  return v === "true" || v === "1";
}

/** Respuesta de la API para una cuenta DMC durante el mantenimiento: 503 con código claro. */
export function respuestaMantenimiento(): Response {
  return Response.json(
    { error: "El portal está en mantenimiento para cuentas internas de DMC.", codigo: CODIGO_MANTENIMIENTO },
    { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } }
  );
}
