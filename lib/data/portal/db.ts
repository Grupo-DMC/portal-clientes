import "server-only";
import type {
  ArchivoVisitaDto,
  ContextoPortal,
  CuentaLocalDto,
  FiltrosVisitas,
  PortalDatos,
  PreferenciasAvisosDto,
  TicketPortalDto,
  VisitaCompletaDto,
  VisitaPortalDto,
} from "@/lib/contratos/portal";
import { log } from "@/lib/log";
import {
  F_FECHA,
  F_FECHA_DMY,
  F_FECHA_HORA_DMY,
  F_HORA,
  consultaDeCliente,
  ident,
  idCliente,
  num,
  numONull,
  sql,
  type Parametro,
} from "@/lib/data/sql";
import {
  garantiaVigente,
  isoADmy,
  resumirGarantias,
  resumirMarcas,
  resumirVisitas,
  ticketsPorSucursal,
  venceGarantia,
} from "./calculos";
import { DatosPendientesError } from "./errores";
import type { FuentePortal } from "./fuente";
import {
  COLUMNA_CLIENTE,
  DIAS_GARANTIA_POR_VENCER,
  ESTADOS_VISITA_BD,
  MAPEO,
  PRIORIDAD_ALTA,
  SECCIONES_OBLIGATORIAS,
  TICKET_ABIERTO,
  type Campo,
  type MapeoPortal,
  type MapeoSeccion,
} from "./mapeo";

// DMC_Core, SOLO LECTURA y SOLO vistas portal.v_* (ver
// docs/portal-vistas.md). Cada consulta:
//   1. fija el cliente de la sesión con sp_set_session_context (RLS), y
//   2. filtra además por cliente_id = @__cliente_id.
// Ambas cosas las garantiza consultaDeCliente (lib/data/sql.ts). El cliente sale
// SIEMPRE de la sesión (lib/server/portalSesion.ts), nunca de la URL ni del body.

/** Tope de filas por sección: el portal no pagina todavía. */
const MAX_FILAS = 5000;

/** Valores neutros mientras las preferencias de avisos no tengan origen en la base. */
const PREFERENCIAS_POR_DEFECTO: PreferenciasAvisosDto = {
  tipos: Object.fromEntries(
    ["ticket_nuevo", "ticket_cerrado", "visita_programada", "visita_realizada", "reporte_nuevo", "garantia", "calibracion"].map((t) => [
      t,
      { portal: true, correo: false },
    ])
  ),
  frecuencia: "inmediato",
  silencio: false,
};

function columnaSql(campo: Campo): string {
  const base = ident(campo.col);
  switch (campo.tipo) {
    case "fecha":
      return F_FECHA_DMY(base);
    case "fechaISO":
      return F_FECHA(base);
    case "fechaHora":
      return F_FECHA_HORA_DMY(base);
    case "hora":
      return F_HORA(base);
    default:
      return base;
  }
}

function convertir(valor: unknown, campo: Campo): unknown {
  if (valor === null || valor === undefined) return null;
  if (campo.tipo === "numero") return numONull(valor);
  if (campo.tipo === "bool") return Boolean(valor);
  return String(valor);
}

/** El cliente de la sesión en la base. Sin él no se consulta nada. */
function clienteDe(ctx: ContextoPortal): number {
  if (ctx.clienteIdBd === null) {
    throw new Error(`La sesión de ${ctx.email} no trae cliente_id: no se puede filtrar la base por cliente.`);
  }
  return idCliente(ctx.clienteIdBd);
}

/** Condición adicional con parámetros (filtros de la UI). El texto es fijo; los valores van en `params`. */
interface Extra {
  donde: string[];
  params: Parametro[];
}

