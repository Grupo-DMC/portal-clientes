'use client';
/* Piezas de interfaz reutilizadas en todo el portal. */
import { useEffect, useRef } from 'react';
import Icon from './Icon';

export { default as Icon } from './Icon';

/** Etiqueta de estado con punto de color. tone: ok | obs | crit | prog | off */
export function Pill({ tone, children }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

/** Grupo de filtros tipo "chip". options: [{ id, label, count }] */
export function Chips({ label, options, value, onChange }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className="chip" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
          {o.count !== undefined && <span className="c num">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ label, placeholder, value, onChange, className = '' }) {
  return (
    <label className={`search ${className}`}>
      <Icon name="search" />
      <span className="sr">{label}</span>
      <input type="search" placeholder={placeholder} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Interruptor accesible basado en un checkbox. */
export function Switch({ checked, onChange, label, small = false, hideLabel = false }) {
  return (
    <label className={`switch ${small ? 'sm' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={hideLabel ? label : undefined} />
      <span className="sw" aria-hidden="true" />
      {!hideLabel && <span>{label}</span>}
    </label>
  );
}

/** Mensaje de error bajo un campo. No ocupa espacio si no hay error. */
export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p className="msg" id={id}>
      <Icon name="alert" />
      <span>{children}</span>
    </p>
  );
}

export function CountChip({ n, warn = false }) {
  return <span className={`count-chip num ${warn ? 'warn' : ''}`}>{n}</span>;
}

export function Avatar({ nombre, foto, size = '' }) {
  const ini = nombre.split(' ').map((p) => p[0]).slice(0, 2).join('');
  return (
    <span className={`avatar ${size}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- foto servida por /api/perfil/foto con sesión */}
      {foto ? <img src={foto} alt="" /> : ini}
    </span>
  );
}

/**
 * Panel lateral modal (para formularios). Cierra con Esc o con clic fuera,
 * mantiene el foco dentro y lo devuelve al elemento que lo abrió.
 */
export function Drawer({ open, title, onClose, onSubmit, footer, children, labelId }) {
  const ref = useRef(null);
  const returnTo = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnTo.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    const first = ref.current?.querySelector('input, select, textarea, button:not(.icon-btn)');
    first?.focus();
    return () => {
      document.body.style.overflow = '';
      returnTo.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      const f = [...ref.current.querySelectorAll('button, input, select, textarea, a[href]')].filter((el) => !el.disabled);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  };

  return (
    <>
      <div className="scrim us-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={labelId} ref={ref} onKeyDown={onKeyDown}>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
          <header className="drawer-head">
            <h2 id={labelId}>{title}</h2>
            <button className="icon-btn" type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button>
          </header>
          <div className="drawer-body">{children}</div>
          <footer className="drawer-foot">{footer}</footer>
        </form>
      </aside>
    </>
  );
}

export function ExampleNote({ children }) {
  return <p className="example-note">{children}</p>;
}
