'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, CountChip, Icon, Pill } from '@/components/portal/ui';
import { ESTADOS_SUCURSAL, ESTADOS_VISITA, ROLES, reportePendiente, zonaNombre } from '@/lib/pcliente/constants';
import { parseDMY, plural, slashDate } from '@/lib/pcliente/format';
import { accesoA, branchSlug, sucKey, visitHref } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';
import ReportList from '@/components/portal/reportes/ReportList';

function Stat({ label, value, note, tone = '' }) {
  return (
    <div className={`kpi ${tone}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value num">{value}</span>
      <span className="kpi-note">{note}</span>
    </div>
  );
}

export default function BranchDetailView() {
  const { id } = useParams();
  const { sucursales, visitas, reportes, cuentas, usuarios, garantias } = usePortal();
  const s = sucursales.find((x) => branchSlug(x) === id);

  if (!s) {
    return (
      <div className="empty-state">
        <h2>No encontramos ese local</h2>
        <p>Puede que no exista o que no tengas acceso.</p>
        <Link className="btn-sec" href="/portal/sucursales">Volver a Mis sucursales</Link>
      </div>
    );
  }

  const k = sucKey(s), c = cuentas[k], st = ESTADOS_SUCURSAL[s.estado] || ESTADOS_SUCURSAL.observaciones;
  const vis = visitas.filter((v) => v.sucursal === s.nombre).sort((a, b) => parseDMY(b.fecha) - parseDMY(a.fecha) || b.folio.localeCompare(a.folio));
  const done = vis.filter((v) => v.estado === 'completada');
  const reps = reportes.filter((r) => r.local === k).sort((a, b) => b.id.localeCompare(a.id));
  const pend = reps.filter(reportePendiente).length;
  const people = accesoA(usuarios, s);
  const place = s.mall ? `${s.mall}${s.local ? `, local ${s.local}` : ''}` : s.direccion || 'Dirección por confirmar';
  const garantia = s.enGarantia
    ? (s.garantiaVence ? `Vigente hasta el ${s.garantiaVence.replace(/-/g, '/')}` : 'Vigente')
    : s.garantia === 'vigente' ? `Vigente hasta el ${garantias.planVigenteHasta}` : null;

  return (
    <section className="view" aria-label="Detalle del local">
      <header className="vd-head">
        <Link className="back" href="/portal/sucursales"><Icon name="back" />Mis sucursales</Link>
        <div className="vd-titlebar">
          <div>
            <div className="vd-title"><h1>{s.nombre}</h1><Pill tone={st.cls}>{st.label}</Pill></div>
            <p className="vd-meta">{s.codigo && <><span className="num">{s.codigo}</span>, </>}{place}. {s.comuna}, {s.region}</p>
          </div>
        </div>
      </header>

      <section className="kpis lc-stats" aria-label="Estadísticas del local">
        <Stat label="Visitas registradas" value={vis.length} note={vis.length ? `Última el ${slashDate(vis[0].fecha)}` : 'Sin visitas cargadas'} />
        <Stat label="Visitas completadas" value={done.length} note={vis.length ? `${Math.round((done.length / vis.length) * 100)}% de las registradas` : 'Sin datos'} />
        <Stat label="Reportes del local" value={reps.length} note={c ? plural(pend, 'pendiente', 'pendientes') : 'El local no tiene cuenta'} tone={pend ? 'is-amber' : ''} />
        <Stat label="Tickets abiertos" value={s.tickets} note={s.tickets ? 'Revisa su avance con soporte' : 'Sin tickets abiertos'} tone={s.tickets ? 'is-amber' : ''} />
        <Stat label="Equipos" value={s.equipos ?? '—'} note={s.accesos != null ? plural(s.accesos, 'acceso', 'accesos') : 'Sin datos de accesos'} />
      </section>

      <div className="vd-grid">
        <div className="vd-main">
          <section className="vd-card">
            <div className="vd-card-head"><h2 className="vd-h">Visitas del local</h2><CountChip n={vis.length} /></div>
            {vis.length ? (
              <ul className="lc-visits">
                {vis.map((v) => {
                  const vs = ESTADOS_VISITA[v.estado];
                  return (
                    <li key={v.folio}>
                      <Link href={visitHref(v.folio)}>
                        <span className="num lv-folio">{v.folio}</span>
                        <span className="lv-mid"><span>{v.motivo}</span><span className="muted d-block">{v.tecnico}, {slashDate(v.fecha)}</span></span>
                        <Pill tone={vs.cls}>{vs.label}</Pill>
                        <Icon name="right" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="muted">Este local no tiene visitas realizadas.</p>}
          </section>

          <section className="vd-card">
            <div className="vd-card-head"><h2 className="vd-h">Reportes del local</h2><CountChip n={reps.length} warn={pend > 0} /></div>
            {!c ? (
              <p className="muted">Este local no tiene cuenta, así que no puede enviar reportes. <Link className="link" href={`/portal/credenciales?local=${encodeURIComponent(k)}`}>Crear cuenta del local</Link></p>
            ) : reps.length ? <ReportList reportes={reps} /> : <p className="ok-line"><Icon name="check" />Este local no ha hecho reportes.</p>}
          </section>
        </div>

        <aside className="vd-side" aria-label="Datos del local">
          <section className="vd-card">
            <div className="vd-card-head"><h2 className="vd-h">Datos del local</h2></div>
            <dl className="facts-list">
              <div><dt>Marca</dt><dd>{s.marca}</dd></div>
              <div><dt>Mall</dt><dd>{s.mall || <span className="muted">Por confirmar</span>}</dd></div>
              {s.direccion && <div><dt>Dirección</dt><dd>{s.direccion}</dd></div>}
              {s.fechaInstalacion && <div><dt>Instalación</dt><dd className="num">{slashDate(s.fechaInstalacion)}</dd></div>}
              <div><dt>Local</dt><dd className="num">{s.local ?? <span className="muted">Por confirmar</span>}</dd></div>
              <div><dt>Comuna</dt><dd>{s.comuna}, {s.region}</dd></div>
              <div><dt>Garantía</dt><dd>{garantia ?? <span className="muted">{s.enGarantia === false ? 'Sin garantía' : 'Sin datos'}</span>}</dd></div>
            </dl>
          </section>

          <section className="vd-card">
            <div className="vd-card-head">
              <h2 className="vd-h">Cuenta del local</h2>
              {c && <Pill tone={c.estado === 'activa' ? 'ok' : 'off'}>{c.estado === 'activa' ? 'Activa' : 'Suspendida'}</Pill>}
            </div>
            {c ? (
              <p className="lc-acc"><span className="num"><b>{c.usuario}</b></span><span className="muted d-block">Último acceso: {c.ultimo ? slashDate(c.ultimo) : 'aún no ingresa'}</span></p>
            ) : <p className="muted">Sin cuenta creada.</p>}
            <Link className="link" href={`/portal/credenciales?local=${encodeURIComponent(k)}`}>{c ? 'Gestionar cuenta' : 'Crear cuenta'} en Credenciales de locales</Link>
          </section>

          <section className="vd-card">
            <div className="vd-card-head"><h2 className="vd-h">Personas con acceso</h2><CountChip n={people.length} /></div>
            <ul className="people">
              {people.map(({ u, via }) => (
                <li key={u.id}>
                  <Avatar nombre={u.nombre} size="sm" />
                  <span><b>{u.nombre}</b><span className="muted d-block">{ROLES[u.rol].label}, {via === 'zona' ? zonaNombre(u.zona) : via}</span></span>
                </li>
              ))}
            </ul>
            <Link className="link" href="/portal/usuarios">Asignar personas en Usuarios y roles</Link>
          </section>
        </aside>
      </div>

    </section>
  );
}
