"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cerrarSesion } from "@/app/actions/auth";
import { Avatar, Icon } from "@/components/portal/ui";
import type { GrupoMenu } from "@/lib/server/panelAcceso";

// Marco del panel interno: el mismo menú lateral y barra superior del portal
// cliente (mismas clases de portal.css), con el menú que corresponde al rol.

interface Props {
  menu: GrupoMenu[];
  usuario: { nombre: string; roles: string[] };
  children: React.ReactNode;
}

const ROL: Record<string, string> = { ADMIN: "Administrador", COORDINADOR: "Coordinador" };

function useDrawer() {
  const [esDrawer, setEsDrawer] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(max-width:1024px)");
    const sync = () => setEsDrawer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return esDrawer;
}

export default function PanelShell({ menu, usuario, children }: Props) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const esDrawer = useDrawer();
  const side = useRef<HTMLElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  const primera = useRef(true);

  const activo = (href: string) => (href === "/panel" ? pathname === "/panel" : pathname === href || pathname.startsWith(href + "/"));
  const actual = menu.flatMap((g) => g.items).filter((it) => activo(it.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const rol = usuario.roles.map((r) => ROL[r] ?? r).join(" · ");

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }, []);

  // Al cambiar de página: cierra el menú, sube y lleva el foco al contenido.
  useEffect(() => {
    setAbierto(false);
    if (primera.current) { primera.current = false; return; }
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  useEffect(() => {
    if (!abierto) return undefined;
    side.current?.querySelector<HTMLElement>('a[aria-current="page"], a')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(true); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, cerrar]);

  return (
    <div className="app">
      <aside className={`side ${abierto ? "open" : ""}`} aria-label="Menú del panel" ref={side} inert={esDrawer && !abierto}>
        <div className="side-brand">
          <Image className="side-logo" src="/pc/logo-dmc.png" alt="Grupo DMC" width={561} height={199} priority />
          <span className="side-portal">Panel interno</span>
          <button className="icon-btn side-close" type="button" aria-label="Cerrar menú" onClick={() => cerrar(true)}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="nav">
          {menu.map((g, gi) => (
            <div className="nav-group" key={gi}>
              {g.label && <span className="nav-label" id={`pnav${gi}`}>{g.label}</span>}
              <ul aria-labelledby={g.label ? `pnav${gi}` : undefined}>
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} aria-current={actual?.href === it.href ? "page" : undefined} onClick={() => cerrar(false)}>
                      <Icon name={it.icon} />
                      <span>{it.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="side-user">
          <Avatar nombre={usuario.nombre} foto={null} />
          <span className="side-user-text">
            <strong>{usuario.nombre}</strong>
            <span>{rol}</span>
          </span>
          <form action={cerrarSesion}>
            <button className="icon-btn" type="submit" aria-label="Cerrar sesión" title="Cerrar sesión">
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </aside>
      {abierto && <div className="scrim" onClick={() => cerrar(false)} />}

      <div className="content">
        <header className="mbar">
          <button ref={boton} className="icon-btn nav-open" type="button" aria-label="Abrir menú" aria-expanded={abierto} onClick={() => setAbierto(true)}>
            <Icon name="menu" />
          </button>
          <Image className="mbar-logo" src="/pc/logo-dmc.png" alt="Grupo DMC" width={561} height={199} />
          <span className="mbar-title">{actual?.label ?? "Panel interno"}</span>
        </header>
        <main className="wrap" id="main" tabIndex={-1} ref={main}>
          {children}
          <p className="foot">© {new Date().getFullYear()} Grupo DMC · Panel interno</p>
        </main>
      </div>
    </div>
  );
}
