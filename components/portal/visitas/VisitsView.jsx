'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Icon, Pill } from '@/components/portal/ui';
import { ESTADOS_VISITA } from '@/lib/pcliente/constants';
import { VACIOS, aQuery, cambiaServidor, contarActivos, filtrarVisitas } from '@/lib/pcliente/filtrosVisitas';
import { initials, slashDate } from '@/lib/pcliente/format';
import { visitHref } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';
import FiltrosVisitas from './filtros/FiltrosVisitas';

const estadoDe = (e) => ESTADOS_VISITA[e] || { label: e, cls: 'off' };
const RUTA = '/portal/visitas';

function FilasCargando() {
  return Array.from({ length: 6 }, (_, i) => (
    <tr key={i} className="fv-skel" aria-hidden="true">
      <td><span style={{ width: 92 }} /></td><td><span style={{ width: 74 }} /></td>
      <td><span style={{ width: '70%' }} /><span style={{ width: '45%' }} /></td>
      <td><span style={{ width: 110 }} /></td><td><span style={{ width: 84 }} /></td><td />
    </tr>
  ));
}

/**
 * `visitas`: las que entrega el servidor, ya acotadas por sucursal y fecha (app/portal/(app)/visitas/page.js).
 * `filtros`: todos los de la URL (lib/pcliente/filtrosVisitas.js). Los de servidor vuelven a pedir datos
 * (con skeleton mientras llegan); el resto filtra en el navegador y solo actualiza la URL.
 */
export default function VisitsView({ visitas: desdeServidor, filtros: inicial = VACIOS }) {
  const store = usePortal();
  const visitas = desdeServidor ?? store.visitas;
  const router = useRouter();
  const [f, setF] = useState(inicial);
  const [cargando, startTransition] = useTransition();
  const sucursalPorId = useMemo(() => new Map(store.sucursales.map((s) => [s.id, s])), [store.sucursales]);
  const list = useMemo(() => filtrarVisitas(visitas, f, sucursalPorId), [visitas, f, sucursalPorId]);

  // La URL refleja siempre los filtros. Si cambian los de servidor, se navega (nuevos datos);
  // si no, basta con reescribir la URL sin pedir nada.
  const servidor = useRef(inicial);
  useEffect(() => {
    const url = RUTA + aQuery(f);
    if (cambiaServidor(servidor.current, f)) {
      servidor.current = f;
      startTransition(() => router.replace(url, { scroll: false }));
    } else if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState(null, '', url);
    }
  }, [f, router]);

  const onChange = useCallback((nuevo) => setF(nuevo), []);
  /** Cuántas quedarían con un borrador del panel; null si cambia la consulta al servidor. */
  const contar = useCallback((d) => (cambiaServidor(servidor.current, d) ? null : filtrarVisitas(visitas, { ...d, q: f.q }, sucursalPorId).length), [visitas, f.q, sucursalPorId]);

  const hayFiltros = contarActivos(f) > 0 || Boolean(f.q);
  const sub = cargando ? 'Actualizando…' : hayFiltros ? `${list.length} de ${store.visitasTotal} visitas` : `${store.visitasTotal} visitas realizadas`;

  return (
    <section className="view" aria-labelledby="vTitle">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="vTitle">Visitas</h1>
          <p className="page-sub" aria-live="polite">{sub}</p>
        </div>
      </header>

      <FiltrosVisitas filtros={f} onChange={onChange} sucursales={store.sucursales} visitas={store.visitas} contar={contar} />

      {!cargando && !list.length ? (
        <div className="empty-state">
          <Icon name="search" />
          {hayFiltros ? (
            <>
              <h2>No hay visitas con estos filtros</h2>
              <p>Prueba con otro período o quita alguno de los filtros activos.</p>
              <button className="btn-out" type="button" onClick={() => setF({ ...VACIOS })}>Limpiar filtros</button>
            </>
          ) : (
            <>
              <h2>Todavía no hay visitas registradas</h2>
              <p>Cuando un técnico de DMC cierre una visita en tus sucursales, aparecerá aquí con su acta.</p>
            </>
          )}
        </div>
      ) : (
        <section className="panel v-panel" aria-busy={cargando}>
          <div className="table-wrap">
            <table className="v-table">
              <thead>
                <tr>
                  <th scope="col">Folio</th><th scope="col">Fecha</th><th scope="col">Sucursal y motivo</th><th scope="col">Técnico</th><th scope="col">Estado</th>
                  <th scope="col" className="r"><span className="sr">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {cargando ? <FilasCargando /> : list.map((v) => {
                  const st = estadoDe(v.estado), href = visitHref(v.folio);
                  const evid = [v.fotos ? `${v.fotos} fotos` : '', v.videos ? `${v.videos} videos` : ''].filter(Boolean).join(', ');
                  return (
                    // La fila completa abre el detalle; el folio y el botón siguen accesibles con teclado.
                    <tr key={v.folio} onClick={(e) => { if (!e.target.closest('a, button')) router.push(href); }}>
                      <td className="v-folio num"><Link href={href}>{v.folio}</Link></td>
                      <td className="v-date num">{slashDate(v.fecha)}</td>
                      <td className="v-suc"><span className="v-suc-name">{v.sucursal}</span><span className="v-suc-mot">{v.motivo}{evid ? ` · ${evid}` : ''}</span></td>
                      <td className="v-tec"><span className="mini-av" aria-hidden="true">{initials(v.tecnico)}</span>{v.tecnico}</td>
                      <td className="v-st"><Pill tone={st.cls}>{st.label}</Pill></td>
                      <td className="r v-go"><Link className="btn-row" href={href} aria-label={`Ver detalle de ${v.folio}`}><Icon name="eye" /><span>Ver detalle</span></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            <span aria-live="polite">{cargando ? 'Cargando visitas…' : `Mostrando ${list.length} de ${visitas.length}.`}</span>
          </div>
        </section>
      )}
    </section>
  );
}
