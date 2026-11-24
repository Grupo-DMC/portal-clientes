'use client';
import { useId, useRef, useState } from 'react';
import { Icon } from '@/components/portal/ui';
import { norm } from '@/lib/pcliente/format';

/**
 * Selector con búsqueda (patrón combobox de ARIA). options: [{ value, label, hint? }].
 * Busca en label y hint sin importar tildes. `value` vacío = «todos».
 */
export default function Combobox({ label, value, onChange, options, placeholder, todos }) {
  const id = useId();
  const elegida = options.find((o) => o.value === value) ?? null;
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activa, setActiva] = useState(0);
  const input = useRef(null);
  const q = norm(texto.trim());
  const lista = [{ value: '', label: todos }, ...options.filter((o) => !q || norm(`${o.label} ${o.hint ?? ''}`).includes(q))];

  const elegir = (o) => {
    onChange(o.value);
    setTexto('');
    setAbierto(false);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActiva((i) => Math.min(i + 1, lista.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiva((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && abierto) { e.preventDefault(); if (lista[activa]) elegir(lista[activa]); }
    else if (e.key === 'Escape' && abierto) { e.stopPropagation(); setAbierto(false); setTexto(''); }
  };

  return (
    <div className="cb" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setAbierto(false); setTexto(''); } }}>
      <label className="fv-label" htmlFor={`${id}-in`}>{label}</label>
      <div className="cb-box">
        <Icon name="search" />
        <input ref={input} id={`${id}-in`} className="input cb-input" role="combobox" aria-expanded={abierto} aria-controls={`${id}-lb`}
          aria-autocomplete="list" aria-activedescendant={abierto ? `${id}-o${activa}` : undefined} autoComplete="off"
          placeholder={elegida ? elegida.label : placeholder} value={abierto ? texto : (elegida?.label ?? '')}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActiva(0); }}
          onFocus={() => setAbierto(true)} onClick={() => setAbierto(true)} onKeyDown={onKeyDown} />
        {elegida && !abierto && (
          <button type="button" className="cb-clear" aria-label={`Quitar ${label.toLowerCase()}`} onClick={() => { onChange(''); input.current?.focus(); }}>
            <Icon name="close" />
          </button>
        )}
      </div>
      {abierto && (
        <ul className="cb-list" id={`${id}-lb`} role="listbox" aria-label={label}>
          {lista.length > 1 || !q ? lista.map((o, i) => (
            <li key={o.value || '__todos'} id={`${id}-o${i}`} role="option" aria-selected={o.value === value}
              className={i === activa ? 'is-act' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(o)} onMouseEnter={() => setActiva(i)}>
              <span>{o.label}</span>{o.hint && <span className="cb-hint">{o.hint}</span>}
            </li>
          )) : <li className="cb-none" role="presentation">Sin coincidencias</li>}
        </ul>
      )}
    </div>
  );
}
