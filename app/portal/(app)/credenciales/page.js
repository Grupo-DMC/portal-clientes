import Maintenance from '@/components/portal/ui/Maintenance';

export const metadata = { title: 'Credenciales de locales' };

/* En mantenimiento: DMC_Core todavía no tiene cuentas de locales. */
export default function Page() {
  return <Maintenance title="Credenciales de locales" />;
}
