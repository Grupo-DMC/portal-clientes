import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { consulta, consultaDeCliente } from "@/lib/data/sql";
import { MAPEO } from "@/lib/data/portal/mapeo";
import { estadoDelMapeo } from "@/lib/data/portal/db";
import { describirDestinoSql } from "@/lib/db/config";
import { enProduccion, env, exigirConexionSql } from "@/lib/env";
import { log } from "@/lib/log";

// Diagnóstico del despliegue (réplica de sys_tecnicos/app/api/salud): dice si
// la app llega a SQL Server sin exigir un inicio de sesión.
//
// Requiere HEALTHCHECK_TOKEN. Sin esa variable la ruta no existe (404): nunca
// debe quedar abierta, porque revela host y nombre de la base de datos.
//
//   curl -H "Authorization: Bearer $HEALTHCHECK_TOKEN" http://localhost:3000/api/salud
//
// Diferencias con la referencia: en vez de contar catálogos de visitas,
// informa si la cuenta SQL puede escribir
// (no debería: el portal es de solo lectura) y qué secciones del mapeo faltan.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(req: NextRequest, esperado: string): boolean {
  const cabecera = req.headers.get("authorization") ?? "";
  const recibido = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** id de cliente imposible, solo para probar el session_context (no lee datos). */
const SONDA_CLIENTE = 9_007_199_254_740_991;

interface FilaSalud {
  ok: number;
  actualizable: string | null;
  puedeInsertar: number | null;
  puedeActualizar: number | null;
  puedeBorrar: number | null;
}

export async function GET(req: NextRequest) {
  const esperado = env("HEALTHCHECK_TOKEN");
  if (!esperado) return new NextResponse(null, { status: 404 });
  if (!autorizado(req, esperado)) return new NextResponse(null, { status: 401 });

  const entorno = enProduccion ? "produccion" : "desarrollo";
  const fuente = "DMC_Core";
  const mapeo = estadoDelMapeo();

  try {
    exigirConexionSql();
  } catch (err) {
    log.error("/api/salud: configuración SQL incompleta", { err });
    return NextResponse.json(
      { ok: false, entorno, fuente, error: "Configuración de SQL incompleta. Revisa el log del despliegue." },
      { status: 503 }
    );
  }

  const inicio = Date.now();
  try {
    const [fila] = await consulta<FilaSalud>(
      `SELECT 1 AS ok,
              CAST(DATABASEPROPERTYEX(DB_NAME(), 'Updateability') AS varchar(20)) AS actualizable,
              HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT') AS puedeInsertar,
              HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE') AS puedeActualizar,
              HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE') AS puedeBorrar`
    );
    const puedeEscribir = Boolean(fila?.puedeInsertar || fila?.puedeActualizar || fila?.puedeBorrar);

    // Permisos por esquema: el portal lee `portal` y NO debe poder leer las tablas.
    const [esquemas] = await consulta<{
      leePortal: number | null;
      leeClientes: number | null;
      leeTecnico: number | null;
      leeSeguridad: number | null;
      porDefecto: string | null;
    }>(
      `SELECT HAS_PERMS_BY_NAME('portal', 'SCHEMA', 'SELECT') AS leePortal,
              HAS_PERMS_BY_NAME('clientes', 'SCHEMA', 'SELECT') AS leeClientes,
              HAS_PERMS_BY_NAME('tecnico', 'SCHEMA', 'SELECT') AS leeTecnico,
              HAS_PERMS_BY_NAME('seguridad', 'SCHEMA', 'SELECT') AS leeSeguridad,
              SCHEMA_NAME() AS porDefecto`
    );

    // session_context: se fija en la misma petición y no queda pegado a la conexión.
    const [conContexto] = await consultaDeCliente<{ ctx: string | null }>(
      SONDA_CLIENTE,
      `SELECT CAST(CAST(SESSION_CONTEXT(N'cliente_id') AS bigint) AS varchar(20)) AS ctx`
    );
    const [sinContexto] = await consulta<{ ctx: string | null }>(
      `SELECT CAST(CAST(SESSION_CONTEXT(N'cliente_id') AS bigint) AS varchar(20)) AS ctx`
    );

    // Qué vistas del mapeo existen ya en la base.
    const vistas = await consulta<{ nombre: string }>(
      `SELECT CONCAT(SCHEMA_NAME(schema_id), '.', name) AS nombre FROM sys.views WHERE schema_id = SCHEMA_ID('portal')`
    );
    const existentes = new Set(vistas.map((v) => v.nombre.toLowerCase()));
    const esperadas = [...new Set(Object.values(MAPEO).flatMap((m) => (m ? [m.tabla.toLowerCase()] : [])))];
    if (puedeEscribir) log.warn("/api/salud", { aviso: "la cuenta SQL tiene permisos de escritura; el portal debería usar una de solo lectura" });

    return NextResponse.json({
      ok: true,
      entorno,
      fuente,
      destino: describirDestinoSql(),
      latenciaMs: Date.now() - inicio,
      sesionFirmada: Boolean(env("SESSION_SECRET")),
      bd: {
        conectada: true,
        base: fila?.actualizable ?? null,
        soloLectura: !puedeEscribir,
        ...(puedeEscribir
          ? { aviso: "La cuenta SQL puede escribir. Usa una cuenta con solo db_datareader (ver docs/DATOS_PENDIENTES.md)." }
          : {}),
      },
      esquemas: {
        porDefecto: esquemas?.porDefecto ?? null,
        leePortal: Boolean(esquemas?.leePortal),
        leeClientes: Boolean(esquemas?.leeClientes),
        leeTecnico: Boolean(esquemas?.leeTecnico),
        leeSeguridad: Boolean(esquemas?.leeSeguridad),
      },
      contextoSesion: {
        seFija: conContexto?.ctx === String(SONDA_CLIENTE),
        quedaEnLaConexion: sinContexto?.ctx != null,
      },
      vistas: {
        existentes: [...existentes],
        faltan: esperadas.filter((v) => !existentes.has(v)),
      },
      mapeo: {
        confirmadas: mapeo.confirmadas,
        pendientes: mapeo.pendientes,
        ...(mapeo.pendientes.length ? { aviso: "Hay secciones sin mapeo: ver docs/DATOS_PENDIENTES.md." } : {}),
      },
    });
  } catch (err) {
    log.error("/api/salud: no se pudo consultar SQL Server", { err });
    return NextResponse.json(
      {
        ok: false,
        entorno,
        fuente,
        destino: describirDestinoSql(),
        latenciaMs: Date.now() - inicio,
        error: "No se pudo consultar SQL Server. Revisa el log del despliegue.",
      },
      { status: 503 }
    );
  }
}
