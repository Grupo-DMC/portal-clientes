'use client';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/portal/ui';

/** Visor de fotos y videos: flechas para avanzar, Esc para cerrar, foco atrapado dentro. */
export default function Lightbox({ items, index, onIndex, onClose }) {
  const ref = useRef(null);
  const g = items[index];

  useEffect(() => {
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('.lb-close')?.focus();
    return () => { document.body.style.overflow = ''; prevFocus?.focus?.(); };
  }, []);

  const step = (n) => onIndex((index + n + items.length) % items.length);
  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Tab') {
      const f = [...ref.current.querySelectorAll('button')];
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  };

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visor de fotos y videos" ref={ref} onKeyDown={onKeyDown}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lb-top">
        <span className="num">{index + 1} de {items.length}</span>
        <button className="lb-btn lb-close" type="button" aria-label="Cerrar visor" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="lb-stage">
        <button className="lb-btn lb-nav lb-prev" type="button" aria-label="Anterior" onClick={() => step(-1)}><Icon name="left" /></button>
        <figure className="lb-fig">
          <div className="lb-media">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen de prueba en data URI */}
            <img src={g.src} alt="" className={g.kind === 'video' ? 'is-video' : ''} />
            {g.kind === 'video' && <span className="play lb-play"><Icon name="play" /></span>}
          </div>
          <figcaption>
            {g.label}, {g.meta}. {g.kind === 'video' ? 'Video de prueba: en producción se reproduce aquí.' : 'Imagen de prueba.'}
          </figcaption>
        </figure>
        <button className="lb-btn lb-nav lb-next" type="button" aria-label="Siguiente" onClick={() => step(1)}><Icon name="right" /></button>
      </div>
    </div>
  );
}
