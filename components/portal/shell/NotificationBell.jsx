'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { TIPOS_AVISO } from '@/lib/pcliente/constants';
import { daysFrom, hourOf, parseDMYHM, plural, shortDate } from '@/lib/pcliente/format';
import { usePortal } from '@/lib/pcliente/store';

export function whenLabel(d, full = false) {
  const n = -daysFrom(d);
  if (n <= 0) return hourOf(d);
  if (n === 1) return `Ayer, ${hourOf(d)}`;
  return full ? `${shortDate(d)}, ${hourOf(d)}` : shortDate(d);
}

/** Campanita de la barra superior con los avisos más recientes. */
export default function NotificationBell() {
  const { notifVisibles, notifSinLeer, actions } = usePortal();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);
  const wrap = useRef(null);
  const btn = useRef(null);
  const prev = useRef(notifSinLeer);

  /* La campanita se mueve cuando llega un aviso nuevo. */
  useEffect(() => {
    if (notifSinLeer > prev.current && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRing(true);
      const t = setTimeout(() => setRing(false), 700);
      prev.current = notifSinLeer;
      return () => clearTimeout(t);
    }
    prev.current = notifSinLeer;
    return undefined;
  }, [notifSinLeer]);

  useEffect(() => {
    if (!open) return undefined;
    wrap.current.querySelector('.bp-item a, .bp-head button')?.focus();
    const onDoc = (e) => { if (!wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const close = (focus = true) => { setOpen(false); if (focus) btn.current?.focus(); };
  const latest = notifVisibles.slice(0, 6);

  return (
    <div className="bell-wrap" ref={wrap} onKeyDown={(e) => { if (e.key === 'Escape' && open) close(); }}>
      <button ref={btn} className={`bell ${ring ? 'ring' : ''}`} type="button" aria-haspopup="dialog" aria-expanded={open}
        aria-label={notifSinLeer ? `Notificaciones, ${plural(notifSinLeer, 'sin leer', 'sin leer')}` : 'Notificaciones, ninguna sin leer'}
        onClick={() => setOpen((o) => !o)}>
        <Icon name="bell" />
        {notifSinLeer > 0 && <span className="bell-count num">{notifSinLeer > 99 ? '99+' : notifSinLeer}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Notificaciones recientes">
          <div className="bp-head">
            <strong>Notificaciones</strong>
            <button className="link" type="button" disabled={!notifSinLeer}
              onClick={() => { actions.markAllRead(); toast('Todas las notificaciones quedaron como leídas.'); }}>
              Marcar todas como leídas
            </button>
          </div>
          <ul className="bp-list">
            {latest.length ? latest.map((n) => {
              const t = TIPOS_AVISO.find((x) => x.id === n.tipo);
              const inner = (
                <>
                  <span className={`nf-ico t-${n.tipo.split('_')[0]}`} aria-hidden="true"><Icon name={t.icon} /></span>
                  <span><b>{n.titulo}</b><p>{n.texto}</p></span>
                  <span><span className="bp-time num">{whenLabel(parseDMYHM(n.fecha))}</span>{!n.leida && <span className="bp-dot" aria-label="Sin leer" />}</span>
                </>
              );
              return (
                <li key={n.id} className={`bp-item ${n.leida ? '' : 'is-unread'}`}>
                  {n.href
                    ? <Link href={n.href} onClick={() => { actions.setNotifRead(n.id); close(false); }}>{inner}</Link>
                    : <div>{inner}</div>}
                </li>
              );
            }) : <li className="bp-empty">No tienes notificaciones.</li>}
          </ul>
          <div className="bp-foot">
            <Link className="link" href="/portal/notificaciones" onClick={() => close(false)}>Ver todas</Link>
            <Link className="bp-settings" href="/portal/notificaciones#ajustes" onClick={() => close(false)}><Icon name="settings" />Ajustes</Link>
          </div>
        </div>
      )}
    </div>
  );
}
