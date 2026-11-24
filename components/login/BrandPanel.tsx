"use client";

import Image from "next/image";
import { useRef, type RefObject } from "react";
import WavesCanvas, { type WavesHandle } from "./WavesCanvas";
import s from "./login.module.css";

/** Panel izquierdo: foto del local con velo morado, ondas animadas y mensaje de marca. */
export default function BrandPanel({ wavesRef }: { wavesRef: RefObject<WavesHandle | null> }) {
  const asideRef = useRef<HTMLElement>(null);
  return (
    <aside className={s.brand} ref={asideRef} aria-hidden="true">
      <Image className={s.photo} src="/login/banner.jpg" alt="" fill priority sizes="(max-width: 960px) 100vw, 60vw" />
      <WavesCanvas ref={wavesRef} targetRef={asideRef} />
      <div className={s.brandCopy}>
        <p className={s.brandKicker}>Ideas tecnológicas de seguridad</p>
        <h2>Protegemos el retail con tecnología que no se detiene.</h2>
        <p>Accede a la plataforma de Grupo DMC con tu cuenta.</p>
      </div>
    </aside>
  );
}
