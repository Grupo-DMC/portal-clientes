import "server-only";
import type { ContextoPortal } from "@/lib/contratos/portal";
import { fuenteDeDatos } from "@/lib/env";
import { fuenteDb } from "./db";
import type { FuentePortal } from "./fuente";
import { fuenteMock } from "./mock";

// Punto de entrada de la capa de datos del portal. Las páginas y layouts del
// portal importan SOLO de aquí; nunca de mock.ts ni de db.ts. Cambiar de fuente
// es cambiar DATA_SOURCE: la UI no se entera.

export function fuentePortal(): FuentePortal {
  return fuenteDeDatos() === "db" ? fuenteDb : fuenteMock;
}

export const cargarPortal = (ctx: ContextoPortal) => fuentePortal().cargarPortal(ctx);
export const listarTickets = (ctx: ContextoPortal) => fuentePortal().listarTickets(ctx);
export const listarTrabajosPlanificados = (ctx: ContextoPortal) => fuentePortal().listarTrabajosPlanificados(ctx);
export const listarCotizaciones = (ctx: ContextoPortal) => fuentePortal().listarCotizaciones(ctx);
export const listarDespachos = (ctx: ContextoPortal) => fuentePortal().listarDespachos(ctx);

export { DatosPendientesError } from "./errores";
export type { FuentePortal } from "./fuente";
