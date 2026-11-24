import "server-only";
import type { ContextoPortal, FiltrosVisitas } from "@/lib/contratos/portal";
import { fuenteDb } from "./db";

// Punto de entrada de la capa de datos del portal. Las páginas y layouts del
// portal importan SOLO de aquí. Todo sale de DMC_Core (vistas portal.v_*).

export const cargarPortal = (ctx: ContextoPortal) => fuenteDb.cargarPortal(ctx);
export const listarVisitas = (ctx: ContextoPortal, filtros: FiltrosVisitas = {}) => fuenteDb.listarVisitas(ctx, filtros);
export const detalleVisita = (ctx: ContextoPortal, folio: string) => fuenteDb.detalleVisita(ctx, folio);
export const listarTickets = (ctx: ContextoPortal) => fuenteDb.listarTickets(ctx);
export const listarTrabajosPlanificados = (ctx: ContextoPortal) => fuenteDb.listarTrabajosPlanificados(ctx);
export const listarCotizaciones = (ctx: ContextoPortal) => fuenteDb.listarCotizaciones(ctx);
export const listarDespachos = (ctx: ContextoPortal) => fuenteDb.listarDespachos(ctx);

export { DatosPendientesError } from "./errores";
export type { FuentePortal } from "./fuente";
