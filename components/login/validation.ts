export const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Devuelve el mensaje de error del campo Correo, o "" si es válido. */
export function validateEmail(v: string): string {
  if (!v) return "Ingresa tu correo.";
  return emailValid(v) ? "" : "El correo no es válido. Revisa que esté completo, por ejemplo nombre@empresa.cl.";
}

/** Solo rutas internas: empieza con "/" y no con "//" ni "/\". */
export function safeInternalPath(to: string): string {
  return to.startsWith("/") && !to.startsWith("//") && !to.startsWith("/\\") ? to : "/";
}
