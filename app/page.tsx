import { ArrowRight, Monitor, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Superficies" };

const SURF = [
  {
    k: "A", href: "/panel/login", title: "Panel interno DMC", who: "Para administradores, coordinadores y comerciales de DMC", cta: "Abrir panel interno", icon: Monitor, dev: "Escritorio",
    items: ["Clientes, marcas, zonas y contactos con cargos y alcance", "Sucursales con instalación por accesos e historial de equipos", "Garantías, calibraciones, catálogos y notificaciones", "Roles, permisos y auditoría global"],
    prev: "panel",
  },
  {
    k: "B", href: "/portal/login", title: "Portal cliente", who: "Para el cliente: sucursales, visitas, tickets y accesos de sus locales", cta: "Abrir portal cliente", icon: Monitor, dev: "Escritorio",
    items: ["Dashboard con visitas por año, mes y semana", "Sucursales por marca con datos técnicos completos", "Credenciales de locales: asignar, restablecer, bloquear", "Usuarios con rol y alcance por marca, zona o región"],
    prev: "portal",
  },
  {
    k: "C", href: "/local", title: "Portal del local", who: "Para el personal de tienda, sin cuenta personal: QR del local y clave", cta: "Abrir portal del local", icon: Smartphone, dev: "Celular · acceso por QR",
    items: ["Sucursal identificada por QR, solo pide la clave", "Trabajos realizados con técnico, detalle y fotos", "Reporte de problema que crea un ticket", "Mis reportes con estado y respuesta del técnico"],
    prev: "local",
  },
] as const;

function Preview({ kind }: { kind: string }) {
  if (kind === "local")
    return (
      <div className="flex h-[200px] justify-center overflow-hidden border border-neutral-400 bg-surface pt-[14px]">
        <div className="flex w-[116px] flex-col gap-[6px] border-2 border-b-0 border-text bg-bg p-2">
          <span className="h-[5px] w-10 bg-neutral-400" />
          <div className="flex h-[52px] flex-col justify-end bg-text p-[6px]"><span className="h-[5px] w-[60px] bg-bg" /></div>
          <div className="flex h-[52px] flex-col justify-end p-[6px]" style={{ background: "var(--color-accent)" }}><span className="h-[5px] w-11 bg-bg" /></div>
          <span className="h-[5px] bg-neutral-300" />
        </div>
      </div>
    );
  return (
    <div className="grid h-[200px] grid-cols-[56px_1fr] overflow-hidden border border-neutral-400 bg-bg">
      <div className="flex flex-col gap-2 bg-text px-[10px] py-3">
        <span className="h-[6px]" style={{ background: "var(--color-accent-400)" }} />
        {[1, 2, 3, 4].map((i) => (<span key={i} className="h-[6px] bg-neutral-700" />))}
      </div>
      {kind === "panel" ? (
        <div className="flex flex-col gap-[10px] p-3">
          <div className="grid grid-cols-3 gap-[6px]">
            {[["7", false], ["20", false], ["9", true]].map(([n, a]) => (
              <div key={String(n)} className="border-t-2 border-text pt-1">
                <div className="text-xl font-extrabold leading-none" style={{ color: a ? "var(--color-accent-700)" : undefined }}>{n}</div>
                <div className="mt-1 h-1 w-[60%] bg-neutral-300" />
              </div>
            ))}
          </div>
          <div className="flex flex-col border-t-2 border-text">
            {[["var(--color-accent-700)", "100%"], ["var(--color-accent-200)", "80%"], ["var(--color-neutral-300)", "60%"]].map(([c, w], i) => (
              <div key={i} className="flex items-center gap-[6px] border-b border-neutral-300 py-[7px]">
                <span className="h-[10px] w-[26px]" style={{ background: c }} />
                <span className="h-[5px] bg-neutral-300" style={{ width: w, flex: "none", maxWidth: "70%" }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-between gap-[10px] p-3">
          <div className="flex gap-[14px]">
            <div><div className="text-xl font-extrabold leading-none">8</div><div className="mt-1 h-1 w-[34px] bg-neutral-300" /></div>
            <div><div className="text-xl font-extrabold leading-none" style={{ color: "var(--color-accent-700)" }}>5</div><div className="mt-1 h-1 w-[34px] bg-neutral-300" /></div>
          </div>
          <div className="grid h-[92px] grid-cols-9 items-end gap-[5px] border-b-2 border-text">
            {[50, 42, 58, 66, 50, 75, 58, 66, 88].map((h, i) => (<span key={i} style={{ height: `${h}%`, background: i === 8 ? "var(--color-accent)" : "var(--color-text)" }} />))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-text px-6 py-5 md:px-12">
        <div className="flex items-center gap-4">
          <Image src="/DMC-logo.png" alt="Grupo dMC" width={120} height={56} priority className="h-14 w-auto" />
          <span className="h-8 w-[2px]" style={{ background: "var(--color-divider)" }} />
          <span className="text-lg font-extrabold">Clientes</span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[.1em] text-neutral-700">Prototipo navegable · Octubre 2026</span>
      </header>

      <section className="grid items-end gap-x-16 gap-y-8 px-6 pb-14 pt-16 md:px-12" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(380px,100%), 1fr))" }}>
        <div className="flex flex-col gap-5">
          <div className="kicker">Sistema de gestión de clientes</div>
          <h1 className="!m-0 !text-[clamp(40px,5.2vw,68px)] !leading-none !tracking-[-0.035em]">
            Cada cliente, cada local, cada equipo. <span style={{ color: "var(--color-accent)" }}>En un solo registro.</span>
          </h1>
        </div>
        <p className="!m-0 max-w-[520px] text-lg">
          Reemplaza al DMC Clientes legacy. Tres superficies con acceso separado: el equipo de DMC administra, el cliente supervisa sus sucursales y el personal de cada local reporta problemas desde el celular.
        </p>
      </section>

      <section className="grid border-y-2 border-text" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(340px,100%), 1fr))" }}>
        {SURF.map((s, i) => (
          <Link key={s.k} href={s.href} className="hover-surface flex flex-col gap-5 px-8 py-8 text-inherit no-underline md:px-8" style={{ borderRight: i < 2 ? "1px solid var(--color-neutral-400)" : undefined }}>
            <div className="flex items-baseline justify-between">
              <span className="text-5xl font-extrabold leading-none" style={{ color: "var(--color-accent)" }}>{s.k}</span>
              <span className="flex items-center gap-[6px] text-xs font-semibold text-neutral-700"><s.icon size={14} aria-hidden />{s.dev}</span>
            </div>
            <Preview kind={s.prev} />
            <div>
              <div className="text-[26px] font-extrabold leading-[1.1]">{s.title}</div>
              <div className="mt-1 text-[13px] text-neutral-700">{s.who}</div>
            </div>
            <div className="flex flex-col border-t-2 border-text">
              {s.items.map((t) => (<div key={t} className="border-b border-neutral-300 py-2 text-sm">{t}</div>))}
            </div>
            <span className="btn btn-primary btn-spread mt-auto !text-[15px]">{s.cta}<ArrowRight size={16} aria-hidden /></span>
          </Link>
        ))}
      </section>

      <footer className="flex flex-wrap justify-between gap-4 border-t-2 border-text px-6 py-5 text-xs text-neutral-700 md:px-12">
        <span>Grupo DMC · Ideas tecnológicas de seguridad</span>
        <span>Datos de ejemplo · Clave del portal del local: Andes-4821</span>
      </footer>
    </div>
  );
}
