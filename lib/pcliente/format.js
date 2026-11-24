/* Utilidades de formato y fechas (formato chileno dd-mm-aaaa). */

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export const initials = (nombre) => nombre.split(' ').map((p) => p[0]).slice(0, 2).join('');
/** Quita tildes y pasa a minúsculas, para buscar sin importar acentos. */
export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const fmtNum = (n) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(n);

/** '20-11-2026' → Date local. */
export function parseDMY(s) {
  const [d, m, y] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
/** '20-11-2026 14:54' → Date local. */
export function parseDMYHM(s) {
  const [d, t = '00:00'] = s.split(' ');
  const x = parseDMY(d);
  const [h, m] = t.split(':').map(Number);
  x.setHours(h, m);
  return x;
}
export function today() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
export const daysFrom = (d) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today()) / 864e5);
export const longDate = (d) => `${d.getDate()} de ${MESES_LARGO[d.getMonth()]} de ${d.getFullYear()}`;
export const slashDate = (s) => s.replace(/-/g, '/');
export const hourOf = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const shortDate = (d) => `${d.getDate()} ${MESES[d.getMonth()].toLowerCase()}`;

export function relative(d) {
  const n = daysFrom(d);
  if (n === 0) return 'Hoy';
  if (n > 0) return n === 1 ? 'Mañana' : `En ${n} días`;
  return n === -1 ? 'Ayer' : `Hace ${-n} días`;
}
export function minutesBetween(a, b) {
  const [h1, m1] = a.split(':').map(Number);
  const [h2, m2] = b.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}
/** 19.454.295-K → 19.454.***-K (el RUT de terceros se muestra parcialmente). */
export const maskRut = (r) => r.replace(/^(\d{1,2}\.\d{3})\.\d{3}/, '$1.***');
