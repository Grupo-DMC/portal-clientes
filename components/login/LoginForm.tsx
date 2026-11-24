"use client";

import { useEffect, useRef, useState } from "react";
import { iniciarSesion } from "@/app/actions/auth";
import { Banner, PasswordField, SubmitButton, TextField } from "./Field";
import { validateEmail } from "./validation";
import s from "./login.module.css";

export default function LoginForm({
  initialEmail = "", notice, onSuccess, onForgot, onShake,
}: {
  initialEmail?: string;
  notice?: string;
  onSuccess: (to: string) => void;
  onForgot: (email: string) => void;
  onShake: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    (initialEmail ? titleRef : emailRef).current?.focus();
  }, [initialEmail]);

  const clearErrors = (field: "email" | "password") => {
    setErrors((e) => (e[field] ? { ...e, [field]: "" } : e));
    setAlert("");
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setAlert("");
    const mail = email.trim().toLowerCase();
    const next = { email: validateEmail(mail), password: password ? "" : "Ingresa tu contraseña." };
    setErrors(next);
    if (next.email || next.password) {
      (next.email ? emailRef : passRef).current?.focus();
      onShake();
      return;
    }

    setLoading(true);
    try {
      const res = await iniciarSesion({ email: mail, password, remember });
      if (res.step === "done") {
        onSuccess(res.to);
        return;
      }
      setAlert(res.error);
      setPassword("");
      passRef.current?.focus();
      onShake();
    } catch {
      setAlert("No pudimos iniciar sesión. Inténtalo nuevamente en unos minutos.");
      setPassword("");
      passRef.current?.focus();
      onShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 ref={titleRef} tabIndex={-1}>Iniciar sesión</h1>
      <p className={s.sub}>Ingresa tus credenciales para continuar.</p>

      <Banner tone="ok">{notice}</Banner>
      <Banner>{alert}</Banner>

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          ref={emailRef}
          id="email"
          name="email"
          label="Correo"
          icon="user"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nombre@empresa.cl"
          value={email}
          error={errors.email}
          onChange={(e) => { setEmail(e.target.value); clearErrors("email"); }}
        />

        <PasswordField
          ref={passRef}
          id="pass"
          name="password"
          label="Contraseña"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          error={errors.password}
          onChange={(e) => { setPassword(e.target.value); clearErrors("password"); }}
        />

        <div className={s.row}>
          <label className={s.check}>
            <input type="checkbox" id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Mantener sesión</span>
          </label>
          <button className={s.link} type="button" onClick={() => onForgot(email.trim())}>
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <SubmitButton loading={loading} arrow>Ingresar</SubmitButton>
      </form>

      <p className={s.help}>¿Problemas para ingresar? Contacta al área de TI de Grupo DMC o a tu ejecutivo de cuenta.</p>
    </div>
  );
}
