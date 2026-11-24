import VisitDetailView from '@/components/portal/visitas/VisitDetailView';

export async function generateMetadata({ params }) {
  const { folio } = await params;
  return { title: folio.toUpperCase() };
}

export default function Page() {
  return <VisitDetailView />;
}
