'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { cambiarClavePerfil, guardarDatosPerfil } from '@/app/actions/perfil';
import { Avatar, FieldError, Icon } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { TIPOS_AVISO } from '@/lib/pcliente/constants';
import { plural } from '@/lib/pcliente/format';
import { usePortal } from '@/lib/pcliente/store';
import { PASSWORD_RULES, emailValid } from '@/lib/pcliente/validation';

function PasswordInput({ id, value, onChange, autoComplete, invalid, describedBy, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input className="input" id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} disabled={disabled}
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
  const router = useRouter();
  const [f, setF] = useState({ nombre: usuario.nombre, correo: usuario.correo, actual: '' });
  const [err, setErr] = useState({});
  const [msg, setMsg] = useState(null);
  const [guardando, startGuardar] = useTransition();
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: '' }); setMsg(null); };
  const cambiaCorreo = f.correo.trim().toLowerCase() !== usuario.correo.toLowerCase();
  const sinCambios = f.nombre.trim() === usuario.nombre && !cambiaCorreo;

  /* Foto: se sube al servidor (POST /api/perfil/foto), que la valida, la reduce y la guarda en DMC_Core.
     La URL que devuelve lleva versión (?v=), así el sidebar y la cabecera muestran la nueva al instante. */
  const [foto, setFoto] = useState({ estado: 'idle', mensaje: '' });
  const pedirFoto = async (init, ok) => {
    setFoto({ estado: 'cargando', mensaje: init.method === 'DELETE' ? 'Quitando la foto…' : 'Subiendo la foto…' });
    try {
      const res = await fetch('/api/perfil/foto', init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No pudimos guardar la foto. Inténtalo de nuevo.');
      actions.updateProfile({ foto: data.url });
      setFoto({ estado: 'ok', mensaje: ok });
      toast(ok);
    } catch (err) {
      const mensaje = err instanceof TypeError ? 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' : err.message;
      setFoto({ estado: 'error', mensaje });
      toast(mensaje);
    }
  };

  const onPhoto = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setFoto({ estado: 'error', mensaje: 'Usa una imagen JPG, PNG o WEBP.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setFoto({ estado: 'error', mensaje: 'La foto debe pesar menos de 5 MB.' }); return; }
    const body = new FormData();
    body.append('foto', file);
    pedirFoto({ method: 'POST', body }, 'Foto actualizada.');
  };
  const quitar = () => pedirFoto({ method: 'DELETE' }, 'Foto quitada.');
  const ocupado = foto.estado === 'cargando';

  /* Nombre y correo se guardan en seguridad.usuario_cliente (Server Action). Cambiar el correo
     (el usuario de ingreso) pide la contraseña actual. Tras guardar se refresca el servidor. */
  const save = (e) => {
    e.preventDefault();
    const nombre = f.nombre.trim(), correo = f.correo.trim().toLowerCase();
    const errs = {
      nombre: nombre.length < 3 ? 'Escribe tu nombre y apellido.' : '',
      correo: !emailValid(correo) ? 'Escribe un correo válido, por ejemplo nombre@empresa.cl.' : '',
      actual: cambiaCorreo && !f.actual ? 'Para cambiar el correo, escribe tu contraseña actual.' : ''
    };
    setErr(errs);
    if (Object.values(errs).some(Boolean)) return;
    startGuardar(async () => {
      const r = await guardarDatosPerfil({ nombre, correo, actual: f.actual }).catch(() => ({ ok: false, error: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' }));
      if (!r.ok) {
        if (r.campo) setErr((x) => ({ ...x, [r.campo]: r.error }));
        // Con campo, el error va junto a él; sin campo (sesión, red), al pie del formulario.
        if (!r.campo) setMsg({ tipo: 'error', texto: r.error });
        return;
      }
      actions.updateProfile({ nombre: r.nombre, correo: r.correo });
      setF({ nombre: r.nombre, correo: r.correo, actual: '' });
      setMsg({ tipo: 'ok', texto: r.mensaje });
      toast(r.mensaje);
      router.refresh();
    });
  };

  return (
    <form className="vd-card" onSubmit={save} noValidate>
      <h2 className="vd-h">Datos personales</h2>
      <div className={`pf-photo${ocupado ? ' is-busy' : ''}`} aria-busy={ocupado}>
        <Avatar nombre={usuario.nombre} foto={usuario.foto} size="xl" />
        <div className="pf-photo-ctl">
          <div className="pf-photo-btns">
            <button className="btn-out" type="button" disabled={ocupado} onClick={() => fileRef.current.click()}>{ocupado ? 'Guardando…' : 'Cambiar foto'}</button>
            {usuario.foto && <button className="link" type="button" disabled={ocupado} onClick={quitar}>Quitar foto</button>}
          </div>
          <p className="muted">JPG, PNG o WEBP de hasta 5 MB. La recortamos a un cuadrado.</p>
          {foto.mensaje && <p className={`pf-status is-${foto.estado}`} role={foto.estado === 'error' ? 'alert' : 'status'}>{foto.mensaje}</p>}
          <input ref={fileRef} className="sr" type="file" accept="image/png,image/jpeg,image/webp" tabIndex={-1} onChange={onPhoto} aria-label="Elegir foto de perfil" />
        </div>
      </div>
      <div className="pf-fields">
        <div className="form-row"><label htmlFor="pfNombre">Nombre y apellido</label><input className="input" id="pfNombre" autoComplete="name" maxLength={120} value={f.nombre} onChange={set('nombre')} disabled={guardando} aria-invalid={!!err.nombre} /><FieldError>{err.nombre}</FieldError></div>
        <div className="form-row"><label htmlFor="pfCorreo">Correo</label><input className="input" id="pfCorreo" type="email" autoComplete="email" maxLength={120} value={f.correo} onChange={set('correo')} disabled={guardando} aria-invalid={!!err.correo} /><FieldError>{err.correo}</FieldError><p className="muted">Es tu usuario para ingresar al portal.</p></div>
        {cambiaCorreo && (
          <div className="form-row pf-full"><label htmlFor="pfActualCorreo">Contraseña actual <span className="muted">(para confirmar el cambio de correo)</span></label>
            <PasswordInput id="pfActualCorreo" autoComplete="current-password" value={f.actual} onChange={(v) => set('actual')({ target: { value: v } })} invalid={!!err.actual} disabled={guardando} />
            <FieldError>{err.actual}</FieldError></div>
        )}
      </div>
      {msg && <p className={`pf-status is-${msg.tipo}`} role={msg.tipo === 'error' ? 'alert' : 'status'}>{msg.texto}</p>}
      <div className="pf-actions"><button className="btn-pri" type="submit" disabled={guardando || sinCambios}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const router = useRouter();
  const [f, setF] = useState({ cur: '', nw: '', rep: '' });
  const [err, setErr] = useState({});
  const [msg, setMsg] = useState(null);
  const [guardando, startGuardar] = useTransition();
  const set = (k) => (v) => { setF({ ...f, [k]: v }); setErr({ ...err, [k]: '' }); setMsg(null); };
  const CAMPO = { actual: 'cur', nueva: 'nw', confirmar: 'rep' };

  /* Se verifica la actual y se guarda la nueva en el servidor (bcrypt). Cierra las demás sesiones. */
  const save = (e) => {
    e.preventDefault();
    const errs = {
      cur: !f.cur ? 'Escribe tu contraseña actual.' : '',
      nw: !PASSWORD_RULES.every((r) => r.test(f.nw)) ? 'La nueva contraseña no cumple todas las reglas.' : f.nw === f.cur ? 'Debe ser distinta a la actual.' : '',
      rep: f.rep !== f.nw ? 'Las contraseñas no coinciden.' : ''
    };
    setErr(errs);
    if (Object.values(errs).some(Boolean)) return;
    startGuardar(async () => {
      const r = await cambiarClavePerfil({ actual: f.cur, nueva: f.nw, confirmar: f.rep }).catch(() => ({ ok: false, error: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.' }));
      if (!r.ok) {
        if (r.campo) setErr((x) => ({ ...x, [CAMPO[r.campo] ?? 'nw']: r.error }));
        // Con campo, el error va junto a él; sin campo (sesión, red), al pie del formulario.
        if (!r.campo) setMsg({ tipo: 'error', texto: r.error });
        return;
      }
      setF({ cur: '', nw: '', rep: '' });
      setMsg({ tipo: 'ok', texto: r.mensaje });
      toast(r.mensaje);
      router.refresh();
    });
  };

  return (
    <form className="vd-card pw-form" onSubmit={save} noValidate>
      <h2 className="vd-h">Contraseña</h2>
      <div className="pf-fields">
        <div className="form-row pf-full"><label htmlFor="pfPwCur">Contraseña actual</label><PasswordInput id="pfPwCur" autoComplete="current-password" value={f.cur} onChange={set('cur')} invalid={!!err.cur} disabled={guardando} /><FieldError>{err.cur}</FieldError></div>
        <div className="form-row"><label htmlFor="pfPwNew">Nueva contraseña</label><PasswordInput id="pfPwNew" autoComplete="new-password" value={f.nw} onChange={set('nw')} invalid={!!err.nw} describedBy="pfPwRules" disabled={guardando} /><FieldError>{err.nw}</FieldError></div>
        <div className="form-row"><label htmlFor="pfPwRep">Repite la nueva contraseña</label><PasswordInput id="pfPwRep" autoComplete="new-password" value={f.rep} onChange={set('rep')} invalid={!!err.rep} disabled={guardando} /><FieldError>{err.rep}</FieldError></div>
      </div>
      <ul className="pw-rules" id="pfPwRules" aria-live="polite">
        {PASSWORD_RULES.map((r) => <li key={r.id} className={r.test(f.nw) ? 'ok' : ''}><Icon name="check" />{r.label}</li>)}
      </ul>
      {msg && <p className={`pf-status is-${msg.tipo}`} role={msg.tipo === 'error' ? 'alert' : 'status'}>{msg.texto}</p>}
      <div className="pf-actions"><button className="btn-pri" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Cambiar contraseña'}</button></div>
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
