import type {
  ContextoPortal,
  CotizacionDto,
  DespachoDto,
  PortalDatos,
  TicketPortalDto,
  TrabajoPlanificadoDto,
} from "@/lib/contratos/portal";
import type { FuenteDatos } from "@/lib/env";

/**
 * Lo que el portal necesita leer, sin decir de dónde. Hay dos implementaciones
 * (mock.ts y db.ts) y lib/data/portal/index.ts elige una con DATA_SOURCE.
 * Solo lectura: las escrituras del portal (editar sucursal, cuentas de local,
 * usuarios, avisos) siguen en memoria del navegador hasta que se habiliten.
 */
export interface FuentePortal {
  readonly nombre: FuenteDatos;
  /** Todo lo que pinta el layout del portal de una vez (dashboard, sucursales, visitas, etc.). */
  cargarPortal(ctx: ContextoPortal): Promise<PortalDatos>;
  listarTickets(ctx: ContextoPortal): Promise<TicketPortalDto[]>;
  listarTrabajosPlanificados(ctx: ContextoPortal): Promise<TrabajoPlanificadoDto[]>;
  listarCotizaciones(ctx: ContextoPortal): Promise<CotizacionDto[]>;
  listarDespachos(ctx: ContextoPortal): Promise<DespachoDto[]>;
}
