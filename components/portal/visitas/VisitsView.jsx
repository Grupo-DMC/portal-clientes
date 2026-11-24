'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Chips, Icon, Pill, SearchBox } from '@/components/portal/ui';
import { ESTADOS_VISITA } from '@/lib/pcliente/constants';
import { initials, norm, slashDate } from '@/lib/pcliente/format';
import { visitHref } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'programada', label: 'Programadas' },
  { id: 'completada', label: 'Completadas' },
  { id: 'cancelada', label: 'Canceladas' }
];
/* "Canceladas" incluye las canceladas por un administrador. */
const matchEstado = (v, id) => id === 'todas' || v.estado === id || (id === 'cancelada' && v.estado === 'cancelada_admin');

export default function VisitsView() {
  const { visitas, visitasTotal } = usePortal();
  const router = useRouter();
  const [estado, setEstado] = useState('todas');
  const [q, setQ] = useState('');
  const nq = norm(q.trim());
  const list = visitas.filter((v) => matchEstado(v, estado) && (!nq || [v.folio, v.sucursal, v.tecnico, v.motivo].some((x) => norm(x).includes(nq))));

  return (
    <section className="view" aria-labelledby="vTitle">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="vTitle">Visitas</h1>
          <p className="page-sub">{visitasTotal} visitas registradas</p>
        </div>
      </header>

      <div className="ms-tools">
        <SearchBox className="ms-search" label="Buscar por folio, sucursal o técnico" placeholder="Buscar folio, sucursal o técnico" value={q} onChange={setQ} />
        <Chips label="Filtrar por estado" value={estado} onChange={setEstado}
          options={FILTROS.map((f) => ({ ...f, count: visitas.filter((v) => matchEstado(v, f.id)).length }))} />
      </div>

      <section className="panel v-panel">
        <div className="table-wrap">
          <table className="v-table">
            <thead>
              <tr>
                <th scope="col">Folio</th><th scope="col">Fecha</th><th scope="col">Sucursal y motivo</th><th scope="col">Técnico</th><th scope="col">Estado</th>
                <th scope="col" className="r"><span className="sr">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {list.length ? list.map((v) => {
                const st = ESTADOS_VISITA[v.estado], href = visitHref(v.folio);
                return (
                  // La fila completa abre el detalle; el folio y el botón siguen accesibles con teclado.
                  <tr key={v.folio} onClick={(e) => { if (!e.target.closest('a, button')) router.push(href); }}>
                    <td className="v-folio num"><Link href={href}>{v.folio}</Link></td>
                    <td className="v-date num">{slashDate(v.fecha)}</td>
                    <td className="v-suc"><span className="v-suc-name">{v.sucursal}</span><span className="v-suc-mot">{v.motivo}</span></td>
                    <td className="v-tec"><span className="mini-av" aria-hidden="true">{initials(v.tecnico)}</span>{v.tecnico}</td>
                    <td className="v-st"><Pill tone={st.cls}>{st.label}</Pill></td>
                    <td className="r v-go"><Link className="btn-row" href={href} aria-label={`Ver detalle de ${v.folio}`}><Icon name="eye" /><span>Ver detalle</span></Link></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="empty">No hay visitas con esos filtros.
                  <button className="link" type="button" onClick={() => { setEstado('todas'); setQ(''); }}>Quitar filtros</button></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span aria-live="polite">Mostrando {list.length} de {visitas.length} cargadas. El cliente tiene {visitasTotal} visitas registradas.</span>
        </div>
      </section>
    </section>
  );
}
