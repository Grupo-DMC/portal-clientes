"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { safeInternalPath } from "./validation";
import s from "./login.module.css";

/** Pantalla de acceso correcto. Tras una breve pausa navega a la ruta indicada por el servidor. */
export default function SuccessView({ to }: { to: string }) {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const t = setTimeout(() => {
      router.replace(safeInternalPath(to));
      router.refresh();
    }, 700);
    return () => clearTimeout(t);
  }, [to, router]);

  return (
    <div>
      <div className={s.doneIco}>
        <svg className={s.i} viewBox="0 0 24 24" aria-hidden="true"><path className={s.tick} d="m5 12.5 4.5 4.5L19 7.5" /></svg>
      </div>
      <h1 ref={titleRef} tabIndex={-1}>Acceso correcto</h1>
      <p className={s.sub}>Te estamos redirigiendo…</p>
      <div className={s.bar} aria-hidden="true"><i /></div>
    </div>
  );
}
