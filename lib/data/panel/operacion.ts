import "server-only";
import { consultaCon, num, sql, type Parametro } from "@/lib/data/sql";
import { ISO_FECHA, ISO_FECHA_HORA, SQL_ESTADO_GARANTIA, SQL_GARANTIA_VENCE, hoyChile, txt } from "./comun";

// Operación: visitas, problemas, actividad y el resumen del dashboard. Solo lectura.
// El panel es interno: aquí sí se ven comentario_interno, indicaciones de acceso y
// datos del responsable, que el portal cliente no muestra.

export interface VisitaFila {
  id: number;
  folio: string;
  fecha: string;
  hora: string;
  estado: string;
  clienteId: number;
  cliente: string;
  sucursalId: number;
  sucursal: string;
  tecnico: string;
  motivo: string;
  enTerreno: boolean;
}

export async function listarVisitas(filtro: { sucursalId?: number; clienteId?: number } = {}): Promise<VisitaFila[]> {
  const filas = await consultaCon<{
    id: string; folio: string; fecha: string; hora: string | null; estado: string; cliente_id: string; cliente: string;
    sucursal_id: string; sucursal: string; tecnico: string; motivo: string | null; terreno: boolean;
  }>(
    `SELECT v.id, v.folio, ${ISO_FECHA("v.fecha_programada")} AS fecha, CONVERT(varchar(5), v.hora_programada, 108) AS hora, v.estado,
            v.cliente_id, COALESCE(c.nombre_fantasia, c.razon_social) AS cliente, v.sucursal_id, s.nombre AS sucursal,
            t.nombre_completo AS tecnico, cm.nombre AS motivo, v.creada_en_terreno AS terreno
       FROM tecnico.visita v
       JOIN clientes.cliente c ON c.id = v.cliente_id
       JOIN clientes.sucursal s ON s.id = v.sucursal_id
       JOIN tecnico.tecnico t ON t.id = v.tecnico_id
       LEFT JOIN tecnico.catalogo_motivo cm ON cm.codigo = v.motivo_codigo
      WHERE v.activo = 1
        AND (@sucursal IS NULL OR v.sucursal_id = @sucursal)
        AND (@cliente IS NULL OR v.cliente_id = @cliente)
      ORDER BY v.fecha_programada DESC, v.hora_programada DESC, v.id DESC`,
    [
      ["sucursal", sql.BigInt, filtro.sucursalId ?? null],
      ["cliente", sql.BigInt, filtro.clienteId ?? null],
    ]
  );
  return filas.map((f) => ({
    id: num(f.id),
    folio: f.folio,
    fecha: f.fecha,
    hora: txt(f.hora),
    estado: f.estado,
    clienteId: num(f.cliente_id),
    cliente: f.cliente,
    sucursalId: num(f.sucursal_id),
    sucursal: f.sucursal,
    tecnico: f.tecnico,
    motivo: txt(f.motivo),
    enTerreno: Boolean(f.terreno),
  }));
}

export interface VisitaDetalle extends VisitaFila {
  fechaHasta: string;
  ayudante: string;
  trabajoSolicitado: string;
  indicacionesAcceso: string;
  responsable: { nombre: string; cargo: string; telefono: string; rut: string };
  creadoEn: string;
  ejecucion: {
    inicio: string; termino: string; responsable: string; cargo: string; email: string; motivoReal: string;
    observaciones: string; comentarioInterno: string; offline: boolean; appVersion: string;
  } | null;
  trabajos: { id: number; trabajo: string; motivo: string; detalle: string; items: string }[];
  problemas: { id: number; tipo: string; estado: string; estadoCodigo: string; descripcion: string; solucion: string; resueltoEn: string }[];
  firmas: { id: number; rol: string; nombre: string; firmadoEn: string }[];
  archivos: { fotos: number; fotosInternas: number; videos: number; videosInternos: number };
  historial: { estado: string; motivo: string; origen: string; en: string }[];
  reagendamientos: { anterior: string; nueva: string; motivo: string; origen: string; en: string }[];
}

