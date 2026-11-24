import { redirect } from "next/navigation";
import Login from "@/components/login/Login";
import { activeAcct } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;

  // Solo se redirige con cuenta vigente (no solo por cookie), para evitar bucles con los layouts.
  const ses = await getSession();
  if (ses?.k === "panel" && activeAcct("panel", ses.id)) redirect("/panel");
  if (ses?.k === "portal" && activeAcct("portal", ses.id)) redirect("/portal");

  return <Login loggedOut={sp.salio === "1"} />;
}
