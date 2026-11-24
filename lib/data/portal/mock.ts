import "server-only";
import type { ContextoPortal, PortalDatos } from "@/lib/contratos/portal";
import { seed } from "@/lib/data";
import { loadPortalData } from "@/lib/pcliente/data";
import type { FuentePortal } from "./fuente";

// DATA_SOURCE=mock: los mismos datos de ejemplo que la UI usaba hasta ahora.
// - Portal (dashboard, sucursales, visitas, credenciales, usuarios, avisos):
//   lib/pcliente/data.js, sin cambios. Antes los cargaba el navegador; ahora
//   los carga el servidor y se los pasa, así que la pantalla es idéntica.
// - Tickets, trabajos planificados, cotizaciones y despachos: lib/data.ts (los
//   mismos que ve el panel interno), acotados a las sucursales del cliente.

/** Las sucursales del cliente de la sesión, por id, con su nombre. */
function sucursalesDelCliente(ctx: ContextoPortal) {
  const db = seed();
  const nombres = new Map(db.sucursales.filter((s) => s.cli === ctx.clienteId).map((s) => [s.id, s.n]));
  return { db, nombres };
}

export const fuenteMock: FuentePortal = {
  nombre: "mock",

  async cargarPortal() {
    // El tipo explícito comprueba que los datos de ejemplo cumplan el contrato.
    const datos: PortalDatos = loadPortalData();
    return datos;
  },

  async listarTickets(ctx) {
    const { db, nombres } = sucursalesDelCliente(ctx);
    return db.tickets
      .filter((t) => nombres.has(t.suc))
      .map((t) => ({
        id: t.id,
        sucursal: nombres.get(t.suc) ?? "",
        fecha: t.f,
        problema: t.prob,
        estado: t.estado,
        prioridad: t.prio,
        descripcion: t.desc,
        solicitadoPor: t.nom ?? null,
      }));
  },

  async listarTrabajosPlanificados(ctx) {
    const { db, nombres } = sucursalesDelCliente(ctx);
    return db.plan
      .filter((p) => nombres.has(p.suc))
      .map((p) => ({ fecha: p.f, sucursal: nombres.get(p.suc) ?? "", trabajo: p.trabajo, tecnico: p.tec, estado: p.estado }));
  },

  async listarCotizaciones(ctx) {
    const { db, nombres } = sucursalesDelCliente(ctx);
    return db.cotizaciones
      .filter((c) => nombres.has(c.suc))
      .map((c) => ({ id: c.id, sucursal: nombres.get(c.suc) ?? "", fecha: c.f, descripcion: c.desc, monto: c.monto, estado: c.estado }));
  },

  async listarDespachos(ctx) {
    const { db, nombres } = sucursalesDelCliente(ctx);
    return db.despachos
      .filter((d) => nombres.has(d.suc))
      .map((d) => ({ id: d.id, sucursal: nombres.get(d.suc) ?? "", fecha: d.f, items: d.items, estado: d.estado }));
  },
};
