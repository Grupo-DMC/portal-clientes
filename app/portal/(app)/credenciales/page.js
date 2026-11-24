import Maintenance from '@/components/portal/ui/Maintenance';

export const metadata = { title: 'Credenciales de locales' };

/* En mantenimiento. Vista real (envolver en <Suspense>, lee ?local=):
   '@/components/portal/credenciales/CredentialsView'. */
export default function Page() {
  return <Maintenance title="Credenciales de locales" />;
}
