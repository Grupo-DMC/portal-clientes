'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Chips, Icon, Pill, SearchBox } from '@/components/portal/ui';
import { ESTADOS_SUCURSAL } from '@/lib/pcliente/constants';
import { norm, plural } from '@/lib/pcliente/format';
import { branchHref } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';

const ESTADO_FILTROS = [
  { id: 'todas', label: 'Todos los estados' },
  { id: 'operativa', label: 'Operativas' },
  { id: 'observaciones', label: 'Con observaciones' }
];

function BranchCard({ s }) {
  const st = ESTADOS_SUCURSAL[s.estado] || ESTADOS_SUCURSAL.observaciones;
  const place = s.mall ? `${s.mall}${s.local ? `, local ${s.local}` : ''}` : 'Dirección por confirmar';
  const hasStats = s.accesos != null || s.equipos != null;
  return (
    <Link className={`card ${s.estado === 'observaciones' ? 'is-obs' : ''}`} href={branchHref(s)} aria-label={`Ver detalle de ${s.nombre}`}>
      <div className="card-top">
        <span className="code num">{s.codigo || 'Sin código'}</span>
        <Pill tone={st.cls}>{st.label}</Pill>
      </div>
      <h3>{s.nombre}</h3>
      <div className="addr"><Icon name="pin" /><span className="place">{place}</span><span className="area">{s.comuna}, {s.region}</span></div>
      <div className="card-foot">
        {s.accesos != null && <span className="stat"><Icon name="door" /><b className="num">{s.accesos}</b> {s.accesos === 1 ? 'acceso' : 'accesos'}</span>}
        {s.equipos != null && <span className="stat"><Icon name="antenna" /><b className="num">{s.equipos}</b> {s.equipos === 1 ? 'equipo' : 'equipos'}</span>}
        {!hasStats && <span className="stat">Sin datos de equipos</span>}
        {(s.tickets > 0 || s.garantia === 'vigente') && (
          <span className="card-badges">
            {s.tickets > 0 && <span className="tag ticket">{plural(s.tickets, 'ticket abierto', 'tickets abiertos')}</span>}
            {s.garantia === 'vigente' && <span className="tag warranty">Garantía vigente</span>}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function BranchesView() {
  const { sucursales, sucursalesTotal, marcas } = usePortal();
  const [marca, setMarca] = useState('Todas');
  const [estado, setEstado] = useState('todas');
  const [q, setQ] = useState('');

  const nq = norm(q.trim());
  const match = (s) => (marca === 'Todas' || s.marca === marca)
    && (estado === 'todas' || s.estado === estado)
    && (!nq || [s.nombre, s.codigo, s.mall, s.comuna, s.region].some((v) => v && norm(v).includes(nq)));
  const filtered = marca !== 'Todas' || estado !== 'todas' || Boolean(nq);
  const byCode = (a, b) => (a.codigo || 'ZZ').localeCompare(b.codigo || 'ZZ') || a.nombre.localeCompare(b.nombre, 'es');
  const groups = marcas
    .map((m) => ({ ...m, list: sucursales.filter((s) => s.marca === m.nombre && match(s)).sort(byCode), loaded: sucursales.filter((s) => s.marca === m.nombre).length }))
    .filter((g) => g.list.length);

  const ok = sucursales.filter((s) => s.estado === 'operativa').length;
  const obs = sucursales.filter((s) => s.estado === 'observaciones').length;

  return (
    <section className="view" aria-labelledby="msTitle">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="msTitle">Mis sucursales</h1>
          <p className="page-sub">{plural(sucursalesTotal, 'sucursal', 'sucursales')} en {plural(marcas.length, 'marca', 'marcas')}</p>
        </div>
        <div className="status-sum">
          <div className="sum ok"><b className="num">{ok}</b><span>Operativas</span></div>
          <div className="sum obs"><b className="num">{obs}</b><span>Con observaciones</span></div>
        </div>
      </header>

      <div className="ms-tools">
        <Chips label="Filtrar por marca" value={marca} onChange={setMarca}
          options={['Todas', ...marcas.map((m) => m.nombre)].map((m) => ({ id: m, label: m === 'Todas' ? 'Todas las marcas' : m, count: m === 'Todas' ? sucursales.length : sucursales.filter((s) => s.marca === m).length }))} />
        <Chips label="Filtrar por estado" value={estado} onChange={setEstado}
          options={ESTADO_FILTROS.map((f) => ({ ...f, count: f.id === 'todas' ? sucursales.length : sucursales.filter((s) => s.estado === f.id).length }))} />
        <SearchBox className="ms-search" label="Buscar sucursal por nombre, código, mall o comuna" placeholder="Buscar sucursal, código o comuna" value={q} onChange={setQ} />
      </div>

      <div aria-live="polite">
        {groups.length ? groups.map((g) => (
          <section className="group" key={g.nombre} aria-label={g.nombre}>
            <div className="group-head"><h2>{g.nombre}</h2><span>{filtered ? `${g.list.length} de ${g.total}` : plural(g.total, 'sucursal', 'sucursales')}</span></div>
            <div className="cards">{g.list.map((s) => <BranchCard key={s.codigo || s.nombre} s={s} />)}</div>
            {!filtered && g.loaded < g.total && <p className="group-note">En esta maqueta se cargaron {g.loaded} de {g.total}. En producción aparecen todas.</p>}
          </section>
        )) : (
          <div className="no-results">No hay sucursales con esos filtros.{' '}
            <button className="link" type="button" onClick={() => { setMarca('Todas'); setEstado('todas'); setQ(''); }}>Quitar filtros</button>
          </div>
        )}
      </div>
    </section>
  );
}
