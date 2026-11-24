'use client';
import { useRef, useState } from 'react';
import { Icon } from '@/components/portal/ui';
import { MESES_LARGO, longDate, plural, today } from '@/lib/pcliente/format';
import { usePortal } from '@/lib/pcliente/store';
import BranchesTable from './BranchesTable';
import VisitsChart from './VisitsChart';
import WarrantyPlan from './WarrantyPlan';

const PERIODOS = [{ id: 'anio', label: 'Año' }, { id: 'mes', label: 'Mes' }, { id: 'semana', label: 'Semana' }];

export default function DashboardView() {
  const { usuario, cliente, sucursales, sucursalesTotal, marcas, tickets, garantias, visitasResumen: vr } = usePortal();
  const [periodo, setPeriodo] = useState('mes');
  const [table, setTable] = useState({ marca: 'Todas', q: '', sort: 'nombre', dir: 1, expanded: false });
  const tableRef = useRef(null);
  const conTickets = sucursales.filter((s) => s.tickets > 0).length;

  const visitas = {
    anio: { v: vr.porMes.reduce((a, b) => a + b, 0), note: `en ${vr.anio}` },
    mes: { v: vr.mes, note: 'últimos 30 días' },
    semana: { v: vr.semana, note: 'últimos 7 días' }
  }[periodo];

  const verSucursalesConTickets = () => {
    setTable({ marca: 'Todas', q: '', sort: 'tickets', dir: -1, expanded: false });
    tableRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section className="view" aria-label="Dashboard">
      <section className="hero" aria-label="Cliente">
        <div className="client">
          {/* Logo del cliente: si el sistema entrega una URL, reemplaza la inicial por <img>. */}
          <div className="client-logo">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo del cliente servido por la app */}
            {cliente.logo ? <img src={cliente.logo} alt={`Logo de ${cliente.nombre}`} /> : <span className="mono" aria-hidden="true">{cliente.nombre[0]}</span>}
          </div>
          <div>
            <p className="hello">Hola, {usuario.nombre.split(' ')[0]}</p>
            <h1>{cliente.nombre}</h1>
            <p className="legal">{cliente.razonSocial}</p>
            <ul className="facts"><li className="fact">RUT <b className="num">{cliente.rut}</b></li></ul>
          </div>
        </div>

        <aside className="attention" aria-labelledby="attTitle">
          <h2 id="attTitle">Requiere atención</h2>
          <div className="att-body">
            {tickets.abiertos > 0 ? (
              <>
                <div className="att-main">
                  <span className="att-num num">{tickets.abiertos}</span>
                  <span className="att-label">{tickets.abiertos === 1 ? 'ticket abierto' : 'tickets abiertos'}</span>
                </div>
                <ul className="att-facts">
                  <li><span className={`adot ${tickets.altaPrioridad ? 'red' : 'ok'}`} aria-hidden="true" />{tickets.altaPrioridad ? `${tickets.altaPrioridad} de prioridad alta` : 'Ninguno de prioridad alta'}</li>
                  <li><span className="adot amber" aria-hidden="true" />En {plural(conTickets, 'sucursal', 'sucursales')}</li>
                </ul>
                <button className="att-btn" type="button" onClick={verSucursalesConTickets}>Ver sucursales con tickets</button>
              </>
            ) : (
              <p className="att-ok"><span className="adot ok" aria-hidden="true" />No hay tickets abiertos.</p>
            )}
          </div>
        </aside>
      </section>

      <section className="kpis" aria-label="Indicadores">
        <div className="kpi">
          <span className="kpi-label"><Icon name="store" />Sucursales</span>
          <span className="kpi-value num">{sucursalesTotal}</span>
          <span className="kpi-note">{marcas.length} marcas</span>
        </div>
        <div className={`kpi ${tickets.abiertos ? 'is-amber' : ''}`}>
          <span className="kpi-label"><Icon name="ticket" />Tickets abiertos</span>
          <span className="kpi-value num">{tickets.abiertos}</span>
          <span className="kpi-note">{tickets.altaPrioridad} de prioridad alta</span>
        </div>
        <div className="kpi">
          <span className="kpi-label"><Icon name="shieldOk" />Garantías por vencer</span>
          <span className="kpi-value num">{garantias.porVencer}</span>
          <span className="kpi-note">{garantias.planVigenteHasta ? <>Plan vigente hasta el <span className="nw">{garantias.planVigenteHasta}</span></> : 'Sin plan de garantía registrado'}</span>
        </div>
        <div className="kpi">
          <div className="kpi-head">
            <span className="kpi-label"><Icon name="pin" />Visitas</span>
            <div className="seg" role="group" aria-label="Periodo de visitas">
              {PERIODOS.map((p) => (
                <button key={p.id} type="button" aria-pressed={p.id === periodo} onClick={() => setPeriodo(p.id)}>{p.label}</button>
              ))}
            </div>
          </div>
          <span className="kpi-value num" aria-live="polite">{visitas.v}</span>
          <span className="kpi-note">{visitas.note}</span>
        </div>
      </section>

      <div className="row2">
        <section className="panel" aria-labelledby="visTitle">
          <div className="panel-head">
            <h2 id="visTitle">Visitas por mes en {vr.anio}</h2>
            <span className="panel-sub">{MESES_LARGO[vr.mesEnCurso][0].toUpperCase() + MESES_LARGO[vr.mesEnCurso].slice(1)} en curso</span>
          </div>
          <VisitsChart anio={vr.anio} porMes={vr.porMes} mesEnCurso={vr.mesEnCurso} />
          <div className="legend" aria-hidden="true">
            <span><i style={{ background: 'var(--lilac)' }} />Mes cerrado</span>
            <span><i style={{ background: 'var(--purple)' }} />Mes en curso</span>
            <span><i style={{ border: '1.5px dashed var(--purple)', height: 0, width: 14, borderRadius: 0 }} />Promedio de meses cerrados</span>
          </div>
        </section>

        <section className="panel" aria-labelledby="dueTitle">
          <div className="panel-head">
            <h2 id="dueTitle">Plan de garantía</h2>
            <span className="panel-sub">Hoy, {longDate(today())}</span>
          </div>
          <WarrantyPlan vigenteHasta={garantias.planVigenteHasta} porVencer={garantias.porVencer} />
        </section>
      </div>

      <BranchesTable ref={tableRef} sucursales={sucursales} marcas={marcas} total={sucursalesTotal} state={table} setState={setTable} />
    </section>
  );
}
