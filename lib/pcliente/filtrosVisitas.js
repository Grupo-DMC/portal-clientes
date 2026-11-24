/* Filtros de la pantalla Visitas: lectura/escritura en la URL, atajos de fecha y filtrado en el navegador.
 *
 * Viajan todos en la URL para que sobrevivan al recargar o compartir el enlace:
 *   servidor (acotan la consulta a DMC_Core): ?sucursal=<id>&desde=AAAA-MM-DD&hasta=AAAA-MM-DD
 *   navegador (sobre las filas ya recibidas): ?q=&region=&estado=&motivo=&marca=&problemas=1
 */
import { MESES, norm } from './format';

/** Claves que obligan a volver a pedir datos al servidor. */
export const CLAVES_SERVIDOR = ['sucursal', 'desde', 'hasta'];
const CLAVES = ['q', 'sucursal', 'desde', 'hasta', 'region', 'estado', 'motivo', 'marca', 'problemas'];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^\d{1,18}$/;

export const VACIOS = Object.freeze({ q: '', sucursal: '', desde: '', hasta: '', region: '', estado: '', motivo: '', marca: '', problemas: '' });

/** searchParams (objeto de Next o URLSearchParams) → filtros saneados. Lo que no calza se descarta. */
export function leerFiltros(sp) {
  const get = (k) => {
    const v = typeof sp?.get === 'function' ? sp.get(k) : sp?.[k];
    return String((Array.isArray(v) ? v[0] : v) ?? '').trim().slice(0, 120);
  };
  const f = { ...VACIOS };
  for (const k of CLAVES) f[k] = get(k);
  if (!ID.test(f.sucursal)) f.sucursal = '';
  if (!ISO.test(f.desde)) f.desde = '';
  if (!ISO.test(f.hasta)) f.hasta = '';
  if (f.desde && f.hasta && f.desde > f.hasta) [f.desde, f.hasta] = [f.hasta, f.desde];
  f.problemas = f.problemas === '1' ? '1' : '';
  return f;
}

/** Filtros → query string (sin claves vacías), en un orden estable. */
export function aQuery(f) {
  const qs = new URLSearchParams();
  for (const k of CLAVES) if (f[k]) qs.set(k, f[k]);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const cambiaServidor = (a, b) => CLAVES_SERVIDOR.some((k) => (a[k] || '') !== (b[k] || ''));

/** Cuántos filtros del panel están activos (el rango de fechas cuenta como uno; la búsqueda no cuenta). */
export const contarActivos = (f) =>
  [f.desde || f.hasta, f.region, f.sucursal, f.estado, f.motivo, f.marca, f.problemas].filter(Boolean).length;

/* ---------- Fechas ---------- */

export const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function deISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const hoy = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const menos = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - n);

/** Atajos del selector de período. `rango()` devuelve [desde, hasta] en ISO. */
export const ATAJOS = [
  { id: 'hoy', label: 'Hoy', rango: () => { const h = aISO(hoy()); return [h, h]; } },
  { id: '7d', label: 'Últimos 7 días', rango: () => [aISO(menos(hoy(), 6)), aISO(hoy())] },
  { id: '30d', label: 'Últimos 30 días', rango: () => [aISO(menos(hoy(), 29)), aISO(hoy())] },
  { id: 'mes', label: 'Este mes', rango: () => { const h = hoy(); return [aISO(new Date(h.getFullYear(), h.getMonth(), 1)), aISO(h)]; } }
];
export const atajoActivo = (desde, hasta) => ATAJOS.find((a) => { const [d, h] = a.rango(); return d === desde && h === hasta; })?.id ?? null;

const corta = (d, conAnio) => `${d.getDate()} ${MESES[d.getMonth()].toLowerCase()}${conAnio ? ` ${d.getFullYear()}` : ''}`;

/** «3 nov – 24 nov 2026», «Desde 3 nov 2026», «Hasta …», o null. */
export function etiquetaRango(desde, hasta) {
  if (!desde && !hasta) return null;
  const at = desde && hasta ? ATAJOS.find((a) => a.id === atajoActivo(desde, hasta)) : null;
  if (at) return at.label;
  if (desde && hasta) {
    const a = deISO(desde), b = deISO(hasta);
    if (desde === hasta) return corta(a, true);
    return `${corta(a, a.getFullYear() !== b.getFullYear())} – ${corta(b, true)}`;
  }
  return desde ? `Desde ${corta(deISO(desde), true)}` : `Hasta ${corta(deISO(hasta), true)}`;
}

/* ---------- Filtrado en el navegador ---------- */

/**
 * Aplica los filtros que no van al servidor. `sucursalPorId` (Map id → sucursal) aporta
 * la región y el mall, que la fila de visita no trae.
 */
export function filtrarVisitas(visitas, f, sucursalPorId) {
  const q = norm(f.q.trim());
  return visitas.filter((v) => {
    if (f.estado && v.estado !== f.estado) return false;
    if (f.motivo && v.motivo !== f.motivo) return false;
    if (f.marca && v.marca !== f.marca) return false;
    if (f.problemas && !(v.problemas > 0)) return false;
    const s = sucursalPorId.get(v.sucursalId);
    if (f.region && s?.region !== f.region) return false;
    if (q && ![v.folio, v.sucursal, v.tecnico, v.motivo, s?.mall, s?.comuna].some((x) => x && norm(x).includes(q))) return false;
    return true;
  });
}

/** Valores únicos no vacíos, ordenados en español. */
export const unicos = (xs) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
