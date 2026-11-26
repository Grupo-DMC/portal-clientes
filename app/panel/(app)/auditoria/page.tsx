import Lista from "@/components/panel/ui/Lista";
import { Encabezado, Kpis, Seccion } from "@/components/panel/ui/Piezas";
import { listarAuditoria, listarCambiosEstado, listarIntentosLogin } from "@/lib/data/panel/administracion";
import { hoyChile } from "@/lib/data/panel/comun";
import type { Estados } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Auditoría · Panel interno" };

const RESULTADO: Estados = { true: { label: "Correcto", tono: "ok" }, false: { label: "Fallido", tono: "crit" } };
const CAMBIO: Estados = { true: { label: "Activado", tono: "ok" }, false: { label: "Desactivado", tono: "off" } };

export default async function Page() {
  await exigirModulo("auditoria");
  const [auditoria, cambios, intentos] = await Promise.all([listarAuditoria(), listarCambiosEstado(), listarIntentosLogin()]);

  // Ventana de 7 días (fechas ISO: la comparación de texto basta).
  const [a, m, d] = hoyChile().split("-").map(Number);
  const desde = new Date(Date.UTC(a, m - 1, d - 7)).toISOString().slice(0, 10);
  const recientes = intentos.filter((i) => i.en >= desde);
  const fallidos = recientes.filter((i) => !i.exito);
  const correosFallidos = new Set(fallidos.map((i) => i.email)).size;

  return (
    <section className="view" aria-labelledby="auTitulo">
      <Encabezado titulo="Auditoría" sub="Acciones registradas en seguridad.auditoria, cambios de estado e intentos de inicio de sesión." />

      <Kpis
        items={[
          { label: "Acciones auditadas", valor: auditoria.length, icon: "history", nota: auditoria.length >= 1000 ? "las 1.000 más recientes" : "desde el inicio" },
          { label: "Cambios de estado", valor: cambios.length, icon: "settings", nota: "activaciones y desactivaciones" },
          { label: "Ingresos últimos 7 días", valor: recientes.length - fallidos.length, icon: "check", nota: "inicios de sesión correctos" },
          { label: "Fallidos últimos 7 días", valor: fallidos.length, icon: "lock", tono: fallidos.length >= 20 ? "red" : fallidos.length ? "amber" : undefined, nota: `${correosFallidos} correos distintos` },
        ]}
      />

      <nav aria-label="Secciones">
        <ul className="pn-indice">
          <li><a href="#acciones">Acciones <span className="num">{auditoria.length}</span></a></li>
          <li><a href="#estados">Cambios de estado <span className="num">{cambios.length}</span></a></li>
          <li><a href="#ingresos">Intentos de ingreso <span className="num">{intentos.length}</span></a></li>
        </ul>
      </nav>

      <div className="pn-ancla" id="acciones">
        <Seccion titulo="Acciones" cuenta={auditoria.length}>
          <Lista
            titulo="Acciones auditadas"
            csv="auditoria"
            buscarEn={["usuario", "accion", "entidad", "entidadId", "detalle"]}
            placeholder="Buscar usuario, acción o detalle"
            filtros={[{ k: "accion", label: "Acción" }, { k: "entidad", label: "Entidad" }, { k: "usuario", label: "Usuario" }]}
            filas={auditoria.map((x) => ({ ...x, objeto: x.entidadId ? `${x.entidad} #${x.entidadId}` : x.entidad }))}
            columnas={[
              { k: "en", label: "Fecha", tipo: "fechaHora" },
              { k: "usuario", label: "Usuario", sub: "ip" },
              { k: "accion", label: "Acción" },
              { k: "objeto", label: "Sobre" },
              { k: "detalle", label: "Detalle", larga: true },
            ]}
          />
        </Seccion>
      </div>

      <div className="pn-ancla" id="estados">
        <Seccion titulo="Cambios de estado" cuenta={cambios.length} sub="Quién activó o desactivó clientes, sucursales, usuarios y catálogos, y por qué">
          <Lista
            titulo="Cambios de estado"
            csv="cambios-estado"
            buscarEn={["entidad", "motivo", "usuario"]}
            placeholder="Buscar entidad, motivo o usuario"
            filtros={[{ k: "entidad", label: "Entidad" }, { k: "activo", label: "Cambio", estados: CAMBIO }]}
            filas={cambios.map((x) => ({ ...x, objeto: `${x.entidad} #${x.entidadId}` }))}
            vacio="No hay cambios de estado registrados."
            columnas={[
              { k: "en", label: "Fecha", tipo: "fechaHora" },
              { k: "objeto", label: "Sobre" },
              { k: "activo", label: "Cambio", tipo: "estado", estados: CAMBIO },
              { k: "motivo", label: "Motivo", larga: true },
              { k: "usuario", label: "Usuario" },
            ]}
          />
        </Seccion>
      </div>

      <div className="pn-ancla" id="ingresos">
        <Seccion titulo="Intentos de ingreso" cuenta={intentos.length} sub="Últimos 500 · 5 fallos por correo o 20 por IP en 15 minutos bloquean el ingreso">
          <Lista
            titulo="Intentos de ingreso"
            csv="intentos-login"
            buscarEn={["email", "ip"]}
            placeholder="Buscar correo o IP"
            filtros={[{ k: "exito", label: "Resultado", estados: RESULTADO }]}
            filas={intentos}
            columnas={[
              { k: "en", label: "Fecha", tipo: "fechaHora" },
              { k: "email", label: "Correo" },
              { k: "ip", label: "IP" },
              { k: "exito", label: "Resultado", tipo: "estado", estados: RESULTADO },
            ]}
          />
        </Seccion>
      </div>
    </section>
  );
}
