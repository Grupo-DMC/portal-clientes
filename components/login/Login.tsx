"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import BrandPanel from "./BrandPanel";
import LoginForm from "./LoginForm";
import RecoverForm from "./RecoverForm";
import SuccessView from "./SuccessView";
import type { WavesHandle } from "./WavesCanvas";
import { figtree, outfit } from "./fonts";
import s from "./login.module.css";

type View = { name: "login" | "recover"; email: string } | { name: "done"; to: string };

/** Login único de Grupo DMC. Vistas: iniciar sesión, recuperar contraseña y acceso correcto. */
export default function Login({ loggedOut = false }: { loggedOut?: boolean }) {
  const [view, setView] = useState<View>({ name: "login", email: "" });
  const [showNotice, setShowNotice] = useState(loggedOut);
  const wavesRef = useRef<WavesHandle>(null);
  const wrapRef = useRef<HTMLElement>(null);

  // Reinicia la animación de "sacudida" del formulario ante un error.
  const shake = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.classList.remove(s.shake);
    void el.offsetWidth;
    el.classList.add(s.shake);
  }, []);

  const go = (name: "login" | "recover", email = "") => {
    wrapRef.current?.classList.remove(s.shake);
    setShowNotice(false);
    setView({ name, email });
  };

  return (
    <div className={`${s.shell} ${outfit.variable} ${figtree.variable}`}>
      <BrandPanel wavesRef={wavesRef} />

      <main className={s.panel}>
        <div className={s.stage}>
          <section className={s.formWrap} ref={wrapRef}>
            <Image className={s.logo} src="/login/logo-dmc.png" alt="Grupo DMC, Ideas Tecnológicas de Seguridad" width={561} height={199} priority />

            {view.name === "login" && (
              <LoginForm
                initialEmail={view.email}
                notice={showNotice ? "Cerraste sesión correctamente." : undefined}
                onShake={shake}
                onForgot={(e) => go("recover", e)}
                onSuccess={(to) => {
                  wavesRef.current?.pulse();
                  setView({ name: "done", to });
                }}
              />
            )}
            {view.name === "recover" && (
              <RecoverForm initialEmail={view.email} onShake={shake} onBack={() => go("login", view.email)} />
            )}
            {view.name === "done" && <SuccessView to={view.to} />}
          </section>
        </div>

        <footer className={s.panelFoot}>
          <span>© {new Date().getFullYear()} Grupo DMC · Ideas Tecnológicas de Seguridad</span>
        </footer>
      </main>
    </div>
  );
}
