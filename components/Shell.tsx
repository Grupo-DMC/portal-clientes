"use client";

import {
  Bell, Building2, CalendarDays, ClipboardCheck, Flag, FileText, History, KeyRound, LayoutDashboard, List, LogOut, MapPin, ShieldCheck, Store, Ticket, Users, Lock, UserRound,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cerrarSesion } from "@/app/actions/auth";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, clientes: Building2, sucursales: Store, malls: MapPin, catalogos: List, garantias: ShieldCheck, notificaciones: Bell,
  usuarios: Users, auditoria: History, visitas: ClipboardCheck, tickets: Ticket, cotizaciones: FileText, trabajos: CalendarDays, credenciales: KeyRound, perfil: UserRound, reportes: Flag,
};

export type NavItem = { id: string; href: string; label: string; badge?: number };
export type NavGroup = { title: string; items: NavItem[] };

export default function Shell({
  surface, groups, user, brandLine, header, scopeBanner, topRight, topActions, profileHref, children,
}: {
  surface: "panel" | "portal";
  groups: NavGroup[];
  user: { n: string; rol: string; ini: string };
  brandLine: string;
  header?: ReactNode;
  scopeBanner?: ReactNode;
  topRight?: string;
  /** Slot aditivo de la barra superior (p. ej. campanita de avisos). */
  topActions?: ReactNode;
  /** Si se indica, el bloque del usuario en el menú lateral enlaza a esta ruta (p. ej. el perfil). */
  profileHref?: string;
  children: ReactNode;
}) {
  const path = usePathname();
  const all = groups.flatMap((g) => g.items);
  const current = [...all].sort((a, b) => b.href.length - a.href.length).find((i) => (i.href === `/${surface}` ? path === i.href : path === i.href || path.startsWith(i.href + "/")));
  const root = `/${surface}`;
  // Un módulo fuera de los permitidos del rol no se muestra aunque se escriba la URL.
  const modulePath = path.replace(root, "").split("/")[1] ?? "";
  const known = ["clientes", "sucursales", "malls", "catalogos", "garantias", "notificaciones", "usuarios", "auditoria", "visitas", "tickets", "cotizaciones", "trabajos", "credenciales", "reportes"];
  const blocked = known.includes(modulePath) && !all.some((i) => i.id === modulePath);

  return (
    <>
      <div className="flex min-h-screen bg-bg text-text">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:bg-text focus:px-3 focus:py-2 focus:text-bg">Saltar al contenido</a>
        <aside className="sticky top-0 flex h-screen w-[264px] flex-none flex-col border-r-2 border-text bg-surface" aria-label="Navegación principal">
          <div className="flex flex-col gap-3 border-b-2 border-text px-5 pb-4 pt-5">
            <Image src="/DMC-logo.png" alt="Grupo dMC" width={110} height={46} priority className="h-[46px] w-auto self-start" />
            <div className="kicker !tracking-[.12em]">{brandLine}</div>
            {header}
          </div>
          <nav className="flex-1 overflow-auto pb-3 pt-1">
            {groups.map((g, gi) => (
              <div key={gi} className="flex flex-col">
                {g.title && <div className="px-5 pb-[6px] pt-[18px] text-[10.5px] font-bold uppercase tracking-[.12em] text-neutral-700">{g.title}</div>}
                {g.items.map((n) => {
                  const Icon = ICONS[n.id] ?? LayoutDashboard;
                  const act = current?.id === n.id;
                  return (
                    <Link
                      key={n.id} href={n.href} aria-current={act ? "page" : undefined}
                      className="flex w-full items-center gap-3 px-5 py-[10px] text-left text-sm no-underline transition-colors"
                      style={act ? { background: "var(--color-text)", color: "var(--color-bg)", fontWeight: 700 } : { color: "var(--color-text)", fontWeight: 600 }}
                    >
                      <Icon size={17} aria-hidden style={{ color: act ? "var(--color-accent-400)" : "var(--color-neutral-700)" }} />
                      <span className="flex-1">{n.label}</span>
                      {!!n.badge && <span className="px-[7px] py-[1px] text-[11px] font-bold" style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}>{n.badge}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="border-t-2 border-text">
            {(() => {
              const who = (
                <>
                  <div className="grid h-9 w-9 flex-none place-items-center bg-text text-[13px] font-extrabold text-bg">{user.ini}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold">{user.n}</div>
                    <div className="truncate text-xs text-neutral-700">{user.rol}</div>
                  </div>
                </>
              );
              const cls = "flex items-center gap-3 border-b border-neutral-300 px-5 py-[14px]";
              return profileHref ? (
                <Link href={profileHref} className={`${cls} text-text no-underline hover:bg-neutral-200`} aria-current={path === profileHref ? "page" : undefined}>
                  {who}<span className="sr-only">, abrir Mi perfil</span>
                </Link>
              ) : <div className={cls}>{who}</div>;
            })()}
            <form action={cerrarSesion}>
              <button type="submit" className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-5 pb-3 pt-[10px] text-left text-[13px] font-semibold text-text hover:bg-neutral-200">
                <LogOut size={16} className="text-neutral-700" aria-hidden /> Cerrar sesión
              </button>
            </form>
          </div>
        </aside>
        <main id="contenido" className="min-w-0 flex-1">
          <div className="flex min-h-[50px] flex-wrap items-center gap-3 border-b border-neutral-300 px-10 py-[10px]">
            <span className="text-[13px] font-bold">{current?.label ?? "Panel"}</span>
            <div className="flex-1" />
            <span className="text-xs text-neutral-700">{topRight ?? "Lunes 5 de octubre, 2026"}</span>
            {topActions}
          </div>
          {scopeBanner}
          <div className="max-w-[1400px] px-10 pb-16 pt-8">
            {blocked ? (
              <div className="flex max-w-[560px] items-start gap-3 border-t-2 border-text bg-surface p-5">
                <Lock size={22} aria-hidden />
                <div>
                  <div className="text-lg font-extrabold">Tu rol no tiene acceso a este módulo</div>
                  <p className="!mb-0 mt-1 text-sm text-neutral-700">Pide a un administrador que revise los permisos de tu rol.</p>
                </div>
              </div>
            ) : (
              <div key={path} className="anim-in">{children}</div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
