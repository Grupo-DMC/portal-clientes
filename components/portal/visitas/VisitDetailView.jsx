'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CountChip, Icon, Pill } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { ESTADOS_VISITA } from '@/lib/pcliente/constants';
import { initials, longDate, maskRut, minutesBetween, parseDMY } from '@/lib/pcliente/format';
import { branchHref, visitSlug } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';
import Lightbox from './Lightbox';
import { svgUrl, testImage } from './testImages';

/** Menú "Descargar": informe, fotos o videos. */
function DownloadMenu({ d }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    wrap.current.querySelector('[role="menuitem"]')?.focus();
    const onDoc = (e) => { if (!wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const pick = (label) => { setOpen(false); toast(`En producción se descarga: ${label.toLowerCase()}.`); };
  return (
    <div className="menu" ref={wrap} onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); wrap.current.querySelector('button').focus(); } }}>
      <button className="btn-out" type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="download" />Descargar<Icon name="chevron" />
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {[`Informe de la visita (PDF)`, `Todas las fotos (${d.fotos.length})`, `Todos los videos (${d.videos.length})`].map((l) => (
            <button key={l} role="menuitem" type="button" onClick={() => pick(l)}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Evidence({ d }) {
  const [tab, setTab] = useState('fotos');
  const [lb, setLb] = useState(null);
  const gallery = useMemo(() => [
    ...d.fotos.map((f, i) => ({ kind: 'foto', label: `Foto ${i + 1}`, meta: f.hora, src: svgUrl(testImage(f.tema, i + 1)) })),
    ...d.videos.map((v, i) => ({ kind: 'video', label: `Video ${i + 1}`, meta: `${v.dur}, ${v.res}`, src: svgUrl(testImage(v.tema, 40 + i, 480, 640)) }))
  ], [d]);
  const tabs = [{ id: 'fotos', label: 'Fotos', n: d.fotos.length }, { id: 'videos', label: 'Videos', n: d.videos.length }];
  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tab === 'fotos' ? 'videos' : 'fotos';
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <section className="vd-card">
      <div className="vd-card-head">
        <div className="tabs" role="tablist" aria-label="Evidencia" onKeyDown={onTabKey}>
          {tabs.map((t) => (
            <button key={t.id} role="tab" type="button" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}>
              {t.label} <span className="num">{t.n}</span>
            </button>
          ))}
        </div>
        <span className="muted test-note">Imágenes de prueba</span>
      </div>
      <div role="tabpanel" id="panel-fotos" aria-labelledby="tab-fotos" hidden={tab !== 'fotos'}>
        <div className="photos">
          {d.fotos.map((f, i) => (
            <button key={i} type="button" className="thumb" aria-label={`Abrir foto ${i + 1}`} onClick={() => setLb(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen de prueba en data URI */}
              <img src={gallery[i].src} alt="" loading="lazy" />
              <span className="thumb-cap"><b>Foto {i + 1}</b><span className="num">{f.hora}</span></span>
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id="panel-videos" aria-labelledby="tab-videos" hidden={tab !== 'videos'}>
        <div className="videos">
          {d.videos.map((v, i) => (
            <button key={i} type="button" className="vthumb" aria-label={`Abrir video ${i + 1}, duración ${v.dur}`} onClick={() => setLb(d.fotos.length + i)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen de prueba en data URI */}
              <img src={gallery[d.fotos.length + i].src} alt="" />
              <span className="play"><Icon name="play" /></span>
              <span className="thumb-cap"><b>Video {i + 1}</b><span className="num">{v.dur}, {v.res}</span></span>
            </button>
          ))}
        </div>
      </div>
      {lb !== null && <Lightbox items={gallery} index={lb} onIndex={setLb} onClose={() => setLb(null)} />}
    </section>
  );
}

export default function VisitDetailView() {
  const { folio } = useParams();
  const { visitas, sucursales } = usePortal();
  const v = visitas.find((x) => visitSlug(x.folio) === folio);

  if (!v) {
    return (
      <div className="empty-state">
        <h2>No encontramos esa visita</h2>
        <p>Puede que el folio no exista o que no tengas acceso.</p>
        <Link className="btn-sec" href="/portal/visitas">Volver a Visitas</Link>
      </div>
    );
  }

  const st = ESTADOS_VISITA[v.estado], d = v.detalle;
  const suc = sucursales.find((s) => s.nombre === v.sucursal);
  const cancelada = v.estado.startsWith('cancelada');

  return (
    <section className="view" aria-label="Detalle de la visita">
      <header className="vd-head">
        <Link className="back" href="/portal/visitas"><Icon name="back" />Visitas</Link>
        <div className="vd-titlebar">
          <div>
            <div className="vd-title"><h1>{v.folio}</h1><Pill tone={st.cls}>{st.label}</Pill></div>
            <p className="vd-meta">{v.motivo} en {v.sucursal}</p>
          </div>
          {d && <div className="vd-actions"><DownloadMenu d={d} /></div>}
        </div>
      </header>

      <div className="vd-grid">
        <div className="vd-main">
          {v.estado === 'programada' && (
            <section className="vd-card notice-card"><Icon name="calendar" /><div><h2 className="vd-h">Visita programada</h2><p>El técnico registrará aquí el trabajo, las fotos y la firma cuando termine la visita.</p></div></section>
          )}
          {cancelada && (
            <section className="vd-card notice-card off"><Icon name="info" /><div><h2 className="vd-h">Esta visita fue cancelada</h2><p>No tiene trabajo registrado. Si necesitas reagendarla, contacta a tu ejecutivo de Grupo DMC.</p></div></section>
          )}
          {v.estado === 'completada' && !d && (
            <section className="vd-card notice-card"><Icon name="info" /><div><h2 className="vd-h">Detalle no cargado en esta maqueta</h2><p>Para ver un detalle completo abre la visita <Link className="link" href="/portal/visitas/v-2026-01064">V-2026-01064</Link>.</p></div></section>
          )}
          {d && (
            <>
              <section className="vd-card">
                <div className="vd-card-head"><h2 className="vd-h">Trabajo solicitado</h2><span className="muted">por {d.solicitadoPor}</span></div>
                <p className="req">{d.solicitud}</p>
                {d.credencialesOcultas && <p className="hint"><Icon name="lock" /><span>La nota incluía credenciales de red y se ocultaron por seguridad.</span></p>}
              </section>
              <section className="vd-card">
                <div className="vd-card-head"><h2 className="vd-h">Trabajo realizado</h2><CountChip n={d.trabajos.length} /></div>
                <div className="works">
                  {d.trabajos.map((t) => (
                    <article className="work" key={t.titulo}>
                      <span className="muted work-type">{t.tipo}</span>
                      <h3>{t.titulo}</h3>
                      <ul className="qty">{t.items.map((it) => <li key={it.n}><span>{it.n}</span><b className="num">× {it.c}</b></li>)}</ul>
                    </article>
                  ))}
                </div>
              </section>
              <section className="vd-card">
                <div className="vd-card-head"><h2 className="vd-h">Problemas levantados</h2><CountChip n={d.problemas.length} warn={d.problemas.length > 0} /></div>
                {d.problemas.length === 0 && <p className="ok-line"><Icon name="check" />Sin problemas registrados en esta visita.</p>}
              </section>
              <Evidence d={d} />
            </>
          )}
        </div>

        <aside className="vd-side" aria-label="Resumen de la visita">
          <section className="vd-card">
            <h2 className="vd-h">Resumen</h2>
            <dl className="facts-list">
              <div><dt><Icon name="calendar" />Fecha</dt><dd>{longDate(parseDMY(v.fecha))}</dd></div>
              {d && <div><dt><Icon name="clock" />Horario</dt><dd className="num">{d.inicio} a {d.fin} <span className="muted">({minutesBetween(d.inicio, d.fin)} min)</span></dd></div>}
              <div><dt><span className="mini-av" aria-hidden="true">{initials(v.tecnico)}</span>Técnico</dt><dd>{v.tecnico}</dd></div>
              <div><dt><Icon name="store" />Sucursal</dt><dd>
                {suc ? <Link className="link" href={branchHref(suc)}>{v.sucursal}</Link> : v.sucursal}
                {suc && <span className="muted d-block">{suc.mall ? `${suc.mall}, local ${suc.local}. ` : ''}{suc.comuna}</span>}
              </dd></div>
              <div><dt><Icon name="check" />Motivo</dt><dd>{v.motivo}</dd></div>
            </dl>
          </section>

          {d?.firma && (
            <section className="vd-card">
              <h2 className="vd-h">Recepción conforme</h2>
              <svg className="sig" viewBox="0 0 220 70" aria-hidden="true"><path d="M8 52c18-30 30-38 34-26s-10 30 6 22 22-40 30-30-8 34 6 30 14-26 24-22-2 20 10 18 30-26 44-22 8 12 20 10 18-6 30-8" fill="none" stroke="#231A29" strokeWidth="1.6" strokeLinecap="round" /></svg>
              <div className="sig-line" />
              <p className="sig-name">{d.firma.nombre}</p>
              <p className="muted sig-role">{d.firma.cargo}, RUT <span className="num">{maskRut(d.firma.rut)}</span></p>
            </section>
          )}

          <section className="vd-card">
            <h2 className="vd-h">Trazabilidad</h2>
            <ol className="trace">
              {v.estado === 'programada' && (<><li className="now"><b>Visita programada</b><span>{longDate(parseDMY(v.fecha))}</span></li><li className="next"><b>Inicio de la visita</b><span>Pendiente</span></li></>)}
              {cancelada && <li className="off"><b>{v.estado === 'cancelada_admin' ? 'Cancelada por un administrador' : 'Visita cancelada'}</b><span>{longDate(parseDMY(v.fecha))}</span></li>}
              {v.estado === 'completada' && d && (
                <>
                  <li><b>Inicio de la visita</b><span className="num">{d.inicio}</span></li>
                  <li><b>Trabajo registrado</b><span>{d.trabajos.length} trabajos, {d.fotos.length} fotos y {d.videos.length} videos</span></li>
                  <li className="done"><b>Término y firma de conformidad</b><span className="num">{d.fin}</span></li>
                </>
              )}
              {v.estado === 'completada' && !d && <li className="done"><b>Visita completada</b><span>{longDate(parseDMY(v.fecha))}</span></li>}
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}
