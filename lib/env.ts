import "server-only";

// Lectura y validación de las variables de entorno del servidor (réplica de
// sys_tecnicos/lib/env.ts). Nada de aquí puede llevar prefijo NEXT_PUBLIC_:
// son secretos de servidor.

export const enProduccion = process.env.NODE_ENV === "production";

/** Devuelve la variable ya recortada, o undefined si está vacía o solo espacios. */
export function env(nombre: string): string | undefined {
  const valor = process.env[nombre]?.trim();
  return valor ? valor : undefined;
}

export function envObligatoria(nombre: string, motivo: string): string {
  const valor = env(nombre);
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. ${motivo}`);
  }
  return valor;
}

export function envBooleana(nombre: string, porDefecto: boolean): boolean {
  const valor = env(nombre)?.toLowerCase();
  if (valor === undefined) return porDefecto;
  return valor === "true" || valor === "1";
}

export function envNumero(nombre: string, porDefecto: number): number {
  const valor = env(nombre);
  if (valor === undefined) return porDefecto;
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${nombre} debe ser un número positivo; llegó "${valor}".`);
  }
  return n;
}

// ── Base de datos ───────────────────────────────────────────────────────────
//
// La app lee y valida todo contra DMC_Core (SQL Server). No hay modo de datos de
// ejemplo: sin credenciales completas no arranca.

/** true cuando hay datos suficientes para abrir el pool de SQL Server. */
export function hayConexionSql(): boolean {
  return Boolean(env("DB_SERVER") && env("DB_NAME") && env("DB_USER") && env("DB_PASSWORD"));
}

/** Falla con un mensaje claro si faltan las credenciales de SQL Server. */
export function exigirConexionSql(): void {
  if (hayConexionSql()) return;
  const faltan = ["DB_SERVER", "DB_NAME", "DB_USER", "DB_PASSWORD"].filter((n) => !env(n));
  const legado = !env("DB_NAME") && env("DB_DATABASE")
    ? " (DB_DATABASE ya no se usa: renómbrala a DB_NAME, como en sys_tecnicos)"
    : "";
  throw new Error(
    `Faltan las credenciales de SQL Server: ${faltan.join(", ")}${legado}. ` +
      "Defínelas en .env.development (local) o en el entorno del despliegue. Ver .env.example."
  );
}
