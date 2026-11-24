'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Chips, CountChip, ExampleNote, Icon, Pill } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { reportePendiente } from '@/lib/pcliente/constants';
import { daysFrom, parseDMY, plural, slashDate } from '@/lib/pcliente/format';
import { branchHref, shortName, sucKey } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';
import ReportList from '@/components/portal/reportes/ReportList';

/** Cuentas con que cada local entra al portal, y los reportes que han enviado. */
export default function CredentialsView() {
  const { sucursales, cuentas, reportes, reportesPendientes, actions } = usePortal();
  const toast = useToast();
  const params = useSearchParams();
  const pedido = params.get('local');
  const [filtro, setFiltro] = useState(() => (pedido && !cuentas[pedido] ? 'sin' : 'con'));
  const [sel, setSel] = useState(pedido);
  const detail = useRef(null);

  const pendOf = (s) => reportes.filter((r) => r.local === sucKey(s) && reportePendiente(r)).length;
  const con = sucursales.filter((s) => cuentas[sucKey(s)]);
  const list = sucursales
    .filter((s) => filtro === 'todos' || (filtro === 'con') === Boolean(cuentas[sucKey(s)]))
    .sort((a, b) => pendOf(b) - pendOf(a) || a.nombre.localeCompare(b.nombre, 'es'));
  const selected = list.find((s) => sucKey(s) === sel) || list[0] || null;
  const rep30 = reportes.filter((r) => daysFrom(parseDMY(r.fecha.slice(0, 10))) >= -30).length;

  /* Si llegó desde el detalle de un local (?local=PU-005), se muestra ese local. */
  useEffect(() => {
    if (pedido) { setSel(pedido); setFiltro(cuentas[pedido] ? 'con' : 'sin'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar el parámetro
  }, [pedido]);

  const choose = (s) => {
    setSel(sucKey(s));
    if (matchMedia('(max-width:900px)').matches) setTimeout(() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <section className="view" aria-labelledby="crTitle">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="crTitle">Credenciales de locales</h1>
          <p className="page-sub">Cuentas con las que cada local entra al portal para reportar problemas con sus antenas.</p>
        </div>
        <div className="status-sum">
          <div className="sum"><b className="num">{con.length}</b><span className="plain">locales con cuenta</span></div>
          <div className="sum"><b className="num">{rep30}</b><span className="plain">reportes en 30 días</span></div>
          <div className="sum obs"><b className="num">{reportesPendientes}</b><span>Pendientes de revisión</span></div>
        </div>
      </header>
      <ExampleNote>Cuentas y reportes de ejemplo.</ExampleNote>

      <div className="cr-grid">
        <section className="vd-card cr-list-card" aria-label="Locales">
          <Chips label="Filtrar locales" value={filtro} onChange={setFiltro} options={[
            { id: 'con', label: 'Con cuenta', count: con.length },
            { id: 'sin', label: 'Sin cuenta', count: sucursales.length - con.length },
            { id: 'todos', label: 'Todos', count: sucursales.length }
          ]} />
          <ul className="cr-list">
            {list.length ? list.map((s) => {
              const k = sucKey(s), c = cuentas[k], n = reportes.filter((r) => r.local === k).length, p = pendOf(s);
              const isSel = selected && sucKey(selected) === k;
              return (
                <li key={k}>
                  <button type="button" className={`cr-item ${isSel ? 'is-sel' : ''}`} aria-pressed={isSel} onClick={() => choose(s)}>
                    <span className="cr-name">{shortName(s.nombre)}{p > 0 && <span className="cr-dot" aria-label={`${p} pendientes`}>{p}</span>}</span>
                    <span className="cr-sub">{c ? <span className="num">{c.usuario}</span> : 'Sin cuenta'}{c?.estado === 'suspendida' ? ' (suspendida)' : ''}</span>
                    <span className="cr-meta">{c ? plural(n, 'reporte', 'reportes') : <span className="num">{s.codigo || ''}</span>}</span>
                  </button>
                </li>
              );
            }) : <li className="muted cr-empty">No hay locales en este filtro.</li>}
          </ul>
        </section>

        <section className="vd-card" ref={detail} aria-live="polite">
          {!selected ? <p className="muted">Elige un local para ver su cuenta y sus reportes.</p> : (() => {
            const k = sucKey(selected), c = cuentas[k];
            const reps = reportes.filter((r) => r.local === k).sort((a, b) => b.id.localeCompare(a.id));
            return (
              <>
                <div className="crd-head">
                  <div>
                    <h2 className="vd-h">{selected.nombre}</h2>
                    <p className="muted">{selected.codigo && <><span className="num">{selected.codigo}</span>, </>}{selected.comuna}</p>
                  </div>
                  {c && <Pill tone={c.estado === 'activa' ? 'ok' : 'off'}>{c.estado === 'activa' ? 'Cuenta activa' : 'Cuenta suspendida'}</Pill>}
                </div>
                {c ? (
                  <>
                    <dl className="crd-facts">
                      <div><dt>Usuario</dt><dd className="num">{c.usuario}</dd></div>
                      <div><dt>Último acceso</dt><dd className="num">{c.ultimo ? slashDate(c.ultimo) : 'Aún no ingresa'}</dd></div>
                      <div><dt>Contraseña</dt><dd>Oculta. Solo se puede restablecer.</dd></div>
                    </dl>
                    <div className="crd-actions">
                      <button className="btn-out" type="button" onClick={() => toast(`Se envió un enlace para restablecer la contraseña de ${c.usuario}.`)}>
                        <Icon name="lock" />Restablecer contraseña
                      </button>
                      <button className="btn-out" type="button" onClick={() => {
                        actions.toggleCuenta(k);
                        toast(c.estado === 'activa' ? 'Cuenta suspendida. El local ya no puede ingresar.' : 'Cuenta reactivada.');
                      }}>{c.estado === 'activa' ? 'Suspender cuenta' : 'Reactivar cuenta'}</button>
                    </div>
                    <div className="vd-card-head crd-rep-head"><h3 className="vd-h">Reportes del local</h3><CountChip n={reps.length} /></div>
                    {reps.length ? <ReportList reportes={reps} /> : <p className="ok-line"><Icon name="check" />Este local no ha hecho reportes.</p>}
                    <Link className="link crd-local" href={branchHref(selected)}>Ver todo el detalle del local</Link>
                  </>
                ) : (
                  <div className="crd-empty">
                    <p>Este local todavía no tiene cuenta. Con una cuenta, el personal del local puede reportar problemas con las antenas directamente en el portal.</p>
                    <button className="btn-sec" type="button" onClick={() => {
                      const usuario = actions.createCuenta(k, selected.nombre);
                      setFiltro('con'); setSel(k);
                      toast(`Cuenta ${usuario} creada. Se envió la invitación al correo del local.`);
                    }}>Crear cuenta del local</button>
                  </div>
                )}
              </>
            );
          })()}
        </section>
      </div>
    </section>
  );
}
