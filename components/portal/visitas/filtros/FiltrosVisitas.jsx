'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, SearchBox } from '@/components/portal/ui';
import { ESTADOS_VISITA } from '@/lib/pcliente/constants';
import { VACIOS, contarActivos, etiquetaRango, unicos } from '@/lib/pcliente/filtrosVisitas';
import Combobox from './Combobox';
import RangoFechas from './RangoFechas';
import './filtros.css';

const estadoLabel = (e) => ESTADOS_VISITA[e]?.label ?? e;

/**
 * Opciones de cada filtro, a partir de lo que el cliente realmente tiene.
 * `sucursales` y `visitas` son las del store (todas las del cliente), no las ya filtradas,
 * para que las opciones no desaparezcan al acotar.
 */
function useOpciones(sucursales, visitas) {
  return useMemo(() => ({
    regiones: unicos(sucursales.map((s) => s.region)),
    marcas: unicos(sucursales.map((s) => s.marca)),
    motivos: unicos(visitas.map((v) => v.motivo)),
    estados: unicos(visitas.map((v) => v.estado)),
    sucursales: [...sucursales].filter((s) => s.id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }), [sucursales, visitas]);
}

/** Panel de filtros: trabaja sobre un borrador y solo cambia la lista al pulsar «Aplicar». */
function Panel({ inicial, opciones, contar, onAplicar, onCerrar }) {
  const [d, setD] = useState(inicial);
  const ref = useRef(null);
  const set = (k) => (v) => setD((x) => ({ ...x, [k]: v }));

  // Cascada: al elegir región, la sucursal elegida debe pertenecer a ella.
  const sucursalesRegion = opciones.sucursales.filter((s) => !d.region || s.region === d.region);
  const setRegion = (region) => setD((x) => {
    const suc = opciones.sucursales.find((s) => s.id === x.sucursal);
    return { ...x, region, sucursal: suc && region && suc.region !== region ? '' : x.sucursal };
  });
  const setSucursal = (id) => setD((x) => {
    const suc = opciones.sucursales.find((s) => s.id === id);
    return { ...x, sucursal: id, region: suc && x.region && suc.region !== x.region ? suc.region : x.region };
  });

  useEffect(() => { ref.current?.querySelector('button, input, select')?.focus(); }, []);

  const aplicar = (e) => {
    e.preventDefault();
    // Un solo día marcado (sin término) se lee como ese día.
    onAplicar({ ...d, hasta: d.desde && !d.hasta ? d.desde : d.hasta });
  };
  const n = contar(d);

  return (
    <>
      <div className="fv-scrim" onClick={onCerrar} aria-hidden="true" />
      <form className="fv-panel" role="dialog" aria-modal="false" aria-labelledby="fvPanelT" ref={ref} onSubmit={aplicar}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); } }}>
        <header className="fv-ph">
          <h2 id="fvPanelT">Filtrar visitas</h2>
          <button className="icon-btn" type="button" aria-label="Cerrar filtros" onClick={onCerrar}><Icon name="close" /></button>
        </header>
        <div className="fv-body">
          <fieldset className="fv-sec">
            <legend>Período</legend>
            <RangoFechas desde={d.desde} hasta={d.hasta} onChange={(desde, hasta) => setD((x) => ({ ...x, desde, hasta }))} />
          </fieldset>

          <fieldset className="fv-sec">
            <legend>Ubicación</legend>
            <div className="fv-row">
              {opciones.regiones.length > 1 && (
                <label className="fv-field">
                  <span className="fv-label">Región</span>
                  <select className="input" value={d.region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="">Todas las regiones</option>
                    {opciones.regiones.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              )}
              <div className="fv-field">
                <Combobox label="Sucursal" todos={d.region ? `Todas las de ${d.region}` : 'Todas las sucursales'} placeholder="Busca por nombre, mall o comuna"
                  value={d.sucursal} onChange={setSucursal}
                  options={sucursalesRegion.map((s) => ({ value: s.id, label: s.nombre, hint: [s.mall, s.comuna].filter(Boolean).join(' · ') }))} />
              </div>
            </div>
          </fieldset>

          <fieldset className="fv-sec">
            <legend>Visita</legend>
            {opciones.estados.length > 1 && (
              <div className="fv-field">
                <span className="fv-label" id="fvEst">Estado</span>
                <div className="chips" role="group" aria-labelledby="fvEst">
                  {['', ...opciones.estados].map((e) => (
                    <button key={e || 'todas'} type="button" className="chip" aria-pressed={d.estado === e} onClick={() => set('estado')(e)}>
                      {e ? estadoLabel(e) : 'Todas'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="fv-row">
              {opciones.motivos.length > 1 && (
                <label className="fv-field">
                  <span className="fv-label">Motivo</span>
                  <select className="input" value={d.motivo} onChange={(e) => set('motivo')(e.target.value)}>
                    <option value="">Todos los motivos</option>
                    {opciones.motivos.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
              )}
              {opciones.marcas.length > 1 && (
                <label className="fv-field">
                  <span className="fv-label">Marca</span>
                  <select className="input" value={d.marca} onChange={(e) => set('marca')(e.target.value)}>
                    <option value="">Todas las marcas</option>
                    {opciones.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
              )}
            </div>
            <label className="fv-check">
              <input type="checkbox" checked={d.problemas === '1'} onChange={(e) => set('problemas')(e.target.checked ? '1' : '')} />
              <span>Solo visitas con problemas registrados</span>
            </label>
          </fieldset>
        </div>
        <footer className="fv-pf">
          <button className="btn-out" type="button" onClick={() => setD({ ...VACIOS, q: d.q })}>Restablecer</button>
          <button className="btn-pri" type="submit">{n === null ? 'Aplicar filtros' : `Ver ${n} ${n === 1 ? 'visita' : 'visitas'}`}</button>
        </footer>
      </form>
    </>
  );
}

/**
 * Barra de filtros de Visitas: búsqueda (con debounce), botón «Filtros» con contador que abre
 * el panel, y chips removibles de lo que está activo.
 * `contar(borrador)` devuelve cuántas visitas quedarían, o null si hay que preguntarle al servidor.
 */
export default function FiltrosVisitas({ filtros, onChange, sucursales, visitas, contar }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState(filtros.q);
  const boton = useRef(null);
  const caja = useRef(null);
  const opciones = useOpciones(sucursales, visitas);
  const activos = contarActivos(filtros);

  // La búsqueda filtra 250 ms después de dejar de escribir.
  const ultimoQ = useRef(filtros.q);
  useEffect(() => {
    if (q === ultimoQ.current) return undefined;
    const t = setTimeout(() => { ultimoQ.current = q; onChange({ ...filtros, q }); }, 250);
    return () => clearTimeout(t);
  }, [q, filtros, onChange]);

  // Clic fuera cierra el panel (en escritorio; en celular lo cierra el fondo).
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (!caja.current?.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const cerrar = () => { setAbierto(false); boton.current?.focus(); };
  const quitar = (cambio) => onChange({ ...filtros, ...cambio });
  const limpiarTodo = () => { ultimoQ.current = ''; setQ(''); onChange({ ...VACIOS }); };

  const suc = opciones.sucursales.find((s) => s.id === filtros.sucursal);
  const chips = [
    filtros.q && { k: 'q', label: `«${filtros.q}»`, quitar: () => { ultimoQ.current = ''; setQ(''); quitar({ q: '' }); } },
    (filtros.desde || filtros.hasta) && { k: 'fecha', label: etiquetaRango(filtros.desde, filtros.hasta), quitar: () => quitar({ desde: '', hasta: '' }) },
    filtros.region && { k: 'region', label: filtros.region, quitar: () => quitar({ region: '' }) },
    filtros.sucursal && { k: 'sucursal', label: suc?.nombre ?? 'Sucursal', quitar: () => quitar({ sucursal: '' }) },
    filtros.estado && { k: 'estado', label: estadoLabel(filtros.estado), quitar: () => quitar({ estado: '' }) },
    filtros.motivo && { k: 'motivo', label: filtros.motivo, quitar: () => quitar({ motivo: '' }) },
    filtros.marca && { k: 'marca', label: filtros.marca, quitar: () => quitar({ marca: '' }) },
    filtros.problemas && { k: 'problemas', label: 'Con problemas', quitar: () => quitar({ problemas: '' }) }
  ].filter(Boolean);

  return (
    <div className="fv">
      <div className="fv-bar" ref={caja}>
        <SearchBox className="fv-search" label="Buscar por folio, sucursal, mall o técnico" placeholder="Buscar folio, sucursal, mall o técnico" value={q} onChange={setQ} />
        <button ref={boton} type="button" className={`btn-out fv-btn${activos ? ' is-on' : ''}`} aria-expanded={abierto} aria-haspopup="dialog"
          onClick={() => setAbierto((x) => !x)}>
          <Icon name="settings" />
          <span>Filtros</span>
          {activos > 0 && <span className="fv-count num" aria-label={`${activos} activos`}>{activos}</span>}
        </button>
        {abierto && (
          <Panel inicial={filtros} opciones={opciones} contar={contar}
            onCerrar={cerrar} onAplicar={(nuevo) => { onChange({ ...nuevo, q: filtros.q }); cerrar(); }} />
        )}
      </div>
      {chips.length > 0 && (
        <ul className="fv-chips" aria-label="Filtros activos">
          {chips.map((c) => (
            <li key={c.k}>
              <span className="fv-chip">
                <span>{c.label}</span>
                <button type="button" aria-label={`Quitar filtro ${c.label}`} onClick={c.quitar}><Icon name="close" /></button>
              </span>
            </li>
          ))}
          <li><button type="button" className="link fv-clear" onClick={limpiarTodo}>Limpiar todo</button></li>
        </ul>
      )}
    </div>
  );
}
