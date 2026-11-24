"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cambiarClave } from "@/app/actions/auth";
import BrandPanel from "./BrandPanel";
import { Banner, PasswordField, SubmitButton } from "./Field";
import type { WavesHandle } from "./WavesCanvas";
import { figtree, outfit } from "./fonts";
import s from "./login.module.css";

/** Cambio de clave obligatorio antes de entrar al portal (debe_cambiar_password = 1). */
export default function CambioClave({ nombre }: { nombre: string }) {
  const wavesRef = useRef<WavesHandle>(null);
  const nuevaRef = useRef<HTMLInputElement>(null);
  const confRef = useRef<HTMLInputElement>(null);
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errors, setErrors] = useState<{ nueva?: string; confirmar?: string }>({});
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setAlert("");
    setErrors({});
    setLoading(true);
    try {
      const res = await cambiarClave({ nueva, confirmar });
      if (res.ok) {
        wavesRef.current?.pulse();
        window.location.assign(res.to);
        return;
      }
      if (res.campo) {
        setErrors({ [res.campo]: res.error });
        (res.campo === "confirmar" ? confRef : nuevaRef).current?.focus();
      } else setAlert(res.error);
    } catch {
      setAlert("No pudimos cambiar la clave. Inténtalo nuevamente en unos minutos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${s.shell} ${outfit.variable} ${figtree.variable}`}>
      <BrandPanel wavesRef={wavesRef} />
      <main className={s.panel}>
        <div className={s.stage}>
          <section className={s.formWrap}>
            <Image className={s.logo} src="/login/logo-dmc.png" alt="Grupo DMC, Ideas Tecnológicas de Seguridad" width={561} height={199} priority />
            <h1 tabIndex={-1}>Cambia tu clave</h1>
            <p className={s.sub}>Hola, {nombre}. Antes de entrar debes definir una clave nueva. Usa al menos 10 caracteres, con letras y números.</p>
            <Banner>{alert}</Banner>
            <form onSubmit={onSubmit} noValidate>
              <PasswordField ref={nuevaRef} id="nueva" name="nueva" label="Clave nueva" autoComplete="new-password"
                value={nueva} error={errors.nueva} onChange={(e) => { setNueva(e.target.value); setErrors((x) => ({ ...x, nueva: "" })); }} />
              <PasswordField ref={confRef} id="confirmar" name="confirmar" label="Repite la clave nueva" autoComplete="new-password"
                value={confirmar} error={errors.confirmar} onChange={(e) => { setConfirmar(e.target.value); setErrors((x) => ({ ...x, confirmar: "" })); }} />
              <SubmitButton loading={loading} arrow>Guardar y entrar</SubmitButton>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
