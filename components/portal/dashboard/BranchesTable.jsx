'use client';
import Link from 'next/link';
import { forwardRef } from 'react';
import { Chips, Icon, Pill, SearchBox } from '@/components/portal/ui';
import { ESTADOS_SUCURSAL } from '@/lib/pcliente/constants';
import { norm } from '@/lib/pcliente/format';
import { branchHref } from '@/lib/pcliente/helpers';

const LIMIT = 5;
const SORTS = [{ k: 'nombre', label: 'Sucursal' }, { k: 'comuna', label: 'Comuna' }, { k: 'tickets', label: 'Tickets abiertos', right: true }];

/**
 * Tabla de sucursales del dashboard (5 filas y "ver más").
 * El estado vive en el componente padre para que el panel "Requiere atención" pueda ordenarla.
 */
const BranchesTable = forwardRef(function BranchesTable({ sucursales, marcas, total, state, setState }, ref) {
  const q = norm(state.q.trim());
  const list = sucursales
    .filter((s) => state.marca === 'Todas' || s.marca === state.marca)
    .filter((s) => !q || norm(s.nombre).includes(q) || norm(s.comuna).includes(q))
    .sort((a, b) => {
      const r = state.sort === 'tickets' ? a.tickets - b.tickets : a[state.sort].localeCompare(b[state.sort], 'es');
      return r ? r * state.dir : a.nombre.localeCompare(b.nombre, 'es');
    });
  const shown = state.expanded ? list : list.slice(0, LIMIT);
  const filtered = state.marca !== 'Todas' || state.q;
  const set = (p) => setState((s) => ({ ...s, ...p }));
  const sortBy = (k) => setState((s) => ({ ...s, sort: k, dir: s.sort === k ? -s.dir : k === 'tickets' ? -1 : 1 }));

  const chipOpts = ['Todas', ...marcas.map((m) => m.nombre)].map((m) => ({
    id: m, label: m, count: m === 'Todas' ? sucursales.length : sucursales.filter((s) => s.marca === m).length
  }));

  return (
    <section className="panel branches-panel" aria-labelledby="sucTitle" ref={ref}>
      <div className="panel-head">
        <h2 id="sucTitle">Sucursales</h2>
        <div className="tools">
          <Chips label="Filtrar por marca" options={chipOpts} value={state.marca} onChange={(m) => set({ marca: m })} />
          <SearchBox label="Buscar sucursal o comuna" placeholder="Buscar sucursal o comuna" value={state.q} onChange={(v) => set({ q: v })} />
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {SORTS.slice(0, 1).map(({ k, label }) => <SortTh key={k} k={k} label={label} state={state} onSort={sortBy} />)}
              <th scope="col">Marca</th>
              {SORTS.slice(1).map(({ k, label, right }) => <SortTh key={k} k={k} label={label} right={right} state={state} onSort={sortBy} />)}
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {shown.length ? shown.map((s) => {
              const st = ESTADOS_SUCURSAL[s.estado] || ESTADOS_SUCURSAL.observaciones;
              return (
                <tr key={s.codigo || s.nombre}>
                  <td className="s-name"><Link className="row-link" href={branchHref(s)}>{s.nombre}</Link></td>
                  <td className="c-brand"><span className={`brand-tag ${s.marca.includes('Outlet') ? 'outlet' : ''}`}>{s.marca}</span></td>
                  <td className="c-comuna">{s.comuna}</td>
                  <td className="r c-tk"><span className={`tk num ${s.tickets ? '' : 'zero'}`}>{s.tickets}</span><span className="tk-m"> {s.tickets === 1 ? 'ticket' : 'tickets'}</span></td>
                  <td className="c-st"><Pill tone={st.cls}>{st.label}</Pill></td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="empty">No hay sucursales que coincidan con la búsqueda.
                <button className="link" type="button" onClick={() => set({ marca: 'Todas', q: '' })}>Limpiar filtros</button></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {list.length > LIMIT && (
        <button className="more" type="button" aria-expanded={state.expanded} onClick={() => set({ expanded: !state.expanded })}>
          <span>{state.expanded ? 'Mostrar menos' : `Ver ${list.length - LIMIT} ${list.length - LIMIT === 1 ? 'sucursal más' : 'sucursales más'}`}</span>
          <Icon name="chevron" />
        </button>
      )}
      <div className="table-foot">
        <span aria-live="polite">
          Mostrando {shown.length} de {list.length}{filtered ? ' (filtradas)' : ''}
          {!filtered && total > sucursales.length ? `. El cliente tiene ${total} sucursales.` : ''}
        </span>
        <Link className="link" href="/portal/sucursales">Ir a Mis sucursales</Link>
      </div>
    </section>
  );
});

function SortTh({ k, label, right, state, onSort }) {
  const sorted = state.sort === k ? (state.dir === 1 ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" className={right ? 'r' : undefined} aria-sort={sorted}>
      <button type="button" onClick={() => onSort(k)}>{label} <Icon name="sort" /></button>
    </th>
  );
}

export default BranchesTable;
