/* Filtros, orden y agrupación de «Mis sucursales». Funciones puras: el estado vive en la URL. */
import { daysFrom, norm, parseDMY } from './format';

/** Días hacia atrás que cuentan como «visita reciente». */
export const DIAS_VISITA_RECIENTE = 30;

/** Por página cuando la lista no está agrupada. */
export const POR_PAGINA = 25;
/** Cuántas muestra cada grupo antes de «Mostrar más». */
export const POR_GRUPO = 10;

export const ESTADOS_FILTRO = [
  { id: '', label: 'Todos los estados' },
  { id: 'tickets', label: 'Con tickets abiertos' },
  { id: 'sin-tickets', label: 'Sin tickets abiertos' },
  { id: 'reciente', label: `Con visita en los últimos ${DIAS_VISITA_RECIENTE} días` },
  { id: 'sin-reciente', label: `Sin visita en los últimos ${DIAS_VISITA_RECIENTE} días` },
  { id: 'observaciones', label: 'Con observaciones' },
  { id: 'inactiva', label: 'Inactivas' }
];

export const ORDENES = [
  { id: 'nombre', label: 'Nombre (A-Z)' },
  { id: 'tickets', label: 'Más tickets abiertos' },
  { id: 'visita', label: 'Última visita (reciente primero)' }
];

export const AGRUPACIONES = [
  { id: '', label: 'Sin agrupar' },
  { id: 'marca', label: 'Por marca' },
  { id: 'region', label: 'Por región' }
];

/** Valores por defecto: no se escriben en la URL. */
export const DEFECTO = { q: '', marca: '', region: '', mall: '', estado: '', orden: 'nombre', vista: 'tabla', agrupar: '', p: '1' };

const valido = (lista, v) => lista.some((x) => x.id === v);

/** URLSearchParams → filtros saneados (lo que no calza vuelve al valor por defecto). */
export function leerFiltros(sp) {
  const g = (k) => sp.get(k) ?? DEFECTO[k];
  const f = { ...DEFECTO };
  f.q = g('q').slice(0, 80);
  f.marca = g('marca');
  f.region = g('region');
  f.mall = g('mall');
  f.estado = valido(ESTADOS_FILTRO, g('estado')) ? g('estado') : '';
  f.orden = valido(ORDENES, g('orden')) ? g('orden') : 'nombre';
  f.vista = g('vista') === 'tarjetas' ? 'tarjetas' : 'tabla';
  f.agrupar = valido(AGRUPACIONES, g('agrupar')) ? g('agrupar') : '';
  f.p = /^\d{1,4}$/.test(g('p')) ? g('p') : '1';
  return f;
}

/** Filtros → query string, sin los valores por defecto. */
export function escribirFiltros(f) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v && v !== DEFECTO[k]) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Días desde la última visita (null si nunca). */
export function diasDesdeVisita(s) {
  if (!s.ultimaVisita) return null;
  return -daysFrom(parseDMY(s.ultimaVisita));
}
export const visitaReciente = (s) => {
  const d = diasDesdeVisita(s);
  return d !== null && d <= DIAS_VISITA_RECIENTE;
};

const cumpleEstado = (s, estado) => {
  switch (estado) {
    case 'tickets': return s.tickets > 0;
    case 'sin-tickets': return !s.tickets;
    case 'reciente': return visitaReciente(s);
    case 'sin-reciente': return !visitaReciente(s);
    case 'observaciones': return s.estado === 'observaciones';
    case 'inactiva': return s.estado === 'inactiva';
    default: return true;
  }
};

/** Aplica búsqueda y filtros (sin el de estado si `sinEstado`, para contar opciones). */
export function filtrar(sucursales, f) {
  const nq = norm(f.q.trim());
  return sucursales.filter((s) => (!f.marca || s.marca === f.marca)
    && (!f.region || s.region === f.region)
    && (!f.mall || (s.mall || '') === f.mall)
    && cumpleEstado(s, f.estado)
    && (!nq || [s.nombre, s.codigo, s.mall, s.direccion, s.comuna, s.region, s.marca].some((v) => v && norm(v).includes(nq))));
}

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true });

export function ordenar(lista, orden) {
  const l = [...lista];
  if (orden === 'tickets') return l.sort((a, b) => (b.tickets || 0) - (a.tickets || 0) || porNombre(a, b));
  if (orden === 'visita') {
    // Sin visita al final.
    const t = (s) => (s.ultimaVisita ? parseDMY(s.ultimaVisita).getTime() : -Infinity);
    return l.sort((a, b) => t(b) - t(a) || porNombre(a, b));
  }
  return l.sort(porNombre);
}

/** Agrupa una lista ya ordenada por marca o región, grupos en orden alfabético. */
export function agrupar(lista, campo) {
  const m = new Map();
  for (const s of lista) {
    const k = s[campo] || (campo === 'region' ? 'Sin región' : 'Sin marca');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(s);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([nombre, items]) => ({ nombre, items }));
}

/** Valores distintos de un campo, ordenados. */
export const opciones = (lista, campo) => [...new Set(lista.map((s) => s[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

/** Cuántos filtros (no búsqueda, orden ni vista) están activos. */
export const filtrosActivos = (f) => ['marca', 'region', 'mall', 'estado'].filter((k) => f[k]).length;
