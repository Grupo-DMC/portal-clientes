import "server-only";
import { consultaCon, num, sql } from "@/lib/data/sql";
import { ISO_FECHA_HORA, txt } from "./comun";

// Administración: catálogos, cuentas del equipo, roles y auditoría. Solo lectura.
// De seguridad.* nunca se lee password_hash; las IPs y correos solo los ve ADMIN
// (lib/server/panelAcceso.ts).

// ── Catálogos ────────────────────────────────────────────────────────────────

export interface CatalogoFila {
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
  /** Dato propio de cada catálogo (sección, grupo, ítems…). */
  extra: string;
}

export interface Catalogo {
  id: string;
  nombre: string;
  descripcion: string;
  columnaExtra: string;
  filas: CatalogoFila[];
}

type FilaCat = { codigo: string; nombre: string; orden: number; activo: boolean; extra: string | null };

/** Cada catálogo es una consulta fija: nombre, descripción y SQL que devuelve codigo, nombre, orden, activo, extra. */
const CATALOGOS: { id: string; nombre: string; descripcion: string; columnaExtra: string; sql: string }[] = [
  {
    id: "motivos",
    nombre: "Motivos de visita",
    descripcion: "Por qué se agenda una visita. Cada motivo trae sus trabajos sugeridos.",
    columnaExtra: "Sección · trabajos",
    sql: `SELECT m.codigo, m.nombre, m.orden, m.activo,
                 CONCAT(COALESCE(sc.nombre, 'Sin sección'), ' · ', (SELECT COUNT(*) FROM tecnico.catalogo_motivo_trabajo mt WHERE mt.motivo_id = m.id), ' trabajos') AS extra
            FROM tecnico.catalogo_motivo m LEFT JOIN tecnico.catalogo_seccion sc ON sc.id = m.seccion_id`,
  },
  {
    id: "trabajos",
    nombre: "Trabajos",
    descripcion: "Trabajos que el técnico registra en el acta, con sus ítems.",
    columnaExtra: "Ítems",
    sql: `SELECT t.codigo, t.nombre, t.orden, t.activo,
                 (SELECT STRING_AGG(st.etiqueta, ', ') WITHIN GROUP (ORDER BY st.orden)
                    FROM tecnico.catalogo_trabajo_subtrabajo st WHERE st.trabajo_id = t.id AND st.activo = 1) AS extra
            FROM tecnico.catalogo_trabajo t`,
  },
  {
    id: "problemas",
    nombre: "Tipos de problema",
    descripcion: "Problemas que el técnico puede reportar en una visita.",
    columnaExtra: "Opciones",
    sql: `SELECT p.codigo, p.nombre, p.orden, p.activo,
                 (SELECT STRING_AGG(o.etiqueta, ', ') WITHIN GROUP (ORDER BY o.orden)
                    FROM tecnico.catalogo_problema_opcion o WHERE o.problema_id = p.id AND o.activo = 1) AS extra
            FROM tecnico.catalogo_problema p`,
  },
  {
    id: "estados-problema",
    nombre: "Estados de problema",
    descripcion: "Ciclo de vida de un problema reportado.",
    columnaExtra: "",
    sql: `SELECT e.codigo, e.nombre, e.orden, e.activo, NULL AS extra FROM tecnico.catalogo_problema_estado e`,
  },
  {
    id: "gestiones",
    nombre: "Gestiones de problema",
    descripcion: "Marcas de seguimiento que el panel de técnicos pone a un problema.",
    columnaExtra: "",
    sql: `SELECT g.codigo, g.nombre, g.orden, g.activo, NULL AS extra FROM tecnico.catalogo_problema_gestion g`,
  },
  {
    id: "pendientes",
    nombre: "Pendientes de visita",
    descripcion: "Gestiones pendientes que se marcan sobre una visita.",
    columnaExtra: "",
    sql: `SELECT x.codigo, x.nombre, x.orden, x.activo, NULL AS extra FROM tecnico.catalogo_pendiente x`,
  },
  {
    id: "internos",
    nombre: "Observaciones internas",
    descripcion: "Marcas internas de una visita; el cliente no las ve.",
    columnaExtra: "",
    sql: `SELECT x.codigo, x.nombre, x.orden, x.activo, NULL AS extra FROM tecnico.catalogo_interno x`,
  },
  {
    id: "cargos",
    nombre: "Cargos de contacto",
    descripcion: "Cargos del personal de tienda y de los contactos del cliente.",
    columnaExtra: "",
    sql: `SELECT x.codigo, x.nombre, x.orden, x.activo, NULL AS extra FROM clientes.catalogo_cargo x`,
  },
];

