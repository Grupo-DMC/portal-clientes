import type {
  ContextoPortal,
  CotizacionDto,
  DespachoDto,
  FiltrosVisitas,
  PortalDatos,
  TicketPortalDto,
  TrabajoPlanificadoDto,
  VisitaCompletaDto,
  VisitaPortalDto,
} from "@/lib/contratos/portal";

/**
 * Lo que el portal necesita leer. Única implementación: db.ts (DMC_Core).
 * Solo lectura: las escrituras del portal (editar sucursal, cuentas de local,
 * usuarios, avisos) siguen en memoria del navegador hasta que se habiliten.
 */
export interface FuentePortal {
  /** Todo lo que pinta el layout del portal de una vez (dashboard, sucursales, visitas, etc.). */
  cargarPortal(ctx: ContextoPortal): Promise<PortalDatos>;
  /** Visitas realizadas del cliente, con filtros opcionales por sucursal y fecha. */
  listarVisitas(ctx: ContextoPortal, filtros: FiltrosVisitas): Promise<VisitaPortalDto[]>;
  /** Detalle de una visita del cliente por folio; null si no existe o es de otro cliente. */
  detalleVisita(ctx: ContextoPortal, folio: string): Promise<VisitaCompletaDto | null>;
  listarTickets(ctx: ContextoPortal): Promise<TicketPortalDto[]>;
  listarTrabajosPlanificados(ctx: ContextoPortal): Promise<TrabajoPlanificadoDto[]>;
  listarCotizaciones(ctx: ContextoPortal): Promise<CotizacionDto[]>;
  listarDespachos(ctx: ContextoPortal): Promise<DespachoDto[]>;
}
