/* Catálogos del portal: estados, roles, permisos, zonas y tipos de aviso. */

export const ESTADOS_SUCURSAL = {
  operativa: { label: 'Operativa', cls: 'ok' },
  observaciones: { label: 'Con observaciones', cls: 'obs' },
  critica: { label: 'Fuera de servicio', cls: 'crit' },
  inactiva: { label: 'Inactiva', cls: 'off' }
};

export const ESTADOS_VISITA = {
  programada: { label: 'Programada', cls: 'prog' },
  completada: { label: 'Completada', cls: 'ok' },
  pendiente: { label: 'Pendiente', cls: 'obs' },
  cancelada: { label: 'Cancelada', cls: 'off' },
  cancelada_admin: { label: 'Cancelada por admin', cls: 'off' }
};

export const ESTADOS_REPORTE = {
  nuevo: { label: 'Nuevo', cls: 'crit' },
  revision: { label: 'En revisión', cls: 'obs' },
  ticket: { label: 'Ticket creado', cls: 'prog' },
  resuelto: { label: 'Resuelto', cls: 'ok' }
};
export const reportePendiente = (r) => r.estado === 'nuevo' || r.estado === 'revision';
export const PRIORIDADES = { alta: 'Alta', urgente: 'Urgente' };

/** Zonas del cliente: DMC_Core todavía no las tiene, así que no hay ninguna. */
export const ZONAS = [];
export const zonaNombre = (id) => ZONAS.find((z) => z.id === id)?.nombre || 'Sin zona';

export const PERMISOS = [
  { id: 'ver', label: 'Ver dashboard y sucursales' },
  { id: 'visitas', label: 'Ver visitas y descargar informes' },
  { id: 'tickets', label: 'Ver tickets' },
  { id: 'reportes', label: 'Revisar reportes de locales' },
  { id: 'cuentas', label: 'Gestionar cuentas de locales' },
  { id: 'usuarios', label: 'Asignar usuarios y roles' }
];

export const ROLES = {
  admin: { label: 'Administrador cliente', desc: 'Todo el cliente y la administración del portal.', alcance: 'todo', base: ['ver', 'visitas', 'tickets', 'reportes', 'cuentas', 'usuarios'] },
  zona: { label: 'Jefe de zona', desc: 'Todas las sucursales de una zona.', alcance: 'zona', base: ['ver', 'visitas', 'tickets', 'reportes'] },
  locales: { label: 'Jefe de locales', desc: 'Varias sucursales elegidas una a una.', alcance: 'locales', base: ['ver', 'visitas', 'tickets'] },
  encargado: { label: 'Encargado de local', desc: 'Solo su sucursal.', alcance: 'local', base: ['ver', 'visitas'] }
};
export const ALCANCE_LABEL = { todo: 'Todo el cliente', zona: 'Una zona', locales: 'Varias sucursales', local: 'Una sucursal' };

export const TIPOS_AVISO = [
  { id: 'ticket_nuevo', label: 'Ticket nuevo', icon: 'ticket' },
  { id: 'ticket_cerrado', label: 'Ticket cerrado', icon: 'ticketOk' },
  { id: 'visita_programada', label: 'Visita programada', icon: 'calendar' },
  { id: 'visita_realizada', label: 'Visita realizada', icon: 'visitOk' },
  { id: 'reporte_nuevo', label: 'Reporte nuevo de un local', icon: 'flag' },
  { id: 'garantia', label: 'Garantía por vencer', icon: 'shield' },
  { id: 'calibracion', label: 'Calibración por vencer', icon: 'gauge' }
];

/** Secciones del menú lateral. `ready: false` muestra la página de mantenimiento. */
export const NAV = [
  { items: [{ href: '/portal/dashboard', label: 'Dashboard', icon: 'dashboard' }] },
  {
    label: 'Operación',
    items: [
      { href: '/portal/sucursales', label: 'Mis sucursales', icon: 'store' },
      { href: '/portal/visitas', label: 'Visitas', icon: 'visit' },
      { href: '/portal/tickets', label: 'Tickets', icon: 'ticket', count: 'tickets' },
      { href: '/portal/trabajos-planificados', label: 'Trabajos planificados', icon: 'plan' }
    ]
  },
  { label: 'Comercial', items: [{ href: '/portal/cotizaciones', label: 'Cotizaciones y despachos', icon: 'quote' }] },
  {
    label: 'Administración',
    items: [
      { href: '/portal/credenciales', label: 'Credenciales de locales', icon: 'key', count: 'reportes' },
      { href: '/portal/usuarios', label: 'Usuarios y roles', icon: 'users' }
    ]
  }
];
