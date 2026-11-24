import VisitsView from '@/components/portal/visitas/VisitsView';
import { listarVisitas } from '@/lib/data/portal';
import { leerFiltros } from '@/lib/pcliente/filtrosVisitas';
import { exigirSesionPortal } from '@/lib/server/portalSesion';

export const metadata = { title: 'Visitas' };

/* Visitas realizadas del cliente de la sesión. Todos los filtros viven en la URL (lib/pcliente/filtrosVisitas.js):
   ?sucursal=<id>&desde=AAAA-MM-DD&hasta=AAAA-MM-DD acotan la consulta; el resto (q, region, estado, motivo,
   marca, problemas) se aplica en el navegador. El cliente sale siempre de la sesión (lib/server/portalSesion.ts). */
export default async function Page({ searchParams }) {
  const ses = await exigirSesionPortal();
  const filtros = leerFiltros(await searchParams);
  const visitas = await listarVisitas(ses.ctx, {
    sucursalId: filtros.sucursal || undefined,
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined
  });
  return <VisitsView visitas={visitas} filtros={filtros} />;
}
