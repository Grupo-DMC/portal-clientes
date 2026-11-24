'use client';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/portal/ui';

/**
 * Visor de fotos y videos: flechas para avanzar, Esc para cerrar, foco atrapado dentro.
 * items: { kind: 'foto' | 'video', label, meta, src, download? }
 */
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
    // Con el foco en el reproductor, las flechas adelantan el video.
    if (e.target.tagName === 'VIDEO' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Tab') {
      const f = [...ref.current.querySelectorAll('button, a[href], video')];
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
        <span className="lb-tools">
          {g.download && <a className="lb-btn" href={g.download} aria-label={`Descargar ${g.label}`}><Icon name="download" /></a>}
          <button className="lb-btn lb-close" type="button" aria-label="Cerrar visor" onClick={onClose}><Icon name="close" /></button>
        </span>
      </div>
      <div className="lb-stage">
        <button className="lb-btn lb-nav lb-prev" type="button" aria-label="Anterior" onClick={() => step(-1)}><Icon name="left" /></button>
        <figure className="lb-fig">
          <div className="lb-media">
            {g.kind === 'video'
              ? <video key={g.src} className="lb-video" src={g.src} controls autoPlay playsInline preload="metadata" />
              /* eslint-disable-next-line @next/next/no-img-element -- archivo servido por /api/archivo con sesión */
              : <img key={g.src} src={g.src} alt={g.alt || ''} />}
          </div>
          <figcaption>{g.label}{g.meta ? `, ${g.meta}` : ''}.</figcaption>
        </figure>
        <button className="lb-btn lb-nav lb-next" type="button" aria-label="Siguiente" onClick={() => step(1)}><Icon name="right" /></button>
      </div>
    </div>
  );
}
