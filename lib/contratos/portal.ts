// Contrato de datos del portal cliente: lo que la capa de datos (lib/data/portal)
// entrega a la UI, sea cual sea la fuente (DATA_SOURCE=mock|db). Equivale a
// sys_tecnicos/lib/contratos/*: tipos de entrada/salida, sin lógica.
//
// La forma calza con lo que hoy consume PortalProvider (lib/pcliente/store.js),
// para no tocar ningún componente. Las fechas viajan como texto ya formateado
// ('DD-MM-YYYY' o 'DD-MM-YYYY HH:mm'), igual que en los datos de ejemplo; en la
// base se convierten en SQL (ver lib/data/sql.ts, F_FECHA_DMY).

// ── Catálogos de estados (valores que entiende la UI) ──────────────────────

export type EstadoSucursal = "operativa" | "observaciones" | "critica";
export type EstadoVisita = "programada" | "completada" | "cancelada" | "cancelada_admin";
export type EstadoReporte = "nuevo" | "revision" | "ticket" | "resuelto";
export type EstadoCuentaLocal = "activa" | "suspendida";
export type RolPortal = "admin" | "zona" | "locales" | "encargado";
export type EstadoUsuarioPortal = "activo" | "invitado" | string;
export type TipoAviso =
  | "ticket_nuevo"
  | "ticket_cerrado"
  | "visita_programada"
  | "visita_realizada"
  | "reporte_nuevo"
  | "garantia"
  | "calibracion";

// ── Cabecera: usuario, cliente y resúmenes del dashboard ───────────────────

export interface PerfilPortalDto {
  id: number;
  nombre: string;
  rol: string;
  correo: string;
  cargo: string;
  telefono: string;
  foto: string | null;
}

export interface ClientePortalDto {
  nombre: string;
  razonSocial: string;
  rut: string;
  logo: string | null;
}

export interface MarcaResumenDto {
  nombre: string;
  total: number;
}

export interface TicketsResumenDto {
  abiertos: number;
  altaPrioridad: number;
}

export interface GarantiasResumenDto {
  porVencer: number;
  /** 'DD-MM-YYYY' */
  planVigenteHasta: string | null;
}

export interface VisitasResumenDto {
  anio: number;
  mes: number;
  semana: number;
  /** Visitas por mes del año en curso, desde enero hasta el mes actual. */
  porMes: number[];
  mesEnCurso: number;
}

// ── Sucursales ─────────────────────────────────────────────────────────────

export interface SucursalPortalDto {
  codigo: string | null;
  nombre: string;
  marca: string;
  mall: string | null;
  local: number | null;
  comuna: string;
  region: string;
  accesos: number | null;
  equipos: number | null;
  garantia: string | null;
  tickets: number;
  estado: EstadoSucursal | string;
  /** Zona del cliente a la que pertenece el local; null = sin zona. */
  zona?: string | null;
}

// ── Visitas ────────────────────────────────────────────────────────────────

export interface VisitaTrabajoDto {
  tipo: string;
  titulo: string;
  items: { n: string; c: number }[];
}

export interface VisitaProblemaDto {
  titulo: string;
  detalle?: string;
  resuelto: boolean;
}

export interface VisitaDetalleDto {
  inicio: string;
  fin: string;
  solicitadoPor: string;
  solicitud: string;
  /** La solicitud original traía credenciales (p. ej. Wi-Fi) y no se muestran. */
  credencialesOcultas: boolean;
  trabajos: VisitaTrabajoDto[];
  problemas: VisitaProblemaDto[];
  fotos: { tema: string; hora: string; url?: string }[];
  videos: { dur: string; res: string; tema: string; url?: string }[];
  firma: { nombre: string; cargo: string; rut: string } | null;
}

export interface VisitaPortalDto {
  folio: string;
  fecha: string;
  sucursal: string;
  tecnico: string;
  motivo: string;
  estado: EstadoVisita | string;
  detalle?: VisitaDetalleDto;
}

// ── Credenciales de locales y reportes ─────────────────────────────────────

export interface CuentaLocalDto {
  usuario: string;
  estado: EstadoCuentaLocal | string;
  /** 'DD-MM-YYYY HH:mm' o null si nunca entró. */
  ultimo: string | null;
}

export interface ReporteLocalDto {
  id: string;
  /** Código del local que lo envió. */
  local: string;
  fecha: string;
  tipo: string;
  detalle: string;
  estado: EstadoReporte | string;
  prioridad: { nivel: string; motivo: string } | null;
}

// ── Usuarios y roles del cliente ───────────────────────────────────────────

export interface UsuarioPortalDto {
  id: number;
  nombre: string;
  correo: string;
  rol: RolPortal | string;
  zona: string | null;
  locales: string[];
  extras: string[];
  estado: EstadoUsuarioPortal;
}

// ── Notificaciones ─────────────────────────────────────────────────────────

export interface NotificacionPortalDto {
  id: string;
  tipo: TipoAviso | string;
  titulo: string;
  texto: string;
  fecha: string;
  leida: boolean;
  href: string | null;
}

export interface PreferenciasAvisosDto {
  tipos: Record<string, { portal: boolean; correo: boolean }>;
  frecuencia: string;
  silencio: boolean;
}

// ── Lo que carga el layout del portal de una vez ───────────────────────────

export interface PortalDatos {
  usuario: PerfilPortalDto;
  cliente: ClientePortalDto;
  sucursalesTotal: number;
  marcas: MarcaResumenDto[];
  tickets: TicketsResumenDto;
  garantias: GarantiasResumenDto;
  visitasResumen: VisitasResumenDto;
  sucursales: SucursalPortalDto[];
  visitasTotal: number;
  visitas: VisitaPortalDto[];
  /** Cuentas de acceso de los locales, por código de local. */
  cuentas: Record<string, CuentaLocalDto>;
  reportes: ReporteLocalDto[];
  usuarios: UsuarioPortalDto[];
  notificaciones: NotificacionPortalDto[];
  preferencias: PreferenciasAvisosDto;
}

// ── Módulos que todavía muestran «en mantenimiento» ────────────────────────
// Se dejan listos en la capa de datos para cuando se construyan sus pantallas.

export interface TicketPortalDto {
  id: string;
  sucursal: string;
  /** 'YYYY-MM-DD' */
  fecha: string;
  problema: string;
  estado: string;
  prioridad: string;
  descripcion: string;
  solicitadoPor: string | null;
}

export interface TrabajoPlanificadoDto {
  fecha: string;
  sucursal: string;
  trabajo: string;
  tecnico: string;
  estado: string;
}

export interface CotizacionDto {
  id: string;
  sucursal: string;
  fecha: string;
  descripcion: string;
  monto: string;
  estado: string;
}

export interface DespachoDto {
  id: string;
  sucursal: string;
  fecha: string;
  items: string;
  estado: string;
}

// ── Contexto de la petición ────────────────────────────────────────────────

/** Quién pide los datos. Lo arma el servidor desde la sesión, nunca el navegador. */
export interface ContextoPortal {
  /** Correo de la cuenta del portal (id de la sesión). */
  email: string;
  /** Cliente al que pertenece la cuenta, en los datos de ejemplo (mock). */
  clienteId: string;
  /** El mismo cliente en la base (clientes.cliente.id, expuesto como cliente_id en portal.v_*). null = sin vincular. */
  clienteIdBd: number | null;
  /** Nombre y rol de la cuenta: la base del portal no expone usuarios (perfil sale de la sesión). */
  nombre: string;
  rol: string;
}
