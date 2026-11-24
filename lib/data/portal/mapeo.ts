// Mapeo vistas → contrato del portal (lib/contratos/portal.ts).
//
// El portal lee SOLO vistas del esquema `portal` (portal.v_*), que crea el
// administrador de la base sobre las tablas de DMC_Core (esquemas `clientes` y
// `tecnico`) según docs/portal-vistas.md. Las vistas ya excluyen lo interno
// (comentario_interno, archivos internos). lib/data/sql.ts rechaza cualquier
// consulta que no sea un SELECT sobre portal.v_* (la cuenta SQL hoy SÍ tiene
// permisos sobre las tablas: esa regla de la app es la que lo impide).
//
// Toda vista lleva `cliente_id` y toda consulta filtra por el cliente de la
// sesión (WHERE cliente_id = @cliente), además del session_context que usa el
// Row-Level Security (lib/data/sql.ts → consultaDeCliente).
//
// Si se cambia una vista, se cambia aquí y en docs/portal-vistas.md a la vez.

/** fecha = DD-MM-YYYY · fechaISO = YYYY-MM-DD · fechaHora = DD-MM-YYYY HH:mm · hora = HH:mm */
export type TipoCampo = "texto" | "numero" | "bool" | "fecha" | "fechaISO" | "fechaHora" | "hora";

/** Una columna de la vista, con su tipo. */
export type Campo = { col: string; tipo: TipoCampo };

export interface MapeoSeccion<C extends string> {
  /** Vista: siempre portal.v_<algo>. */
  tabla: `portal.v_${string}`;
  campos: Record<C, Campo>;
  /** Condición fija adicional, escrita aquí (nunca con datos del usuario). */
  donde?: string;
  orden?: { col: string; dir: "ASC" | "DESC" };
  /** Traducción de códigos de la base a los valores que entiende la UI, por campo. */
  valores?: Partial<Record<C, Record<string, string>>>;
}

/** La columna por la que se filtra cada vista. */
export const COLUMNA_CLIENTE = "cliente_id";

// Campos que lee cada sección. El resto del DTO se calcula en db.ts.
export type CamposCliente = "nombre" | "razonSocial" | "rut";
export type CamposSucursal =
  | "id"
  | "codigo"
  | "nombre"
  | "direccion"
  | "marca"
  | "mall"
  | "comuna"
  | "region"
  | "activo"
  | "fechaInstalacion"
  | "fechaInstalacionISO"
  | "enGarantia"
  | "garantiaMeses"
  | "visitasRealizadas"
  | "ultimaVisita";
export type CamposVisita =
  | "folio"
  | "fecha"
  | "fechaISO"
  | "sucursalId"
  | "sucursal"
  | "marca"
  | "tecnico"
  | "motivo"
  | "estado"
  | "fotos"
  | "videos"
  | "problemas";
export type CamposTrabajo = "fecha" | "sucursal" | "trabajo" | "tecnico" | "estado";
export type CamposCuentaLocal = "local" | "usuario" | "estado" | "ultimo";
export type CamposReporte = "id" | "local" | "fecha" | "tipo" | "detalle" | "estado" | "prioridadNivel" | "prioridadMotivo";
export type CamposUsuario = "id" | "nombre" | "correo" | "rol" | "zona" | "estado";
export type CamposNotificacion = "id" | "tipo" | "titulo" | "texto" | "fecha" | "leida" | "href";
export type CamposTicket = "id" | "sucursal" | "fecha" | "problema" | "estado" | "prioridad" | "descripcion" | "solicitadoPor";
export type CamposCotizacion = "id" | "sucursal" | "fecha" | "descripcion" | "monto" | "estado";
export type CamposDespacho = "id" | "sucursal" | "fecha" | "items" | "estado";

export interface MapeoPortal {
  cliente: MapeoSeccion<CamposCliente> | null;
  sucursales: MapeoSeccion<CamposSucursal> | null;
  visitas: MapeoSeccion<CamposVisita> | null;
  trabajosPlanificados: MapeoSeccion<CamposTrabajo> | null;
  // Sin origen en DMC_Core (clientes/tecnico): no hay vista y se entregan vacías.
  cuentasLocales: MapeoSeccion<CamposCuentaLocal> | null;
  reportes: MapeoSeccion<CamposReporte> | null;
  usuarios: MapeoSeccion<CamposUsuario> | null;
  notificaciones: MapeoSeccion<CamposNotificacion> | null;
  tickets: MapeoSeccion<CamposTicket> | null;
  cotizaciones: MapeoSeccion<CamposCotizacion> | null;
  despachos: MapeoSeccion<CamposDespacho> | null;
}

