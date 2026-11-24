'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Chips, Icon, Switch } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { whenLabel } from '@/components/portal/shell/NotificationBell';
import { TIPOS_AVISO } from '@/lib/pcliente/constants';
import { daysFrom, parseDMYHM, plural } from '@/lib/pcliente/format';
import { usePortal } from '@/lib/pcliente/store';

const FILTROS = [
  { id: 'todas', label: 'Todas', test: () => true },
  { id: 'noleidas', label: 'No leídas', test: (n) => !n.leida },
  { id: 'tickets', label: 'Tickets', test: (n) => n.tipo.startsWith('ticket') },
  { id: 'visitas', label: 'Visitas', test: (n) => n.tipo.startsWith('visita') },
  { id: 'reportes', label: 'Reportes', test: (n) => n.tipo === 'reporte_nuevo' },
  { id: 'vencim', label: 'Vencimientos', test: (n) => n.tipo === 'garantia' || n.tipo === 'calibracion' }
];
function groupLabel(d) {
  const n = -daysFrom(d);
  if (n <= 0) return 'Hoy';
  if (n === 1) return 'Ayer';
  if (n < 7) return 'Esta semana';
  if (n < 31) return 'Este mes';
  return 'Anteriores';
}
const FRECUENCIAS = [
  { id: 'inmediato', label: 'Apenas ocurren', desc: 'Un correo por cada aviso.' },
  { id: 'diario', label: 'Resumen diario', desc: 'Un solo correo a las 8:00.' },
  { id: 'semanal', label: 'Resumen semanal', desc: 'Los lunes a las 8:00.' }
];

