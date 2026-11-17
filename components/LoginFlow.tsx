"use client";

import { ArrowLeft, ArrowRight, Check, CircleAlert, Circle, ExternalLink, Info, Lock, Mail, Send, UserX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { abrirEnlaceDemo, definirPassword, iniciarSesion, solicitarDesbloqueo, solicitarRecuperacion, verificarMfa, type LoginResult } from "@/app/actions/auth";
import type { PublicAcct } from "@/lib/server/accounts";
import { initials } from "@/lib/format";

export type LoginCopy = {
  brand: string; kicker: string; title: string; idLabel: string; idPlaceholder: string; sideTitle: string; sideEm: string; sideText: string;
  inactiveText: string; notice?: string; support: string;
};
type Step = "login" | "mfa" | "first" | "forgot" | "sent" | "locked" | "inactive";

const CASO: Record<string, [string, string]> = {
  ok: ["var(--color-neutral-700)", "var(--color-bg)"],
  mfa: ["var(--color-accent-100)", "var(--color-accent-800)"],
  primer: ["var(--color-accent-100)", "var(--color-accent-800)"],
  bloqueado: ["var(--color-danger)", "#fff"],
  inactivo: ["var(--color-neutral-700)", "var(--color-bg)"],
};

function Alert({ tone, icon, children }: { tone: "danger" | "surface" | "accent"; icon: React.ReactNode; children: React.ReactNode }) {
  const s = tone === "danger" ? { background: "var(--color-danger-100)", color: "var(--color-danger-800)" } : tone === "accent" ? { background: "var(--color-accent-100)", color: "var(--color-accent-800)" } : { background: "var(--color-surface)", borderTop: "2px solid var(--color-text)" };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className="flex gap-[10px] px-3 py-[10px] text-sm" style={s}>
      <span className="mt-[2px]">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function SubmitBtn({ children, disabled }: { children: React.ReactNode; disabled: boolean }) {
  return (
    <button type="submit" className="btn btn-primary btn-spread" disabled={disabled}>
      {children} <ArrowRight size={16} aria-hidden />
    </button>
  );
}

export default function LoginFlow({ surface, copy, accounts, demoNotice }: { surface: "panel" | "portal"; copy: LoginCopy; accounts: PublicAcct[]; demoNotice?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState(demoNotice ?? "");
  const [showNotice, setShowNotice] = useState(!!copy.notice);
  const [code, setCode] = useState("");
  const [np, setNp] = useState("");
  const [np2, setNp2] = useState("");
  const [reset, setReset] = useState(false);
  const [fEmail, setFEmail] = useState("");
  const [lockWhy, setLockWhy] = useState<"tries" | "admin">("admin");
  const [reqSent, setReqSent] = useState(false);

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const rules: [string, boolean][] = [
    ["Al menos 8 caracteres", np.length >= 8],
    ["Una letra mayúscula", /[A-ZÑ]/.test(np)],
    ["Un número", /\d/.test(np)],
    ["Las dos contraseñas coinciden", !!np2 && np === np2],
  ];
  const allOk = rules.every((r) => r[1]);

  const go = (s: Step, extra?: () => void) => (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setStep(s); setErr(""); setInfo(""); extra?.();
  };

  const apply = (r: LoginResult) => {
    switch (r.step) {
      case "error": setErr(r.error); break;
      case "locked": setLockWhy(r.why); setReqSent(false); setStep("locked"); setErr(""); break;
      case "inactive": setStep("inactive"); break;
      case "first": setReset(!!r.reset); setNp(""); setNp2(""); setErr(""); setStep("first"); break;
      case "mfa": setCode(""); setErr(""); setStep("mfa"); break;
      case "login": setStep("login"); setPass(""); setInfo(r.notice); setShowNotice(true); break;
      case "done": router.replace(r.to); router.refresh(); break;
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const em = email.trim();
    if (!em || !pass) return setErr("Ingresa tu correo y tu contraseña.");
    if (!isEmail(em)) return setErr("El correo no tiene un formato válido. Ejemplo: nombre@empresa.cl");
    setErr("");
    start(async () => apply(await iniciarSesion({ surface, email: em, password: pass, remember })));
  };
  const submitMfa = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (code.length < 6) return setErr("Ingresa los 6 dígitos del código.");
    start(async () => apply(await verificarMfa(code)));
  };
  const submitFirst = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allOk || pending) return;
    start(async () => apply(await definirPassword({ np, np2 })));
  };
  const submitForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const em = fEmail.trim();
    if (!em) return setErr("Ingresa el correo de tu cuenta.");
    if (!isEmail(em)) return setErr("El correo no tiene un formato válido.");
    start(async () => {
      const r = await solicitarRecuperacion({ email: em });
      if (r.ok) { setErr(""); setStep("sent"); } else setErr(r.error ?? "Correo no válido.");
    });
  };

  const titles: Record<Step, string> = {
    login: copy.title, mfa: "Verificación en dos pasos", first: reset ? "Crea una nueva contraseña" : "Define tu contraseña",
    forgot: "Recupera tu acceso", sent: "Revisa tu correo", locked: "Acceso bloqueado", inactive: "Cuenta desactivada",
  };
  const bd = (bad: boolean) => (bad ? "var(--color-danger)" : "var(--color-divider)");
  const Back = (
    <a href="#" onClick={go("login", () => setShowNotice(false))} className="flex items-center gap-[6px] text-[13px] font-semibold">
      <ArrowLeft size={14} aria-hidden /> Volver a iniciar sesión
    </a>
  );
  return (
    <div className="grid min-h-screen bg-bg text-text" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(460px,100%), 1fr))" }}>
      <div className="flex flex-col justify-between gap-8 px-[clamp(24px,5vw,64px)] py-10">
        <div className="flex items-center gap-[14px]">
          <Image src="/DMC-logo.png" alt="Grupo dMC" width={110} height={52} priority className="h-[52px] w-auto" />
          <span className="h-7 w-[2px]" style={{ background: "var(--color-divider)" }} />
          <span className="text-base font-extrabold">{copy.brand}</span>
        </div>

        <div className="flex w-full max-w-[400px] flex-col gap-5">
          <div className="kicker">{copy.kicker}</div>
          <h1 className="!m-0 !text-[38px] !leading-[1.05] !tracking-[-0.03em]">{titles[step]}</h1>

          {step === "login" && (
            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
              {showNotice && (info || copy.notice) && <Alert tone="surface" icon={<Info size={16} aria-hidden />}>{info || copy.notice}</Alert>}
              {err && <Alert tone="danger" icon={<CircleAlert size={16} aria-hidden />}>{err}</Alert>}
              <div className="field">
                <label htmlFor="lg-email">{copy.idLabel}</label>
                <input id="lg-email" className="input" type="email" autoComplete="username" value={email} placeholder={copy.idPlaceholder} aria-invalid={!!err} onChange={(e) => { setEmail(e.target.value); setErr(""); setInfo(""); }} style={{ borderColor: bd(!!err) }} />
              </div>
              <div className="field">
                <label htmlFor="lg-pass">Contraseña</label>
                <div className="relative">
                  <input id="lg-pass" className="input !pr-[84px]" type={show ? "text" : "password"} autoComplete="current-password" value={pass} aria-invalid={!!err} onChange={(e) => { setPass(e.target.value); setErr(""); }} style={{ borderColor: bd(!!err) }} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 cursor-pointer border-0 bg-transparent px-3 text-[13px] font-semibold" style={{ color: "var(--color-accent-700)" }}>
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input type="checkbox" className="chk" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Mantener sesión iniciada
                </label>
                <a href="#" onClick={go("forgot", () => setFEmail(email))} className="text-[13px] font-semibold">¿Olvidaste tu contraseña?</a>
              </div>
              <SubmitBtn disabled={pending}>{pending ? "Validando…" : "Ingresar"}</SubmitBtn>
            </form>
          )}

          {step === "mfa" && (
            <form onSubmit={submitMfa} className="flex flex-col gap-4" noValidate>
              <p className="!m-0 text-[15px] text-neutral-700">Enviamos un código de 6 dígitos a tu celular terminado en <strong className="text-text">•• 482</strong>. Vence en 5 minutos.</p>
              {err && <Alert tone="danger" icon={<CircleAlert size={16} aria-hidden />}>{err}</Alert>}
              {info && <Alert tone="surface" icon={<Check size={16} aria-hidden />}>{info}</Alert>}
              <div className="field">
                <label htmlFor="lg-code">Código de verificación</label>
                <input id="lg-code" className="input !min-h-14 !text-[26px] !font-bold !tracking-[.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} placeholder="000000" aria-invalid={!!err} style={{ borderColor: bd(!!err) }} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErr(""); }} />
              </div>
              <SubmitBtn disabled={pending}>{pending ? "Verificando…" : "Verificar y entrar"}</SubmitBtn>
              <div className="flex flex-wrap justify-between gap-3 text-[13px]">
                <a href="#" className="font-semibold" onClick={(e) => { e.preventDefault(); setInfo("Enviamos un nuevo código. Puede tardar unos segundos."); setErr(""); }}>Reenviar código</a>
                <a href="#" className="font-semibold" onClick={go("login", () => setShowNotice(false))}>Usar otra cuenta</a>
              </div>
              <div className="text-xs text-neutral-700">Demostración: el código es <strong>123456</strong></div>
            </form>
          )}

          {step === "first" && (
            <form onSubmit={submitFirst} className="flex flex-col gap-4" noValidate>
              <p className="!m-0 text-[15px] text-neutral-700">
                {reset ? "Elige una contraseña que no hayas usado antes. Al guardarla, cerraremos las demás sesiones abiertas." : "Tu cuenta tiene una contraseña temporal. Crea una propia para continuar; solo tú la conocerás."}
              </p>
              {err && <Alert tone="danger" icon={<CircleAlert size={16} aria-hidden />}>{err}</Alert>}
              <div className="field"><label htmlFor="lg-np">Nueva contraseña</label><input id="lg-np" className="input" type="password" autoComplete="new-password" value={np} onChange={(e) => setNp(e.target.value)} /></div>
              <div className="field"><label htmlFor="lg-np2">Repite la contraseña</label><input id="lg-np2" className="input" type="password" autoComplete="new-password" value={np2} onChange={(e) => setNp2(e.target.value)} /></div>
              <div className="flex flex-col border-t-2 border-text" aria-label="Requisitos de la contraseña">
                {rules.map(([t, ok]) => (
                  <div key={t} className="flex items-center gap-[10px] border-b border-neutral-300 py-[7px] text-[13px]" style={{ color: ok ? "var(--color-text)" : "var(--color-neutral-700)" }}>
                    {ok ? <Check size={15} aria-hidden /> : <Circle size={15} aria-hidden />} {t}
                  </div>
                ))}
              </div>
              <SubmitBtn disabled={!allOk || pending}>{reset ? "Guardar contraseña" : "Guardar y continuar"}</SubmitBtn>
            </form>
          )}

          {step === "forgot" && (
            <form onSubmit={submitForgot} className="flex flex-col gap-4" noValidate>
              <p className="!m-0 text-[15px] text-neutral-700">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.</p>
              {err && <Alert tone="danger" icon={<CircleAlert size={16} aria-hidden />}>{err}</Alert>}
              <div className="field"><label htmlFor="lg-f">{copy.idLabel}</label><input id="lg-f" className="input" type="email" value={fEmail} placeholder={copy.idPlaceholder} onChange={(e) => { setFEmail(e.target.value); setErr(""); }} /></div>
              <SubmitBtn disabled={pending}>{pending ? "Enviando…" : "Enviar enlace"}</SubmitBtn>
              {Back}
            </form>
          )}

          {step === "sent" && (
            <div className="flex flex-col gap-4">
              <p className="!m-0 text-[15px]">Si <strong>{fEmail}</strong> corresponde a una cuenta activa, recibirás un correo con el enlace en los próximos minutos. El enlace vence en 30 minutos.</p>
              <Alert tone="surface" icon={<Mail size={16} aria-hidden />}>¿No llega? Revisa la carpeta de spam o escribe a {copy.support}.</Alert>
              <button type="button" className="btn btn-secondary btn-spread" onClick={() => start(async () => apply(await abrirEnlaceDemo({ surface, email: fEmail.trim() })))}>
                Demostración: abrir el enlace del correo <ExternalLink size={16} aria-hidden />
              </button>
              {Back}
            </div>
          )}

          {step === "locked" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 p-[14px] text-sm" style={{ background: "var(--color-danger-100)", color: "var(--color-danger-800)" }}>
                <Lock size={20} className="mt-[1px] flex-none" aria-hidden />
                <span>
                  {lockWhy === "tries"
                    ? "Superaste los 3 intentos permitidos. Por seguridad bloqueamos el acceso de esta cuenta hasta que soporte la desbloquee."
                    : "Esta cuenta fue bloqueada por un administrador. No puedes ingresar hasta que sea desbloqueada."}
                </span>
              </div>
              {reqSent ? (
                <Alert tone="surface" icon={<Check size={16} aria-hidden />}>Solicitud enviada a {copy.support}. Te responderemos en horario hábil (lunes a viernes, 9:00 a 18:00).</Alert>
              ) : (
                <button type="button" className="btn btn-primary btn-spread" onClick={() => start(async () => { await solicitarDesbloqueo(); setReqSent(true); })}>
                  Solicitar desbloqueo <Send size={16} aria-hidden />
                </button>
              )}
              {Back}
            </div>
          )}

          {step === "inactive" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 border-t-2 border-text bg-surface p-[14px] text-sm">
                <UserX size={20} className="mt-[1px] flex-none" aria-hidden />
                <span>{copy.inactiveText}</span>
              </div>
              {Back}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-4 text-xs text-neutral-700">
          <span>¿Problemas para ingresar? Escribe a {copy.support}</span>
          <Link href="/" className="font-semibold">Cambiar de superficie</Link>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-10 p-[clamp(32px,5vw,64px)]" style={{ background: "var(--color-text)", color: "var(--color-bg)", borderTop: "8px solid var(--color-accent)" }}>
        <div className="flex flex-col gap-4">
          <div className="max-w-[560px] text-[clamp(36px,4.4vw,56px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-balance">
            {copy.sideTitle} <span style={{ color: "var(--color-accent-400)" }}>{copy.sideEm}</span>
          </div>
          <div className="max-w-[460px] text-base text-neutral-300">{copy.sideText}</div>
        </div>
        <div className="flex max-w-[520px] flex-col">
          <div className="flex items-baseline justify-between pb-2 pt-[10px]" style={{ borderTop: "2px solid var(--color-bg)" }}>
            <span className="text-[11px] font-bold uppercase tracking-[.1em]">Cuentas de demostración</span>
            <span className="text-xs text-neutral-400">Toca una para rellenar</span>
          </div>
          {accounts.map((a) => {
            const k = a.status === "ok" && a.mfa ? "mfa" : a.status;
            const c = CASO[k] ?? CASO.ok;
            return (
              <button
                key={a.email} type="button"
                onClick={() => { setStep("login"); setEmail(a.email); setPass(a.hint); setErr(""); setInfo(""); setShowNotice(false); }}
                className="grid cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-0 border-t border-neutral-700 bg-transparent py-[10px] pr-2 text-left text-inherit hover:bg-neutral-800"
              >
                <span className="grid h-8 w-8 place-items-center bg-bg text-xs font-extrabold text-text">{initials(a.name)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{a.name}</span>
                  <span className="block truncate text-xs text-neutral-400">{a.email}</span>
                </span>
                <span className="whitespace-nowrap px-2 py-[3px] text-[11px] font-bold" style={{ background: c[0], color: c[1] }}>{a.caso}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
