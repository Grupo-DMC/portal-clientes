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

// ── Fuente de datos ─────────────────────────────────────────────────────────
//
// Diferencia con sys_tecnicos: allá no hay modo de demostración (todo sale de
// SQL Server). El portal cliente todavía no tiene confirmado su esquema, así que
// la fuente se elige con una sola variable y la UI no se entera:
//
//   DATA_SOURCE=mock  datos de ejemplo en memoria (lib/pcliente/data.js, lib/data.ts)
//   DATA_SOURCE=db    SQL Server, solo lectura (lib/data/portal/db.ts)

export type FuenteDatos = "mock" | "db";
export const FUENTES: readonly FuenteDatos[] = ["mock", "db"];

/** La fuente configurada. Sin la variable: mock (se avisa al arrancar en producción). */
export function fuenteDeDatos(): FuenteDatos {
  const valor = env("DATA_SOURCE")?.toLowerCase();
  if (valor === undefined) return "mock";
  if (!(FUENTES as readonly string[]).includes(valor)) {
    throw new Error(`DATA_SOURCE debe ser "mock" o "db"; llegó "${valor}".`);
  }
  return valor as FuenteDatos;
}

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
