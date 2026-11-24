'use client';
import { useState } from 'react';
import { Icon } from '@/components/portal/ui';
import { ATAJOS, aISO, atajoActivo, deISO, etiquetaRango } from '@/lib/pcliente/filtrosVisitas';
import { MESES_LARGO } from '@/lib/pcliente/format';

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Celdas del mes (semana de lunes a domingo); null = hueco antes del día 1. */
function celdas(anio, mes) {
  const primero = new Date(anio, mes, 1);
  const hueco = (primero.getDay() + 6) % 7;
  const total = new Date(anio, mes + 1, 0).getDate();
  return [...Array(hueco).fill(null), ...Array.from({ length: total }, (_, i) => new Date(anio, mes, i + 1))];
}

/**
 * Un solo selector de período: atajos + calendario. El primer clic fija «desde» y el
 * segundo «hasta» (si es anterior, reemplaza al «desde»). Las fechas van en ISO (AAAA-MM-DD).
 */
export default function RangoFechas({ desde, hasta, onChange }) {
  const base = desde ? deISO(desde) : new Date();
  const [vista, setVista] = useState({ anio: base.getFullYear(), mes: base.getMonth() });
  const [hover, setHover] = useState(null);
  const hoyISO = aISO(new Date());
  const eligiendoFin = Boolean(desde && !hasta);
  const finVisible = hasta || (eligiendoFin && hover && hover >= desde ? hover : '');
  const atajo = atajoActivo(desde, hasta);

  const elegir = (iso) => {
    if (!desde || hasta) onChange(iso, '');
    else if (iso < desde) onChange(iso, '');
    else onChange(desde, iso);
  };
  const mover = (n) => setVista(({ anio, mes }) => { const d = new Date(anio, mes + n, 1); return { anio: d.getFullYear(), mes: d.getMonth() }; });
  const usarAtajo = (a) => {
    const [d, h] = a.rango();
    onChange(d, h);
    const x = deISO(d);
    setVista({ anio: x.getFullYear(), mes: x.getMonth() });
  };

  return (
    <div className="rf">
      <div className="rf-atajos" role="group" aria-label="Atajos de período">
        {ATAJOS.map((a) => (
          <button key={a.id} type="button" className="chip" aria-pressed={atajo === a.id} onClick={() => usarAtajo(a)}>{a.label}</button>
        ))}
      </div>
      <div className="rf-cal" onMouseLeave={() => setHover(null)}>
        <div className="rf-head">
          <button type="button" className="icon-btn" aria-label="Mes anterior" onClick={() => mover(-1)}><Icon name="left" /></button>
          <span className="rf-mes" aria-live="polite">{MESES_LARGO[vista.mes]} {vista.anio}</span>
          <button type="button" className="icon-btn" aria-label="Mes siguiente" onClick={() => mover(1)}><Icon name="right" /></button>
        </div>
        <div className={`rf-grid${desde && finVisible ? ' has-range' : ''}`} role="group" aria-label="Elige el período">
          {DIAS.map((d, i) => <span key={i} className="rf-dow" aria-hidden="true">{d}</span>)}
          {celdas(vista.anio, vista.mes).map((d, i) => {
            if (!d) return <span key={`h${i}`} />;
            const iso = aISO(d);
            const ini = iso === desde, fin = iso === finVisible;
            const dentro = desde && finVisible && iso > desde && iso < finVisible;
            const cls = ['rf-day', ini && 'is-ini', fin && 'is-fin', dentro && 'is-in', iso === hoyISO && 'is-hoy', ini && fin && 'is-uno'].filter(Boolean).join(' ');
            return (
              <button key={iso} type="button" className={cls} aria-pressed={ini || fin}
                aria-label={`${d.getDate()} de ${MESES_LARGO[d.getMonth()]} de ${d.getFullYear()}${ini ? ', inicio' : fin ? ', término' : ''}`}
                onMouseEnter={() => eligiendoFin && setHover(iso)} onFocus={() => eligiendoFin && setHover(iso)} onClick={() => elegir(iso)}>
                <span className="num">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="rf-sel" aria-live="polite">
        {eligiendoFin ? 'Ahora elige el día de término.' : etiquetaRango(desde, hasta) ?? 'Sin período: se muestran todas las fechas.'}
        {(desde || hasta) && <button type="button" className="link" onClick={() => onChange('', '')}>Quitar período</button>}
      </p>
    </div>
  );
}
