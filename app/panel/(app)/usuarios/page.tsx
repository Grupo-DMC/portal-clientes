import { Icon } from "@/components/portal/ui";
import Lista from "@/components/panel/ui/Lista";
import { Encabezado, Seccion } from "@/components/panel/ui/Piezas";
import { listarEquipo, listarRoles, listarSolicitudesClave } from "@/lib/data/panel/administracion";
import { listarCuentasPortal } from "@/lib/data/panel/clientes";
import { ACTIVA, ACTIVO, SI_NO, plural, type Estados } from "@/lib/panel/formato";
import { exigirModulo } from "@/lib/server/panelAcceso";

export const metadata = { title: "Usuarios y permisos · Panel interno" };

const ESTADOS_SOLICITUD: Estados = {
  PENDIENTE: { label: "Pendiente", tono: "obs" },
  ATENDIDA: { label: "Atendida", tono: "ok" },
  DESCARTADA: { label: "Descartada", tono: "off" },
};

/** Agrupa permisos «modulo.accion» por módulo: { visitas: ['ver', 'crear'], … }. */
function porModulo(permisos: string[]): [string, string[]][] {
  const m = new Map<string, string[]>();
  for (const p of permisos) {
    const [mod, acc = ""] = p.split(".");
    m.set(mod, [...(m.get(mod) ?? []), acc]);
  }
  return [...m.entries()];
}

export default async function Page() {
  await exigirModulo("usuarios");
  const [equipo, roles, cuentas, solicitudes] = await Promise.all([listarEquipo(), listarRoles(), listarCuentasPortal(), listarSolicitudesClave()]);
  const pendientes = solicitudes.filter((s) => s.estado === "PENDIENTE").length;

  return (
    <section className="view" aria-labelledby="usTitulo">
      <Encabezado
        titulo="Usuarios y permisos"
        sub={`${plural(equipo.filter((u) => u.activo).length, "cuenta activa", "cuentas activas")} del equipo DMC y ${plural(cuentas.filter((c) => c.activo).length, "cuenta activa", "cuentas activas")} del portal cliente.`}
      />

      <p className="pn-nota">
        <Icon name="lock" />
        <span>Solo lectura. Las altas, bajas, roles y reseteos de clave se hacen en el panel de técnicos; quedan registrados en Auditoría.</span>
      </p>

      <nav aria-label="Secciones">
        <ul className="pn-indice">
          <li><a href="#equipo">Equipo DMC <span className="num">{equipo.length}</span></a></li>
          <li><a href="#roles">Roles y permisos <span className="num">{roles.length}</span></a></li>
          <li><a href="#portal">Cuentas del portal <span className="num">{cuentas.length}</span></a></li>
          <li><a href="#claves">Solicitudes de clave <span className="num">{pendientes ? `${pendientes} pendientes` : solicitudes.length}</span></a></li>
        </ul>
      </nav>

      <div className="pn-ancla" id="equipo">
        <Seccion titulo="Equipo DMC" cuenta={equipo.length} sub="seguridad.usuario · entran al panel solo ADMIN y COORDINADOR">
          <Lista
            titulo="Equipo DMC"
            csv="equipo-dmc"
            buscarEn={["nombre", "email", "roles", "perfil", "tecnico"]}
            placeholder="Buscar nombre, correo o rol"
            filtros={[{ k: "activo", label: "Estado", estados: ACTIVA }]}
            filas={equipo.map((u) => ({ ...u, debe: u.debeCambiarPassword }))}
            columnas={[
              { k: "nombre", label: "Nombre", sub: "email" },
              { k: "roles", label: "Roles", sub: "perfil" },
              { k: "tecnico", label: "Técnico vinculado" },
              { k: "ultimoAcceso", label: "Último acceso", tipo: "fechaHora" },
              { k: "debe", label: "Debe cambiar clave", tipo: "estado", estados: SI_NO },
              { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVA },
            ]}
          />
        </Seccion>
      </div>

      <div className="pn-ancla" id="roles">
        <Seccion titulo="Roles y permisos" cuenta={roles.length} sub="Perfiles de seguridad.rol con sus permisos (seguridad.rol_permiso)">
          <div className="pn-roles">
            {roles.map((r) => (
              <article className="pn-rol" key={r.id}>
                <h3>
                  {r.nombre}
                  {r.sistema && <span className="pill prog">Sistema</span>}
                </h3>
                <p>{r.descripcion || "Sin descripción"} · {plural(r.usuarios, "usuario activo", "usuarios activos")}</p>
                {r.permisos.length ? (
                  <dl className="pn-datos pn-aparte">
                    {porModulo(r.permisos).map(([mod, acciones]) => (
                      <div key={mod}>
                        <dt>{mod}</dt>
                        <dd className="pn-tags">{acciones.map((a) => <span className="brand-tag" key={a}>{a}</span>)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>Sin permisos asignados.</p>
                )}
              </article>
            ))}
          </div>
        </Seccion>
      </div>

      <div className="pn-ancla" id="portal">
        <Seccion titulo="Cuentas del portal" cuenta={cuentas.length} sub="seguridad.usuario_cliente · cada cuenta ve solo su cliente">
          <Lista
            titulo="Cuentas del portal"
            csv="cuentas-portal"
            buscarEn={["nombre", "email", "cliente"]}
            placeholder="Buscar nombre, correo o cliente"
            filtros={[{ k: "cliente", label: "Cliente" }, { k: "activo", label: "Estado", estados: ACTIVA }]}
            filas={cuentas.map((c) => ({ ...c, debe: c.debeCambiarPassword, hrefCliente: `/panel/clientes/${c.clienteId}` }))}
            columnas={[
              { k: "nombre", label: "Nombre", sub: "email" },
              { k: "cliente", label: "Cliente", href: "hrefCliente" },
              { k: "ultimoAcceso", label: "Último acceso", tipo: "fechaHora" },
              { k: "creadoEn", label: "Creada", tipo: "fecha" },
              { k: "debe", label: "Debe cambiar clave", tipo: "estado", estados: SI_NO },
              { k: "activo", label: "Estado", tipo: "estado", estados: ACTIVO },
            ]}
          />
        </Seccion>
      </div>

      <div className="pn-ancla" id="claves">
        <Seccion titulo="Solicitudes de clave" cuenta={solicitudes.length} sub="Pedidos de «olvidé mi clave» desde el login">
          <Lista
            titulo="Solicitudes de clave"
            filas={solicitudes}
            filtros={[{ k: "estado", label: "Estado", estados: ESTADOS_SOLICITUD }]}
            vacio="No hay solicitudes de clave."
            columnas={[
              { k: "creadoEn", label: "Fecha", tipo: "fechaHora" },
              { k: "email", label: "Correo", sub: "mensaje" },
              { k: "atendidoPor", label: "Atendida por", sub: "atendidoEn" },
              { k: "estado", label: "Estado", tipo: "estado", estados: ESTADOS_SOLICITUD },
            ]}
          />
        </Seccion>
      </div>
    </section>
  );
}
