import { MallDetail } from "@/components/panel/Lists";
export const metadata = { title: "Mall" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <MallDetail id={id} />; }