export async function detalleVisita(id: number): Promise<VisitaDetalle | null> {
  const p: Parametro[] = [["id", sql.BigInt, id]];
  const [base, eje, trabajos, problemas, firmas, archivos, historial, reag] = await Promise.all([
    consultaCon<{
      id: string; folio: string; fecha: string; hora: string | null; hasta: string | null; estado: string; cliente_id: string; cliente: string;
      sucursal_id: string; sucursal: string; tecnico: string; ayudante: string | null; motivo: string | null; terreno: boolean;
      solicitado: string; acceso: string | null; r_nombre: string | null; r_cargo: string | null; r_tel: string | null; r_rut: string | null;
      creado: string;
    }>(
      `SELECT v.id, v.folio, ${ISO_FECHA("v.fecha_programada")} AS fecha, CONVERT(varchar(5), v.hora_programada, 108) AS hora,
              ${ISO_FECHA("v.fecha_hasta")} AS hasta, v.estado, v.cliente_id, COALESCE(c.nombre_fantasia, c.razon_social) AS cliente,
              v.sucursal_id, s.nombre AS sucursal, t.nombre_completo AS tecnico, ta.nombre_completo AS ayudante, cm.nombre AS motivo,
              v.creada_en_terreno AS terreno, v.trabajo_solicitado AS solicitado, v.indicaciones_acceso AS acceso,
              v.responsable_nombre AS r_nombre, v.responsable_cargo AS r_cargo, v.responsable_telefono AS r_tel, v.responsable_rut AS r_rut,
              ${ISO_FECHA_HORA("v.creado_en")} AS creado
         FROM tecnico.visita v
         JOIN clientes.cliente c ON c.id = v.cliente_id
         JOIN clientes.sucursal s ON s.id = v.sucursal_id
         JOIN tecnico.tecnico t ON t.id = v.tecnico_id
         LEFT JOIN tecnico.tecnico ta ON ta.id = v.tecnico_ayudante_id
         LEFT JOIN tecnico.catalogo_motivo cm ON cm.codigo = v.motivo_codigo
        WHERE v.id = @id AND v.activo = 1`,
      p
    ),
    consultaCon<{
      inicio: string; termino: string | null; responsable: string; cargo: string | null; email: string | null; motivo_real: string | null;
      observaciones: string | null; interno: string | null; offline: boolean; app: string | null;
    }>(
      `SELECT ${ISO_FECHA_HORA("e.hora_inicio")} AS inicio, ${ISO_FECHA_HORA("e.hora_termino")} AS termino, e.responsable_nombre AS responsable,
              e.responsable_cargo AS cargo, e.responsable_email AS email, cm.nombre AS motivo_real, e.observaciones,
              e.comentario_interno AS interno, e.registrado_offline AS offline, e.app_version AS app
         FROM tecnico.visita_ejecucion e
         LEFT JOIN tecnico.catalogo_motivo cm ON cm.codigo = e.motivo_real_codigo
        WHERE e.visita_id = @id`,
      p
    ),
    consultaCon<{ id: string; trabajo: string; motivo: string | null; detalle: string | null; items: string | null }>(
      `SELECT vt.id, ct.nombre AS trabajo, cm.nombre AS motivo, vt.detalle,
              (SELECT STRING_AGG(CONCAT(st.etiqueta, ' × ', st.cantidad), ' · ') WITHIN GROUP (ORDER BY st.orden)
                 FROM tecnico.visita_trabajo_subtrabajo st WHERE st.visita_trabajo_id = vt.id) AS items
         FROM tecnico.visita_trabajo vt
         JOIN tecnico.catalogo_trabajo ct ON ct.codigo = vt.trabajo_codigo
         LEFT JOIN tecnico.catalogo_motivo cm ON cm.codigo = vt.motivo_codigo
        WHERE vt.visita_id = @id AND vt.activo = 1
        ORDER BY vt.orden`,
      p
    ),
    consultaCon<{ id: string; tipo: string; estado: string; codigo: string; descripcion: string | null; solucion: string | null; resuelto: string | null }>(
      `SELECT p.id, cp.nombre AS tipo, COALESCE(ce.nombre, p.estado) AS estado, p.estado AS codigo, p.descripcion, p.solucion,
              ${ISO_FECHA("p.resuelto_en")} AS resuelto
         FROM tecnico.problema p
         JOIN tecnico.catalogo_problema cp ON cp.codigo = p.tipo_codigo
         LEFT JOIN tecnico.catalogo_problema_estado ce ON ce.codigo = p.estado
        WHERE p.visita_id = @id ORDER BY p.orden`,
      p
    ),
    consultaCon<{ id: string; rol: string; nombre: string; firmado: string }>(
      `SELECT f.id, f.rol, f.nombre, ${ISO_FECHA_HORA("f.firmado_en")} AS firmado FROM tecnico.visita_firma f WHERE f.visita_id = @id ORDER BY f.firmado_en`,
      p
    ),
    consultaCon<{ fotos: number; fotos_int: number; videos: number; videos_int: number }>(
      `SELECT (SELECT COUNT(*) FROM tecnico.visita_foto f WHERE f.visita_id = @id AND f.activo = 1 AND f.interno = 0) AS fotos,
              (SELECT COUNT(*) FROM tecnico.visita_foto f WHERE f.visita_id = @id AND f.activo = 1 AND f.interno = 1) AS fotos_int,
              (SELECT COUNT(*) FROM tecnico.visita_video x WHERE x.visita_id = @id AND x.activo = 1 AND x.interno = 0) AS videos,
              (SELECT COUNT(*) FROM tecnico.visita_video x WHERE x.visita_id = @id AND x.activo = 1 AND x.interno = 1) AS videos_int`,
      p
    ),
    consultaCon<{ estado: string; motivo: string | null; origen: string; en: string }>(
      `SELECT h.estado, h.motivo, h.origen, ${ISO_FECHA_HORA("h.ocurrido_en")} AS en
         FROM tecnico.visita_estado_historial h WHERE h.visita_id = @id ORDER BY h.ocurrido_en`,
      p
    ),
    consultaCon<{ anterior: string; nueva: string | null; motivo: string; origen: string; en: string }>(
      `SELECT ${ISO_FECHA("r.fecha_anterior")} AS anterior, ${ISO_FECHA("r.fecha_nueva")} AS nueva, r.motivo, r.origen,
              ${ISO_FECHA_HORA("r.creado_en")} AS en
         FROM tecnico.reagendamiento r WHERE r.visita_id = @id ORDER BY r.creado_en`,
      p
    ),
  ]);
  const v = base[0];
  if (!v) return null;
  const e = eje[0];
  const a = archivos[0];
  return {
    id: num(v.id),
    folio: v.folio,
    fecha: v.fecha,
    hora: txt(v.hora),
    fechaHasta: txt(v.hasta),
    estado: v.estado,
    clienteId: num(v.cliente_id),
    cliente: v.cliente,
    sucursalId: num(v.sucursal_id),
    sucursal: v.sucursal,
    tecnico: v.tecnico,
    ayudante: txt(v.ayudante),
    motivo: txt(v.motivo),
    enTerreno: Boolean(v.terreno),
    trabajoSolicitado: v.solicitado,
    indicacionesAcceso: txt(v.acceso),
    responsable: { nombre: txt(v.r_nombre), cargo: txt(v.r_cargo), telefono: txt(v.r_tel), rut: txt(v.r_rut) },
    creadoEn: v.creado,
    ejecucion: e
      ? {
          inicio: e.inicio,
          termino: txt(e.termino),
          responsable: e.responsable,
          cargo: txt(e.cargo),
          email: txt(e.email),
          motivoReal: txt(e.motivo_real),
          observaciones: txt(e.observaciones),
          comentarioInterno: txt(e.interno),
          offline: Boolean(e.offline),
          appVersion: txt(e.app),
        }
      : null,
    trabajos: trabajos.map((t) => ({ id: num(t.id), trabajo: t.trabajo, motivo: txt(t.motivo), detalle: txt(t.detalle), items: txt(t.items) })),
    problemas: problemas.map((x) => ({
      id: num(x.id),
      tipo: x.tipo,
      estado: x.estado,
      estadoCodigo: x.codigo,
      descripcion: txt(x.descripcion),
      solucion: txt(x.solucion),
      resueltoEn: txt(x.resuelto),
    })),
    firmas: firmas.map((f) => ({ id: num(f.id), rol: f.rol, nombre: f.nombre, firmadoEn: f.firmado })),
    archivos: {
      fotos: num(a?.fotos ?? 0),
      fotosInternas: num(a?.fotos_int ?? 0),
      videos: num(a?.videos ?? 0),
      videosInternos: num(a?.videos_int ?? 0),
    },
    historial: historial.map((h) => ({ estado: h.estado, motivo: txt(h.motivo), origen: h.origen, en: h.en })),
    reagendamientos: reag.map((r) => ({ anterior: r.anterior, nueva: txt(r.nueva), motivo: r.motivo, origen: r.origen, en: r.en })),
  };
}

