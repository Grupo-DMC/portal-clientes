'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cerrarSesion } from '@/app/actions/auth';
import { Avatar, Icon } from '@/components/portal/ui';
import { NAV } from '@/lib/pcliente/constants';
import { usePortal } from '@/lib/pcliente/store';

/** Menú lateral. En pantallas de hasta 1024 px se abre como panel desde el botón ☰. */
export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { cliente, usuario, tickets, reportesPendientes } = usePortal();
  const ref = useRef(null);
  const counts = { tickets: tickets.abiertos, reportes: reportesPendientes };

  /* En modo panel (celular/tablet) el menú cerrado queda fuera del orden de tabulación. */
  const [isDrawer, setIsDrawer] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(max-width:1024px)');
    const sync = () => setIsDrawer(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* Al abrir en celular, el foco entra al menú; Esc lo cierra. */
  useEffect(() => {
    if (!open) return undefined;
    ref.current?.querySelector('a[aria-current="page"], a')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(true); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <aside className={`side ${open ? 'open' : ''}`} aria-label="Menú principal" ref={ref} inert={isDrawer && !open}>
        <div className="side-brand">
          <Image className="side-logo" src="/pc/logo-dmc.png" alt="Grupo DMC" width={561} height={199} priority />
          <span className="side-portal">Portal cliente</span>
          <button className="icon-btn side-close" type="button" aria-label="Cerrar menú" onClick={() => onClose(true)}>
            <Icon name="close" />
          </button>
        </div>

        <div className="side-client">
          <div className="side-client-logo" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo del cliente servido por la app */}
            {cliente.logo ? <img src={cliente.logo} alt="" /> : cliente.nombre[0]}
          </div>
          <div className="side-client-text">
            <strong>{cliente.nombre}</strong>
            <span className="num">RUT {cliente.rut}</span>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((g, gi) => (
            <div className="nav-group" key={gi}>
              {g.label && <span className="nav-label" id={`navg${gi}`}>{g.label}</span>}
              <ul aria-labelledby={g.label ? `navg${gi}` : undefined}>
                {g.items.map((it) => {
                  const n = it.count ? counts[it.count] : 0;
                  return (
                    <li key={it.href}>
                      <Link href={it.href} aria-current={isActive(it.href) ? 'page' : undefined} onClick={() => onClose(false)}>
                        <Icon name={it.icon} />
                        <span>{it.label}</span>
                        {n > 0 && <span className="count num" aria-label={`${n} pendientes`}>{n}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="side-user">
          <Link className="side-me" href="/portal/perfil" aria-current={pathname === '/portal/perfil' ? 'page' : undefined} onClick={() => onClose(false)}>
            <Avatar nombre={usuario.nombre} foto={usuario.foto} />
            <span className="side-user-text">
              <strong>{usuario.nombre}</strong>
              <span>{usuario.rol}</span>
            </span>
            <span className="sr">, abrir Mi perfil</span>
          </Link>
          <form action={cerrarSesion}>
            <button className="icon-btn" type="submit" aria-label="Cerrar sesión" title="Cerrar sesión">
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => onClose(false)} />}
    </>
  );
}
