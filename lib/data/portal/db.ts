import "server-only";
import type { ContextoPortal, CuentaLocalDto, PortalDatos, PreferenciasAvisosDto, TicketPortalDto } from "@/lib/contratos/portal";
import { log } from "@/lib/log";
import { F_FECHA, F_FECHA_DMY, F_FECHA_HORA_DMY, F_HORA, consultaDeCliente, ident, idCliente, numONull } from "@/lib/data/sql";
import {
  estadoSucursal,
  garantiaVigente,
  resumirGarantias,
  resumirMarcas,
  resumirVisitas,
  ticketsPorSucursal,
} from "./calculos";
import { DatosPendientesError } from "./errores";
import type { FuentePortal } from "./fuente";
import {
  COLUMNA_CLIENTE,
  DIAS_GARANTIA_POR_VENCER,
  MAPEO,
  PRIORIDAD_ALTA,
  SECCIONES_OBLIGATORIAS,
  TICKET_ABIERTO,
  type Campo,
  type MapeoPortal,
  type MapeoSeccion,
} from "./mapeo";

// DATA_SOURCE=db: DMC_Core, SOLO LECTURA y SOLO vistas portal.v_* (ver
// docs/portal-vistas.md). Cada consulta:
//   1. fija el cliente de la sesión con sp_set_session_context (RLS), y
//   2. filtra además por cliente_id = @cliente.
// Ambas cosas las garantiza consultaDeCliente (lib/data/sql.ts) + leer().

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
    throw new Error(
      `La cuenta ${ctx.email} no tiene clienteIdBd (clientes.cliente.id): no se puede filtrar la base por cliente. Ver lib/server/accounts.ts.`
    );
  }
  return idCliente(ctx.clienteIdBd);
}

/** Lee una sección según su mapeo: contexto de sesión + WHERE cliente_id = @cliente. */
async function leer<C extends string>(m: MapeoSeccion<C>, ctx: ContextoPortal): Promise<Record<C, unknown>[]> {
  const cliente = clienteDe(ctx);
  const campos = Object.entries(m.campos) as [C, Campo][];
  const columnas = campos.map(([nombre, campo]) => `${columnaSql(campo)} AS ${ident(nombre)}`).join(", ");
  const donde = m.donde ? ` AND (${m.donde})` : "";
  const orden = m.orden ? ` ORDER BY ${ident(m.orden.col)} ${m.orden.dir === "DESC" ? "DESC" : "ASC"}` : "";
  const filas = await consultaDeCliente<Record<C, unknown>>(
    cliente,
    `SELECT TOP (${MAX_FILAS}) ${columnas} FROM ${ident(m.tabla)} WHERE ${ident(COLUMNA_CLIENTE)} = @__cliente_id${donde}${orden}`
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

export const fuenteDb: FuentePortal = {
  nombre: "db",

  async cargarPortal(ctx) {
    const faltan = SECCIONES_OBLIGATORIAS.filter((s) => !MAPEO[s]);
    if (faltan.length) throw new DatosPendientesError(faltan);

    // Las consultas van en serie: cada una toma su conexión (reiniciada) y fija
    // su contexto; en paralelo pedirían varias conexiones del pool a la vez.
    const clientes = await leer(obligatoria("cliente"), ctx);
    const sucursales = await leer(obligatoria("sucursales"), ctx);
    const visitas = await leer(obligatoria("visitas"), ctx);
    const cuentas = await leerOpcional("cuentasLocales", ctx);
    const reportes = await leerOpcional("reportes", ctx);
    const usuarios = await leerOpcional("usuarios", ctx);
    const notificaciones = await leerOpcional("notificaciones", ctx);
    const tickets = await leerTickets(ctx);

    const cliente = clientes[0];
    if (!cliente) throw new Error("portal.v_cliente no devolvió el cliente de la sesión. Revisa clienteIdBd y la vista.");

    const abiertosPorSucursal = ticketsPorSucursal(tickets, TICKET_ABIERTO);
    const sucursalesDto = sucursales.map((s) => {
      const vence = textoONull(s.garantiaVence);
      return {
        codigo: textoONull(s.codigo),
        nombre: texto(s.nombre),
        marca: texto(s.marca),
        mall: textoONull(s.mall),
        // Sin origen en DMC_Core (docs/portal-vistas.md, «Sin origen»).
        local: null,
        accesos: null,
        equipos: null,
        comuna: texto(s.comuna),
        region: texto(s.region),
        garantia: garantiaVigente(vence) ? "vigente" : null,
        tickets: abiertosPorSucursal.get(texto(s.nombre)) ?? 0,
        estado: estadoSucursal(numONull(s.problemasAbiertos)),
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
      cliente: { nombre: texto(cliente.nombre), razonSocial: texto(cliente.razonSocial), rut: texto(cliente.rut), logo: null },
      sucursalesTotal: sucursalesDto.length,
      marcas: resumirMarcas(sucursalesDto),
      tickets: {
        abiertos: tickets.filter((t) => t.estado === TICKET_ABIERTO).length,
        altaPrioridad: tickets.filter((t) => t.estado === TICKET_ABIERTO && PRIORIDAD_ALTA.includes(t.prioridad)).length,
      },
      garantias: resumirGarantias(
        sucursales.map((s) => textoONull(s.garantiaVence)),
        DIAS_GARANTIA_POR_VENCER
      ),
      visitasResumen: resumirVisitas(visitas.map((v) => texto(v.fechaISO))),
      sucursales: sucursalesDto,
      visitasTotal: visitas.length,
      // El detalle del acta (v_visita_ejecucion, v_visita_trabajo, fotos, firma) se carga aparte: pendiente.
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

/** Qué secciones tienen vista, para /api/salud. */
export function estadoDelMapeo(): { confirmadas: string[]; pendientes: string[] } {
  const secciones = Object.keys(MAPEO) as (keyof MapeoPortal)[];
  return {
    confirmadas: secciones.filter((s) => MAPEO[s] !== null),
    pendientes: secciones.filter((s) => MAPEO[s] === null),
  };
}