// ── Problemas ────────────────────────────────────────────────────────────────

export interface ProblemaFila {
  id: number;
  visitaId: number;
  folio: string;
  clienteId: number;
  cliente: string;
  sucursalId: number;
  sucursal: string;
  tipo: string;
  estado: string;
  estadoCodigo: string;
  descripcion: string;
  creadoEn: string;
  resueltoEn: string;
  desdePanel: boolean;
}

export async function listarProblemas(): Promise<ProblemaFila[]> {
  const filas = await consultaCon<{
    id: string; visita_id: string; folio: string; cliente_id: string; cliente: string; sucursal_id: string; sucursal: string;
    tipo: string; estado: string; codigo: string; descripcion: string | null; creado: string; resuelto: string | null; panel: boolean;
  }>(
    `SELECT p.id, p.visita_id, v.folio, v.cliente_id, COALESCE(c.nombre_fantasia, c.razon_social) AS cliente, v.sucursal_id, s.nombre AS sucursal,
            cp.nombre AS tipo, COALESCE(ce.nombre, p.estado) AS estado, p.estado AS codigo, p.descripcion,
            ${ISO_FECHA("p.creado_en")} AS creado, ${ISO_FECHA("p.resuelto_en")} AS resuelto, p.registrado_en_panel AS panel
       FROM tecnico.problema p
       JOIN tecnico.visita v ON v.id = p.visita_id
       JOIN clientes.cliente c ON c.id = v.cliente_id
       JOIN clientes.sucursal s ON s.id = v.sucursal_id
       JOIN tecnico.catalogo_problema cp ON cp.codigo = p.tipo_codigo
       LEFT JOIN tecnico.catalogo_problema_estado ce ON ce.codigo = p.estado
      WHERE v.activo = 1
      ORDER BY CASE WHEN p.estado = 'RESUELTO' THEN 1 ELSE 0 END, p.creado_en DESC`,
    []
  );
  return filas.map((f) => ({
    id: num(f.id),
    visitaId: num(f.visita_id),
    folio: f.folio,
    clienteId: num(f.cliente_id),
    cliente: f.cliente,
    sucursalId: num(f.sucursal_id),
    sucursal: f.sucursal,
    tipo: f.tipo,
    estado: f.estado,
    estadoCodigo: f.codigo,
    descripcion: txt(f.descripcion),
    creadoEn: f.creado,
    resueltoEn: txt(f.resuelto),
    desdePanel: Boolean(f.panel),
  }));
}