export async function listarCatalogos(): Promise<Catalogo[]> {
  const resultados = await Promise.all(CATALOGOS.map((c) => consultaCon<FilaCat>(`${c.sql} ORDER BY activo DESC, orden, nombre`, [])));
  return CATALOGOS.map((c, i) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    columnaExtra: c.columnaExtra,
    filas: resultados[i].map((f) => ({ codigo: f.codigo, nombre: f.nombre, orden: num(f.orden), activo: Boolean(f.activo), extra: txt(f.extra) })),
  }));
}

// ── Equipo DMC (seguridad.usuario) ───────────────────────────────────────────

export interface UsuarioEquipo {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  motivoInactivo: string;
  roles: string;
  perfil: string;
  tecnico: string;
  debeCambiarPassword: boolean;
  ultimoAcceso: string;
  creadoEn: string;
}

export async function listarEquipo(): Promise<UsuarioEquipo[]> {
  const filas = await consultaCon<{
    id: string; nombre: string | null; email: string; telefono: string | null; activo: boolean; motivo: string | null; roles: string | null;
    perfil: string | null; tecnico: string | null; debe: boolean; acceso: string | null; creado: string;
  }>(
    `SELECT u.id, u.nombre, u.email, u.telefono, u.activo, u.motivo_inactivo AS motivo,
            (SELECT STRING_AGG(r.rol, ', ') WITHIN GROUP (ORDER BY r.rol) FROM seguridad.usuario_rol r WHERE r.usuario_id = u.id) AS roles,
            ro.nombre AS perfil, t.nombre_completo AS tecnico, u.debe_cambiar_password AS debe,
            ${ISO_FECHA_HORA("u.ultimo_acceso_en")} AS acceso, ${ISO_FECHA_HORA("u.creado_en")} AS creado
       FROM seguridad.usuario u
       LEFT JOIN seguridad.rol ro ON ro.id = u.rol_id
       LEFT JOIN tecnico.tecnico t ON t.id = u.tecnico_id
      ORDER BY u.activo DESC, COALESCE(u.nombre, u.email)`,
    []
  );
  return filas.map((f) => ({
    id: num(f.id),
    nombre: f.nombre || f.email,
    email: f.email,
    telefono: txt(f.telefono),
    activo: Boolean(f.activo),
    motivoInactivo: txt(f.motivo),
    roles: txt(f.roles),
    perfil: txt(f.perfil),
    tecnico: txt(f.tecnico),
    debeCambiarPassword: Boolean(f.debe),
    ultimoAcceso: txt(f.acceso),
    creadoEn: f.creado,
  }));
}

export interface RolPermisos {
  id: number;
  nombre: string;
  descripcion: string;
  sistema: boolean;
  usuarios: number;
  permisos: string[];
}

export async function listarRoles(): Promise<RolPermisos[]> {
  const filas = await consultaCon<{ id: string; nombre: string; descripcion: string | null; sistema: boolean; usuarios: number; permisos: string | null }>(
    `SELECT r.id, r.nombre, r.descripcion, r.es_sistema AS sistema,
            (SELECT COUNT(*) FROM seguridad.usuario u WHERE u.rol_id = r.id AND u.activo = 1) AS usuarios,
            (SELECT STRING_AGG(p.permiso, ',') WITHIN GROUP (ORDER BY p.permiso) FROM seguridad.rol_permiso p WHERE p.rol_id = r.id) AS permisos
       FROM seguridad.rol r ORDER BY r.es_sistema DESC, r.nombre`,
    []
  );
  return filas.map((f) => ({
    id: num(f.id),
    nombre: f.nombre,
    descripcion: txt(f.descripcion),
    sistema: Boolean(f.sistema),
    usuarios: num(f.usuarios),
    permisos: f.permisos ? f.permisos.split(",") : [],
  }));
}

