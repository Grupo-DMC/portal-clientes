/* Mientras llega el acta (una consulta a DMC_Core): la silueta de sus secciones. */
export default function Loading() {
  return (
    <section className="view acta-skel" aria-busy="true" aria-label="Cargando el acta de la visita">
      <div className="skel" style={{ height: 22, width: 120 }} />
      <div className="skel" style={{ height: 56, width: '60%' }} />
      <div className="skel" style={{ height: 70 }} />
      <div className="skel" style={{ height: 260 }} />
      <div className="skel" style={{ height: 140 }} />
      <div className="skel" style={{ height: 200 }} />
    </section>
  );
}
