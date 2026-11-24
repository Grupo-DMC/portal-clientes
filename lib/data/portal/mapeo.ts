// Mapeo tablas/columnas → contrato del portal (lib/contratos/portal.ts).
//
// NO HAY NOMBRES INVENTADOS. Toda sección está en `null` hasta que se confirme
// el esquema real (ver docs/DATOS_PENDIENTES.md). Los comentarios «candidato»
// citan tablas que SÍ existen en el esquema de sys_tecnicos
// (sql/dmc_contingencia_sqlserver.sql); solo valen si el portal lee esa misma
// base, cosa que también está por confirmar.
//
// Cómo se completa una sección:
//   1. `tabla`: tabla o vista, con esquema ("dmc.sucursal"). Se recomienda una
//      VISTA por sección (p. ej. "portal.v_sucursal") que ya entregue cada
//      columna con el valor final: así este archivo queda trivial y los joins
//      viven en la base, versionados con el resto del esquema.
//   2. `filtro`: la columna que acota al cliente (o al usuario) de la sesión.
//   3. `campos`: cada campo del DTO → columna o expresión, con su tipo. Las
//      fechas se formatean en SQL (lib/data/sql.ts), nunca en JS.
//   4. `valores`: la traducción de los códigos de la base a los de la UI.
//
// Todo lo que se arme con este mapeo pasa por `asegurarSoloLectura`.

/** fecha = DD-MM-YYYY · fechaISO = YYYY-MM-DD · fechaHora = DD-MM-YYYY HH:mm · hora = HH:mm */
export type TipoCampo = "texto" | "numero" | "bool" | "fecha" | "fechaISO" | "fechaHora" | "hora";

/** Una columna de la tabla, o una expresión SQL escrita aquí (nunca entrada del usuario). */
export type Campo = { col: string; tipo: TipoCampo } | { expr: string; tipo: TipoCampo };

export interface MapeoSeccion<C extends string> {
  tabla: string;
  /** Columna con que se filtra por la sesión. */
  filtro: { col: string; por: "cliente" | "usuario" };
  campos: Record<C, Campo>;
  /** Columna (o expresión) para ORDER BY, con dirección. */
  orden?: { col: string; dir: "ASC" | "DESC" };
  /** Traducción de códigos de la base a los valores que entiende la UI, por campo. */
  valores?: Partial<Record<C, Record<string, string>>>;
}

// Campos que lee cada sección (los del DTO que vienen de la base; el resto se
// calcula en lib/data/portal/db.ts).
export type CamposPerfil = "id" | "nombre" | "rol" | "correo" | "cargo" | "telefono";
export type CamposCliente = "nombre" | "razonSocial" | "rut";
export type CamposSucursal =
  | "codigo" | "nombre" | "marca" | "mall" | "local" | "comuna" | "region"
  | "accesos" | "equipos" | "garantia" | "estado";
export type CamposVisita = "folio" | "fecha" | "fechaISO" | "sucursal" | "tecnico" | "motivo" | "estado";
export type CamposGarantia = "porVencer" | "planVigenteHasta";
export type CamposCuentaLocal = "local" | "usuario" | "estado" | "ultimo";
export type CamposReporte = "id" | "local" | "fecha" | "tipo" | "detalle" | "estado" | "prioridadNivel" | "prioridadMotivo";
export type CamposUsuario = "id" | "nombre" | "correo" | "rol" | "zona" | "estado";
export type CamposNotificacion = "id" | "tipo" | "titulo" | "texto" | "fecha" | "leida" | "href";
export type CamposTicket = "id" | "sucursal" | "fecha" | "problema" | "estado" | "prioridad" | "descripcion" | "solicitadoPor";
export type CamposTrabajo = "fecha" | "sucursal" | "trabajo" | "tecnico" | "estado";
export type CamposCotizacion = "id" | "sucursal" | "fecha" | "descripcion" | "monto" | "estado";
export type CamposDespacho = "id" | "sucursal" | "fecha" | "items" | "estado";