/** Lee una sección según su mapeo: contexto de sesión + WHERE cliente_id = @__cliente_id. */
async function leer<C extends string>(m: MapeoSeccion<C>, ctx: ContextoPortal, extra?: Extra): Promise<Record<C, unknown>[]> {
  const cliente = clienteDe(ctx);
  const campos = Object.entries(m.campos) as [C, Campo][];
  const columnas = campos.map(([nombre, campo]) => `${columnaSql(campo)} AS ${ident(nombre)}`).join(", ");
  const condiciones = [m.donde, ...(extra?.donde ?? [])]
    .filter(Boolean)
    .map((c) => ` AND (${c})`)
    .join("");
  const orden = m.orden ? ` ORDER BY ${ident(m.orden.col)} ${m.orden.dir === "DESC" ? "DESC" : "ASC"}` : "";
  const filas = await consultaDeCliente<Record<C, unknown>>(
    cliente,
    `SELECT TOP (${MAX_FILAS}) ${columnas} FROM ${ident(m.tabla)} WHERE ${ident(COLUMNA_CLIENTE)} = @__cliente_id${condiciones}${orden}`,
    extra?.params ?? []
  );
  return filas.map((fila) => {
    const salida = {} as Record<C, unknown>;
    for (const [nombre, campo] of campos) {
      const valor = convertir(fila[nombre], campo);
      const traduccion = m.valores?.[nombre];
      salida[nombre] = traduccion && typeof valor === "string" ? (traduccion[valor] ?? valor) : valor;
    }
    return salida;
  });
}

/** Lee una sección opcional: sin vista devuelve [] y lo deja anotado en el log. */
async function leerOpcional<K extends keyof MapeoPortal>(seccion: K, ctx: ContextoPortal): Promise<Record<string, unknown>[]> {
  const m = MAPEO[seccion] as MapeoSeccion<string> | null;
  if (!m) {
    log.warn("portal.db", { seccion, aviso: "sección sin vista en portal: se entrega vacía" });
    return [];
  }
  return leer(m, ctx);
}

function obligatoria<K extends (typeof SECCIONES_OBLIGATORIAS)[number]>(seccion: K): NonNullable<MapeoPortal[K]> {
  const m = MAPEO[seccion];
  if (!m) throw new DatosPendientesError([seccion]);
  return m as NonNullable<MapeoPortal[K]>;
}

const texto = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const textoONull = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));

async function leerTickets(ctx: ContextoPortal): Promise<TicketPortalDto[]> {
  const filas = await leerOpcional("tickets", ctx);
  return filas.map((f) => ({
    id: texto(f.id),
    sucursal: texto(f.sucursal),
    fecha: texto(f.fecha),
    problema: texto(f.problema),
    estado: texto(f.estado),
    prioridad: texto(f.prioridad),
    descripcion: texto(f.descripcion),
    solicitadoPor: textoONull(f.solicitadoPor),
  }));
}

/** Problemas abiertos por sucursal (de las visitas del cliente), para el estado «con observaciones». */
async function problemasAbiertosPorSucursal(ctx: ContextoPortal): Promise<Map<string, number>> {
  const filas = await consultaDeCliente<{ sucursal_id: string; n: number }>(
    clienteDe(ctx),
    `SELECT v.sucursal_id, COUNT(*) AS n
       FROM portal.v_visita_problema p
       JOIN portal.v_visita v ON v.visita_id = p.visita_id AND v.cliente_id = p.cliente_id
      WHERE p.cliente_id = @__cliente_id AND v.cliente_id = @__cliente_id AND p.estado_codigo = 'ABIERTO'
      GROUP BY v.sucursal_id`
  );
  return new Map(filas.map((f) => [String(f.sucursal_id), num(f.n)]));
}