/**
 * Estados de portal.v_visita → los que conoce la UI. La vista solo trae visitas
 * realizadas (COMPLETADA o PENDIENTE); el resto queda por si se amplía.
 */
export const ESTADOS_VISITA_BD: Record<string, string> = {
  COMPLETADA: "completada",
  PENDIENTE: "pendiente",
  PROGRAMADA: "programada",
  CANCELADA: "cancelada",
  CANCELADA_ADMIN: "cancelada_admin",
};

/** Valores de la UI para tickets abiertos y de alta prioridad. */
export const TICKET_ABIERTO = "Abierto";
export const PRIORIDAD_ALTA = ["Alta", "Urgente"];

/** Días antes del vencimiento en que una garantía cuenta como «por vencer». [VERIFICAR] */
export const DIAS_GARANTIA_POR_VENCER = 30;

export const MAPEO: MapeoPortal = {
  // No hay portal.v_cliente: la cabecera del cliente llega con la sesión (lib/server/portalSesion.ts).
  cliente: null,
  sucursales: {
    tabla: "portal.v_sucursal",
    orden: { col: "nombre", dir: "ASC" },
    campos: {
      id: { col: "sucursal_id", tipo: "numero" },
      codigo: { col: "codigo", tipo: "texto" },
      nombre: { col: "nombre", tipo: "texto" },
      direccion: { col: "direccion", tipo: "texto" },
      marca: { col: "marca", tipo: "texto" },
      mall: { col: "mall", tipo: "texto" },
      comuna: { col: "comuna", tipo: "texto" },
      region: { col: "region", tipo: "texto" },
      activo: { col: "activo", tipo: "bool" },
      fechaInstalacion: { col: "fecha_instalacion", tipo: "fecha" },
      fechaInstalacionISO: { col: "fecha_instalacion", tipo: "fechaISO" },
      enGarantia: { col: "en_garantia", tipo: "bool" },
      garantiaMeses: { col: "garantia_meses", tipo: "numero" },
      visitasRealizadas: { col: "visitas_realizadas", tipo: "numero" },
      ultimaVisita: { col: "ultima_visita", tipo: "fecha" },
    },
  },
  visitas: {
    tabla: "portal.v_visita",
    orden: { col: "fecha_programada", dir: "DESC" },
    campos: {
      folio: { col: "folio", tipo: "texto" },
      fecha: { col: "fecha_programada", tipo: "fecha" },
      fechaISO: { col: "fecha_programada", tipo: "fechaISO" },
      sucursalId: { col: "sucursal_id", tipo: "numero" },
      sucursal: { col: "sucursal", tipo: "texto" },
      marca: { col: "marca", tipo: "texto" },
      tecnico: { col: "tecnico", tipo: "texto" },
      motivo: { col: "motivo", tipo: "texto" },
      estado: { col: "estado", tipo: "texto" },
      fotos: { col: "fotos", tipo: "numero" },
      videos: { col: "videos", tipo: "numero" },
      problemas: { col: "problemas", tipo: "numero" },
    },
    valores: { estado: ESTADOS_VISITA_BD },
  },
  // Trabajos planificados = visitas programadas de hoy en adelante (misma vista).
  trabajosPlanificados: {
    tabla: "portal.v_visita",
    donde: "estado = 'PROGRAMADA' AND fecha_programada >= CAST(SYSDATETIME() AS date)",
    orden: { col: "fecha_programada", dir: "ASC" },
    campos: {
      fecha: { col: "fecha_programada", tipo: "fechaISO" },
      sucursal: { col: "sucursal", tipo: "texto" },
      trabajo: { col: "motivo", tipo: "texto" },
      tecnico: { col: "tecnico", tipo: "texto" },
      estado: { col: "estado", tipo: "texto" },
    },
  },
  cuentasLocales: null,
  reportes: null,
  usuarios: null,
  notificaciones: null,
  tickets: null,
  cotizaciones: null,
  despachos: null,
};

/** Secciones sin las cuales el portal no puede pintarse. */
export const SECCIONES_OBLIGATORIAS = ["sucursales", "visitas"] as const satisfies readonly (keyof MapeoPortal)[];
