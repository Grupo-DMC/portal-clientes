'use client';
/* Filas, tarjetas y detalle expandible de «Mis sucursales». Primero lo importante
   (nombre, mall, estado, tickets, última visita); lo demás va en el detalle. */
import Link from 'next/link';
import { Icon, Pill } from '@/components/portal/ui';
import { ESTADOS_SUCURSAL } from '@/lib/pcliente/constants';
import { plural, slashDate } from '@/lib/pcliente/format';
import { branchHref } from '@/lib/pcliente/helpers';
import { diasDesdeVisita } from '@/lib/pcliente/sucursalesFiltro';

const estadoDe = (s) => ESTADOS_SUCURSAL[s.estado] || ESTADOS_SUCURSAL.observaciones;
export const claveSuc = (s) => s.id || s.codigo || s.nombre;

function UltimaVisita({ s }) {
  if (!s.ultimaVisita) return <span className="muted">Sin visitas</span>;
  const d = diasDesdeVisita(s);
  const hace = d === 0 ? 'hoy' : d === 1 ? 'ayer' : d > 0 ? `hace ${d} días` : '';
  return <span className="sl-uv"><span className="num">{slashDate(s.ultimaVisita)}</span>{hace && <span className="muted">{hace}</span>}</span>;
}

function Tickets({ n }) {
  return <span className={`tk ${n ? '' : 'zero'} num`} aria-label={plural(n || 0, 'ticket abierto', 'tickets abiertos')}>{n || 0}</span>;
}

/** Datos secundarios: se muestran al expandir. */
function Detalle({ s }) {
  const dato = (k, v) => <div><dt>{k}</dt><dd>{v ?? <span className="muted">Sin dato</span>}</dd></div>;
  return (
    <div className="sl-det">
      <dl>
        {dato('Código', s.codigo)}
        {dato('Marca', s.marca)}
        {dato('Dirección', [s.direccion, s.comuna].filter(Boolean).join(', ') || null)}
        {dato('Región', s.region || null)}
        {dato('Instalación', s.fechaInstalacion ? slashDate(s.fechaInstalacion) : null)}
        {dato('Garantía', s.garantia === 'vigente' ? `Vigente${s.garantiaVence ? ` hasta ${slashDate(s.garantiaVence)}` : ''}` : s.enGarantia === false ? 'Sin garantía' : s.garantiaVence ? `Vencida el ${slashDate(s.garantiaVence)}` : null)}
        {dato('Visitas realizadas', s.visitasRealizadas)}
      </dl>
      <Link className="btn-out sl-det-go" href={branchHref(s)}>Ver ficha de la sucursal<Icon name="right" /></Link>
    </div>
  );
}

function BotonExpandir({ s, abierta, onToggle, idDet }) {
  return (
    <button className="icon-btn sl-exp" type="button" aria-expanded={abierta} aria-controls={idDet}
      aria-label={`${abierta ? 'Ocultar' : 'Ver'} detalle de ${s.nombre}`} onClick={onToggle}>
      <Icon name="chevron" />
    </button>
  );
}

/** Tabla compacta. En celular cada fila se apila (ver lista.css). */
export function TablaSucursales({ items, abiertas, onToggle }) {
  return (
    <div className="sl-tw">
      <table className="sl-table">
        <thead>
          <tr>
            <th scope="col">Sucursal</th>
            <th scope="col">Mall</th>
            <th scope="col">Estado</th>
            <th scope="col" className="r">Tickets abiertos</th>
            <th scope="col">Última visita</th>
            <th scope="col"><span className="sr">Detalle</span></th>
          </tr>
        </thead>
        {items.map((s) => {
          const k = claveSuc(s);
          const abierta = abiertas.has(k);
          const idDet = `sl-det-${k}`;
          const st = estadoDe(s);
          return (
            <tbody key={k} className={abierta ? 'is-open' : ''}>
              <tr>
                <td className="sl-name">
                  <Link className="s-name" href={branchHref(s)}>{s.nombre}</Link>
                  <span className="muted sl-sub">{[s.codigo, s.comuna].filter(Boolean).join(' · ')}</span>
                </td>
                <td className="sl-mall" data-l="Mall">{s.mall || <span className="muted">Calle</span>}</td>
                <td className="sl-st" data-l="Estado"><Pill tone={st.cls}>{st.label}</Pill></td>
                <td className="r sl-tk" data-l="Tickets"><Tickets n={s.tickets} /></td>
                <td className="sl-v" data-l="Última visita"><UltimaVisita s={s} /></td>
                <td className="r sl-x"><BotonExpandir s={s} abierta={abierta} onToggle={() => onToggle(k)} idDet={idDet} /></td>
              </tr>
              {abierta && (
                <tr className="sl-det-row">
                  <td colSpan={6} id={idDet}><Detalle s={s} /></td>
                </tr>
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

/** Tarjetas ligeras: lo mismo que la tabla, con el detalle desplegable. */
export function TarjetasSucursales({ items, abiertas, onToggle }) {
  return (
    <ul className="sl-cards">
      {items.map((s) => {
        const k = claveSuc(s);
        const abierta = abiertas.has(k);
        const idDet = `sl-det-${k}`;
        const st = estadoDe(s);
        return (
          <li key={k} className={`sl-card ${s.estado === 'observaciones' ? 'is-obs' : ''}`}>
            <div className="sl-card-top">
              <Pill tone={st.cls}>{st.label}</Pill>
              <BotonExpandir s={s} abierta={abierta} onToggle={() => onToggle(k)} idDet={idDet} />
            </div>
            <Link className="s-name sl-card-name" href={branchHref(s)}>{s.nombre}</Link>
            <p className="muted sl-card-mall"><Icon name="pin" />{s.mall || [s.comuna, s.region].filter(Boolean).join(', ') || 'Sin ubicación'}</p>
            <div className="sl-card-foot">
              <span><Tickets n={s.tickets} /> <span className="muted">tickets</span></span>
              <UltimaVisita s={s} />
            </div>
            {abierta && <div id={idDet}><Detalle s={s} /></div>}
          </li>
        );
      })}
    </ul>
  );
}
