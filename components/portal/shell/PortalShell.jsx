'use client';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/portal/ui';
import { ToastProvider } from '@/components/portal/ui/Toast';
import { PortalProvider, usePortal } from '@/lib/pcliente/store';
import { branchSlug, shortName } from '@/lib/pcliente/helpers';
import NotificationBell from './NotificationBell';
import Sidebar from './Sidebar';

const TITLES = {
  '/portal/dashboard': 'Dashboard', '/portal/notificaciones': 'Mis notificaciones', '/portal/sucursales': 'Mis sucursales', '/portal/visitas': 'Visitas',
  '/portal/tickets': 'Tickets', '/portal/trabajos-planificados': 'Trabajos planificados', '/portal/cotizaciones': 'Cotizaciones y despachos',
  '/portal/credenciales': 'Credenciales de locales', '/portal/usuarios': 'Usuarios y roles', '/portal/perfil': 'Mi perfil'
};

/** Título de la barra superior según la ruta actual. */
function usePageTitle() {
  const pathname = usePathname();
  const { sucursales } = usePortal();
  if (TITLES[pathname]) return TITLES[pathname];
  const [, , section, id] = pathname.split('/');
  if (section === 'visitas' && id) return id.toUpperCase();
  if (section === 'sucursales' && id) {
    const s = sucursales.find((x) => branchSlug(x) === id);
    return s ? shortName(s.nombre) : 'Mis sucursales';
  }
  return '';
}

function Frame({ children }) {
  const pathname = usePathname();
  const title = usePageTitle();
  const [menu, setMenu] = useState(false);
  const menuBtn = useRef(null);
  const main = useRef(null);
  const first = useRef(true);

  const closeMenu = useCallback((returnFocus) => {
    setMenu(false);
    if (returnFocus) menuBtn.current?.focus();
  }, []);

  /* Al cambiar de sección: cierra el menú, sube al inicio y lleva el foco al contenido. */
  useEffect(() => {
    setMenu(false);
    if (first.current) { first.current = false; return; }
    // Con un ancla (#ajustes) la propia página decide el scroll y el foco.
    if (window.location.hash) return;
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="app">
      <Sidebar open={menu} onClose={closeMenu} />
      <div className="content">
        <header className="mbar">
          <button ref={menuBtn} className="icon-btn nav-open" type="button" aria-label="Abrir menú" aria-expanded={menu} onClick={() => setMenu(true)}>
            <Icon name="menu" />
          </button>
          <Image className="mbar-logo" src="/pc/logo-dmc.png" alt="Grupo DMC" width={561} height={199} />
          <span className="mbar-title">{title}</span>
          <NotificationBell />
        </header>
        <main className="wrap" id="main" tabIndex={-1} ref={main}>
          {children}
          <p className="foot">© {new Date().getFullYear()} Grupo DMC, Ideas Tecnológicas de Seguridad</p>
        </main>
      </div>
    </div>
  );
}

/** `datos`: los del portal, ya cargados en el servidor (ver app/portal/(app)/layout.tsx). */
export default function PortalShell({ datos, children }) {
  return (
    <PortalProvider initial={datos}>
      <ToastProvider>
        <Frame>{children}</Frame>
      </ToastProvider>
    </PortalProvider>
  );
}
