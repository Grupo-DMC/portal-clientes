import { PSucursalDetail } from "@/components/portal/Views";
export const metadata = { title: "Sucursal" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PSucursalDetail id={id} />; }
