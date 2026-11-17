import "server-only";
import type { Ticket } from "@/lib/data";

/* Estado efímero del servidor para la demostración (se pierde al reiniciar).
   Con SQL Server esto pasa a ser tablas. */
type RT = { tries: Map<string, number>; locked: Set<string>; pw: Map<string, string>; tickets: Ticket[]; seq: number };
const g = globalThis as typeof globalThis & { __dmc?: RT };
export const rt: RT = (g.__dmc ??= { tries: new Map(), locked: new Set(), pw: new Map(), tickets: [], seq: 4832 });
