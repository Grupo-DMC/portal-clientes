import "server-only";
import type { Ticket } from "@/lib/data";

/* Estado efímero del servidor para la demostración (se pierde al reiniciar).
   Con SQL Server esto pasa a ser tablas.
   - tries/locked: intentos del acceso de local (app/actions/local.ts).
   - fails: intentos fallidos del login único, por correo normalizado. */
type RT = {
  tries: Map<string, number>;
  locked: Set<string>;
  fails: Map<string, { count: number; until: number }>;
  tickets: Ticket[];
  seq: number;
};
const g = globalThis as typeof globalThis & { __dmc?: RT };
export const rt: RT = (g.__dmc ??= { tries: new Map(), locked: new Set(), fails: new Map(), tickets: [], seq: 4832 });
// Un estado previo (recarga en caliente) puede no traer `fails`.
rt.fails ??= new Map();
