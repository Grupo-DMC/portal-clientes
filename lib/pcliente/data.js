/**
 * Datos iniciales del portal.
 *
 * Los del cliente, sucursales, visitas y avisos del sistema vienen de las capturas del sistema actual.
 * Cuentas de locales, reportes, usuarios y zonas son DE EJEMPLO.
 * En producción, reemplaza `loadPortalData` por llamadas a tu API (ver lib/store.js).
 * `null` = dato que no aparecía en las capturas.
 */
import { ZONAS } from './constants';

export const SEED = {
  usuario: { id: 1, nombre: 'Sofía Ayala', rol: 'Administrador cliente', correo: 'sofia.ayala@ejemplo.cl', cargo: '', telefono: '', foto: null },
  cliente: { nombre: 'Puma', razonSocial: 'Puma Chile S.A.', rut: '76.384.120-0', logo: null },
  sucursalesTotal: 23,
  marcas: [{ nombre: 'Puma', total: 16 }, { nombre: 'Puma Outlet', total: 7 }],
  tickets: { abiertos: 8, altaPrioridad: 0 },
  garantias: { porVencer: 0, planVigenteHasta: '01-03-2027' },
  visitasResumen: { anio: 2026, mes: 16, semana: 4, porMes: [5, 6, 7, 9, 7, 9, 10, 10, 12, 5], mesEnCurso: 9 },

  sucursales: [
    { codigo: 'PU-003', nombre: 'Puma Mall Plaza Antofagasta', marca: 'Puma', mall: 'Mall Plaza Antofagasta', local: 121, comuna: 'Antofagasta', region: 'Antofagasta', accesos: 2, equipos: 7, garantia: 'vigente', tickets: 0, estado: 'observaciones' },
    { codigo: 'PU-021', nombre: 'Puma Mall Plaza Calama', marca: 'Puma', mall: 'Mall Plaza Calama', local: 247, comuna: 'Calama', region: 'Antofagasta', accesos: 1, equipos: 5, garantia: 'vigente', tickets: 0, estado: 'operativa' },
    { codigo: 'PU-022', nombre: 'Puma Mall Plaza Copiapó', marca: 'Puma', mall: 'Mall Plaza Copiapó', local: 254, comuna: 'Copiapó', region: 'Atacama', accesos: 2, equipos: 7, garantia: 'vigente', tickets: 0, estado: 'operativa' },
    { codigo: 'PU-006', nombre: 'Puma Mall Plaza La Serena', marca: 'Puma', mall: 'Mall Plaza La Serena', local: 142, comuna: 'La Serena', region: 'Coquimbo', accesos: 1, equipos: 5, garantia: 'vigente', tickets: 0, estado: 'operativa' },
    { codigo: 'PU-004', nombre: 'Puma Mall Plaza Norte', marca: 'Puma', mall: 'Mall Plaza Norte', local: 128, comuna: 'Huechuraba', region: 'Metropolitana', accesos: 1, equipos: 5, garantia: 'vigente', tickets: 1, estado: 'observaciones' },
    { codigo: 'PU-001', nombre: 'Puma Costanera Center', marca: 'Puma', mall: 'Costanera Center', local: 107, comuna: 'Providencia', region: 'Metropolitana', accesos: 2, equipos: 8, garantia: 'vigente', tickets: 1, estado: 'observaciones' },
    { codigo: 'PU-024', nombre: 'Puma Mall Plaza Los Dominicos', marca: 'Puma', mall: 'Mall Plaza Los Dominicos', local: 268, comuna: 'Las Condes', region: 'Metropolitana', accesos: 1, equipos: 5, garantia: 'vigente', tickets: 1, estado: 'observaciones' },
    { codigo: 'PU-025', nombre: 'Puma Mall Plaza Egaña', marca: 'Puma', mall: 'Mall Plaza Egaña', local: 275, comuna: 'La Reina', region: 'Metropolitana', accesos: 2, equipos: 7, garantia: 'vigente', tickets: 1, estado: 'observaciones' },
    { codigo: 'PU-002', nombre: 'Puma Mall Plaza Alameda', marca: 'Puma', mall: 'Mall Plaza Alameda', local: 114, comuna: 'Estación Central', region: 'Metropolitana', accesos: null, equipos: null, garantia: null, tickets: 0, estado: 'operativa' },
    { codigo: 'PU-027', nombre: 'Puma Mall Plaza Oeste', marca: 'Puma', mall: 'Mall Plaza Oeste', local: 289, comuna: 'Cerrillos', region: 'Metropolitana', accesos: null, equipos: null, garantia: null, tickets: 0, estado: 'observaciones' },
    { codigo: 'PU-005', nombre: 'Puma Mall Plaza Vespucio', marca: 'Puma', mall: 'Mall Plaza Vespucio', local: 135, comuna: 'La Florida', region: 'Metropolitana', accesos: null, equipos: null, garantia: null, tickets: 1, estado: 'observaciones' },
    { codigo: 'PU-007', nombre: 'Puma Mall Plaza Tobalaba', marca: 'Puma', mall: 'Mall Plaza Tobalaba', local: 149, comuna: 'Puente Alto', region: 'Metropolitana', accesos: null, equipos: null, garantia: null, tickets: 1, estado: 'observaciones' },
    { codigo: null, nombre: 'Puma Vivo Outlet Los Toros', marca: 'Puma Outlet', mall: null, local: null, comuna: 'Puente Alto', region: 'Metropolitana', accesos: null, equipos: null, garantia: null, tickets: 1, estado: 'observaciones' },
    { codigo: null, nombre: 'Puma Nucleo Puente', marca: 'Puma Outlet', mall: null, local: null, comuna: 'Puente Alto', region: 'Metropolitana', accesos: null, equipos: null, garantia: null, tickets: 1, estado: 'observaciones' }
  ],

  visitasTotal: 96,
  visitas: [
    { folio: 'V-2026-01071', fecha: '23-11-2026', sucursal: 'Puma Mall Plaza Vespucio', tecnico: 'Alexis Abarzua', motivo: 'Visita de calibración', estado: 'programada' },
    { folio: 'V-2026-01069', fecha: '20-11-2026', sucursal: 'Puma Mall Plaza Los Dominicos', tecnico: 'Alexis Abarzua', motivo: 'Visita de calibración', estado: 'cancelada' },
    { folio: 'V-2026-01065', fecha: '20-11-2026', sucursal: 'Puma Mall Plaza Vespucio', tecnico: 'Manuel Zambrano', motivo: 'Visita de calibración', estado: 'cancelada' },
    {
      folio: 'V-2026-01064', fecha: '20-11-2026', sucursal: 'Puma Mall Plaza Tobalaba', tecnico: 'Manuel Zambrano', motivo: 'Visita de calibración', estado: 'completada',
      detalle: {
        inicio: '14:43', fin: '14:54',
        solicitadoPor: 'rcarvajal@grupodmc.cl',
        // La nota original incluía el nombre y la contraseña del Wi-Fi de la tienda: no se muestran.
        solicitud: 'Dejar todas las antenas conectadas por Wi-Fi a la red de la tienda y enviar foto de las MAC.',
        credencialesOcultas: true,
        trabajos: [
          { tipo: 'Visita de calibración', titulo: 'Conectividad de antenas', items: [{ n: 'Módulo Wi-Fi', c: 7 }] },
          { tipo: 'Visita de calibración', titulo: 'Modelo de antenas instaladas', items: [{ n: 'SD-201&202', c: 7 }, { n: 'MDG Tx 1.6', c: 7 }] }
        ],
        problemas: [],
        fotos: Array.from({ length: 18 }, (_, i) => ({ tema: i < 2 ? 'tienda' : 'modulo', hora: '14:54' })),
        videos: [{ dur: '0:25', res: '360×480', tema: 'acceso' }, { dur: '0:09', res: '360×480', tema: 'tienda' }],
        firma: { nombre: 'Diego Loubies', cargo: 'Responsable de tienda', rut: '19.454.295-K' }
      }
    },
    { folio: 'V-2026-01062', fecha: '20-11-2026', sucursal: 'Puma Vivo Outlet Parque', tecnico: 'Manuel Zambrano', motivo: 'Visita de calibración', estado: 'completada' },
    { folio: 'V-2026-01061', fecha: '20-11-2026', sucursal: 'Puma Mall Plaza Vespucio', tecnico: 'Alexis Abarzua', motivo: 'Visita de calibración', estado: 'cancelada_admin' },
    { folio: 'V-2026-01060', fecha: '20-11-2026', sucursal: 'Puma Costanera Center', tecnico: 'Alexis Abarzua', motivo: 'Visita de calibración', estado: 'completada' },
    { folio: 'V-2026-01059', fecha: '20-11-2026', sucursal: 'Puma Mall Plaza Norte', tecnico: 'Alexis Abarzua', motivo: 'Visita de calibración', estado: 'cancelada' },
    { folio: 'V-2026-01068', fecha: '19-11-2026', sucursal: 'Puma Mall Plaza Egaña', tecnico: 'Alexis Abarzua', motivo: 'Visita de calibración', estado: 'completada' }
  ],

  /* Ejemplo: cuentas con que cada local entra al portal (clave = código del local). */
  cuentas: {
    'PU-001': { usuario: 'puma.costanera', estado: 'activa', ultimo: '22-11-2026 18:40' },
    'PU-004': { usuario: 'puma.plazanorte', estado: 'activa', ultimo: '23-11-2026 10:15' },
    'PU-024': { usuario: 'puma.losdominicos', estado: 'activa', ultimo: '21-11-2026 12:02' },
    'PU-025': { usuario: 'puma.egana', estado: 'activa', ultimo: '19-11-2026 16:48' },
    'PU-005': { usuario: 'puma.vespucio', estado: 'activa', ultimo: '23-11-2026 09:31' },
    'PU-007': { usuario: 'puma.tobalaba', estado: 'suspendida', ultimo: '02-11-2026 11:20' }
  },

  /* Ejemplo: reportes enviados por las cuentas de los locales. */
  reportes: [
    { id: 'R-0148', local: 'PU-005', fecha: '23-11-2026 09:40', tipo: 'Falsa alarma', detalle: 'La antena del acceso principal suena sin que pase ningún cliente.', estado: 'nuevo', prioridad: null },
    { id: 'R-0147', local: 'PU-004', fecha: '23-11-2026 10:20', tipo: 'Antena no detecta', detalle: 'Una prenda con etiqueta pasó sin que sonara la antena izquierda.', estado: 'nuevo', prioridad: null },
    { id: 'R-0145', local: 'PU-001', fecha: '22-11-2026 18:45', tipo: 'Desactivador no funciona', detalle: 'El desactivador de la caja 2 no quita la alarma de las etiquetas.', estado: 'revision', prioridad: null },
    { id: 'R-0141', local: 'PU-024', fecha: '21-11-2026 12:10', tipo: 'Cable suelto', detalle: 'Hay un cable expuesto en la base de la antena derecha.', estado: 'revision', prioridad: null },
    { id: 'R-0139', local: 'PU-005', fecha: '20-11-2026 15:05', tipo: 'Falsa alarma', detalle: 'Suena cada vez que se abre la puerta lateral.', estado: 'revision', prioridad: null },
    { id: 'R-0132', local: 'PU-004', fecha: '18-11-2026 11:30', tipo: 'Antena dañada', detalle: 'La antena fue golpeada por un carro de reposición.', estado: 'ticket', prioridad: null },
    { id: 'R-0128', local: 'PU-025', fecha: '17-11-2026 16:50', tipo: 'Antena no detecta', detalle: 'No suena con etiquetas duras en la antena central.', estado: 'ticket', prioridad: null },
    { id: 'R-0121', local: 'PU-001', fecha: '12-11-2026 10:05', tipo: 'Falsa alarma', detalle: 'Sonó varias veces durante la mañana.', estado: 'resuelto', prioridad: null },
    { id: 'R-0117', local: 'PU-007', fecha: '30-10-2026 19:12', tipo: 'Desactivador no funciona', detalle: 'El desactivador no enciende.', estado: 'resuelto', prioridad: null }
  ],

  /* Ejemplo: usuarios del cliente. El id 1 es la persona que inició sesión. */
  usuarios: [
    { id: 1, nombre: 'Sofía Ayala', correo: 'sofia.ayala@ejemplo.cl', rol: 'admin', zona: null, locales: [], extras: [], estado: 'activo' },
    { id: 2, nombre: 'Carla Muñoz', correo: 'carla.munoz@ejemplo.cl', rol: 'zona', zona: 'norte', locales: [], extras: [], estado: 'activo' },
    { id: 3, nombre: 'Rodrigo Pérez', correo: 'rodrigo.perez@ejemplo.cl', rol: 'zona', zona: 'oriente', locales: [], extras: ['cuentas'], estado: 'activo' },
    { id: 4, nombre: 'Valentina Rojas', correo: 'valentina.rojas@ejemplo.cl', rol: 'locales', zona: null, locales: ['PU-005', 'PU-007'], extras: ['reportes'], estado: 'activo' },
    { id: 5, nombre: 'Matías Soto', correo: 'matias.soto@ejemplo.cl', rol: 'encargado', zona: null, locales: ['PU-004'], extras: [], estado: 'invitado' }
  ],

  /* Los cuatro últimos vienen de la captura del sistema actual; los demás salen de los datos de ejemplo. */
  notificaciones: [
    { id: 'n8', tipo: 'reporte_nuevo', titulo: 'Reporte nuevo R-0147', texto: 'Puma Mall Plaza Norte: antena no detecta.', fecha: '23-11-2026 10:20', leida: false, href: '/portal/sucursales/pu-004' },
    { id: 'n7', tipo: 'reporte_nuevo', titulo: 'Reporte nuevo R-0148', texto: 'Puma Mall Plaza Vespucio: falsa alarma en el acceso principal.', fecha: '23-11-2026 09:40', leida: false, href: '/portal/sucursales/pu-005' },
    { id: 'n6', tipo: 'visita_programada', titulo: 'Visita programada V-2026-01071', texto: 'Visita de calibración en Puma Mall Plaza Vespucio para el 23-11-2026.', fecha: '21-11-2026 12:00', leida: false, href: '/portal/visitas/v-2026-01071' },
    { id: 'n5', tipo: 'visita_realizada', titulo: 'Visita realizada V-2026-01064', texto: 'Visita de calibración en Puma Mall Plaza Tobalaba. Sin problemas registrados.', fecha: '20-11-2026 14:54', leida: true, href: '/portal/visitas/v-2026-01064' },
    { id: 'n4', tipo: 'ticket_nuevo', titulo: 'Ticket nuevo TK-4905', texto: 'Puma Nucleo Puente: dejar la tienda en remoto el 20-11-2026. Prioridad baja.', fecha: '19-11-2026 08:30', leida: true, href: '/portal/tickets' },
    { id: 'n3', tipo: 'ticket_nuevo', titulo: 'Ticket nuevo TK-4901', texto: 'Puma Mall Plaza Norte: dejar la tienda en remoto el 19-11-2026. Prioridad baja.', fecha: '19-11-2026 08:30', leida: true, href: '/portal/tickets' },
    { id: 'n2', tipo: 'visita_realizada', titulo: 'Visita realizada V-20961', texto: 'Mantención preventiva en Puma Costanera Center.', fecha: '02-10-2026 17:10', leida: true, href: '/portal/sucursales/pu-001' },
    { id: 'n1', tipo: 'calibracion', titulo: 'Calibración remota por vencer', texto: 'La calibración anual de tus 23 sucursales vence el 28-10-2026.', fecha: '28-09-2026 09:00', leida: true, href: null }
  ],

  preferencias: {
    tipos: {
      ticket_nuevo: { portal: true, correo: true },
      ticket_cerrado: { portal: true, correo: true },
      visita_programada: { portal: true, correo: false },
      visita_realizada: { portal: true, correo: true },
      reporte_nuevo: { portal: true, correo: true },
      garantia: { portal: true, correo: true },
      calibracion: { portal: true, correo: true }
    },
    frecuencia: 'inmediato',
    silencio: true
  }
};

/** Copia los datos iniciales y asigna la zona de cada local según su comuna o región. */
export function loadPortalData() {
  const data = structuredClone(SEED);
  data.sucursales.forEach((s) => {
    s.zona = ZONAS.find((z) => z.incluye(s))?.id ?? null;
  });
  return data;
}
