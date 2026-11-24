'use client';
import { useState } from 'react';
import { Avatar, ExampleNote, Icon, Pill } from '@/components/portal/ui';
import { ALCANCE_LABEL, PERMISOS, ROLES, zonaNombre } from '@/lib/pcliente/constants';
import { plural } from '@/lib/pcliente/format';
import { shortName, sucKey, zonaSucursales } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';
import UserDrawer from './UserDrawer';

export default function UsersView() {
  const { usuarios, sucursales, sucursalesTotal, cliente } = usePortal();
  const [drawer, setDrawer] = useState({ open: false, user: null });

  const alcance = (u) => {
    if (u.rol === 'admin') return { txt: 'Todo el cliente', n: sucursalesTotal };
    if (u.rol === 'zona') return { txt: zonaNombre(u.zona), n: zonaSucursales(sucursales, u.zona).length };
    const l = u.locales.map((k) => sucursales.find((s) => sucKey(s) === k)).filter(Boolean);
    return { txt: l.map((s) => shortName(s.nombre)).join(', ') || 'Sin sucursales', n: l.length };
  };
  const roleKeys = Object.keys(ROLES);

  return (
    <section className="view" aria-labelledby="usTitle">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="usTitle">Usuarios y roles</h1>
          <p className="page-sub">{plural(usuarios.length, 'usuario', 'usuarios')} con acceso al portal de {cliente.nombre}</p>
        </div>
        <button className="btn-pri" type="button" onClick={() => setDrawer({ open: true, user: null })}><Icon name="plus" />Invitar usuario</button>
      </header>
      <ExampleNote>Usuarios y zonas de ejemplo.</ExampleNote>

      <section className="panel">
        <div className="panel-head"><h2>Usuarios</h2></div>
        <div className="table-wrap">
          <table className="us-table">
            <thead><tr><th scope="col">Usuario</th><th scope="col">Rol</th><th scope="col">Alcance</th><th scope="col">Permisos extra</th><th scope="col">Estado</th><th scope="col" className="r"><span className="sr">Acciones</span></th></tr></thead>
            <tbody>
              {usuarios.map((u) => {
                const a = alcance(u);
                return (
                  <tr key={u.id}>
                    <td><div className="us-who"><Avatar nombre={u.nombre} size="sm" /><span><b>{u.nombre}</b><span className="muted d-block">{u.correo}</span></span></div></td>
                    <td><span className={`role-tag r-${u.rol}`}>{ROLES[u.rol].label}</span></td>
                    <td className="us-scope"><span>{a.txt}</span>{u.rol !== 'admin' && <span className="muted d-block">{plural(a.n, 'sucursal', 'sucursales')}</span>}</td>
                    <td>{u.extras.length ? u.extras.map((id) => <span className="tag ticket" key={id}>{PERMISOS.find((p) => p.id === id).label}</span>) : <span className="muted">Ninguno</span>}</td>
                    <td><Pill tone={u.estado === 'activo' ? 'ok' : 'prog'}>{u.estado === 'activo' ? 'Activo' : 'Invitación enviada'}</Pill></td>
                    <td className="r"><button className="btn-row" type="button" aria-label={`Editar a ${u.nombre}`} onClick={() => setDrawer({ open: true, user: u })}>Editar</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Qué puede hacer cada rol</h2><span className="panel-sub">Los permisos marcados como extra se pueden sumar a un usuario en particular.</span></div>
        <div className="table-wrap">
          <table className="rm">
            <thead>
              <tr>
                <th scope="col">Permiso</th>
                {roleKeys.map((k) => (
                  <th scope="col" key={k}><span className="rm-role">{ROLES[k].label}</span><span className="rm-count num">{plural(usuarios.filter((u) => u.rol === k).length, 'usuario', 'usuarios')}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISOS.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.label}</th>
                  {roleKeys.map((k) => (
                    <td key={k}>{ROLES[k].base.includes(p.id)
                      ? <span className="rm-yes" aria-label="Incluido"><Icon name="check" /></span>
                      : <span className="rm-extra">Como extra</span>}</td>
                  ))}
                </tr>
              ))}
              <tr className="rm-scope"><th scope="row">Alcance</th>{roleKeys.map((k) => <td key={k}>{ALCANCE_LABEL[ROLES[k].alcance]}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <UserDrawer open={drawer.open} user={drawer.user} onClose={() => setDrawer({ open: false, user: null })} />
    </section>
  );
}
