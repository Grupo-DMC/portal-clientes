import ClienteDetail from "@/components/panel/ClienteDetail";
export const metadata = { title: "Cliente" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ClienteDetail id={id} />; }
