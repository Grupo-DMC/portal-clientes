import "server-only";
import type {
  ContextoPortal,
  CuentaLocalDto,
  PortalDatos,
  PreferenciasAvisosDto,
  TicketPortalDto,
} from "@/lib/contratos/portal";
import { log } from "@/lib/log";
import { F_FECHA, F_FECHA_DMY, F_FECHA_HORA_DMY, F_HORA, consultaCon, ident, numONull, sql } from "@/lib/data/sql";
import { resumirMarcas, resumirVisitas, ticketsPorSucursal } from "./calculos";
import { DatosPendientesError } from "./errores";
import type { FuentePortal } from "./fuente";
import { MAPEO, PRIORIDAD_ALTA, SECCIONES_OBLIGATORIAS, TICKET_ABIERTO, type Campo, type MapeoPortal, type MapeoSeccion } from "./mapeo";

// DATA_SOURCE=db: SQL Server, SOLO LECTURA. Las consultas se arman desde el
// mapeo de lib/data/portal/mapeo.ts (que hoy está vacío a propósito: ver
// docs/DATOS_PENDIENTES.md) y pasan todas por consultaCon, que rechaza lo que
// no sea un SELECT.

/** Tope de filas por sección: el portal no pagina todavía. */
const MAX_FILAS = 5000;

/** Valores neutros para las secciones opcionales que aún no tienen mapeo. */
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
  const base = "col" in campo ? ident(campo.col) : `(${campo.expr})`;
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

/** Lee una sección según su mapeo, ya acotada al cliente o al usuario de la sesión. */
async function leer<C extends string>(m: MapeoSeccion<C>, ctx: ContextoPortal): Promise<Record<C, unknown>[]> {
  const campos = Object.entries(m.campos) as [C, Campo][];
  const columnas = campos.map(([nombre, campo]) => `${columnaSql(campo)} AS ${ident(nombre)}`).join(", ");
  const orden = m.orden ? ` ORDER BY ${ident(m.orden.col)} ${m.orden.dir === "DESC" ? "DESC" : "ASC"}` : "";
  const filas = await consultaCon<Record<C, unknown>>(
    `SELECT TOP (${MAX_FILAS}) ${columnas} FROM ${ident(m.tabla)} WHERE ${ident(m.filtro.col)} = @filtro${orden}`,
    [["filtro", sql.NVarChar(200), m.filtro.por === "cliente" ? ctx.clienteId : ctx.email]]
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

/** Lee una sección opcional: sin mapeo devuelve [] y lo deja anotado en el log. */
async function leerOpcional<K extends keyof MapeoPortal>(
  seccion: K,
  ctx: ContextoPortal
): Promise<Record<string, unknown>[]> {
  const m = MAPEO[seccion] as MapeoSeccion<string> | null;
  if (!m) {
    log.warn("portal.db", { seccion, aviso: "sección sin mapeo: se entrega vacía" });
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

export const fuenteDb: FuentePortal = {
  nombre: "db",

  async cargarPortal(ctx) {
    // Todas las que faltan de una vez, para que el mensaje sea completo.
    const faltan = SECCIONES_OBLIGATORIAS.filter((s) => !MAPEO[s]);
    if (faltan.length) throw new DatosPendientesError(faltan);

    const [perfiles, clientes, sucursales, visitas, garantias, cuentas, reportes, usuarios, notificaciones, tickets] =
      await Promise.all([
        leer(obligatoria("perfil"), ctx),
        leer(obligatoria("cliente"), ctx),
        leer(obligatoria("sucursales"), ctx),
        leer(obligatoria("visitas"), ctx),
        leer(obligatoria("garantias"), ctx),
        leerOpcional("cuentasLocales", ctx),
        leerOpcional("reportes", ctx),
        leerOpcional("usuarios", ctx),
        leerOpcional("notificaciones", ctx),
        leerTickets(ctx),
      ]);

    const perfil = perfiles[0];
    const cliente = clientes[0];
    const garantia = garantias[0];
    if (!perfil || !cliente || !garantia) {
      throw new Error("La base no devolvió el perfil, el cliente o la garantía de la sesión. Revisa el filtro del mapeo.");
    }

    const abiertosPorSucursal = ticketsPorSucursal(tickets, TICKET_ABIERTO);
    const sucursalesDto = sucursales.map((s) => ({
      codigo: textoONull(s.codigo),
      nombre: texto(s.nombre),
      marca: texto(s.marca),
      mall: textoONull(s.mall),
      local: numONull(s.local),
      comuna: texto(s.comuna),
      region: texto(s.region),
      accesos: numONull(s.accesos),
      equipos: numONull(s.equipos),
      garantia: textoONull(s.garantia),
      tickets: abiertosPorSucursal.get(texto(s.nombre)) ?? 0,
      estado: texto(s.estado),
      // Las zonas del cliente no tienen tabla conocida (docs/DATOS_PENDIENTES.md).
      zona: null,
    }));

    const cuentasDto: Record<string, CuentaLocalDto> = {};
    for (const c of cuentas) {
      cuentasDto[texto(c.local)] = { usuario: texto(c.usuario), estado: texto(c.estado), ultimo: textoONull(c.ultimo) };
    }

    const datos: PortalDatos = {
      usuario: {
        id: numONull(perfil.id) ?? 0,
        nombre: texto(perfil.nombre),
        rol: texto(perfil.rol),
        correo: texto(perfil.correo),
        cargo: texto(perfil.cargo),
        telefono: texto(perfil.telefono),
        foto: null,
      },
      cliente: { nombre: texto(cliente.nombre), razonSocial: texto(cliente.razonSocial), rut: texto(cliente.rut), logo: null },
      sucursalesTotal: sucursalesDto.length,
      marcas: resumirMarcas(sucursalesDto),
      tickets: {
        abiertos: tickets.filter((t) => t.estado === TICKET_ABIERTO).length,
        altaPrioridad: tickets.filter((t) => t.estado === TICKET_ABIERTO && PRIORIDAD_ALTA.includes(t.prioridad)).length,
      },
      garantias: { porVencer: numONull(garantia.porVencer) ?? 0, planVigenteHasta: texto(garantia.planVigenteHasta) },
      visitasResumen: resumirVisitas(visitas.map((v) => texto(v.fechaISO))),
      sucursales: sucursalesDto,
      visitasTotal: visitas.length,
      // El detalle del acta (trabajos, fotos, firma) sale de varias tablas: pendiente.
      visitas: visitas.map((v) => ({
        folio: texto(v.folio),
        fecha: texto(v.fecha),
        sucursal: texto(v.sucursal),
        tecnico: texto(v.tecnico),
        motivo: texto(v.motivo),
        estado: texto(v.estado),
      })),
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
      // Locales asignados y permisos extra son listas: pendientes de su tabla.
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

/** Cuántas secciones del mapeo están confirmadas, para /api/salud. */
export function estadoDelMapeo(): { confirmadas: string[]; pendientes: string[] } {
  const secciones = Object.keys(MAPEO) as (keyof MapeoPortal)[];
  return {
    confirmadas: secciones.filter((s) => MAPEO[s] !== null),
    pendientes: secciones.filter((s) => MAPEO[s] === null),
  };
}
