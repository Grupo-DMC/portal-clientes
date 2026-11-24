"use client";

import { useEffect } from "react";
import type { AvisoPortal, Reporte } from "@/lib/data";
import { useStore } from "@/components/store";

/* Vuelca en el estado en memoria (useStore) lo que los locales generaron en el servidor: reportes, avisos del portal y último ingreso.
   Es idempotente: no duplica ni pisa lo que ya existe, así que se puede montar en cualquier layout (panel o portal) dentro del StoreProvider.
   Con SQL Server desaparece: el store leerá estas tablas directamente. */
export default function ServerSync({ reportes, avisos, accesos }: { reportes: Reporte[]; avisos: Record<string, AvisoPortal[]>; accesos: Record<string, string> }) {
  const { mut } = useStore();
  const firma = `${reportes.map((r) => r.id).join(",")}|${Object.entries(avisos).map(([u, l]) => u + l.length).join(",")}|${Object.values(accesos).join(",")}`;
  useEffect(() => {
    if (!reportes.length && !Object.keys(avisos).length && !Object.keys(accesos).length) return;
    mut((d) => {
      reportes.forEach((r) => { if (!d.reportes.some((x) => x.id === r.id)) d.reportes.push({ ...r }); });
      Object.entries(avisos).forEach(([uid, lista]) => {
        if (!d.usuariosPortal.some((u) => u.id === uid)) return;
        const mios = (d.avisos[uid] ??= []);
        lista.forEach((a) => { if (!mios.some((x) => x.id === a.id)) mios.push({ ...a }); });
      });
      Object.entries(accesos).forEach(([sid, f]) => {
        const c = d.cuentas[sid], s = d.sucursales.find((x) => x.id === sid);
        if (c && (c.ultimo ?? "") < f) c.ultimo = f;
        if (s && (s.ultimoAcceso ?? "") < f.slice(0, 10)) s.ultimoAcceso = f.slice(0, 10);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, mut]);
  return null;
}
