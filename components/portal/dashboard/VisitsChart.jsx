'use client';
import { useEffect, useRef, useState } from 'react';
import { MESES, MESES_LARGO, fmtNum } from '@/lib/pcliente/format';

/** Barras de visitas por mes. Se dibuja al ancho real de su contenedor. */
export default function VisitsChart({ anio, porMes, mesEnCurso }) {
  const box = useRef(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const el = box.current;
    let raf = 0;
    // El cambio de tamaño se aplica en el cuadro siguiente para no provocar "ResizeObserver loop".
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = Math.round(entry.contentRect.width);
        if (w) setWidth((prev) => (Math.abs(prev - w) < 5 ? prev : w));
      });
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const closed = porMes.slice(0, mesEnCurso);
  const avg = closed.length ? closed.reduce((a, b) => a + b, 0) / closed.length : 0;
  const max = Math.max(...porMes, avg);
  const step = max <= 12 ? 4 : max <= 30 ? 10 : Math.ceil(max / 40) * 10;
  const top = Math.ceil(max / step) * step;
  const W = Math.max(320, width), H = W < 500 ? 220 : 260, L = 28, R = 4, T = 22, B = 28;
  const cw = (W - L - R) / 12, bw = Math.min(38, cw * 0.62);
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  return (
    <div className="chart" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Visitas por mes en ${anio}`}>
        <g className="grid">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
              <text x={L - 8} y={y(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
        </g>
        <g role="list">
          {MESES.map((m, i) => {
            const v = porMes[i];
            const cur = i === mesEnCurso, future = v === undefined || i > mesEnCurso;
            const x = L + i * cw + (cw - bw) / 2;
            const h = future ? (H - T - B) * 0.06 : Math.max(2, y(0) - y(v));
            const label = future ? `${MESES_LARGO[i]}: sin datos` : `${MESES_LARGO[i]}: ${v} visitas${cur ? ' (mes en curso)' : ''}`;
            return (
              <g className="col" role="listitem" aria-label={label} key={m}>
                <rect className={`bar ${cur ? 'cur' : ''} ${future ? 'future' : ''}`} x={x} y={y(0) - h} width={bw} height={h} rx="5" style={{ animationDelay: `${i * 45}ms` }}>
                  <title>{label}</title>
                </rect>
                {!future && <text className="val num" x={x + bw / 2} y={y(v) - 7} textAnchor="middle">{v}</text>}
                <text className={`month ${cur ? 'cur' : ''}`} x={x + bw / 2} y={H - 8} textAnchor="middle">{m}</text>
              </g>
            );
          })}
        </g>
        {closed.length > 0 && (
          <>
            <line className="avg" x1={L} x2={W - R} y1={y(avg)} y2={y(avg)} />
            <text className="avg-label" x={W - R} y={y(avg) - 6} textAnchor="end">Promedio {fmtNum(avg)}</text>
          </>
        )}
      </svg>
    </div>
  );
}