// ── Actividad (tecnico.actividad: el registro de eventos de sys_tecnicos) ─────

export interface ActividadFila {
  id: number;
  en: string;
  tipo: string;
  actor: string;
  deTecnico: boolean;
  texto: string;
  detalle: string;
}

export async function listarActividad(tope = 500): Promise<ActividadFila[]> {
  const filas = await consultaCon<{ id: string; en: string; tipo: string; actor: string | null; tec: boolean; texto: string; detalle: string | null }>(
    `SELECT TOP (@tope) a.id, ${ISO_FECHA_HORA("a.creado_en")} AS en, a.tipo, a.actor_nombre AS actor, a.de_tecnico AS tec, a.texto, a.detalle
       FROM tecnico.actividad a ORDER BY a.creado_en DESC, a.id DESC`,
    [["tope", sql.Int, tope]]
  );
  return filas.map((f) => ({
    id: num(f.id),
    en: f.en,
    tipo: f.tipo,
    actor: txt(f.actor),
    deTecnico: Boolean(f.tec),
    texto: f.texto,
    detalle: txt(f.detalle),
  }));
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface ResumenPanel {
  clientes: number;
  clientesInactivos: number;
  sucursales: number;
  malls: number;
  cuentasPortal: number;
  visitasMes: number;
  visitasMesAnterior: number;
  programadas7: number;
  enCurso: number;
  problemasAbiertos: number;
  garantiasPorVencer: number;
  porMes: { mes: string; n: number }[];
  proximas: VisitaFila[];
  problemas: ProblemaFila[];
  actividad: ActividadFila[];
}

export async function resumenPanel(): Promise<ResumenPanel> {
  const [cuentas, porMes, proximas, problemas, actividad] = await Promise.all([
    consultaCon<{
      clientes: number; inactivos: number; sucursales: number; malls: number; cuentas: number; mes: number; mes_ant: number;
      prog7: number; en_curso: number; problemas: number; por_vencer: number;
    }>(
      `SELECT (SELECT COUNT(*) FROM clientes.cliente WHERE activo = 1) AS clientes,
              (SELECT COUNT(*) FROM clientes.cliente WHERE activo = 0) AS inactivos,
              (SELECT COUNT(*) FROM clientes.sucursal WHERE activo = 1) AS sucursales,
              (SELECT COUNT(*) FROM clientes.mall WHERE activo = 1) AS malls,
              (SELECT COUNT(*) FROM seguridad.usuario_cliente WHERE activo = 1) AS cuentas,
              (SELECT COUNT(*) FROM tecnico.visita WHERE activo = 1 AND estado = 'COMPLETADA'
                  AND fecha_programada >= DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)) AS mes,
              (SELECT COUNT(*) FROM tecnico.visita WHERE activo = 1 AND estado = 'COMPLETADA'
                  AND fecha_programada >= DATEADD(month, -1, DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1))
                  AND fecha_programada < DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)) AS mes_ant,
              (SELECT COUNT(*) FROM tecnico.visita WHERE activo = 1 AND estado = 'PROGRAMADA'
                  AND fecha_programada BETWEEN CAST(SYSDATETIME() AS date) AND DATEADD(day, 7, CAST(SYSDATETIME() AS date))) AS prog7,
              (SELECT COUNT(*) FROM tecnico.visita WHERE activo = 1 AND estado = 'EN_CURSO') AS en_curso,
              (SELECT COUNT(*) FROM tecnico.problema p JOIN tecnico.visita v ON v.id = p.visita_id
                WHERE v.activo = 1 AND p.estado <> 'RESUELTO') AS problemas,
              (SELECT COUNT(*) FROM clientes.sucursal s JOIN clientes.cliente c ON c.id = s.cliente_id
                CROSS APPLY (SELECT ${SQL_GARANTIA_VENCE} AS vence) g
                WHERE s.activo = 1 AND ${SQL_ESTADO_GARANTIA("g.vence")} = 'por_vencer') AS por_vencer`,
      []
    ),
    consultaCon<{ mes: string; n: number }>(
      `SELECT CONVERT(varchar(7), v.fecha_programada, 23) AS mes, COUNT(*) AS n
         FROM tecnico.visita v
        WHERE v.activo = 1 AND v.estado = 'COMPLETADA'
          AND v.fecha_programada >= DATEADD(month, -11, DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1))
        GROUP BY CONVERT(varchar(7), v.fecha_programada, 23)`,
      []
    ),
    listarVisitas().then((l) => {
      const hoy = hoyChile();
      return l.filter((v) => v.estado === "PROGRAMADA" && v.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8);
    }),
    listarProblemas().then((l) => l.filter((p) => p.estadoCodigo !== "RESUELTO").slice(0, 6)),
    listarActividad(8),
  ]);
  const c = cuentas[0];

  // Los 12 meses, incluidos los que no tuvieron visitas.
  const mapa = new Map(porMes.map((f) => [f.mes, num(f.n)]));
  const [anio, mesActual] = hoyChile().split("-").map(Number);
  const meses: { mes: string; n: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(anio, mesActual - 1 - i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push({ mes: clave, n: mapa.get(clave) ?? 0 });
  }

  return {
    clientes: num(c?.clientes ?? 0),
    clientesInactivos: num(c?.inactivos ?? 0),
    sucursales: num(c?.sucursales ?? 0),
    malls: num(c?.malls ?? 0),
    cuentasPortal: num(c?.cuentas ?? 0),
    visitasMes: num(c?.mes ?? 0),
    visitasMesAnterior: num(c?.mes_ant ?? 0),
    programadas7: num(c?.prog7 ?? 0),
    enCurso: num(c?.en_curso ?? 0),
    problemasAbiertos: num(c?.problemas ?? 0),
    garantiasPorVencer: num(c?.por_vencer ?? 0),
    porMes: meses,
    proximas,
    problemas,
    actividad,
  };
}
