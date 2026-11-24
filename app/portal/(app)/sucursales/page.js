import BranchesView from '@/components/portal/sucursales/BranchesView';
import { exigirSesionPortal } from '@/lib/server/portalSesion';

export const metadata = { title: 'Mis sucursales' };

/* La sesión se revalida contra la base en cada request (también en navegación interna). */
export default async function Page() {
  await exigirSesionPortal();
  return <BranchesView />;
}
