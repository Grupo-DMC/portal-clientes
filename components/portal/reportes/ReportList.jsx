'use client';
import { useState } from 'react';
import { Pill } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { ESTADOS_REPORTE, PRIORIDADES, reportePendiente } from '@/lib/pcliente/constants';
import { slashDate } from '@/lib/pcliente/format';
import { usePortal } from '@/lib/pcliente/store';

/** Reportes de un local, con la opción de solicitar prioridad a soporte. */
export default function ReportList({ reportes }) {
  const { actions } = usePortal();
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const [nivel, setNivel] = useState('alta');
  const [motivo, setMotivo] = useState('');

  const start = (id) => { setOpen(id); setNivel('alta'); setMotivo(''); };
  const send = (r) => {
    actions.requestPriority(r.id, nivel, motivo.trim());
    setOpen(null);
    toast(`Soporte recibió tu solicitud de prioridad ${PRIORIDADES[nivel].toLowerCase()} para el reporte ${r.id}.`);
  };

  return (
    <ol className="reports">
      {reportes.map((r) => {
        const st = ESTADOS_REPORTE[r.estado];
        const canAsk = reportePendiente(r) && !r.prioridad;
        return (
          <li key={r.id} className={`report ${r.prioridad ? 'is-prio' : ''}`}>
            <div className="report-top"><b>{r.tipo}</b><Pill tone={st.cls}>{st.label}</Pill></div>
            <p>{r.detalle}</p>
            <div className="report-foot">
              <span className="muted num">{r.id}, {slashDate(r.fecha)}</span>
              {r.prioridad && <span className="tag prio">Prioridad {PRIORIDADES[r.prioridad.nivel].toLowerCase()} solicitada a soporte</span>}
              {canAsk && open !== r.id && (
                <button className="btn-prio" type="button" onClick={() => start(r.id)}>Solicitar prioridad a soporte</button>
              )}
            </div>
            {open === r.id && (
              <div className="prio-form" role="group" aria-label={`Solicitud de prioridad para ${r.id}`}>
                <span className="flabel">Nivel de prioridad</span>
                <div className="prio-opts">
                  <label>
                    <input type="radio" name={`prio-${r.id}`} value="alta" checked={nivel === 'alta'} onChange={() => setNivel('alta')} autoFocus />
                    <span><b>Alta</b><span className="muted d-block">Necesitamos atención antes de lo habitual.</span></span>
                  </label>
                  <label>
                    <input type="radio" name={`prio-${r.id}`} value="urgente" checked={nivel === 'urgente'} onChange={() => setNivel('urgente')} />
                    <span><b>Urgente</b><span className="muted d-block">El local quedó sin protección en un acceso.</span></span>
                  </label>
                </div>
                <label className="flabel" htmlFor={`prioTxt-${r.id}`}>Motivo para soporte (opcional)</label>
                <textarea className="input ta" id={`prioTxt-${r.id}`} rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej.: hoy hay alto flujo de clientes y la antena no detecta" />
                <div className="prio-actions">
                  <button className="btn-out" type="button" onClick={() => setOpen(null)}>Cancelar</button>
                  <button className="btn-pri" type="button" onClick={() => send(r)}>Enviar a soporte</button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
