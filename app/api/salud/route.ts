import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { consulta } from "@/lib/data/sql";
import { estadoDelMapeo } from "@/lib/data/portal/db";
import { describirDestinoSql } from "@/lib/db/config";
import { enProduccion, env, exigirConexionSql, fuenteDeDatos, hayConexionSql } from "@/lib/env";
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
// informa la fuente de datos (DATA_SOURCE), si la cuenta SQL puede escribir
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
  let fuente: string;
  try {
    fuente = fuenteDeDatos();
  } catch (err) {
    log.error("/api/salud: DATA_SOURCE no válido", { err });
    return NextResponse.json({ ok: false, entorno, error: "DATA_SOURCE no válido. Revisa el log del despliegue." }, { status: 503 });
  }
  const mapeo = estadoDelMapeo();

  // En mock sin credenciales no hay nada que comprobar: la app funciona sola.
  if (fuente === "mock" && !hayConexionSql()) {
    return NextResponse.json({ ok: true, entorno, fuente, bd: { configurada: false } });
  }

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
