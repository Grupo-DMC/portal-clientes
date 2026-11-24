"use client";

import { useEffect, useRef, useState } from "react";
import { solicitarRecuperacion } from "@/app/actions/auth";
import { Banner, SubmitButton, TextField } from "./Field";
import Icon from "./Icon";
import { validateEmail } from "./validation";
import s from "./login.module.css";

const FAIL = "No pudimos enviar la solicitud. Inténtalo nuevamente en unos minutos.";

export default function RecoverForm({ initialEmail = "", onBack, onShake }: { initialEmail?: string; onBack: () => void; onShake: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setSent(false);
    setAlert("");
    const mail = email.trim().toLowerCase();
    const err = validateEmail(mail);
    setError(err);
    if (err) {
      emailRef.current?.focus();
      onShake();
      return;
    }
    setLoading(true);
    try {
      const res = await solicitarRecuperacion({ email: mail });
      if (res.ok) {
        setSent(true);
      } else {
        setAlert(res.error ?? FAIL);
        onShake();
      }
    } catch {
      setAlert(FAIL);
      onShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Recuperar contraseña</h1>
      <p className={s.sub}>Te enviaremos las instrucciones a tu correo.</p>

      <Banner tone="ok">{sent ? "Si el correo corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña en unos minutos." : ""}</Banner>
      <Banner>{alert}</Banner>

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          ref={emailRef}
          id="rEmail"
          name="rEmail"
          label="Correo"
          icon="user"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nombre@empresa.cl"
          value={email}
          error={error}
          onChange={(e) => { setEmail(e.target.value); setError(""); setAlert(""); }}
        />
        <div className={s.gap8} />
        <SubmitButton loading={loading}>Enviar instrucciones</SubmitButton>
      </form>

      <button className={s.btnGhost} type="button" onClick={onBack}>
        <Icon name="arrowLeft" />
        Volver a iniciar sesión
      </button>
    </div>
  );
}
