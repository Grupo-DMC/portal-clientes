'use client';
/**
 * Estado compartido del portal (React Context).
 *
 * Los datos iniciales los carga el servidor (app/portal/(app)/layout.tsx → lib/data/portal, desde
 * DMC_Core) y llegan en `initial`. Los cambios viven en memoria mientras la pestaña esté
 * abierta: la base es de solo lectura por ahora. Cada acción está marcada con la ruta sugerida.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { reportePendiente } from './constants';
import { norm, parseDMYHM } from './format';
import { shortName, sucKey } from './helpers';

const PortalContext = createContext(null);

export function PortalProvider({ initial, children }) {
  const [data, setData] = useState(initial);

  /* Actualiza una parte del estado sin mutar el objeto original. */
  const patch = useCallback((fn) => setData((d) => fn(structuredClone(d))), []);

  const actions = useMemo(() => ({
    /** PATCH /api/sucursales/:codigo */
    updateSucursal(key, changes) {
      patch((d) => {
        const s = d.sucursales.find((x) => sucKey(x) === key);
        if (!s) return d;
        if (changes.nombre && changes.nombre !== s.nombre) {
          d.visitas.forEach((v) => { if (v.sucursal === s.nombre) v.sucursal = changes.nombre; });
        }
        Object.assign(s, changes);
        return d;
      });
    },
    /** POST /api/reportes/:id/prioridad */
    requestPriority(reportId, nivel, motivo) {
      patch((d) => {
        const r = d.reportes.find((x) => x.id === reportId);
        if (r) r.prioridad = { nivel, motivo };
        return d;
      });
    },
    /** POST /api/locales/:codigo/cuenta — devuelve el usuario creado. */
    createCuenta(key, nombreLocal) {
      const usuario = 'puma.' + norm(shortName(nombreLocal)).replace(/[^a-z0-9]+/g, '');
      patch((d) => { d.cuentas[key] = { usuario, estado: 'activa', ultimo: null }; return d; });
      return usuario;
    },
    /** POST /api/locales/:codigo/cuenta/suspender | reactivar */
    toggleCuenta(key) {
      patch((d) => { const c = d.cuentas[key]; if (c) c.estado = c.estado === 'activa' ? 'suspendida' : 'activa'; return d; });
    },
    /** POST /api/usuarios (invitar) o PATCH /api/usuarios/:id */
    saveUsuario(id, values) {
      patch((d) => {
        const u = id ? d.usuarios.find((x) => x.id === id) : null;
        if (u) Object.assign(u, values);
        else d.usuarios.push({ id: Math.max(...d.usuarios.map((x) => x.id)) + 1, estado: 'invitado', ...values });
        if (id === d.usuario.id) Object.assign(d.usuario, { nombre: values.nombre, correo: values.correo });
        return d;
      });
    },
    /** PATCH /api/notificaciones/:id */
    setNotifRead(id, leida = true) {
      patch((d) => { const n = d.notificaciones.find((x) => x.id === id); if (n) n.leida = leida; return d; });
    },
    /** POST /api/notificaciones/leer-todas */
    markAllRead() {
      patch((d) => {
        d.notificaciones.forEach((n) => { if (d.preferencias.tipos[n.tipo].portal) n.leida = true; });
        return d;
      });
    },
    /** PUT /api/notificaciones/preferencias */
    savePrefs(prefs) {
      patch((d) => { d.preferencias = structuredClone(prefs); return d; });
    },
    /** PATCH /api/perfil */
    updateProfile(values) {
      patch((d) => {
        Object.assign(d.usuario, values);
        const me = d.usuarios.find((x) => x.id === d.usuario.id);
        if (me) Object.assign(me, { nombre: d.usuario.nombre, correo: d.usuario.correo });
        return d;
      });
    }
  }), [patch]);

  /* Valores derivados que usan varias pantallas. */
  const derived = useMemo(() => {
    const visibles = data.notificaciones
      .filter((n) => data.preferencias.tipos[n.tipo].portal)
      .sort((a, b) => parseDMYHM(b.fecha) - parseDMYHM(a.fecha));
    return {
      notifVisibles: visibles,
      notifSinLeer: visibles.filter((n) => !n.leida).length,
      reportesPendientes: data.reportes.filter(reportePendiente).length
    };
  }, [data]);

  const value = useMemo(() => ({ ...data, ...derived, actions }), [data, derived, actions]);
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal debe usarse dentro de <PortalProvider>.');
  return ctx;
}
