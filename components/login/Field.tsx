"use client";

import { useState, type ComponentProps, type ReactNode, type Ref } from "react";
import Icon, { type IconName } from "./Icon";
import s from "./login.module.css";

/** Mensaje bajo un campo: error (rojo) o aviso (ámbar). */
export function FieldMessage({ id, tone = "error", children }: { id: string; tone?: "error" | "note"; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className={tone === "error" ? s.msg : s.note} id={id}>
      <Icon name="alert" />
      <span>{children}</span>
    </p>
  );
}

type InputProps = Omit<ComponentProps<"input">, "id" | "ref">;

/** Campo de texto con ícono a la izquierda. */
export function TextField({ id, label, icon, error, ref, ...inputProps }: InputProps & { id: string; label: string; icon: IconName; error?: string; ref?: Ref<HTMLInputElement> }) {
  const msgId = `${id}Msg`;
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <div className={s.control}>
        <Icon name={icon} className={s.ico} />
        <input
          ref={ref}
          id={id}
          type="text"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? msgId : undefined}
          {...inputProps}
        />
      </div>
      <FieldMessage id={msgId}>{error}</FieldMessage>
    </div>
  );
}

/** Campo de contraseña con botón mostrar/ocultar y aviso de Bloq Mayús. */
export function PasswordField({ id, label, error, ref, ...inputProps }: InputProps & { id: string; label: string; error?: string; ref: React.RefObject<HTMLInputElement | null> }) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const msgId = `${id}Msg`;
  const capsId = `${id}Caps`;
  const describedBy = [error && msgId, caps && capsId].filter(Boolean).join(" ") || undefined;

  const checkCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(Boolean(e.getModifierState?.("CapsLock")));

  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <div className={`${s.control} ${s.hasAction}`}>
        <Icon name="lock" className={s.ico} />
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={() => setCaps(false)}
          {...inputProps}
        />
        <button
          className={s.reveal}
          type="button"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          onClick={() => {
            setVisible((v) => !v);
            ref.current?.focus();
          }}
        >
          <Icon name={visible ? "eyeOff" : "eye"} />
        </button>
      </div>
      <FieldMessage id={msgId}>{error}</FieldMessage>
      <FieldMessage id={capsId} tone="note">{caps ? "Bloq Mayús está activado." : ""}</FieldMessage>
    </div>
  );
}

/** Botón principal con estado de carga. */
export function SubmitButton({ loading, children, arrow = false }: { loading: boolean; children: ReactNode; arrow?: boolean }) {
  return (
    <button className={s.btn} type="submit" data-state={loading ? "loading" : undefined} aria-busy={loading}>
      <span>{children}</span>
      {arrow && <Icon name="arrow" className={s.arrow} />}
      <span className={s.spinner} aria-hidden="true" />
    </button>
  );
}

/** Caja de alerta (error) o aviso (éxito). */
export function Banner({ tone = "error", children }: { tone?: "error" | "ok"; children?: ReactNode }) {
  if (!children) return null;
  return tone === "error" ? (
    <div className={s.alert} role="alert">
      <Icon name="alert" />
      <span>{children}</span>
    </div>
  ) : (
    <div className={s.notice} role="status">
      <Icon name="check" />
      <span>{children}</span>
    </div>
  );
}
