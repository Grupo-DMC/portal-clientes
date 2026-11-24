'use client';
/* «Mis sucursales»: búsqueda + filtros en una barra compacta, tabla (por defecto) o tarjetas,
   agrupación opcional y detalle expandible. Todo el estado vive en la URL (?q=&marca=&…)
   para que sobreviva al recargar y se pueda compartir. */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, SearchBox } from '@/components/portal/ui';
import { plural } from '@/lib/pcliente/format';
import { usePortal } from '@/lib/pcliente/store';
import {
  AGRUPACIONES, ESTADOS_FILTRO, ORDENES, POR_GRUPO, POR_PAGINA,
  agrupar, escribirFiltros, filtrar, filtrosActivos, leerFiltros, opciones, ordenar
} from '@/lib/pcliente/sucursalesFiltro';
import { TablaSucursales, TarjetasSucursales } from './lista/Piezas';
import './lista/lista.css';

function Select({ id, label, value, onChange, children }) {
  return (
    <div className="sl-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </div>
  );
}

function Lista({ vista, items, abiertas, onToggle }) {
  return vista === 'tarjetas'
    ? <TarjetasSucursales items={items} abiertas={abiertas} onToggle={onToggle} />
    : <TablaSucursales items={items} abiertas={abiertas} onToggle={onToggle} />;
}

function Paginacion({ pagina, paginas, onPagina }) {
  if (paginas <= 1) return null;
  return (
    <nav className="sl-pag" aria-label="Paginación">
      <button className="btn-out" type="button" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}><Icon name="left" />Anterior</button>
      <span className="num">Página {pagina} de {paginas}</span>
      <button className="btn-out" type="button" disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>Siguiente<Icon name="right" /></button>
    </nav>
  );
}

