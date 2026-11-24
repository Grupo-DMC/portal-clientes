import Maintenance from '@/components/portal/ui/Maintenance';

export const metadata = { title: 'Usuarios y roles' };

/* En mantenimiento: DMC_Core todavía no tiene usuarios ni roles del cliente. */
export default function Page() {
  return <Maintenance title="Usuarios y roles" />;
}
