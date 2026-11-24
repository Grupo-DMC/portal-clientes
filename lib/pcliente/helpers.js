/* Funciones puras sobre los datos del portal (sin estado). */
import { norm } from './format';

/** Clave estable de una sucursal: su código, o su nombre si no tiene. */
export const sucKey = (s) => s.codigo || s.nombre;
/** Segmento de URL de una sucursal: /sucursales/pu-005 o /sucursales/puma-nucleo-puente */
export const branchSlug = (s) => (s.codigo ? s.codigo.toLowerCase() : norm(s.nombre).replace(/[^a-z0-9]+/g, '-'));
export const branchHref = (s) => `/portal/sucursales/${branchSlug(s)}`;
export const visitSlug = (folio) => folio.toLowerCase();
export const visitHref = (folio) => `/portal/visitas/${visitSlug(folio)}`;
/** "Puma Mall Plaza Vespucio" → "Vespucio" */
export const shortName = (n) => n.replace(/^Puma (Mall Plaza )?/, '');

export const zonaSucursales = (sucursales, zonaId) => sucursales.filter((s) => s.zona === zonaId);

/** Personas con acceso a una sucursal según su rol y alcance. */
export function accesoA(usuarios, s) {
  const k = sucKey(s);
  return usuarios
    .filter((u) => u.rol === 'admin' || (u.rol === 'zona' && u.zona === s.zona) || u.locales.includes(k))
    .map((u) => ({ u, via: u.rol === 'admin' ? 'Todo el cliente' : u.rol === 'zona' ? 'zona' : 'Asignado a este local' }));
}