function aVisitaDto(v: Record<string, unknown>): VisitaPortalDto {
  return {
    folio: texto(v.folio),
    fecha: texto(v.fecha),
    sucursal: texto(v.sucursal),
    sucursalId: texto(v.sucursalId),
    marca: texto(v.marca),
    tecnico: texto(v.tecnico),
    motivo: texto(v.motivo),
    estado: texto(v.estado),
    fotos: numONull(v.fotos) ?? 0,
    videos: numONull(v.videos) ?? 0,
    problemas: numONull(v.problemas) ?? 0,
  };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^\d{1,18}$/;

/** Filtros de la URL → condiciones parametrizadas. Lo que no calza se ignora. Solo acotan dentro del cliente. */
function condicionesVisitas(f: FiltrosVisitas): Extra {
  const extra: Extra = { donde: [], params: [] };
  if (f.sucursalId && ID.test(f.sucursalId)) {
    extra.donde.push("sucursal_id = @sucursal");
    extra.params.push(["sucursal", sql.BigInt, f.sucursalId]);
  }
  if (f.desde && ISO.test(f.desde)) {
    extra.donde.push("fecha_programada >= @desde");
    extra.params.push(["desde", sql.Date, f.desde]);
  }
  if (f.hasta && ISO.test(f.hasta)) {
    extra.donde.push("fecha_programada <= @hasta");
    extra.params.push(["hasta", sql.Date, f.hasta]);
  }
  return extra;
}

/** Folio tal como lo guarda la base: «V-2026-01064» o el histórico «V-20961». */
const FOLIO = /^V-(\d{4,6}|\d{4}-\d{5})$/;

/** Ruta de descarga de un archivo por el endpoint propio del portal. */
const urlArchivo = (tipo: string, id: string) => `/api/archivo/${encodeURIComponent(tipo.toLowerCase())}/${encodeURIComponent(id)}`;

/** Filas hijas que llegan anidadas en el JSON del detalle. */
interface JsonDetalle {
  visita_id: string;
  [col: string]: unknown;
  motivos?: { ambito: string; motivo: string }[];
  trabajos?: { trabajo: string; detalle: string | null; subtrabajos: string | null; subs?: { etiqueta: string; cantidad: number }[] }[];
  problemas?: Record<string, unknown>[];
  archivos?: Record<string, unknown>[];
}

/**
 * El acta completa en UNA consulta (FOR JSON): visita, sucursal (código y mall),
 * motivos, trabajos con subtrabajos, problemas y archivos. Antes eran seis
 * consultas en serie; contra DMC_Core remoto cada una cuesta ~0,7 s (ida y vuelta
 * más el reinicio de la conexión), así que el detalle tardaba 4 s solo en datos.
 *
 * Cada vista hija filtra por cliente_id = @__cliente_id además de por visita.
 * El RUT de la firma sale de tecnico.visita_firma (tabla binaria permitida) solo
 * para un archivo que ya está en portal.v_visita_archivo de ese cliente.
 */
const SQL_DETALLE = `SELECT (
  SELECT TOP (1) CAST(v.visita_id AS varchar(20)) AS visita_id, v.folio, v.estado,
         ${F_FECHA_DMY("v.fecha_programada")} AS fecha, ${F_FECHA("v.fecha_programada")} AS fecha_iso,
         CAST(v.sucursal_id AS varchar(20)) AS sucursal_id, v.sucursal, v.marca, v.direccion, v.comuna, v.region,
         v.motivo, v.motivo_real, v.trabajo_solicitado, v.tecnico, v.tecnico_ayudante,
         ${F_HORA("v.hora_inicio")} AS hora_inicio, ${F_HORA("v.hora_termino")} AS hora_termino, v.duracion_min,
         v.responsable_nombre, v.responsable_cargo, v.observaciones,
         s.codigo AS sucursal_codigo, s.mall,
         (SELECT m.ambito, m.motivo FROM portal.v_visita_motivo m
           WHERE m.visita_id = v.visita_id AND m.cliente_id = @__cliente_id
           ORDER BY m.ambito, m.orden FOR JSON PATH) AS motivos,
         (SELECT t.trabajo, t.detalle, t.subtrabajos,
                 (SELECT st.etiqueta, st.cantidad FROM portal.v_visita_subtrabajo st
                   WHERE st.visita_trabajo_id = t.visita_trabajo_id AND st.cliente_id = @__cliente_id
                   ORDER BY st.orden FOR JSON PATH) AS subs
            FROM portal.v_visita_trabajo t
           WHERE t.visita_id = v.visita_id AND t.cliente_id = @__cliente_id
           ORDER BY t.orden FOR JSON PATH) AS trabajos,
         (SELECT CAST(p.problema_id AS varchar(20)) AS problema_id, p.tipo, p.estado, p.estado_codigo, p.descripcion,
                 p.solucion, p.items, ${F_FECHA_DMY("p.resuelto_en")} AS resuelto_en
            FROM portal.v_visita_problema p
           WHERE p.visita_id = v.visita_id AND p.cliente_id = @__cliente_id
           ORDER BY p.creado_en FOR JSON PATH) AS problemas,
         (SELECT a.tipo, CAST(a.archivo_id AS varchar(20)) AS archivo_id, a.mime, a.bytes, a.duracion_seg,
                 ${F_FECHA_HORA_DMY("a.fecha")} AS fecha, a.descripcion, CAST(a.problema_id AS varchar(20)) AS problema_id,
                 (SELECT TOP (1) f.rut FROM tecnico.visita_firma f
                   WHERE f.id = a.archivo_id AND f.visita_id = a.visita_id AND a.tipo LIKE 'FIRMA[_]%') AS rut
            FROM portal.v_visita_archivo a
           WHERE a.visita_id = v.visita_id AND a.cliente_id = @__cliente_id
           ORDER BY a.tipo, a.orden FOR JSON PATH) AS archivos
    FROM portal.v_visita v
    LEFT JOIN portal.v_sucursal s ON s.sucursal_id = v.sucursal_id AND s.cliente_id = @__cliente_id
   WHERE v.folio = @folio AND v.cliente_id = @__cliente_id
   FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
) AS j`;

/** Detalle de una visita del cliente. null si el folio no existe o es de otro cliente (la página responde 404). */
async function detalleVisita(ctx: ContextoPortal, folioUrl: string): Promise<VisitaCompletaDto | null> {
  const folio = folioUrl.trim().toUpperCase();
  if (!FOLIO.test(folio)) return null;
  const cliente = clienteDe(ctx);

  const [fila] = await consultaDeCliente<{ j: string | null }>(cliente, SQL_DETALLE, [["folio", sql.VarChar(20), folio]], ["tecnico.visita_firma"]);
  if (!fila?.j) return null;
  const v = JSON.parse(fila.j) as JsonDetalle;
  const responsable = textoONull(v.responsable_nombre);

  return {
    folio: texto(v.folio),
    estado: ESTADOS_VISITA_BD[texto(v.estado)] ?? texto(v.estado),
    fecha: texto(v.fecha),
    fechaISO: textoONull(v.fecha_iso),
    sucursal: texto(v.sucursal),
    sucursalId: textoONull(v.sucursal_id),
    sucursalCodigo: textoONull(v.sucursal_codigo),
    mall: textoONull(v.mall),
    marca: texto(v.marca),
    direccion: texto(v.direccion),
    comuna: texto(v.comuna),
    region: texto(v.region),
    motivo: texto(v.motivo),
    motivoReal: textoONull(v.motivo_real),
    trabajoSolicitado: texto(v.trabajo_solicitado),
    tecnico: texto(v.tecnico),
    tecnicoAyudante: textoONull(v.tecnico_ayudante),
    horaInicio: textoONull(v.hora_inicio),
    horaTermino: textoONull(v.hora_termino),
    duracionMin: numONull(v.duracion_min),
    responsable: responsable ? { nombre: responsable, cargo: textoONull(v.responsable_cargo) } : null,
    observaciones: textoONull(v.observaciones),
    motivos: (v.motivos ?? []).map((m) => ({ ambito: m.ambito, motivo: m.motivo })),
    trabajos: (v.trabajos ?? []).map((t) => ({
      trabajo: t.trabajo,
      detalle: textoONull(t.detalle),
      resumen: textoONull(t.subtrabajos),
      subtrabajos: (t.subs ?? []).map((s) => ({ etiqueta: s.etiqueta, cantidad: num(s.cantidad) })),
    })),
    problemas: (v.problemas ?? []).map((p) => ({
      id: texto(p.problema_id),
      tipo: texto(p.tipo),
      estado: texto(p.estado),
      estadoCodigo: texto(p.estado_codigo),
      descripcion: textoONull(p.descripcion),
      solucion: textoONull(p.solucion),
      items: textoONull(p.items),
      resueltoEn: textoONull(p.resuelto_en),
    })),
    archivos: (v.archivos ?? []).map((a): ArchivoVisitaDto => {
      const tipo = texto(a.tipo);
      const url = urlArchivo(tipo, texto(a.archivo_id));
      return {
        tipo,
        id: texto(a.archivo_id),
        mime: texto(a.mime),
        bytes: numONull(a.bytes),
        duracionSeg: numONull(a.duracion_seg),
        fecha: textoONull(a.fecha),
        descripcion: textoONull(a.descripcion),
        problemaId: textoONull(a.problema_id),
        url,
        miniUrl: tipo === "VIDEO" ? null : `${url}?mini=1`,
        rut: textoONull(a.rut),
      };
    }),
  };
}

export const fuenteDb: FuentePortal = {
  async cargarPortal(ctx) {
    const faltan = SECCIONES_OBLIGATORIAS.filter((s) => !MAPEO[s]);
    if (faltan.length) throw new DatosPendientesError(faltan);

    // En paralelo: cada consulta toma su propia conexión (reiniciada) del pool y
    // fija su contexto, y el pool (DB_POOL_MAX) acota cuántas van a la vez. En
    // serie, contra DMC_Core remoto (~0,7 s por consulta) el layout tardaba ~2 s.
    const [sucursales, visitas, abiertos, cuentas, reportes, usuarios, notificaciones, tickets] = await Promise.all([
      leer(obligatoria("sucursales"), ctx),
      leer(obligatoria("visitas"), ctx),
      problemasAbiertosPorSucursal(ctx),
      leerOpcional("cuentasLocales", ctx),
      leerOpcional("reportes", ctx),
      leerOpcional("usuarios", ctx),
      leerOpcional("notificaciones", ctx),
      leerTickets(ctx),
    ]);

    const ticketsAbiertos = ticketsPorSucursal(tickets, TICKET_ABIERTO);
    const vencimientos: (string | null)[] = [];
    const sucursalesDto = sucursales.map((s) => {
      const id = texto(s.id);
      const enGarantia = s.enGarantia === null ? null : Boolean(s.enGarantia);
      const venceISO = venceGarantia(enGarantia, textoONull(s.fechaInstalacionISO), numONull(s.garantiaMeses));
      vencimientos.push(venceISO);
      const activo = s.activo !== false;
      return {
        id,
        codigo: textoONull(s.codigo),
        nombre: texto(s.nombre),
        marca: texto(s.marca),
        mall: textoONull(s.mall),
        direccion: textoONull(s.direccion),
        // Sin origen en DMC_Core (docs/portal-vistas.md, «Sin origen»).
        local: null,
        accesos: null,
        equipos: null,
        comuna: texto(s.comuna),
        region: texto(s.region),
        activo,
        fechaInstalacion: textoONull(s.fechaInstalacion),
        enGarantia,
        garantiaMeses: numONull(s.garantiaMeses),
        garantiaVence: venceISO ? isoADmy(venceISO) : null,
        visitasRealizadas: numONull(s.visitasRealizadas),
        ultimaVisita: textoONull(s.ultimaVisita),
        // Con en_garantia = 1 pero sin fechas para calcular el vencimiento, se confía en la marca de la vista.
        garantia: enGarantia && (venceISO === null || garantiaVigente(venceISO)) ? "vigente" : null,
        tickets: ticketsAbiertos.get(texto(s.nombre)) ?? 0,
        estado: !activo ? "inactiva" : (abiertos.get(id) ?? 0) > 0 ? "observaciones" : "operativa",
        zona: null,
      };
    });

    const cuentasDto: Record<string, CuentaLocalDto> = {};
    for (const c of cuentas) {
      cuentasDto[texto(c.local)] = { usuario: texto(c.usuario), estado: texto(c.estado), ultimo: textoONull(c.ultimo) };
    }

    const datos: PortalDatos = {
      // La base del portal no expone usuarios: el perfil sale de la cuenta de la sesión.
      usuario: { id: 0, nombre: ctx.nombre, rol: ctx.rol, correo: ctx.email, cargo: "", telefono: "", foto: null },
      cliente: ctx.cliente ?? { nombre: "", razonSocial: "", rut: "", logo: null },
      sucursalesTotal: sucursalesDto.length,
      marcas: resumirMarcas(sucursalesDto),
      tickets: {
        abiertos: tickets.filter((t) => t.estado === TICKET_ABIERTO).length,
        altaPrioridad: tickets.filter((t) => t.estado === TICKET_ABIERTO && PRIORIDAD_ALTA.includes(t.prioridad)).length,
      },
      garantias: resumirGarantias(vencimientos, DIAS_GARANTIA_POR_VENCER),
      visitasResumen: resumirVisitas(visitas.map((v) => texto(v.fechaISO))),
      sucursales: sucursalesDto,
      visitasTotal: visitas.length,
      visitas: visitas.map(aVisitaDto),
      cuentas: cuentasDto,
      reportes: reportes.map((r) => ({
        id: texto(r.id),
        local: texto(r.local),
        fecha: texto(r.fecha),
        tipo: texto(r.tipo),
        detalle: texto(r.detalle),
        estado: texto(r.estado),
        prioridad: r.prioridadNivel ? { nivel: texto(r.prioridadNivel), motivo: texto(r.prioridadMotivo) } : null,
      })),
      usuarios: usuarios.map((u) => ({
        id: numONull(u.id) ?? 0,
        nombre: texto(u.nombre),
        correo: texto(u.correo),
        rol: texto(u.rol),
        zona: textoONull(u.zona),
        locales: [],
        extras: [],
        estado: texto(u.estado),
      })),
      notificaciones: notificaciones.map((n) => ({
        id: texto(n.id),
        tipo: texto(n.tipo),
        titulo: texto(n.titulo),
        texto: texto(n.texto),
        fecha: texto(n.fecha),
        leida: Boolean(n.leida),
        href: textoONull(n.href),
      })),
      preferencias: PREFERENCIAS_POR_DEFECTO,
    };
    return datos;
  },

  async listarVisitas(ctx, filtros) {
    const filas = await leer(obligatoria("visitas"), ctx, condicionesVisitas(filtros));
    return filas.map(aVisitaDto);
  },

  detalleVisita,

  listarTickets: leerTickets,

  async listarTrabajosPlanificados(ctx) {
    const filas = await leerOpcional("trabajosPlanificados", ctx);
    return filas.map((f) => ({
      fecha: texto(f.fecha),
      sucursal: texto(f.sucursal),
      trabajo: texto(f.trabajo),
      tecnico: texto(f.tecnico),
      estado: texto(f.estado),
    }));
  },

  async listarCotizaciones(ctx) {
    const filas = await leerOpcional("cotizaciones", ctx);
    return filas.map((f) => ({
      id: texto(f.id),
      sucursal: texto(f.sucursal),
      fecha: texto(f.fecha),
      descripcion: texto(f.descripcion),
      monto: texto(f.monto),
      estado: texto(f.estado),
    }));
  },

  async listarDespachos(ctx) {
    const filas = await leerOpcional("despachos", ctx);
    return filas.map((f) => ({ id: texto(f.id), sucursal: texto(f.sucursal), fecha: texto(f.fecha), items: texto(f.items), estado: texto(f.estado) }));
  },
};

/** Qué secciones tienen vista, para /api/salud. */
export function estadoDelMapeo(): { confirmadas: string[]; pendientes: string[] } {
  const secciones = Object.keys(MAPEO) as (keyof MapeoPortal)[];
  return {
    confirmadas: secciones.filter((s) => MAPEO[s] !== null),
    pendientes: secciones.filter((s) => MAPEO[s] === null),
  };
}
