import { notFound } from 'next/navigation';
import VisitDetailView from '@/components/portal/visitas/VisitDetailView';
import { detalleVisita } from '@/lib/data/portal';
import { exigirSesionPortal } from '@/lib/server/portalSesion';

export async function generateMetadata({ params }) {
  const { folio } = await params;
  return { title: folio.toUpperCase() };
}

/* Detalle de una visita. Se busca por folio DENTRO del cliente de la sesión:
   una visita de otro cliente responde 404, igual que una que no existe. */
export default async function Page({ params }) {
  const ses = await exigirSesionPortal();
  const { folio } = await params;
  const visita = await detalleVisita(ses.ctx, decodeURIComponent(folio));
  if (!visita) notFound();
  return <VisitDetailView v={visita} />;
}
