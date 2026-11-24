'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Avatar, FieldError, Icon } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { TIPOS_AVISO } from '@/lib/pcliente/constants';
import { plural } from '@/lib/pcliente/format';
import { usePortal } from '@/lib/pcliente/store';
import { PASSWORD_RULES, emailValid, phoneValid } from '@/lib/pcliente/validation';

function PasswordInput({ id, value, onChange, autoComplete, invalid, describedBy }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input className="input" id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value}
        onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} aria-describedby={describedBy} />
      <button className="icon-btn" type="button" aria-pressed={show} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow((s) => !s)}>
        <Icon name="eye" />
      </button>
    </div>
  );
}

function PersonalData() {
  const { usuario, actions } = usePortal();
  const toast = useToast();
  const fileRef = useRef(null);
  const [f, setF] = useState({ nombre: usuario.nombre, cargo: usuario.cargo, correo: usuario.correo, telefono: usuario.telefono });
  const [err, setErr] = useState({});
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: '' }); };

  /* Libera la URL de la foto anterior cuando se reemplaza. */
  const lastUrl = useRef(usuario.foto);
  useEffect(() => {
    const prev = lastUrl.current;
    if (prev && prev !== usuario.foto && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    lastUrl.current = usuario.foto;
  }, [usuario.foto]);

  const onPhoto = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast('Usa una imagen PNG, JPG o WEBP.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast('La foto debe pesar menos de 2 MB.'); return; }
    // En producción: subir con POST /api/perfil/foto y guardar la URL que devuelva el servidor.
    actions.updateProfile({ foto: URL.createObjectURL(file) });
    toast('Foto actualizada.');
  };

  const save = (e) => {
    e.preventDefault();
    const nombre = f.nombre.trim(), correo = f.correo.trim().toLowerCase(), telefono = f.telefono.trim();
    const errs = {
      nombre: nombre.length < 3 ? 'Escribe tu nombre y apellido.' : '',
      correo: !emailValid(correo) ? 'Escribe un correo válido, por ejemplo nombre@empresa.cl.' : '',
      telefono: telefono && !phoneValid(telefono) ? 'Usa solo números, por ejemplo +56 9 1234 5678.' : ''
    };
    setErr(errs);
    if (Object.values(errs).some(Boolean)) return;
    const cambioCorreo = correo !== usuario.correo;
    actions.updateProfile({ nombre, cargo: f.cargo.trim(), correo, telefono });
    toast(cambioCorreo ? `Datos guardados. Te enviamos un correo a ${correo} para confirmarlo.` : 'Datos guardados.');
  };

  return (
    <form className="vd-card" onSubmit={save} noValidate>
      <h2 className="vd-h">Datos personales</h2>
      <div className="pf-photo">
        <Avatar nombre={usuario.nombre} foto={usuario.foto} size="xl" />
        <div className="pf-photo-ctl">
          <div className="pf-photo-btns">
            <button className="btn-out" type="button" onClick={() => fileRef.current.click()}>Cambiar foto</button>
            {usuario.foto && <button className="link" type="button" onClick={() => { actions.updateProfile({ foto: null }); toast('Foto quitada.'); }}>Quitar foto</button>}
          </div>
          <p className="muted">PNG, JPG o WEBP de hasta 2 MB.</p>
          <input ref={fileRef} className="sr" type="file" accept="image/png,image/jpeg,image/webp" tabIndex={-1} onChange={onPhoto} aria-label="Elegir foto de perfil" />
        </div>
      </div>
      <div className="pf-fields">
        <div className="form-row"><label htmlFor="pfNombre">Nombre y apellido</label><input className="input" id="pfNombre" autoComplete="name" value={f.nombre} onChange={set('nombre')} aria-invalid={!!err.nombre} /><FieldError>{err.nombre}</FieldError></div>
        <div className="form-row"><label htmlFor="pfCargo">Cargo <span className="muted">(opcional)</span></label><input className="input" id="pfCargo" value={f.cargo} onChange={set('cargo')} placeholder="Ej.: Jefa de prevención de pérdidas" /></div>
        <div className="form-row"><label htmlFor="pfCorreo">Correo</label><input className="input" id="pfCorreo" type="email" autoComplete="email" value={f.correo} onChange={set('correo')} aria-invalid={!!err.correo} /><FieldError>{err.correo}</FieldError><p className="muted">Si lo cambias, te enviaremos un correo para confirmarlo.</p></div>
        <div className="form-row"><label htmlFor="pfTel">Teléfono <span className="muted">(opcional)</span></label><input className="input" id="pfTel" type="tel" autoComplete="tel" value={f.telefono} onChange={set('telefono')} placeholder="+56 9 1234 5678" aria-invalid={!!err.telefono} /><FieldError>{err.telefono}</FieldError></div>
      </div>
      <div className="pf-actions"><button className="btn-pri" type="submit">Guardar cambios</button></div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [f, setF] = useState({ cur: '', nw: '', rep: '' });
  const [err, setErr] = useState({});
  const set = (k) => (v) => { setF({ ...f, [k]: v }); setErr({ ...err, [k]: '' }); };

  const save = (e) => {
    e.preventDefault();
    const errs = {
      cur: !f.cur ? 'Escribe tu contraseña actual.' : '',
      nw: !PASSWORD_RULES.every((r) => r.test(f.nw)) ? 'La nueva contraseña no cumple todas las reglas.' : f.nw === f.cur ? 'Debe ser distinta a la actual.' : '',
      rep: f.rep !== f.nw ? 'Las contraseñas no coinciden.' : ''
    };
    setErr(errs);
    if (Object.values(errs).some(Boolean)) return;
    // En producción: POST /api/perfil/contrasena con la actual y la nueva. La contraseña nunca se guarda en el navegador.
    setF({ cur: '', nw: '', rep: '' });
    toast('Contraseña actualizada. Usa la nueva la próxima vez que ingreses.');
  };

  return (
    <form className="vd-card pw-form" onSubmit={save} noValidate>
      <h2 className="vd-h">Contraseña</h2>
      <div className="pf-fields">
        <div className="form-row pf-full"><label htmlFor="pfPwCur">Contraseña actual</label><PasswordInput id="pfPwCur" autoComplete="current-password" value={f.cur} onChange={set('cur')} invalid={!!err.cur} /><FieldError>{err.cur}</FieldError></div>
        <div className="form-row"><label htmlFor="pfPwNew">Nueva contraseña</label><PasswordInput id="pfPwNew" autoComplete="new-password" value={f.nw} onChange={set('nw')} invalid={!!err.nw} describedBy="pfPwRules" /><FieldError>{err.nw}</FieldError></div>
        <div className="form-row"><label htmlFor="pfPwRep">Repite la nueva contraseña</label><PasswordInput id="pfPwRep" autoComplete="new-password" value={f.rep} onChange={set('rep')} invalid={!!err.rep} /><FieldError>{err.rep}</FieldError></div>
      </div>
      <ul className="pw-rules" id="pfPwRules" aria-live="polite">
        {PASSWORD_RULES.map((r) => <li key={r.id} className={r.test(f.nw) ? 'ok' : ''}><Icon name="check" />{r.label}</li>)}
      </ul>
      <div className="pf-actions"><button className="btn-pri" type="submit">Cambiar contraseña</button></div>
    </form>
  );
}

export default function ProfileView() {
  const { usuario, cliente, preferencias } = usePortal();
  const mail = TIPOS_AVISO.filter((t) => preferencias.tipos[t.id].correo);
  const freq = { inmediato: 'apenas ocurren', diario: 'en un resumen diario', semanal: 'en un resumen semanal' }[preferencias.frecuencia];

  return (
    <section className="view" aria-labelledby="pfTitle">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="pfTitle">Mi perfil</h1>
          <p className="page-sub">Tus datos, tu contraseña y los avisos que recibes del portal.</p>
        </div>
      </header>
      <div className="vd-grid">
        <div className="vd-main">
          <PersonalData />
          <PasswordForm />
        </div>
        <aside className="vd-side" aria-label="Tu acceso y notificaciones">
          <section className="vd-card">
            <h2 className="vd-h">Tu acceso</h2>
            <dl className="facts-list">
              <div><dt>Rol</dt><dd>{usuario.rol}</dd></div>
              <div><dt>Alcance</dt><dd>Todo el cliente</dd></div>
              <div><dt>Cliente</dt><dd>{cliente.nombre} ({cliente.razonSocial})</dd></div>
            </dl>
            <p className="muted pf-note">El rol y el alcance los asigna un administrador del cliente en Usuarios y roles.</p>
          </section>
          <section className="vd-card">
            <h2 className="vd-h">Notificaciones</h2>
            <p className="pf-nsum">{mail.length ? `Recibes ${plural(mail.length, 'tipo de aviso', 'tipos de aviso')} por correo, ${freq}.` : 'No recibes avisos por correo.'}</p>
            <Link className="btn-out" href="/portal/notificaciones#ajustes">Ajustar en Mis notificaciones</Link>
          </section>
        </aside>
      </div>
    </section>
  );
}
