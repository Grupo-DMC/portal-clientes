"use client";

import { ArrowLeft, ArrowRight, Check, CircleAlert, Info, KeyRound, Lock, MapPin, QrCode, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { avisarJefatura, ingresarLocal } from "@/app/actions/local";

export type Scan =
  | { kind: "invalido" }
  | { kind: "ok" | "sinclave" | "bloqueado"; cod: string; n: string; marca: string; dir: string };

const CASOS: [string, string][] = [["AM-012", "QR válido"], ["AM-031", "Local sin clave"], ["AK-003", "Local bloqueado"], ["XX-000", "QR inválido"]];
const big = "!min-h-[52px] !text-[17px]";

function Top({ link }: { link?: boolean }) {
  return (
    <div className="flex items-center gap-[10px] px-5 pt-5">
      <Image src="/DMC-logo.png" alt="Grupo dMC" width={86} height={40} priority className="h-10 w-auto" />
      <span className="flex-1 text-sm font-semibold">Portal del local</span>
      {link && <Link href="/" className="flex min-h-11 items-center text-xs font-semibold">Inicio</Link>}
    </div>
  );
}

export default function LocalEntry({ scan, codigoMode, notice }: { scan: Scan; codigoMode: boolean; notice?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"qr" | "codigo">(codigoMode ? "codigo" : "qr");
  const [cod, setCod] = useState("");
  const [clave, setClave] = useState("");
  const [err, setErr] = useState("");
  const [lock, setLock] = useState<null | "tries" | "admin">(scan.kind === "bloqueado" ? "admin" : null);
  const [sinclave, setSinclave] = useState(scan.kind === "sinclave");
  const [avis, setAvis] = useState(false);

  const enter = (code: string) => {
    if (pending) return;
    if (!clave) return setErr("Ingresa la clave del local.");
    setErr("");
    start(async () => {
      const r = await ingresarLocal({ cod: code, clave });
      if (r.ok) { router.refresh(); return; }
      if (r.kind === "error") setErr(r.error);
      else if (r.kind === "sinclave") { setSinclave(true); setMode("qr"); }
      else { setLock(r.why); setMode("qr"); setClave(""); }
    });
  };

  const lockTxt = lock === "tries"
    ? "Superaste los 3 intentos permitidos. Tu jefatura puede restablecer la clave desde el portal cliente."
    : "Tu empresa bloqueó el acceso de este local. Tu jefatura puede desbloquearlo desde el portal cliente.";

  return (
    <div className="flex min-h-screen justify-center bg-surface text-text">
      <div className="flex min-h-screen w-full max-w-[440px] flex-col bg-bg" style={{ boxShadow: "var(--shadow-md)" }}>
        {mode === "qr" ? (
          <>
            <Top link />
            <div className="flex flex-1 flex-col gap-5 px-5 pb-5 pt-7">
              {notice && <div role="status" className="flex gap-[10px] border-t-2 border-text bg-surface px-3 py-[10px] text-sm"><Info size={16} className="mt-[2px]" aria-hidden />{notice}</div>}
              {scan.kind === "invalido" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em]" style={{ color: "var(--color-danger-700)" }}><QrCode size={15} aria-hidden />QR no reconocido</div>
                  <h1 className="!m-0 !text-[30px] !leading-[1.1]">No pudimos identificar tu local</h1>
                  <p className="!m-0 text-[15px] text-neutral-700">El QR está dañado o fue reemplazado. Ingresa con el código de sucursal que aparece impreso junto al QR.</p>
                  <button className="btn btn-primary btn-spread !min-h-[52px] !text-base" onClick={() => setMode("codigo")}>Ingresar con código <ArrowRight size={18} aria-hidden /></button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-5">
                    <div className="kicker flex items-center gap-2 !font-semibold"><QrCode size={15} aria-hidden />Sucursal identificada por QR</div>
                    <div className="border-t-2 border-text pt-[14px]">
                      <div className="text-[13px] text-neutral-700">{scan.marca} · {scan.cod}</div>
                      <div className="mt-[2px] text-[30px] font-extrabold leading-[1.1]">{scan.n}</div>
                      <div className="mt-[6px] flex gap-[6px] text-sm"><MapPin size={15} className="mt-[2px] flex-none" aria-hidden />{scan.dir}</div>
                    </div>
                  </div>
                  {!lock && !sinclave && (
                    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); enter(scan.cod); }} noValidate>
                      <div className="field">
                        <label htmlFor="lc" className="!text-[13px]">Clave del local</label>
                        <input id="lc" className={`input ${big}`} type="password" autoComplete="current-password" value={clave} placeholder="Clave entregada por tu empresa" aria-invalid={!!err} style={{ borderColor: err ? "var(--color-danger)" : undefined }} onChange={(e) => { setClave(e.target.value); setErr(""); }} />
                      </div>
                      {err && <div role="alert" className="flex gap-2 px-3 py-[10px] text-sm" style={{ background: "var(--color-danger-100)", color: "var(--color-danger-800)" }}><CircleAlert size={16} className="mt-[2px]" aria-hidden />{err}</div>}
                      <button type="submit" disabled={pending} className="btn btn-primary btn-spread !min-h-[52px] !text-base">{pending ? "Validando…" : "Ingresar"}<ArrowRight size={18} aria-hidden /></button>
                      <div className="text-xs text-neutral-700">Demostración: la clave es <strong>Andes-4821</strong>. Tres errores bloquean el acceso.</div>
                    </form>
                  )}
                  {sinclave && !lock && (
                    <div className="flex gap-3 border-t-2 border-text bg-surface p-[14px] text-sm"><KeyRound size={20} className="mt-[1px] flex-none" aria-hidden /><span><strong>Este local aún no tiene clave.</strong> Pídele a tu jefatura que la genere desde el portal cliente (Credenciales de locales) y vuelve a escanear el QR.</span></div>
                  )}
                  {lock && (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-3 p-[14px] text-sm" style={{ background: "var(--color-danger-100)", color: "var(--color-danger-800)" }}><Lock size={20} className="mt-[1px] flex-none" aria-hidden /><span><strong>Acceso bloqueado.</strong> {lockTxt}</span></div>
                      {avis
                        ? <div role="status" className="flex gap-[10px] bg-surface px-3 py-[10px] text-sm"><Check size={16} className="mt-[2px]" aria-hidden />Aviso enviado al administrador de tu empresa.</div>
                        : <button className="btn btn-secondary btn-spread !min-h-[52px] !text-base" onClick={() => start(async () => { await avisarJefatura(); setAvis(true); })}>Avisar a mi jefatura <Send size={17} aria-hidden /></button>}
                    </div>
                  )}
                </>
              )}
              <div className="flex-1" />
              <div className="flex flex-col border-t-2 border-text">
                <div className="pb-[6px] pt-2 text-[11px] font-bold uppercase tracking-[.1em] text-neutral-700">Casos de demostración</div>
                <div className="flex flex-wrap gap-[6px]">
                  {CASOS.map(([c, t]) => {
                    const on = scan.kind === "invalido" ? c === "XX-000" : c === scan.cod;
                    return <Link key={c} href={`/local?s=${c}`} className="flex min-h-9 items-center border border-text px-3 text-[13px] font-semibold no-underline" style={{ background: on ? "var(--color-text)" : "transparent", color: on ? "var(--color-bg)" : "var(--color-text)" }}>{t}</Link>;
                  })}
                </div>
              </div>
              <button className="btn btn-ghost self-start !min-h-11" onClick={() => { setMode("codigo"); setErr(""); }}>¿No escaneaste el QR? Ingresa con código de sucursal</button>
            </div>
          </>
        ) : (
          <>
            <Top />
            <form className="flex flex-col gap-[18px] px-5 py-7" onSubmit={(e) => { e.preventDefault(); if (!cod.trim()) return setErr("Ingresa el código de tu sucursal."); enter(cod.trim().toUpperCase()); }} noValidate>
              <h1 className="!m-0 !text-[30px]">Ingresa a tu local</h1>
              <div className="field"><label htmlFor="cc" className="!text-[13px]">Código de sucursal</label><input id="cc" className={`input ${big} uppercase`} value={cod} placeholder="Ej. AM-012" maxLength={12} autoCapitalize="characters" onChange={(e) => { setCod(e.target.value); setErr(""); }} /></div>
              <div className="field"><label htmlFor="cl" className="!text-[13px]">Clave del local</label><input id="cl" className={`input ${big}`} type="password" autoComplete="current-password" value={clave} aria-invalid={!!err} style={{ borderColor: err ? "var(--color-danger)" : undefined }} onChange={(e) => { setClave(e.target.value); setErr(""); }} /></div>
              {err && <div role="alert" className="flex gap-2 px-3 py-[10px] text-sm" style={{ background: "var(--color-danger-100)", color: "var(--color-danger-800)" }}><CircleAlert size={16} className="mt-[2px]" aria-hidden />{err}</div>}
              <button type="submit" disabled={pending} className="btn btn-primary btn-spread !min-h-[52px] !text-base">{pending ? "Validando…" : "Ingresar"}<ArrowRight size={18} aria-hidden /></button>
              <div className="flex flex-col gap-[2px] text-xs text-neutral-700"><span>Demostración: <strong>AM-012</strong> · clave <strong>Andes-4821</strong></span><span><strong>AM-031</strong> sin clave · <strong>AK-003</strong> bloqueado · otro código: no existe</span></div>
              <button type="button" className="btn btn-ghost self-start !min-h-11" onClick={() => { setMode("qr"); setErr(""); }}><ArrowLeft size={15} aria-hidden />Volver</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