export default function BranchesView() {
  const { sucursales } = usePortal();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const f = useMemo(() => leerFiltros(sp), [sp]);

  const ir = useCallback((cambios, { resetPagina = true } = {}) => {
    const next = { ...f, ...cambios };
    if (resetPagina && !('p' in cambios)) next.p = '1';
    router.replace(`${pathname}${escribirFiltros(next)}`, { scroll: false });
  }, [f, pathname, router]);

  /* Búsqueda con debounce: se escribe local y se lleva a la URL tras 300 ms. */
  const [q, setQ] = useState(f.q);
  const ultimoQ = useRef(f.q);
  useEffect(() => {
    // Si la URL cambia desde fuera (atrás/adelante, limpiar), el campo la sigue.
    if (f.q !== ultimoQ.current) { ultimoQ.current = f.q; setQ(f.q); }
  }, [f.q]);
  useEffect(() => {
    if (q === f.q) return undefined;
    const t = setTimeout(() => { ultimoQ.current = q; ir({ q }); }, 300);
    return () => clearTimeout(t);
  }, [q, f.q, ir]);

  const [panel, setPanel] = useState(false);
  const [abiertas, setAbiertas] = useState(() => new Set());
  const [colapsados, setColapsados] = useState(() => new Set());
  const [extra, setExtra] = useState({});
  const toggle = (set, k) => set((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const onToggleFila = useCallback((k) => toggle(setAbiertas, k), []);

  /* Opciones en cascada: región acota malls; marca acota regiones y malls. */
  const marcas = useMemo(() => opciones(sucursales, 'marca'), [sucursales]);
  const regiones = useMemo(() => opciones(sucursales.filter((s) => !f.marca || s.marca === f.marca), 'region'), [sucursales, f.marca]);
  const malls = useMemo(() => opciones(sucursales.filter((s) => (!f.marca || s.marca === f.marca) && (!f.region || s.region === f.region)), 'mall'), [sucursales, f.marca, f.region]);

  const lista = useMemo(() => ordenar(filtrar(sucursales, f), f.orden), [sucursales, f]);
  const nActivos = filtrosActivos(f);
  const conBusqueda = Boolean(f.q.trim());

  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(Number(f.p) || 1, paginas);
  const grupos = f.agrupar ? agrupar(lista, f.agrupar) : null;
  const visibles = grupos ? null : lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const ok = sucursales.filter((s) => s.estado === 'operativa').length;
  const obs = sucursales.filter((s) => s.estado === 'observaciones').length;
  const conTickets = sucursales.filter((s) => s.tickets > 0).length;

  const chips = [
    f.marca && { k: 'marca', label: `Marca: ${f.marca}`, quitar: { marca: '', region: '', mall: '' } },
    f.region && { k: 'region', label: `Región: ${f.region}`, quitar: { region: '', mall: '' } },
    f.mall && { k: 'mall', label: `Mall: ${f.mall}`, quitar: { mall: '' } },
    f.estado && { k: 'estado', label: ESTADOS_FILTRO.find((e) => e.id === f.estado)?.label, quitar: { estado: '' } },
    conBusqueda && { k: 'q', label: `“${f.q.trim()}”`, quitar: { q: '' } }
  ].filter(Boolean);
  const limpiar = () => { ultimoQ.current = ''; setQ(''); ir({ q: '', marca: '', region: '', mall: '', estado: '' }); };

  return (
    <section className="view" aria-labelledby="msTitle">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="msTitle">Mis sucursales</h1>
          <p className="page-sub">{plural(sucursales.length, 'sucursal', 'sucursales')} en {plural(marcas.length, 'marca', 'marcas')}</p>
        </div>
        <div className="status-sum">
          <div className="sum ok"><b className="num">{ok}</b><span>Operativas</span></div>
          <button type="button" className="sum obs sl-sum" aria-pressed={f.estado === 'observaciones'} onClick={() => ir({ estado: f.estado === 'observaciones' ? '' : 'observaciones' })}><b className="num">{obs}</b><span>Con observaciones</span></button>
          <button type="button" className="sum sl-sum" aria-pressed={f.estado === 'tickets'} onClick={() => ir({ estado: f.estado === 'tickets' ? '' : 'tickets' })}><b className="num">{conTickets}</b><span>Con tickets abiertos</span></button>
        </div>
      </header>

      <div className="sl-bar">
        <div className="sl-bar-row">
          <SearchBox className="sl-search" label="Buscar sucursal por nombre, código, mall o comuna" placeholder="Buscar sucursal, código, mall o comuna" value={q} onChange={setQ} />
          <button className="btn-out sl-fbtn" type="button" aria-expanded={panel} aria-controls="slPanel" onClick={() => setPanel((p) => !p)}>
            <Icon name="settings" />Filtros{nActivos > 0 && <span className="sl-badge num" aria-label={`${nActivos} activos`}>{nActivos}</span>}
          </button>
          <div className="sl-sort">
            <label htmlFor="slOrden" className="sr">Ordenar por</label>
            <Icon name="sort" />
            <select id="slOrden" className="input" value={f.orden} onChange={(e) => ir({ orden: e.target.value })}>
              {ORDENES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="seg sl-seg" role="group" aria-label="Vista">
            <button type="button" aria-pressed={f.vista === 'tabla'} onClick={() => ir({ vista: 'tabla' }, { resetPagina: false })}>Tabla</button>
            <button type="button" aria-pressed={f.vista === 'tarjetas'} onClick={() => ir({ vista: 'tarjetas' }, { resetPagina: false })}>Tarjetas</button>
          </div>
        </div>

        {panel && (
          <div className="sl-panel" id="slPanel">
            <Select id="slMarca" label="Marca" value={f.marca} onChange={(v) => ir({ marca: v, region: '', mall: '' })}>
              <option value="">Todas las marcas</option>
              {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select id="slRegion" label="Región" value={f.region} onChange={(v) => ir({ region: v, mall: '' })}>
              <option value="">Todas las regiones</option>
              {regiones.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select id="slMall" label="Mall" value={f.mall} onChange={(v) => ir({ mall: v })}>
              <option value="">{malls.length ? 'Todos los malls' : 'Sin malls en esta selección'}</option>
              {malls.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select id="slEstado" label="Estado" value={f.estado} onChange={(v) => ir({ estado: v })}>
              {ESTADOS_FILTRO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </Select>
            <Select id="slAgrupar" label="Agrupar" value={f.agrupar} onChange={(v) => ir({ agrupar: v })}>
              {AGRUPACIONES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </Select>
            <div className="sl-panel-foot">
              <button className="link" type="button" onClick={limpiar} disabled={!nActivos && !conBusqueda}>Limpiar todo</button>
              <button className="btn-pri" type="button" onClick={() => setPanel(false)}>Listo</button>
            </div>
          </div>
        )}
      </div>

      <div className="sl-res" aria-live="polite">
        <p className="sl-count"><b className="num">{plural(lista.length, 'sucursal', 'sucursales')}</b>
          {lista.length !== sucursales.length && <span className="muted"> de {sucursales.length}</span>}
        </p>
        {chips.length > 0 && (
          <ul className="sl-chips" aria-label="Filtros activos">
            {chips.map((c) => (
              <li key={c.k}><button type="button" className="sl-chip" onClick={() => { if (c.k === 'q') { ultimoQ.current = ''; setQ(''); } ir(c.quitar); }} aria-label={`Quitar filtro ${c.label}`}>
                {c.label}<Icon name="close" /></button></li>
            ))}
            {chips.length > 1 && <li><button className="link" type="button" onClick={limpiar}>Limpiar todo</button></li>}
          </ul>
        )}
      </div>

      {!lista.length ? (
        <div className="empty-state">
          <h2>{sucursales.length ? 'No hay sucursales con esos filtros' : 'Todavía no hay sucursales registradas'}</h2>
          <p className="muted">{sucursales.length ? 'Prueba con otra búsqueda o quita algunos filtros.' : 'Cuando DMC registre sucursales de tu empresa aparecerán aquí.'}</p>
          {sucursales.length > 0 && <button className="btn-pri" type="button" onClick={limpiar}>Quitar filtros</button>}
        </div>
      ) : grupos ? (
        grupos.map((g) => {
          const cerrado = colapsados.has(g.nombre);
          const tope = extra[g.nombre] ?? POR_GRUPO;
          const idG = `slg-${g.nombre.replace(/\W+/g, '-')}`;
          return (
            <section className="sl-group" key={g.nombre} aria-label={g.nombre}>
              <h2 className="sl-group-h">
                <button type="button" aria-expanded={!cerrado} aria-controls={idG} onClick={() => toggle(setColapsados, g.nombre)}>
                  <Icon name="chevron" /><span>{g.nombre}</span><span className="muted num">{plural(g.items.length, 'sucursal', 'sucursales')}</span>
                </button>
              </h2>
              {!cerrado && (
                <div id={idG}>
                  <Lista vista={f.vista} items={g.items.slice(0, tope)} abiertas={abiertas} onToggle={onToggleFila} />
                  {g.items.length > tope && (
                    <button className="link sl-more" type="button" onClick={() => setExtra((e) => ({ ...e, [g.nombre]: tope + POR_GRUPO }))}>
                      Mostrar {Math.min(POR_GRUPO, g.items.length - tope)} más de {g.nombre}
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })
      ) : (
        <>
          <Lista vista={f.vista} items={visibles} abiertas={abiertas} onToggle={onToggleFila} />
          <Paginacion pagina={pagina} paginas={paginas} onPagina={(p) => { ir({ p: String(p) }); window.scrollTo({ top: 0 }); }} />
        </>
      )}
    </section>
  );
}

