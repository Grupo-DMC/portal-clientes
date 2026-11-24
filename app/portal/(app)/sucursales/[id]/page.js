import BranchDetailView from '@/components/portal/sucursales/BranchDetailView';
import { exigirSesionPortal } from '@/lib/server/portalSesion';

export const metadata = { title: 'Detalle del local' };

/* La sesión se revalida contra la base en cada request (también en navegación interna). */
export default async function Page() {
  await exigirSesionPortal();
  return <BranchDetailView />;
}
