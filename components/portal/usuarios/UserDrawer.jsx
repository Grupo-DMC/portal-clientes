'use client';
import { useEffect, useState } from 'react';
import { Drawer, FieldError } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { PERMISOS, ROLES, ZONAS } from '@/lib/pcliente/constants';
import { plural } from '@/lib/pcliente/format';
import { shortName, sucKey, zonaSucursales } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';
import { emailValid } from '@/lib/pcliente/validation';

const EMPTY = { nombre: '', correo: '', rol: 'locales', zona: 'norte', locales: [], extras: [] };

/** Invitar o editar un usuario: rol, alcance (zona o sucursales) y permisos extra. */
export default function UserDrawer({ user, open, onClose }) {
  const { usuarios, sucursales, actions } = usePortal();
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState({});

  useEffect(() => {
    if (open) {
      setF(user ? { ...EMPTY, ...user, zona: user.zona || 'norte', locales: [...user.locales], extras: [...user.extras] } : EMPTY);
      setErr({});
    }
  }, [open, user]);

  if (!open) return null;
  const r = ROLES[f.rol];
  const set = (patch, clear = []) => { setF((x) => ({ ...x, ...patch })); setErr((e) => ({ ...e, ...Object.fromEntries(clear.map((k) => [k, ''])) })); };
  const toggleLocal = (k) => {
    const locales = r.alcance === 'local' ? [k] : f.locales.includes(k) ? f.locales.filter((x) => x !== k) : [...f.locales, k];
    set({ locales }, ['locales']);
  };
  const toggleExtra = (id) => set({ extras: f.extras.includes(id) ? f.extras.filter((x) => x !== id) : [...f.extras, id] });

  const save = () => {
    const nombre = f.nombre.trim(), correo = f.correo.trim().toLowerCase();
    const scopeLocales = r.alcance === 'locales' || r.alcance === 'local';
    const dup = usuarios.some((u) => u.correo === correo && u.id !== user?.id);
    const quedaAdmin = f.rol === 'admin' || usuarios.some((u) => u.rol === 'admin' && u.id !== user?.id);
    const e = {
      nombre: nombre.length < 3 ? 'Escribe el nombre y apellido.' : '',
      correo: !emailValid(correo) ? 'Escribe un correo válido, por ejemplo nombre@empresa.cl.' : dup ? 'Ya hay un usuario con ese correo.' : '',
      locales: scopeLocales && !f.locales.length ? 'Elige al menos una sucursal.' : '',
      rol: !quedaAdmin ? 'Debe quedar al menos un administrador del cliente.' : ''
    };
    setErr(e);
    if (Object.values(e).some(Boolean)) return;
    actions.saveUsuario(user?.id ?? null, {
      nombre, correo, rol: f.rol,
      zona: r.alcance === 'zona' ? f.zona : null,
      locales: scopeLocales ? (r.alcance === 'local' ? f.locales.slice(0, 1) : f.locales) : [],
      extras: f.extras.filter((x) => !r.base.includes(x))
    });
    onClose();
    toast(user ? `Cambios guardados para ${nombre}.` : `Invitación enviada a ${correo}.`);
  };

  return (
    <Drawer open={open} labelId="udTitle" title={user ? `Editar a ${user.nombre}` : 'Invitar usuario'} onClose={onClose} onSubmit={save}
      footer={<><button className="btn-out" type="button" onClick={onClose}>Cancelar</button><button className="btn-pri" type="submit">{user ? 'Guardar cambios' : 'Enviar invitación'}</button></>}>
      <div className="form-row">
        <label htmlFor="udNombre">Nombre y apellido</label>
        <input className="input" id="udNombre" autoComplete="name" value={f.nombre} onChange={(e) => set({ nombre: e.target.value }, ['nombre'])} aria-invalid={!!err.nombre} />
        <FieldError>{err.nombre}</FieldError>
      </div>
      <div className="form-row">
        <label htmlFor="udCorreo">Correo</label>
        <input className="input" id="udCorreo" type="email" autoComplete="email" placeholder="nombre@empresa.cl" value={f.correo} onChange={(e) => set({ correo: e.target.value }, ['correo'])} aria-invalid={!!err.correo} />
        <FieldError>{err.correo}</FieldError>
      </div>

      <fieldset className="form-row">
        <legend>Rol</legend>
        <div className="role-opts">
          {Object.entries(ROLES).map(([k, ro]) => (
            <label className="role-opt" key={k}>
              <input type="radio" name="udRol" value={k} checked={f.rol === k} onChange={() => set({ rol: k, locales: ROLES[k].alcance === 'local' ? f.locales.slice(0, 1) : f.locales }, ['rol', 'locales'])} />
              <span><b>{ro.label}</b><span className="muted d-block">{ro.desc}</span></span>
            </label>
          ))}
        </div>
        <FieldError>{err.rol}</FieldError>
      </fieldset>

      {r.alcance === 'todo' && (
        <div className="form-row"><span className="flabel">Alcance</span><p className="scope-all">Ve y administra todas las sucursales del cliente.</p></div>
      )}
      {r.alcance === 'zona' && (
        <div className="form-row">
          <label htmlFor="udZona">Zona a cargo</label>
          <select className="input" id="udZona" value={f.zona} onChange={(e) => set({ zona: e.target.value })}>
            {ZONAS.map((z) => <option key={z.id} value={z.id}>{z.nombre} ({plural(zonaSucursales(sucursales, z.id).length, 'sucursal', 'sucursales')})</option>)}
          </select>
          <p className="muted">{zonaSucursales(sucursales, f.zona).map((s) => shortName(s.nombre)).join(', ')}</p>
        </div>
      )}
      {(r.alcance === 'locales' || r.alcance === 'local') && (
        <fieldset className="form-row">
          <legend>Sucursales a cargo</legend>
          <p className="muted">{r.alcance === 'local' ? 'Elige una sola sucursal.' : 'Elige todas las sucursales que verá.'}</p>
          <div className="loc-opts">
            {sucursales.map((s) => {
              const k = sucKey(s);
              return (
                <label className="loc-opt" key={k}>
                  <input type={r.alcance === 'local' ? 'radio' : 'checkbox'} name={r.alcance === 'local' ? 'udLocal' : undefined}
                    value={k} checked={f.locales.includes(k)} onChange={() => toggleLocal(k)} />
                  <span>{shortName(s.nombre)}<span className="muted"> {s.comuna}</span></span>
                </label>
              );
            })}
          </div>
          <FieldError>{err.locales}</FieldError>
        </fieldset>
      )}

      <fieldset className="form-row">
        <legend>Permisos</legend>
        <div className="perm-opts">
          {PERMISOS.map((p) => {
            const base = r.base.includes(p.id);
            return (
              <label className={`perm-opt ${base ? 'is-base' : ''}`} key={p.id}>
                <input type="checkbox" checked={base || f.extras.includes(p.id)} disabled={base} onChange={() => toggleExtra(p.id)} />
                <span>{p.label}</span>
                {base ? <span className="muted">Incluido en el rol</span> : <span className="extra-tag">Permiso extra</span>}
              </label>
            );
          })}
        </div>
      </fieldset>
    </Drawer>
  );
}
