import LocalApp, { type LocalData } from "@/components/local/LocalApp";
import LocalEntry, { type Scan } from "@/components/local/LocalEntry";
import { seed } from "@/lib/data";
import { rt } from "@/lib/server/runtime";
import { getSession } from "@/lib/server/session";

export const metadata = { title: "Portal del local" };

export default async function LocalPage({ searchParams }: { searchParams: Promise<{ s?: string; salio?: string; codigo?: string }> }) {
  const sp = await searchParams;
  const db = seed();
  const ses = await getSession();

  if (ses?.k === "local") {
    const suc = db.sucursales.find((s) => s.id === ses.id);
    if (suc) {
      const mall = db.malls.find((m) => m.id === suc.mall);
      const data: LocalData = {
        suc: { n: suc.n, cod: suc.cod, marca: suc.marca, dir: mall ? `${mall.n}, ${suc.local} · ${mall.dir}, ${mall.com}` : `${suc.calle}, ${suc.com}` },
        visitas: db.visitas.filter((v) => v.suc === suc.id).sort((a, b) => b.f.localeCompare(a.f)),
        tickets: [...db.tickets, ...rt.tickets].filter((t) => t.suc === suc.id).sort((a, b) => b.f.localeCompare(a.f) || b.id.localeCompare(a.id)),
        accesos: (db.inst[suc.id] ?? []).map((a) => a.n),
        personal: (db.personal[suc.id] ?? [{ n: "Camila Rojas" }])[0].n,
      };
      return <LocalApp data={data} />;
    }
  }

  const code = (sp.s ?? "AM-012").toUpperCase().slice(0, 12);
  const found = db.sucursales.find((s) => s.cod.toUpperCase() === code);
  const scan: Scan = !found
    ? { kind: "invalido" }
    : found.cred === "Sin clave" ? { kind: "sinclave", ...info(found, db) }
    : found.cred === "Bloqueado" ? { kind: "bloqueado", ...info(found, db) }
    : { kind: "ok", ...info(found, db) };
  return <LocalEntry scan={scan} codigoMode={sp.codigo === "1"} notice={sp.salio ? "Cerraste sesión. Escanea el QR del local para volver a entrar." : undefined} />;
}

function info(s: ReturnType<typeof seed>["sucursales"][number], db: ReturnType<typeof seed>) {
  const mall = db.malls.find((m) => m.id === s.mall);
  return { cod: s.cod, n: s.n, marca: s.marca, dir: mall ? `${mall.n}, ${s.local} · ${mall.dir}, ${mall.com}` : `${s.calle}, ${s.com}` };
}