export interface SolicitudClave {
  id: number;
  email: string;
  mensaje: string;
  estado: string;
  creadoEn: string;
  atendidoEn: string;
  atendidoPor: string;
}

export async function listarSolicitudesClave(): Promise<SolicitudClave[]> {
  const filas = await consultaCon<{ id: string; email: string; mensaje: string | null; estado: string; creado: string; atendido: string | null; por: string | null }>(
    `SELECT TOP 200 s.id, s.email, s.mensaje, s.estado, ${ISO_FECHA_HORA("s.creado_en")} AS creado,
            ${ISO_FECHA_HORA("s.atendido_en")} AS atendido, COALESCE(u.nombre, u.email) AS por
       FROM seguridad.solicitud_password s LEFT JOIN seguridad.usuario u ON u.id = s.atendido_por
      ORDER BY s.creado_en DESC`,
    []
  );
  return filas.map((f) => ({
    id: num(f.id),
    email: f.email,
    mensaje: txt(f.mensaje),
    estado: f.estado,
    creadoEn: f.creado,
    atendidoEn: txt(f.atendido),
    atendidoPor: txt(f.por),
  }));
}

// ── Auditoría ────────────────────────────────────────────────────────────────

export interface EventoAuditoria {
  id: number;
  en: string;
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: string;
  detalle: string;
  ip: string;
}

export async function listarAuditoria(tope = 1000): Promise<EventoAuditoria[]> {
  const filas = await consultaCon<{ id: string; en: string; usuario: string | null; accion: string; entidad: string; eid: string | null; detalle: string | null; ip: string | null }>(
    `SELECT TOP (@tope) a.id, ${ISO_FECHA_HORA("a.creado_en")} AS en, a.usuario_email AS usuario, a.accion, a.entidad,
            a.entidad_id AS eid, a.detalle, a.ip
       FROM seguridad.auditoria a ORDER BY a.creado_en DESC, a.id DESC`,
    [["tope", sql.Int, tope]]
  );
  return filas.map((f) => ({
    id: num(f.id),
    en: f.en,
    usuario: txt(f.usuario),
    accion: f.accion,
    entidad: f.entidad,
    entidadId: txt(f.eid),
    detalle: txt(f.detalle),
    ip: txt(f.ip),
  }));
}

export interface CambioEstado {
  id: number;
  en: string;
  entidad: string;
  entidadId: number;
  activo: boolean;
  motivo: string;
  usuario: string;
}

export async function listarCambiosEstado(tope = 500): Promise<CambioEstado[]> {
  const filas = await consultaCon<{ id: string; en: string; entidad: string; eid: string; activo: boolean; motivo: string | null; usuario: string | null }>(
    `SELECT TOP (@tope) c.id, ${ISO_FECHA_HORA("c.creado_en")} AS en, c.entidad, c.entidad_id AS eid, c.activo, c.motivo, c.usuario_email AS usuario
       FROM seguridad.cambio_estado c ORDER BY c.creado_en DESC, c.id DESC`,
    [["tope", sql.Int, tope]]
  );
  return filas.map((f) => ({
    id: num(f.id),
    en: f.en,
    entidad: f.entidad,
    entidadId: num(f.eid),
    activo: Boolean(f.activo),
    motivo: txt(f.motivo),
    usuario: txt(f.usuario),
  }));
}

export interface IntentoLogin {
  id: number;
  en: string;
  email: string;
  ip: string;
  exito: boolean;
}

export async function listarIntentosLogin(tope = 500): Promise<IntentoLogin[]> {
  const filas = await consultaCon<{ id: string; en: string; email: string; ip: string | null; exito: boolean }>(
    `SELECT TOP (@tope) i.id, ${ISO_FECHA_HORA("i.creado_en")} AS en, i.email, i.ip, i.exito
       FROM seguridad.intento_login i ORDER BY i.creado_en DESC, i.id DESC`,
    [["tope", sql.Int, tope]]
  );
  return filas.map((f) => ({ id: num(f.id), en: f.en, email: f.email, ip: txt(f.ip), exito: Boolean(f.exito) }));
}
