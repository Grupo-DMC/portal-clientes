import Link from 'next/link';
import Icon from './Icon';

/** Página de sección en mantenimiento o en proceso. */
export default function Maintenance({ title }) {
  return (
    <section className="view" aria-labelledby="pendTitle">
      <header className="page-head"><h1 className="page-title" id="pendTitle">{title}</h1></header>
      <div className="empty-state maint">
        <span className="maint-ico" aria-hidden="true"><Icon name="wrench" /></span>
        <span className="pill prog">En proceso</span>
        <h2>Sección en mantenimiento</h2>
        <p>Estamos trabajando en {title}. Pronto estará disponible en el portal.</p>
        <Link className="btn-sec" href="/portal/dashboard">Ir al Dashboard</Link>
      </div>
    </section>
  );
}
