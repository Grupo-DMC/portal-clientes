'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Pill } from '@/components/portal/ui';
import { ESTADOS_VISITA } from '@/lib/pcliente/constants';
import { longDate, parseDMY } from '@/lib/pcliente/format';
import { branchHref } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';
import Lightbox from './Lightbox';

// Acta de la visita: mismas secciones 01–05 que el PDF que recibe el cliente.
// Las fotos se ven como miniaturas WebP (?mini=1, ~17 KB) con carga diferida y se
// abren en grande en el visor; los videos no se descargan hasta reproducirlos.

const descargar = (url) => (url ? `${url}?descarga=1` : null);
const duracionClip = (seg) => (seg ? `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}` : '');
const peso = (b) => (b ? (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`) : '');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const duracionMin = (m) => (m == null ? null : m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`);

/** Botón «Descargar acta» con las dos opciones de sys_tecnicos. Descargas nativas del navegador: nada se junta en memoria. */
function DescargarActa({ folio, completada, fotos, videos }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (!ref.current?.contains(e.target)) setAbierto(false); };
    const esc = (e) => { if (e.key === 'Escape') { setAbierto(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);

  const conteo = [fotos ? plural(fotos, 'foto', 'fotos') : '', videos ? plural(videos, 'video', 'videos') : ''].filter(Boolean).join(' y ');
  const f = encodeURIComponent(folio);
  const opciones = [
    completada && { href: `/api/visita/acta/${f}`, texto: 'Acta en PDF', detalle: 'La que recibe el cliente, sin comentarios internos' },
    fotos + videos > 0 && { href: `/api/visita/multimedia/${f}`, texto: 'Fotos y videos (.zip)', detalle: `${conteo} para el cliente` },
  ].filter(Boolean);
  if (!opciones.length) return null;

  return (
    <div className="menu" ref={ref}>
      <button className="btn-pri" type="button" aria-haspopup="true" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        <Icon name="download" />Descargar acta<Icon name="chevron" />
      </button>
      <div className="menu-list acta-menu" hidden={!abierto}>
        {opciones.map((o) => (
          <a key={o.href} href={o.href} download onClick={() => setAbierto(false)}>
            <Icon name="download" />
            <span><b>{o.texto}</b><span className="muted">{o.detalle}</span></span>
          </a>
        ))}
        <p className="muted acta-menu-nota">La descarga empieza en tu navegador; el PDF puede tardar unos segundos.</p>
      </div>
    </div>
  );
}

/** Título de sección numerado, como en el PDF. */
function Seccion({ n, titulo, extra, children, id }) {
  return (
    <section className="vd-card acta-sec" aria-labelledby={id}>
      <div className="vd-card-head">
        <h2 className="vd-h acta-h" id={id}><span className="acta-n num">{String(n).padStart(2, '0')}</span>{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

/** Miniatura de foto: WebP liviano, carga diferida; abre el visor. */
function Foto({ f, onOpen, grande = false }) {
  const [lista, setLista] = useState(false);
  return (
    <figure className={`acta-foto${grande ? ' is-big' : ''}`}>
      <button type="button" className={`thumb${lista ? '' : ' is-loading'}`} aria-label={`Abrir ${f.etiqueta} en grande`} onClick={onOpen}>
        {/* eslint-disable-next-line @next/next/no-img-element -- archivo con sesión servido por /api/archivo */}
        <img src={f.mini} alt="" loading="lazy" decoding="async" onLoad={() => setLista(true)} onError={() => setLista(true)} />
      </button>
      <figcaption><b>{f.etiqueta}</b>{f.contexto && <span className="muted"> · {f.contexto}</span>}</figcaption>
    </figure>
  );
}

/** Tarjeta de video: póster propio (sin bajar el clip) y reproducción en el visor. */
function Video({ v, onOpen }) {
  return (
    <figure className="acta-foto">
      <button type="button" className="vthumb acta-poster" aria-label={`Reproducir ${v.etiqueta}${v.meta ? `, ${v.meta}` : ''}`} onClick={onOpen}>
        <span className="play"><Icon name="play" /></span>
        <span className="acta-poster-meta num">{v.meta}</span>
      </button>
      <figcaption><b>{v.etiqueta}</b>{v.contexto && <span className="muted"> · {v.contexto}</span>}</figcaption>
    </figure>
  );
}

/** `v`: acta ya cargada y filtrada por cliente en el servidor (lib/data/portal → detalleVisita). */
export default function VisitDetailView({ v }) {
  const { sucursales, cliente } = usePortal();
  const [lb, setLb] = useState(null);
  const st = ESTADOS_VISITA[v.estado] || { label: v.estado, cls: 'off' };
  const suc = sucursales.find((s) => (v.sucursalId && s.id === v.sucursalId) || s.nombre === v.sucursal);
  const fecha = longDate(parseDMY(v.fecha));
  const completada = v.estado === 'completada';
  const real = v.motivos.filter((m) => m.ambito === 'REAL').map((m) => m.motivo);
  const plan = v.motivos.filter((m) => m.ambito !== 'REAL').map((m) => m.motivo);
  const motivos = real.length ? real : plan.length ? plan : [v.motivo].filter(Boolean);
  const firma = v.archivos.find((a) => a.tipo === 'FIRMA_TIENDA') ?? v.archivos.find((a) => a.tipo.startsWith('FIRMA_'));

  /* Fotos y videos numerados como en el PDF y el .zip, con el problema al que pertenecen. */
  const { fotos, videos, galeria } = useMemo(() => {
    const prob = new Map(v.problemas.map((p, i) => [p.id, `Problema ${i + 1}: ${p.tipo}`]));
    const fotos = v.archivos.filter((a) => a.tipo === 'FOTO').map((a, i) => ({
      ...a, etiqueta: `Foto ${i + 1}`, contexto: [a.descripcion, prob.get(a.problemaId)].filter(Boolean).join(' · '), mini: a.miniUrl || a.url
    }));
    const videos = v.archivos.filter((a) => a.tipo === 'VIDEO').map((a, i) => ({
      ...a, etiqueta: `Video ${i + 1}`, contexto: [a.descripcion, prob.get(a.problemaId)].filter(Boolean).join(' · '),
      meta: [duracionClip(a.duracionSeg), peso(a.bytes)].filter(Boolean).join(' · ')
    }));
    const galeria = [
      ...fotos.map((f) => ({ kind: 'foto', label: [f.etiqueta, f.contexto].filter(Boolean).join(' · '), meta: '', src: f.url, download: descargar(f.url) })),
      ...videos.map((x) => ({ kind: 'video', label: [x.etiqueta, x.contexto].filter(Boolean).join(' · '), meta: x.meta, src: x.url, download: descargar(x.url) }))
    ];
    return { fotos, videos, galeria };
  }, [v]);
  const abrirFoto = (i) => setLb(i);
  const abrirVideo = (i) => setLb(fotos.length + i);
  const fotosDe = (problemaId) => fotos.map((f, i) => ({ f, i })).filter((x) => x.f.problemaId === problemaId);
  const fotosSueltas = fotos.map((f, i) => ({ f, i })).filter((x, k) => k > 0 && !x.f.problemaId);

  const datos = [
    ['Cliente', cliente?.nombre || '—'], ['Marca', v.marca || '—'],
    ['Sucursal', <>{suc ? <Link className="link" href={branchHref(suc)}>{v.sucursal}</Link> : v.sucursal}{v.sucursalCodigo && <span className="muted"> ({v.sucursalCodigo})</span>}</>],
    ['Mall', v.mall || 'Local a la calle'],
    ['Dirección', [v.direccion, v.comuna, v.region].filter(Boolean).join(', ') || '—', true],
    ['Técnico a cargo', v.tecnico || '—'], ['Técnico ayudante', v.tecnicoAyudante || 'No aplica'],
    ['Responsable de tienda', [v.responsable?.nombre ?? firma?.descripcion, v.responsable?.cargo].filter(Boolean).join(' · ') || '—'],
    ['RUT', firma?.rut || '—']
  ];

  return (
    <section className="view" aria-label={`Acta de la visita ${v.folio}`}>
      <header className="vd-head">
        <Link className="back" href="/portal/visitas"><Icon name="back" />Visitas</Link>
        <div className="vd-titlebar">
          <div>
            <p className="acta-kicker">Acta de visita técnica · N° {v.folio}</p>
            <div className="vd-title"><h1>{v.sucursal}</h1><Pill tone={st.cls}>{st.label}</Pill></div>
            <p className="vd-meta">{[v.marca, v.motivo].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="vd-actions">
            <DescargarActa folio={v.folio} completada={completada} fotos={fotos.length} videos={videos.length} />
          </div>
        </div>
      </header>

      <dl className="acta-resumen">
        <div><dt>Fecha</dt><dd>{fecha}</dd></div>
        <div><dt>Horario en tienda</dt><dd className="num">{v.horaInicio ? `${v.horaInicio} – ${v.horaTermino ?? '—'}` : '—'}</dd></div>
        <div><dt>Duración</dt><dd className="num">{duracionMin(v.duracionMin) ?? '—'}</dd></div>
        <div><dt>Problemas</dt><dd className={v.problemas.length ? 'is-warn' : ''}>{v.problemas.length ? plural(v.problemas.length, 'detectado', 'detectados') : 'Ninguno'}</dd></div>
      </dl>

      <div className="acta-cuerpo">
        <Seccion n={1} id="sec1" titulo="Trabajo realizado">
          <div className={fotos.length ? 'acta-01' : ''}>
            <div className="acta-01-texto">
              {motivos.length > 0 && (
                <div className="acta-campo"><span className="acta-rot">Motivo de la visita</span>
                  <ul className="acta-chips">{motivos.map((m) => <li key={m}>{m}</li>)}</ul></div>
              )}
              {v.trabajoSolicitado && <div className="acta-campo"><span className="acta-rot">Trabajo solicitado</span><p className="req">{v.trabajoSolicitado}</p></div>}
              <div className="acta-campo">
                <span className="acta-rot">Tareas</span>
                {v.trabajos.length ? (
                  <ol className="acta-tareas">
                    {v.trabajos.map((t, i) => (
                      <li key={`${t.trabajo}-${i}`}>
                        <span className="acta-tn num">{i + 1}</span>
                        <div>
                          <b>{t.trabajo}</b>
                          {t.subtrabajos.length > 0 && <p className="muted">{t.subtrabajos.map((s) => (s.cantidad > 1 ? `${s.etiqueta} × ${s.cantidad}` : s.etiqueta)).join(' · ')}</p>}
                          {t.detalle && <p>{t.detalle}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : <p className="muted">No hay tareas registradas.</p>}
              </div>
              {v.observaciones && <div className="acta-campo acta-detalle"><span className="acta-rot">Detalle del trabajo</span><p>{v.observaciones}</p></div>}
            </div>
            {fotos[0] && <Foto f={fotos[0]} grande onOpen={() => abrirFoto(0)} />}
          </div>
        </Seccion>

        <Seccion n={2} id="sec2" titulo="Problemas detectados">
          {v.problemas.length ? (
            <ol className="probs">
              {v.problemas.map((p, i) => {
                const suyas = fotosDe(p.id);
                return (
                  <li key={p.id} className={p.estadoCodigo === 'ABIERTO' ? 'is-open' : ''}>
                    <div className="prob-head"><b>Problema {i + 1}: {p.tipo}</b><Pill tone={p.estadoCodigo === 'ABIERTO' ? 'obs' : 'ok'}>{p.estado}</Pill></div>
                    {p.items && <p><span className="acta-rot">Equipos</span> {p.items}</p>}
                    {p.descripcion && <p><span className="acta-rot">Descripción</span> {p.descripcion}</p>}
                    {p.solucion && <p><span className="acta-rot">Solución sugerida</span> {p.solucion}</p>}
                    {p.resueltoEn && <p className="muted">Resuelto el {p.resueltoEn.replace(/-/g, '/')}</p>}
                    {suyas.length > 0 && <div className="acta-grid">{suyas.map(({ f, i: k }) => <Foto key={f.id} f={f} onOpen={() => abrirFoto(k)} />)}</div>}
                  </li>
                );
              })}
            </ol>
          ) : <p className="ok-line"><Icon name="check" />Sin problemas detectados en esta visita.</p>}
        </Seccion>

        <Seccion n={3} id="sec3" titulo="Datos de la visita">
          <dl className="acta-datos">
            {datos.map(([k, val, ancho]) => <div key={k} className={ancho ? 'is-wide' : ''}><dt>{k}</dt><dd>{val}</dd></div>)}
          </dl>
        </Seccion>

        <Seccion n={4} id="sec4" titulo="Registro fotográfico adicional"
          extra={<span className="muted acta-cuenta">{[plural(fotos.length, 'foto', 'fotos'), plural(videos.length, 'video', 'videos')].join(' · ')}</span>}>
          {fotosSueltas.length > 0 && <div className="acta-grid">{fotosSueltas.map(({ f, i }) => <Foto key={f.id} f={f} onOpen={() => abrirFoto(i)} />)}</div>}
          {videos.length > 0 && (
            <>
              <h3 className="acta-sub">Videos</h3>
              <div className="acta-grid acta-grid-v">{videos.map((x, i) => <Video key={x.id} v={x} onOpen={() => abrirVideo(i)} />)}</div>
            </>
          )}
          {!fotosSueltas.length && !videos.length && <p className="muted">{fotos.length ? 'Las fotos de esta visita ya se muestran en sus secciones.' : 'La visita no tiene fotos ni videos.'}</p>}
        </Seccion>

        <Seccion n={5} id="sec5" titulo="Conformidad de la tienda">
          {firma ? (
            <div className="acta-firma">
              <figure className="acta-firma-caja">
                {/* eslint-disable-next-line @next/next/no-img-element -- archivo con sesión servido por /api/archivo */}
                <img src={firma.miniUrl || firma.url} alt={`Firma de ${firma.descripcion || 'la tienda'}`} loading="lazy" />
                <figcaption className="acta-rot">Firma del responsable de tienda</figcaption>
              </figure>
              <dl className="acta-firma-datos">
                <div><dt>Nombre</dt><dd><b>{firma.descripcion || v.responsable?.nombre || '—'}</b></dd></div>
                <div><dt>RUT</dt><dd className="num">{firma.rut || '—'}</dd></div>
                <div><dt>Firmado el</dt><dd className="num">{firma.fecha ? firma.fecha.replace(/-/g, '/').replace(' ', ' · ') : '—'}</dd></div>
                {firma.url && <div><dt /><dd><a className="link" href={descargar(firma.url)}>Descargar firma</a></dd></div>}
              </dl>
            </div>
          ) : <p className="muted">La visita no tiene firma registrada.</p>}
          <p className="muted acta-constancia">Con su firma, la tienda deja constancia de la visita y de los trabajos descritos en esta acta.</p>
        </Seccion>
      </div>

      {lb !== null && <Lightbox items={galeria} index={lb} onIndex={setLb} onClose={() => setLb(null)} />}
    </section>
  );
}