/** Ajustes: se editan en un borrador y se aplican al guardar. */
function Preferences() {
  const { preferencias, actions } = usePortal();
  const toast = useToast();
  const [draft, setDraft] = useState(() => structuredClone(preferencias));
  const form = useRef(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(preferencias);
  const anyMail = Object.values(draft.tipos).some((t) => t.correo);

  /* Llegando desde "Ajustes" en la campanita (/notificaciones#ajustes). */
  useEffect(() => {
    if (window.location.hash === '#ajustes') {
      form.current?.scrollIntoView({ block: 'start' });
      form.current?.querySelector('input')?.focus({ preventScroll: true });
    }
  }, []);

  const setTipo = (id, canal, v) => setDraft((d) => ({ ...d, tipos: { ...d.tipos, [id]: { ...d.tipos[id], [canal]: v } } }));
  const setAllMail = (v) => setDraft((d) => ({ ...d, tipos: Object.fromEntries(Object.entries(d.tipos).map(([k, t]) => [k, { ...t, correo: v }])) }));

  return (
    <form className="vd-card np-card" id="ajustes" ref={form} noValidate
      onSubmit={(e) => { e.preventDefault(); actions.savePrefs(draft); toast('Preferencias de notificaciones guardadas.'); }}>
      <h2 className="vd-h">Qué te avisamos</h2>
      <p className="muted np-scope">Solo para las sucursales de tu alcance.</p>
      <table className="np-table">
        <thead><tr><th scope="col">Aviso</th><th scope="col">En el portal</th><th scope="col">Por correo</th></tr></thead>
        <tbody>
          {TIPOS_AVISO.map((t) => (
            <tr key={t.id}>
              <th scope="row"><span className="np-name"><Icon name={t.icon} />{t.label}</span></th>
              <td><Switch small hideLabel label={`${t.label} en el portal`} checked={draft.tipos[t.id].portal} onChange={(v) => setTipo(t.id, 'portal', v)} /></td>
              <td><Switch small hideLabel label={`${t.label} por correo`} checked={draft.tipos[t.id].correo} onChange={(v) => setTipo(t.id, 'correo', v)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="np-quick">
        <span className="muted">Correo:</span>
        <button className="link" type="button" onClick={() => setAllMail(true)}>activar todos</button>
        <button className="link" type="button" onClick={() => setAllMail(false)}>desactivar todos</button>
      </div>

      <fieldset className={`np-mail ${anyMail ? '' : 'is-off'}`} disabled={!anyMail}>
        <legend>Cómo te llegan los correos</legend>
        {FRECUENCIAS.map((f) => (
          <label className="np-radio" key={f.id}>
            <input type="radio" name="npFreq" value={f.id} checked={draft.frecuencia === f.id} onChange={() => setDraft((d) => ({ ...d, frecuencia: f.id }))} />
            <span><b>{f.label}</b><span className="muted d-block">{f.desc}</span></span>
          </label>
        ))}
        <Switch label="No enviar correos entre 21:00 y 8:00" checked={draft.silencio} onChange={(v) => setDraft((d) => ({ ...d, silencio: v }))} />
      </fieldset>

      <div className="np-foot">
        <span className={`np-state ${dirty ? 'is-dirty' : ''}`} aria-live="polite">{dirty ? 'Tienes cambios sin guardar.' : 'Preferencias guardadas.'}</span>
        <div className="np-btns">
          {dirty && <button className="link" type="button" onClick={() => setDraft(structuredClone(preferencias))}>Descartar</button>}
          <button className="btn-pri" type="submit" disabled={!dirty}>Guardar</button>
        </div>
      </div>
    </form>
  );
}

export default function NotificationsView() {
  const { notificaciones, notifVisibles, notifSinLeer, actions } = usePortal();
  const toast = useToast();
  const [filtro, setFiltro] = useState('todas');
  const hidden = notificaciones.length - notifVisibles.length;
  const f = FILTROS.find((x) => x.id === filtro);
  const list = notifVisibles.filter(f.test);

  const groups = [];
  list.forEach((n) => {
    const g = groupLabel(parseDMYHM(n.fecha));
    const last = groups[groups.length - 1];
    if (last && last.g === g) last.items.push(n); else groups.push({ g, items: [n] });
  });

  return (
    <section className="view" aria-labelledby="nfTitle">
      <header className="page-head">
        <div>
          <h1 className="page-title" id="nfTitle">Mis notificaciones</h1>
          <p className="page-sub">{notifSinLeer ? plural(notifSinLeer, 'notificación sin leer', 'notificaciones sin leer') : 'Estás al día'}</p>
        </div>
      </header>

      <div className="vd-grid nf-grid">
        <section className="vd-card nf-card" aria-label="Notificaciones">
          <div className="nf-tools">
            <Chips label="Filtrar notificaciones" value={filtro} onChange={setFiltro}
              options={FILTROS.map((x) => ({ id: x.id, label: x.label, count: notifVisibles.filter(x.test).length }))} />
            <button className="btn-out" type="button" disabled={!notifSinLeer}
              onClick={() => { actions.markAllRead(); toast('Todas las notificaciones quedaron como leídas.'); }}>
              <Icon name="checks" />Marcar todas como leídas
            </button>
          </div>
          {hidden > 0 && <p className="nf-hidden"><Icon name="info" /><span>{plural(hidden, 'aviso oculto', 'avisos ocultos')} porque desactivaste su tipo en el portal.</span></p>}

          <div aria-live="polite">
            {groups.length ? groups.map((g) => (
              <section className="nf-group" key={g.g} aria-label={g.g}>
                <h3 className="nf-day">{g.g}</h3>
                <ul className="nf-items">
                  {g.items.map((n) => {
                    const t = TIPOS_AVISO.find((x) => x.id === n.tipo), d = parseDMYHM(n.fecha);
                    return (
                      <li key={n.id} className={`nf-item ${n.leida ? '' : 'is-unread'}`}>
                        <span className={`nf-ico t-${n.tipo.split('_')[0]}`} aria-hidden="true"><Icon name={t.icon} /></span>
                        <div className="nf-text">
                          {n.href
                            ? <Link className="nf-title" href={n.href} onClick={() => actions.setNotifRead(n.id)}>{n.titulo}</Link>
                            : <span className="nf-title">{n.titulo}</span>}
                          <p>{n.texto}</p>
                          <span className="nf-type">{t.label}</span>
                        </div>
                        <div className="nf-side">
                          <time className="num" dateTime={d.toISOString()}>{whenLabel(d, true)}</time>
                          <button className="nf-read" type="button" onClick={() => actions.setNotifRead(n.id, !n.leida)}
                            aria-label={n.leida ? 'Marcar como no leída' : 'Marcar como leída'} title={n.leida ? 'Marcar como no leída' : 'Marcar como leída'}>
                            <span className="nf-dot" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )) : (
              <div className="nf-empty"><Icon name="bell" /><p>{filtro === 'noleidas' ? 'Estás al día. No tienes notificaciones sin leer.' : 'No hay notificaciones en este filtro.'}</p></div>
            )}
          </div>
        </section>

        <aside className="vd-side" aria-label="Ajustes de notificaciones">
          <Preferences />
        </aside>
      </div>
    </section>
  );
}