export interface MapeoPortal {
  /** Obligatoria en db. Candidato: dmc.usuario (pero allí no hay cargo ni teléfono, y es la tabla del equipo DMC). */
  perfil: MapeoSeccion<CamposPerfil> | null;
  /** Obligatoria en db. Candidato: dmc.cliente (rut, razon_social, nombre_fantasia). */
  cliente: MapeoSeccion<CamposCliente> | null;
  /** Obligatoria en db. Candidato: dmc.sucursal + dmc.marca + dmc.mall (codigo, nombre, comuna, region). Sin equivalente conocido: local, accesos, equipos, estado. */
  sucursales: MapeoSeccion<CamposSucursal> | null;
  /** Obligatoria en db. Candidato: dmc.visita (folio, fecha_programada, estado) + dmc.tecnico + dmc.catalogo_motivo. */
  visitas: MapeoSeccion<CamposVisita> | null;
  /** Obligatoria en db (el dashboard la necesita). Candidato parcial: dmc.cliente.garantia_meses / dmc.sucursal.garantia_meses + fecha_instalacion. */
  garantias: MapeoSeccion<CamposGarantia> | null;
  /** Opcional (vacía si falta). Sin candidato en la referencia. */
  cuentasLocales: MapeoSeccion<CamposCuentaLocal> | null;
  /** Opcional. Sin candidato en la referencia. */
  reportes: MapeoSeccion<CamposReporte> | null;
  /** Opcional. Sin candidato: los usuarios del cliente no existen en el esquema de técnicos. */
  usuarios: MapeoSeccion<CamposUsuario> | null;
  /** Opcional. Candidato dudoso: dmc.notificacion_usuario (es del panel interno). */
  notificaciones: MapeoSeccion<CamposNotificacion> | null;
  /** Opcional. Sin candidato en la referencia. */
  tickets: MapeoSeccion<CamposTicket> | null;
  /** Opcional. Candidato: dmc.visita con estado PROGRAMADA (a confirmar si es lo mismo). */
  trabajosPlanificados: MapeoSeccion<CamposTrabajo> | null;
  /** Opcional. Sin candidato en la referencia. */
  cotizaciones: MapeoSeccion<CamposCotizacion> | null;
  /** Opcional. Sin candidato en la referencia. */
  despachos: MapeoSeccion<CamposDespacho> | null;
}

/** Valores de la UI para tickets abiertos y de alta prioridad (los códigos de la base van en `valores`). */
export const TICKET_ABIERTO = "Abierto";
export const PRIORIDAD_ALTA = ["Alta", "Urgente"];

export const MAPEO: MapeoPortal = {
  perfil: null,
  cliente: null,
  sucursales: null,
  visitas: null,
  garantias: null,
  cuentasLocales: null,
  reportes: null,
  usuarios: null,
  notificaciones: null,
  tickets: null,
  trabajosPlanificados: null,
  cotizaciones: null,
  despachos: null,
};

/** Secciones sin las cuales el portal no puede pintarse. */
export const SECCIONES_OBLIGATORIAS = ["perfil", "cliente", "sucursales", "visitas", "garantias"] as const satisfies readonly (keyof MapeoPortal)[];

/*
Ejemplo de una sección completa (NO activar: nombres de vista hipotéticos que
hay que crear o confirmar):

  sucursales: {
    tabla: "portal.v_sucursal",
    filtro: { col: "cliente_id", por: "cliente" },
    orden: { col: "nombre", dir: "ASC" },
    campos: {
      codigo:   { col: "codigo",   tipo: "texto" },
      nombre:   { col: "nombre",   tipo: "texto" },
      ...
      estado:   { col: "estado",   tipo: "texto" },
    },
    valores: { estado: { OPERATIVA: "operativa", OBSERVACIONES: "observaciones", CRITICA: "critica" } },
  },
*/
