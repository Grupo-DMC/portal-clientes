import Link from 'next/link';

export const metadata = { title: 'Página no encontrada' };

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="empty-state">
        <h2>No encontramos esta página</h2>
        <p>Puede que la dirección esté mal escrita o que ya no exista.</p>
        <Link className="btn-sec" href="/portal/dashboard">Ir al Dashboard</Link>
      </div>
    </main>
  );
}
