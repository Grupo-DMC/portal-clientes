import { redirect } from "next/navigation";
import { activeAcct } from "@/lib/server/accounts";
import { getSession } from "@/lib/server/session";

/* Entrada única: no tiene UI propia, solo envía a cada quien a su sitio. */
export default async function Home() {
  const ses = await getSession();
  if (ses?.k === "panel" && activeAcct("panel", ses.id)) redirect("/panel");
  if (ses?.k === "portal" && activeAcct("portal", ses.id)) redirect("/portal");
  redirect("/login");
}
