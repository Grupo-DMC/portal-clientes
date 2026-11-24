import { MESES, daysFrom, longDate, parseDMY, today } from '@/lib/pcliente/format';

/** Días restantes del plan de garantía y avance del último año. */
export default function WarrantyPlan({ vigenteHasta, porVencer }) {
  // Sin fecha de plan (p. ej. la base no tiene garantías registradas) no hay nada que dibujar.
  if (!vigenteHasta) return <div className="plan"><p className="plan-date">Sin plan de garantía registrado.</p></div>;
  const end = parseDMY(vigenteHasta);
  const left = daysFrom(end);
  const vigente = left >= 0;
  const from = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  const pct = Math.min(100, Math.max(0, ((today() - from) / (end - from)) * 100));
  const months = [];
  for (let i = 0; i <= 12; i += 3) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    months.push(MESES[d.getMonth()] + (i === 0 || d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''));
  }
  return (
    <div className="plan">
      <div className="plan-top"><span className={`pill ${vigente ? 'ok' : 'crit'}`}>{vigente ? 'Vigente' : 'Vencido'}</span></div>
      <div className="plan-days"><span className="num">{Math.abs(left)}</span> {vigente ? (left === 1 ? 'día restante' : 'días restantes') : 'días vencido'}</div>
      <p className="plan-date">{vigente ? 'Vence' : 'Venció'} el {longDate(end)}</p>
      <div className="plan-track" role="img" aria-label={`Avance del último año del plan: ${Math.round(pct)}%`}>
        <div className="plan-fill" style={{ width: `${pct}%` }} />
        <span className="plan-now" style={{ left: `${pct}%` }}><b>Hoy</b></span>
      </div>
      <div className="plan-months" aria-hidden="true">{months.map((m) => <span key={m}>{m}</span>)}</div>
      <dl className="plan-stats">
        <div><dt>Garantías por vencer</dt><dd className="num">{porVencer}</dd></div>
      </dl>
    </div>
  );
}
