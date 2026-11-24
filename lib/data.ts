import { zonaPorUbicacion } from "./calc";
import { addM, fmtRut } from "./format";
import {
  legacyDe, prefsPorDefecto, sucKey, sucursalesVisibles, usuarioCuentaDe,
  type EstadoCuentaLocal, type EstadoReporte, type EstadoUsuarioPortal, type EstadoVisita, type FrecuenciaAviso,
  type NivelPrioridad, type PermisoId, type RolPortal, type TipoAviso,
} from "./portal";

/* Datos estáticos de demostración. Cuando se conecte SQL Server (lib/db.ts),
   solo hay que reemplazar `seed()` por consultas parametrizadas. */

export type Mall = { id: string; n: string; dir: string; reg: string; com: string; activo: boolean };
/** Zona del cliente. `id` (norte, oriente, sur, poniente…) es el que usan los usuarios del portal; si falta, se usa el slug de `n`
    (ver `zonaId` en lib/calc.ts). `comunas` es opcional: sin ella la zona abarca toda la región. */
export type Zona = { id?: string; n: string; regs: string[]; comunas?: string[] };
export type Direccion = { id: string; tipo: string; dir: string; reg: string; com: string; principal: boolean; activo: boolean };
export type Cliente = {
  id: string; tipo: "Empresa" | "Persona natural"; rs: string; rutStr: string; giro: string; dte: string; pago: string;
  marcas: string[]; activo: boolean; plan: boolean; planMeses: number; planDesde: string; calTodas: boolean;
  calSuc: string[]; calVence: string; zonas: Zona[]; dirs: Direccion[];
  /** Nombre comercial que se muestra en grande en el portal (si falta, se usa `rs`). */
  nombre?: string;
  /** Ruta pública del logo (p. ej. «/clientes/puma.svg»). Sin logo se muestra un monograma. */
  logo?: string;
};
export type Cred = "Activo" | "Sin clave" | "Bloqueado";
export type Sucursal = {
  id: string; cli: string; marca: string; cod: string; n: string; mall: string; calle: string; reg: string; com: string;
  local: string; inst: string; meses: number; cred: Cred; activo: boolean; zona: string; ultimoAcceso: string | null;
};
export type Hist = { f: string; u: string; a: string; d: string };
export type Equipo = {
  id: string; kind: "antena" | "contador" | "otro"; modelo: string; cant: number; serie: string; mac: string; uuid: string;
  fecha: string; hist: Hist[]; inactivo?: boolean; remota?: boolean; ip?: string; dhcp?: boolean; destino?: string; url?: string; tipo?: string;
};
export type Acceso = { id: string; n: string; eq: Equipo[] };
export type Persona = { n: string; c: string; t: string; m: string; inactivo?: boolean };
export type Cargo = { cargo: string; alc: string; val: string };
export type Contacto = { id: string; cli: string; n: string; tel: string; mail: string; activo: boolean; cargos: Cargo[] };
export type Item = { n: string; activo: boolean };
export type Catalogos = { cargos: Item[]; tiposDir: Item[]; modAntena: Item[]; modContador: Item[]; tiposDisp: Item[]; modOtro: Item[] };
export type VisitaItem = { n: string; c: number };
export type VisitaTrabajo = { tipo: string; titulo: string; items: VisitaItem[] };
export type VisitaProblema = { titulo: string; detalle?: string; resuelto: boolean };
/** Foto o video de la visita. `url` es opcional: sin ella la UI muestra una imagen de prueba según `tema`. */
export type VisitaFoto = { tema: string; hora: string; url?: string };
export type VisitaVideo = { dur: string; res: string; tema: string; url?: string };
/** Quien firma en tienda. El RUT se guarda completo y SIEMPRE se muestra con `maskRut` (lib/format.ts). */
export type VisitaFirma = { nombre: string; cargo: string; rut: string };
export type VisitaDetalle = {
  /** Horas «HH:MM» de llegada y salida del técnico. */
  inicio: string; fin: string;
  solicitadoPor: string;
  /** Texto de la solicitud ya depurado: nunca contiene claves ni redes Wi-Fi (la nota original puede traerlas). */
  solicitud: string;
  /** true si la nota original traía credenciales y se ocultaron; la UI lo avisa pero jamás las muestra. */
  credencialesOcultas: boolean;
  trabajos: VisitaTrabajo[]; problemas: VisitaProblema[]; fotos: VisitaFoto[]; videos: VisitaVideo[];
  firma: VisitaFirma | null;
};
/** `id` es el folio («V-20961» o «V-2026-01064»); `f` es fecha ISO. `detalle` solo existe en algunas visitas. */
export type Visita = { id: string; suc: string; f: string; tec: string; tipo: string; res: string; estado: EstadoVisita; detalle?: VisitaDetalle };
export type Ticket = { id: string; suc: string; f: string; prob: string; estado: string; prio: string; desc: string; nom?: string; isNew?: boolean };
export type Cotizacion = { id: string; suc: string; f: string; desc: string; monto: string; estado: string };
export type Despacho = { id: string; suc: string; f: string; items: string; estado: string };
export type Plan = { f: string; suc: string; trabajo: string; tec: string; estado: string };
export type UsuarioDmc = { id: string; n: string; m: string; rol: string; activo: boolean; ult: string };
/** Usuario del portal cliente. `rol/alc/val/activo/ult` son el formato antiguo (panel y listados) y se mantienen sincronizados;
    los campos opcionales son el modelo nuevo (rol, zona, locales, extras, estado, perfil). Usa `normUsuario` (lib/portal.ts) para leerlos completos.
    `locales` contiene ids de sucursal. */
export type UsuarioPortal = {
  id: string; cli: string; n: string; m: string; rol: string; alc: string; val: string; activo: boolean; ult: string | null;
  rolKey?: RolPortal; zonaId?: string | null; locales?: string[]; extras?: PermisoId[]; estado?: EstadoUsuarioPortal;
  cargo?: string; tel?: string; foto?: string | null;
};
export type NotifRow = { n: string; tipo: string; m: string; ev: Record<string, boolean> };
export type Envio = { f: string; ev: string; cli: string; dest: string; estado: string };
export type Audit = { f: string; u: string; ent: string; reg: string; acc: string; det: string };

/** Reporte que un local envía desde su acceso. `suc` = id de sucursal; `f` = «YYYY-MM-DD HH:MM». */
export type Reporte = {
  id: string; suc: string; f: string; tipo: string; detalle: string; estado: EstadoReporte;
  /** Prioridad que pidió el cliente (la decide DMC); null si no pidió. */
  prioridad: { nivel: NivelPrioridad; motivo: string } | null;
};
/** Cuenta con que un local entra al portal (sin contraseña: nunca se muestra, solo se restablece). Clave de `Db.cuentas` = id de sucursal. */
export type CuentaLocal = { usuario: string; estado: EstadoCuentaLocal; ultimo: string | null };
/** Aviso del portal para un usuario. `f` = «YYYY-MM-DD HH:MM»; `href` es una ruta del portal o null; `suc` (opcional) permite filtrar por alcance. */
export type AvisoPortal = { id: string; tipo: TipoAviso; titulo: string; texto: string; f: string; leida: boolean; href: string | null; suc?: string };
export type PrefsAvisos = { tipos: Record<TipoAviso, { portal: boolean; correo: boolean }>; frecuencia: FrecuenciaAviso; silencio: boolean };

export type Db = {
  malls: Mall[]; clients: Cliente[]; sucursales: Sucursal[]; inst: Record<string, Acceso[]>; personal: Record<string, Persona[]>;
  contacts: Contacto[]; cat: Catalogos; visitas: Visita[]; tickets: Ticket[]; cotizaciones: Cotizacion[]; despachos: Despacho[];
  plan: Plan[]; usuariosDmc: UsuarioDmc[]; usuariosPortal: UsuarioPortal[]; notif: Record<string, NotifRow[]>; envios: Envio[]; audit: Audit[];
  /** Reportes enviados por los locales. */
  reportes: Reporte[];
  /** Cuentas de acceso de los locales, por id de sucursal (la sucursal sin entrada no tiene cuenta). */
  cuentas: Record<string, CuentaLocal>;
  /** Avisos del portal y sus preferencias, por id de usuario del portal. */
  avisos: Record<string, AvisoPortal[]>; prefs: Record<string, PrefsAvisos>;
};

const NORTE = ["Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo"];
export { NORTE };

export function seed(): Db {
  const malls: Mall[] = [
    { id: "m1", n: "Costanera Center", dir: "Av. Andrés Bello 2425", reg: "Metropolitana", com: "Providencia", activo: true },
    { id: "m2", n: "Parque Arauco", dir: "Av. Presidente Kennedy 5413", reg: "Metropolitana", com: "Las Condes", activo: true },
    { id: "m3", n: "Mall Plaza Vespucio", dir: "Av. Vicuña Mackenna 7110", reg: "Metropolitana", com: "La Florida", activo: true },
    { id: "m4", n: "Mall Plaza Antofagasta", dir: "Av. Balmaceda 2355", reg: "Antofagasta", com: "Antofagasta", activo: true },
    { id: "m5", n: "Mall Marina Arauco", dir: "Av. Libertad 1348", reg: "Valparaíso", com: "Viña del Mar", activo: true },
    { id: "m6", n: "Mall Plaza Trébol", dir: "Av. Jorge Alessandri 3177", reg: "Biobío", com: "Talcahuano", activo: true },
    { id: "m7", n: "Mall Plaza La Serena", dir: "Av. Alberto Solari 1400", reg: "Coquimbo", com: "La Serena", activo: true },
    { id: "m8", n: "Mall Florida Center", dir: "Av. Vicuña Mackenna 6100", reg: "Metropolitana", com: "La Florida", activo: true },
    /* Centros comerciales y outlets del listado de tiendas Puma (m1, m3, m4 y m7 ya existen arriba).
       Las direcciones quedan «Por completar» hasta tener el dato oficial. */
    ...([
      ["m9", "Mall Plaza Calama", "Antofagasta", "Calama"],
      ["m10", "Mall Plaza Copiapó", "Atacama", "Copiapó"],
      ["m11", "Arauco Premium Outlet Coquimbo", "Coquimbo", "Coquimbo"],
      ["m12", "Mall Plaza Norte", "Metropolitana", "Huechuraba"],
      ["m13", "Mall Plaza Los Dominicos", "Metropolitana", "Las Condes"],
      ["m14", "Mall Plaza Egaña", "Metropolitana", "La Reina"],
      ["m15", "Mall Plaza Alameda", "Metropolitana", "Estación Central"],
      ["m16", "Arauco Estacion", "Metropolitana", "Estación Central"],
      ["m17", "Mall Plaza Oeste", "Metropolitana", "Cerrillos"],
      ["m18", "Mall Plaza Tobalaba", "Metropolitana", "Puente Alto"],
      ["m19", "Vivo Outlet Los Toros", "Metropolitana", "Puente Alto"],
      ["m20", "Puma Nucleo Puente", "Metropolitana", "Puente Alto"],
      ["m21", "Mall Outlet Rancagua", "O'Higgins", "Rancagua"],
      ["m22", "Mall Plaza Maule", "Maule", "Talca"],
      ["m23", "Mall Arauco Chillán", "Ñuble", "Chillán"],
      ["m24", "Mall Plaza Premium Outlets Concepción (ex Mirador Bío-Bío)", "Biobío", "Concepción"],
      ["m25", "Mall Paseo Valdivia", "Los Ríos", "Valdivia"],
      ["m26", "Mall Paseo Costanera Puerto Montt", "Los Lagos", "Puerto Montt"],
      ["m27", "Outlet Paseo Alerce", "Los Lagos", "Puerto Montt"],
    ] as const).map(([id, n, reg, com]): Mall => ({ id, n, dir: "Por completar", reg, com, activo: true })),
  ];
  /* Zonas de Puma (las del prototipo). Las tiendas de regiones fuera de estas zonas quedan «Sin zona». */
  const RM = ["Metropolitana"];
  const Z1: Zona[] = [
    { id: "norte", n: "Zona Norte", regs: NORTE },
    { id: "oriente", n: "Santiago Oriente", regs: RM, comunas: ["Providencia", "Las Condes", "La Reina", "Ñuñoa", "Vitacura"] },
    { id: "sur", n: "Santiago Sur", regs: RM, comunas: ["La Florida", "Puente Alto"] },
    { id: "poniente", n: "Santiago Norte y Poniente", regs: RM, comunas: ["Huechuraba", "Cerrillos", "Estación Central", "Pudahuel", "Maipú", "Santiago"] },
  ];
  const C = (id: string, tipo: Cliente["tipo"], rs: string, rut: number, giro: string, dte: string, pago: string, marcas: string[], o: Partial<Cliente>): Cliente => ({
    id, tipo, rs, rutStr: fmtRut(rut), giro, dte, pago, marcas, activo: true, plan: false, planMeses: 12, planDesde: "2026-01-01",
    calTodas: false, calSuc: [], calVence: "2027-01-15", zonas: [], dirs: [], ...o,
  });
  const D = (id: string, tipo: string, dir: string, reg: string, com: string, principal = true, activo = true): Direccion => ({ id, tipo, dir, reg, com, principal, activo });
  const clients: Cliente[] = [
    C("c1", "Empresa", "Puma Chile S.A.", 76384120, "Venta al por menor de vestuario y artículos deportivos", "dte@retailandes.cl", "30 días", ["Puma", "Puma Outlet"], {
      nombre: "PUMA", logo: "/clientes/puma.png",
      plan: true, planDesde: "2026-03-01", calTodas: true, calVence: "2027-10-28", zonas: Z1,
      dirs: [
        D("d1", "Facturación", "Av. Apoquindo 4501, of. 1202", "Metropolitana", "Las Condes"),
        D("d2", "Casa matriz", "Av. Apoquindo 4501, piso 12", "Metropolitana", "Las Condes"),
        D("d3", "Despacho", "Camino Lo Boza 120, bodega 4", "Metropolitana", "Pudahuel"),
        D("d4", "Despacho", "Av. Pedro de Valdivia 2500", "Antofagasta", "Antofagasta", false),
        D("d5", "Otra", "San Antonio 220, of. 501", "Metropolitana", "Santiago", false, false),
      ],
    }),
    C("c2", "Empresa", "Comercial Pacífico SpA", 76912455, "Venta al por menor de artículos deportivos", "facturas@pacificosport.cl", "45 días", ["Pacífico Sport"], {
      calSuc: ["s9"], calVence: "2026-10-28",
      zonas: [{ n: "Zona Norte", regs: ["Tarapacá", "Antofagasta"] }, { n: "Zona Centro-Sur", regs: ["Metropolitana", "Biobío"] }],
      dirs: [D("d6", "Facturación", "Av. Vitacura 2939, of. 801", "Metropolitana", "Vitacura")],
    }),
    C("c3", "Empresa", "Farmacias Cordillera Ltda.", 77105330, "Farmacias y perfumería", "dte@fcordillera.cl", "60 días", ["Cordillera Farma", "Cordillera Express"], {
      plan: true, planDesde: "2025-11-01", dirs: [D("d7", "Facturación", "Av. Providencia 1760, of. 34", "Metropolitana", "Providencia")],
    }),
    C("c4", "Empresa", "Distribuidora Austral S.A.", 76550812, "Venta de equipamiento outdoor", "contabilidad@australoutdoor.cl", "30 días", ["Austral Outdoor"], {
      calTodas: true, calVence: "2026-09-20", dirs: [D("d8", "Facturación", "Antonio Varas 550", "Los Lagos", "Puerto Montt")],
    }),
    C("c5", "Empresa", "Óptica Visión Sur SpA", 77880214, "Ópticas", "facturacion@visionsur.cl", "Contado", ["Visión Sur"], {
      dirs: [D("d9", "Facturación", "Av. Libertad 1348, local 210", "Valparaíso", "Viña del Mar")],
    }),
    C("c6", "Empresa", "Librería Atenea Ltda.", 76201677, "Librerías y papelerías", "dte@atenea.cl", "30 días", ["Atenea"], {
      dirs: [D("d10", "Facturación", "Av. Libertador Bernardo O'Higgins 1302", "Metropolitana", "Santiago")],
    }),
    C("c7", "Persona natural", "Juan Pablo Riquelme Soto", 13456789, "Bazar y paquetería", "jp.riquelme@gmail.com", "Contado", ["Bazar Riquelme"], {
      dirs: [D("d11", "Facturación", "Calle Prat 455", "Valparaíso", "Valparaíso")],
    }),
    C("c8", "Empresa", "Calzados Norte Grande S.A.", 76044391, "Venta de calzado", "dte@nortegrande.cl", "30 días", ["Norte Grande"], { activo: false }),
  ];

  type Row = [string, string, string, string, string, string, string, string, string, string, Cred];
  const B: Row[] = [
    /* Tiendas Puma (23), en el orden del listado del cliente. Código = PU-NNN según el número de id.
       Tipo «Mall» → marca Puma · tipo «Outlet» → marca Puma Outlet. */
    ["s3", "c1", "Puma", "PU-003", "Puma Mall Plaza Antofagasta", "m4", "", "", "", "2026-04-08", "Sin clave"],
    ["s21", "c1", "Puma", "PU-021", "Puma Mall Plaza Calama", "m9", "", "", "", "2025-03-14", "Activo"],
    ["s22", "c1", "Puma", "PU-022", "Puma Mall Plaza Copiapó", "m10", "", "", "", "2025-05-22", "Activo"],
    ["s6", "c1", "Puma", "PU-006", "Puma Mall Plaza La Serena", "m7", "", "", "", "2026-07-21", "Activo"],
    ["s23", "c1", "Puma Outlet", "PU-023", "Puma Arauco Premium Outlet Coquimbo", "m11", "", "", "", "2025-08-09", "Activo"],
    ["s4", "c1", "Puma", "PU-004", "Puma Mall Plaza Norte", "m12", "", "", "", "2025-01-15", "Activo"],
    ["s1", "c1", "Puma", "PU-001", "Puma Costanera Center", "m1", "", "", "", "2025-10-20", "Activo"],
    ["s24", "c1", "Puma", "PU-024", "Puma Mall Plaza Los Dominicos", "m13", "", "", "", "2024-11-18", "Activo"],
    ["s25", "c1", "Puma", "PU-025", "Puma Mall Plaza Egaña", "m14", "", "", "", "2024-09-02", "Activo"],
    ["s2", "c1", "Puma", "PU-002", "Puma Mall Plaza Alameda", "m15", "", "", "", "2024-06-11", "Activo"],
    ["s26", "c1", "Puma Outlet", "PU-026", "Puma Arauco Estacion", "m16", "", "", "", "2025-02-27", "Activo"],
    ["s27", "c1", "Puma", "PU-027", "Puma Mall Plaza Oeste", "m17", "", "", "", "2025-06-30", "Sin clave"],
    ["s5", "c1", "Puma", "PU-005", "Puma Mall Plaza Vespucio", "m3", "", "", "", "2025-11-02", "Activo"],
    ["s7", "c1", "Puma", "PU-007", "Puma Mall Plaza Tobalaba", "m18", "", "", "", "2023-09-04", "Bloqueado"],
    ["s28", "c1", "Puma Outlet", "PU-028", "Puma Vivo Outlet Los Toros", "m19", "", "", "", "2024-04-15", "Activo"],
    ["s29", "c1", "Puma Outlet", "PU-029", "Puma Nucleo Puente", "m20", "", "", "", "2026-02-10", "Activo"],
    ["s30", "c1", "Puma Outlet", "PU-030", "Puma Mall Outlet Rancagua", "m21", "", "", "", "2025-09-12", "Activo"],
    ["s31", "c1", "Puma", "PU-031", "Puma Mall Plaza Maule", "m22", "", "", "", "2026-03-05", "Activo"],
    ["s32", "c1", "Puma", "PU-032", "Puma Mall Arauco Chillán", "m23", "", "", "", "2025-04-21", "Activo"],
    ["s8", "c1", "Puma Outlet", "PU-008", "Puma Premium Outlets Concepción", "m24", "", "", "", "2026-01-19", "Activo"],
    ["s33", "c1", "Puma", "PU-033", "Puma Mall Paseo Valdivia", "m25", "", "", "", "2025-12-09", "Bloqueado"],
    ["s34", "c1", "Puma", "PU-034", "Puma Mall Paseo Costanera Puerto Montt", "m26", "", "", "", "2026-05-18", "Activo"],
    ["s35", "c1", "Puma Outlet", "PU-035", "Puma Outlet Paseo Alerce", "m27", "", "", "", "2024-07-26", "Activo"],
    ["s9", "c2", "Pacífico Sport", "PS-01", "Pacífico Sport Florida Center", "m8", "", "", "", "2025-08-10", "Activo"],
    ["s10", "c2", "Pacífico Sport", "PS-02", "Pacífico Sport Concepción", "", "Barros Arana 765", "Biobío", "Concepción", "2026-02-14", "Activo"],
    ["s11", "c2", "Pacífico Sport", "PS-03", "Pacífico Sport Iquique", "", "Av. Héroes de la Concepción 2555", "Tarapacá", "Iquique", "2025-10-25", "Sin clave"],
    ["s12", "c3", "Cordillera Farma", "CF-210", "Cordillera Farma Costanera", "m1", "", "", "", "2025-12-01", "Activo"],
    ["s13", "c3", "Cordillera Farma", "CF-233", "Cordillera Farma Providencia", "", "Av. Providencia 2133", "Metropolitana", "Providencia", "2024-03-18", "Activo"],
    ["s14", "c3", "Cordillera Express", "CE-015", "Cordillera Express Vespucio", "m3", "", "", "", "2026-06-30", "Sin clave"],
    ["s15", "c4", "Austral Outdoor", "AO-01", "Austral Outdoor Parque Arauco", "m2", "", "", "", "2026-05-02", "Activo"],
    ["s16", "c4", "Austral Outdoor", "AO-02", "Austral Outdoor Puerto Montt", "", "Antonio Varas 550", "Los Lagos", "Puerto Montt", "2025-09-01", "Activo"],
    ["s17", "c5", "Visión Sur", "VS-11", "Visión Sur Marina", "m5", "", "", "", "2025-10-30", "Activo"],
    ["s18", "c6", "Atenea", "AT-01", "Atenea Alameda", "", "Av. Libertador Bernardo O'Higgins 1302", "Metropolitana", "Santiago", "2026-03-12", "Activo"],
    ["s19", "c7", "Bazar Riquelme", "BR-1", "Bazar Riquelme", "", "Calle Prat 455", "Valparaíso", "Valparaíso", "2025-06-05", "Sin clave"],
    ["s20", "c8", "Norte Grande", "NG-04", "Norte Grande Antofagasta", "m4", "", "", "", "2023-05-10", "Bloqueado"],
  ];
  /* Último ingreso de las cuentas de Puma que traía el prototipo (fecha y hora); el resto conserva el de la demostración. */
  const ULT_PUMA: Record<string, string> = {
    s1: "2026-11-22 18:40", s4: "2026-11-23 10:15", s24: "2026-11-21 12:02", s25: "2026-11-19 16:48", s5: "2026-11-23 09:31", s7: "2026-11-02 11:20",
  };
  const sucursales: Sucursal[] = B.map(([id, cli, marca, cod, n, mall, calle, reg, com, inst, cred]) => {
    const m = malls.find((x) => x.id === mall);
    const num = +id.slice(1);
    const r = m ? m.reg : reg, c = m ? m.com : com;
    const cl = clients.find((x) => x.id === cli)!;
    return {
      id, cli, marca, cod, n, mall, calle, reg: r, com: c,
      local: m ? "Local " + (100 + num * 7) : "", inst, meses: 12, cred, activo: cli !== "c8", zona: zonaPorUbicacion(cl.zonas, r, c)?.n ?? "",
      ultimoAcceso: ULT_PUMA[id]?.slice(0, 10) ?? (cred === "Activo" ? "2026-10-0" + (1 + (num % 4)) : null),
    };
  });
  /* Cuentas de acceso de los locales. Puma trae solo las 6 del prototipo; en los demás clientes, toda sucursal con clave tiene cuenta.
     Regla: cred «Activo» ↔ cuenta activa · «Bloqueado» ↔ suspendida · «Sin clave» ↔ sin cuenta. */
  const USER_PUMA: Record<string, string> = { s1: "puma.costanera", s4: "puma.plazanorte", s24: "puma.losdominicos", s25: "puma.egana", s5: "puma.vespucio", s7: "puma.tobalaba" };
  const cuentas: Record<string, CuentaLocal> = {};
  sucursales.forEach((s) => {
    if (s.cred === "Sin clave") return;
    if (s.cli === "c1" && !USER_PUMA[s.id]) { s.cred = "Sin clave"; s.ultimoAcceso = null; return; }
    cuentas[s.id] = {
      usuario: USER_PUMA[s.id] ?? usuarioCuentaDe(s), estado: s.cred === "Activo" ? "activa" : "suspendida",
      ultimo: ULT_PUMA[s.id] ?? (s.ultimoAcceso ? s.ultimoAcceso + " 12:00" : null),
    };
  });

  const TEC = ["Cristián Morales", "Javier Tapia", "Nicolás Araya", "Sebastián Lillo"];
  const inst: Record<string, Acceso[]> = {};
  sucursales.forEach((s, i) => {
    let sv = (i + 3) * 7919;
    const rnd = () => { sv = (sv * 9301 + 49297) % 233280; return sv / 233280; };
    const hx = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(rnd() * 16)]).join("");
    const uuid = () => `${hx(8)}-${hx(4)}-4${hx(3)}-a${hx(3)}-${hx(12)}`;
    const mac = () => `00:1A:3F:${hx(2)}:${hx(2)}:${hx(2)}`.toUpperCase();
    const sub = 10 + i;
    const H = (e: Hist[] = []): Hist[] => [{ f: s.inst, u: TEC[i % 4], a: "Instalado", d: "Equipo instalado y probado en terreno." }, ...e];
    const acc: Acceso[] = [{
      id: s.id + "a1", n: "Entrada principal", eq: [
        { id: s.id + "e1", kind: "antena", modelo: i % 3 === 2 ? "RF Neo 8.2 MHz" : "EVO-AM 58 kHz Dual", cant: 2, remota: i % 3 !== 0 || s.id === "s1", uuid: uuid(), mac: mac(), serie: `EA58-${2400 + i * 13}-01`, fecha: s.inst,
          hist: H(s.id === "s1" ? [
            { f: "2026-02-11", u: "Rocío Henríquez", a: "Cambio de MAC", d: "Reemplazo de tarjeta de red. MAC anterior 00:1A:3F:2C:91:0E." },
            { f: "2026-06-03", u: "Cristián Morales", a: "Reemplazado", d: "Se reemplaza antena derecha por falla de bobina (serie EA58-2400-02)." },
          ] : []) },
        { id: s.id + "e2", kind: "contador", modelo: "Vision 3D Count v2", cant: 1, ip: `192.168.${sub}.45`, dhcp: i % 2 === 1, destino: "Plataforma", url: "https://conteo.dmc.cl/t/" + s.cod, mac: mac(), uuid: "", serie: `V3D-${8800 + i * 5}`, fecha: s.inst,
          hist: H(s.id === "s1" ? [{ f: "2026-08-19", u: "Javier Tapia", a: "Cambio de IP", d: "IP 192.168.10.32 → 192.168.10.45 por cambio de router del mall." }] : []) },
        { id: s.id + "e3", kind: "otro", tipo: "Desactivador AM", modelo: "Desactivador DA-58", cant: s.id === "s1" ? 2 : 1, serie: `DA58-${310 + i}`, mac: "", uuid: "", fecha: s.inst, hist: H() },
        { id: s.id + "e4", kind: "otro", tipo: "Alarma sonora", modelo: "Sirena SX-110", cant: 1, serie: `SX-${5021 + i}`, mac: "", uuid: "", fecha: s.inst, hist: H() },
      ],
    }];
    if (i % 2 === 0) acc.push({
      id: s.id + "a2", n: s.id === "s1" ? "Acceso bodega" : "Acceso lateral", eq: [
        { id: s.id + "e5", kind: "antena", modelo: "RF Neo 8.2 MHz", cant: 1, remota: false, uuid: uuid(), mac: "", serie: `RF82-${1200 + i}-07`, fecha: s.inst, hist: H() },
        { id: s.id + "e6", kind: "contador", modelo: "Vision 3D Count Lite", cant: 1, ip: "", dhcp: true, destino: "Servidor", url: `192.168.${sub}.20:8080`, mac: mac(), uuid: "", serie: `V3L-${400 + i}`, fecha: s.inst, hist: H() },
      ],
    });
    inst[s.id] = acc;
  });

  const personal: Record<string, Persona[]> = {
    s1: [
      { n: "Camila Rojas", c: "Jefa de tienda", t: "+56 9 8123 4567", m: "crojas@retailandes.cl" },
      { n: "Tomás Ibarra", c: "Subjefe de tienda", t: "+56 9 7740 2211", m: "tibarra@retailandes.cl" },
      { n: "Luis Paredes", c: "Guardia de seguridad", t: "+56 9 6012 8890", m: "" },
    ],
  };
  const NOM = ["Francisca Soto", "Diego Navarro", "Valentina Pino", "Matías Carrasco", "Josefa Gallardo", "Benjamín Ortiz", "Antonia Reyes", "Vicente Bravo"];
  sucursales.forEach((s, i) => {
    if (!personal[s.id]) personal[s.id] = [{ n: NOM[i % 8], c: "Jefe/a de tienda", t: `+56 9 ${6100 + i * 37} ${1000 + i * 91}`, m: NOM[i % 8].split(" ")[0].toLowerCase() + "@tienda.cl" }];
  });

  const contacts: Contacto[] = [
    { id: "k1", cli: "c1", n: "Sofia Ayala", tel: "+56 9 9876 5432", mail: "sayala@retailandes.cl", activo: true, cargos: [{ cargo: "Gerente de operaciones", alc: "Todo el cliente", val: "" }, { cargo: "Encargada/o de mantención", alc: "Marca", val: "Puma Outlet" }] },
    { id: "k2", cli: "c1", n: "Rodrigo Saavedra", tel: "+56 9 8455 1290", mail: "rsaavedra@retailandes.cl", activo: true, cargos: [{ cargo: "Jefe zonal", alc: "Zona", val: "Zona Norte" }] },
    { id: "k3", cli: "c1", n: "Camila Rojas", tel: "+56 9 8123 4567", mail: "crojas@retailandes.cl", activo: true, cargos: [{ cargo: "Jefa/e de tienda", alc: "Sucursal", val: "Puma Costanera Center" }] },
    { id: "k4", cli: "c1", n: "Felipe Muñoz", tel: "+56 2 2940 1100", mail: "fmunoz@retailandes.cl", activo: true, cargos: [{ cargo: "Prevención de pérdidas", alc: "Región", val: "Metropolitana" }, { cargo: "Contacto de facturación", alc: "Todo el cliente", val: "" }] },
    { id: "k5", cli: "c1", n: "Constanza Vera", tel: "+56 9 7321 0098", mail: "cvera@retailandes.cl", activo: true, cargos: [{ cargo: "Jefa/e de tienda", alc: "Sucursal", val: "Puma Mall Plaza La Serena" }] },
    { id: "k6", cli: "c1", n: "Andrés Lobos", tel: "+56 9 5544 3322", mail: "alobos@retailandes.cl", activo: false, cargos: [{ cargo: "Jefe zonal", alc: "Zona", val: "Santiago Sur" }] },
    { id: "k7", cli: "c2", n: "Ignacia Herrera", tel: "+56 9 9001 2345", mail: "iherrera@pacificosport.cl", activo: true, cargos: [{ cargo: "Gerente de operaciones", alc: "Todo el cliente", val: "" }] },
    { id: "k8", cli: "c3", n: "Pablo Cifuentes", tel: "+56 9 8765 1100", mail: "pcifuentes@fcordillera.cl", activo: true, cargos: [{ cargo: "Prevención de pérdidas", alc: "Todo el cliente", val: "" }] },
  ];
  const on = (a: string[]): Item[] => a.map((n) => ({ n, activo: true }));
  const cat: Catalogos = {
    cargos: [...on(["Gerente de operaciones", "Jefe zonal", "Jefa/e de tienda", "Prevención de pérdidas", "Encargada/o de mantención", "Contacto de facturación"]), { n: "Subgerente de seguridad", activo: false }],
    tiposDir: on(["Facturación", "Despacho", "Casa matriz", "Otra"]),
    modAntena: [...on(["EVO-AM 58 kHz Dual", "EVO-AM 58 kHz Single", "RF Neo 8.2 MHz", "Ultra Max Pro Acrílico"]), { n: "AM Clásica 2015", activo: false }],
    modContador: on(["Vision 3D Count v2", "Vision 3D Count Lite", "ThermoCount TC-200"]),
    tiposDisp: on(["Alarma sonora", "Luz estroboscópica", "Desactivador AM", "Detacher magnético", "Panel de alarma"]),
    modOtro: on(["Desactivador DA-58", "Sirena SX-110", "Estrobo LX-20", "Detacher Mag-15K", "Panel PA-8"]),
  };
  const V = (id: string, suc: string, f: string, tec: string, tipo: string, res: string): Visita => ({ id, suc, f, tec, tipo, res, estado: "completada" });
  const visitasBase: Visita[] = [
    V("V-20961", "s1", "2026-10-02", "Cristián Morales", "Mantención preventiva", "Limpieza y ajuste de sensibilidad en antenas de entrada principal. Prueba de detección con 12 etiquetas: OK."),
    V("V-20955", "s5", "2026-10-01", "Javier Tapia", "Correctiva", "Antena izquierda con falsos positivos por interferencia de letrero LED. Se reubica fuente de poder y se recalibra."),
    V("V-20948", "s3", "2026-09-30", "Nicolás Araya", "Instalación", "Instalación de contador Vision 3D en acceso lateral y configuración hacia plataforma."),
    V("V-20932", "s9", "2026-09-29", "Sebastián Lillo", "Calibración remota", "Calibración remota anual ejecutada sin incidencias."),
    V("V-20910", "s2", "2026-09-22", "Cristián Morales", "Mantención preventiva", "Revisión general. Cambio de cable coaxial en antena 2."),
    V("V-20877", "s7", "2026-09-10", "Javier Tapia", "Correctiva", "Equipo apagado por corte de energía. Se repone fusible y se deja operativo."),
    V("V-20841", "s8", "2026-08-28", "Nicolás Araya", "Mantención preventiva", "Ajuste de sensibilidad y prueba de desactivadores."),
    V("V-20802", "s6", "2026-08-12", "Sebastián Lillo", "Instalación", "Instalación de 2 antenas EVO-AM y sirena en entrada principal."),
    V("V-20770", "s1", "2026-07-30", "Javier Tapia", "Correctiva", "Contador sin datos: IP en conflicto. Se asigna IP fija 192.168.10.45."),
    V("V-20714", "s4", "2026-07-08", "Cristián Morales", "Mantención preventiva", "Mantención semestral. Equipos operativos."),
    V("V-20690", "s12", "2026-06-25", "Nicolás Araya", "Mantención preventiva", "Revisión de antenas y desactivador. Sin observaciones."),
    V("V-20655", "s1", "2026-06-03", "Cristián Morales", "Correctiva", "Reemplazo de antena derecha por falla de bobina."),
    V("V-20530", "s5", "2026-04-17", "Javier Tapia", "Mantención preventiva", "Mantención semestral. Se recomienda reubicar letrero LED."),
    V("V-20410", "s15", "2026-05-02", "Sebastián Lillo", "Instalación", "Instalación inicial del sistema EAS."),
  ];

  /* Visitas de demostración: las 14 de arriba + 69 generadas = 80 en el portal de Puma
     (los demás clientes conservan las suyas). Determinista: no cambia entre cargas. */
  const visitasHist: Visita[] = (() => {
    let sv = 20261005;
    const rnd = () => { sv = (sv * 9301 + 49297) % 233280; return sv / 233280; };
    const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
    const shuffle = <T,>(a: readonly T[]): T[] => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
    const RES = {
      "Mantención preventiva": [
        "Limpieza y ajuste de sensibilidad en antenas de entrada. Prueba de detección con etiquetas duras y blandas: OK.",
        "Revisión general del sistema EAS. Cableado, fuente de poder y desactivadores sin observaciones.",
        "Mantención semestral. Se verifica la alineación de las antenas y se prueba la alarma sonora: OK.",
        "Prueba de detección en todos los accesos y revisión del contador de personas. Equipos operativos.",
        "Ajuste de sensibilidad y limpieza de conectores. Se capacita al personal en el uso del desactivador.",
        "Revisión de antenas y desactivador. Se actualiza el registro de equipos de la sucursal.",
      ],
      "Correctiva": [
        "Falsos positivos por interferencia de luminaria cercana. Se reubica la fuente de poder y se recalibra.",
        "Contador sin datos: se reconfigura la IP y se valida el envío a la plataforma.",
        "Equipo apagado tras corte de energía. Se repone fusible y se deja operativo.",
        "Antena con detección intermitente. Se reemplaza el cable coaxial y se prueba con 12 etiquetas: OK.",
        "Sirena sin sonido. Se reemplaza el módulo de alarma y se verifica su funcionamiento.",
        "Daño físico en antena por golpe de carro. Se reinstala y se emite cotización de reposición.",
      ],
      "Calibración remota": [
        "Calibración remota anual ejecutada sin incidencias.",
        "Calibración remota de antenas y verificación de sensibilidad. Sin observaciones.",
        "Calibración remota completada. Se registran los nuevos parámetros en la ficha de la sucursal.",
        "Calibración remota con ajuste menor de umbral en el acceso principal. Equipos operativos.",
      ],
      "Instalación": [
        "Instalación inicial del sistema EAS: antenas en acceso principal, desactivador y alarma sonora. Puesta en marcha y pruebas OK.",
        "Instalación de antenas EVO-AM y contador Vision 3D. Configuración hacia plataforma y capacitación al personal.",
      ],
    } as const;
    const puma = sucursales.filter((x) => x.cli === "c1");
    const tecDe = (reg: string) => (NORTE.includes(reg) ? "Nicolás Araya" : reg === "Metropolitana" ? pick(["Cristián Morales", "Javier Tapia"]) : "Sebastián Lillo");
    type G = Omit<Visita, "id">;
    const G = (suc: string, f: string, tipo: keyof typeof RES): G => ({ suc, f, tipo, estado: "completada", tec: tecDe(puma.find((x) => x.id === suc)!.reg), res: pick(RES[tipo]) });
    // Instalaciones en la fecha de instalación de las tiendas puestas en marcha en 2026 sin visita de instalación propia.
    const fijas = ["s8", "s29", "s31", "s34"].map((id) => G(id, sucursales.find((x) => x.id === id)!.inst, "Instalación"));
    // Visitas de Puma por mes (Ene–Oct): 80 en total, con más actividad hacia el segundo semestre.
    const META = [5, 6, 7, 9, 7, 9, 10, 10, 12, 5];
    const yaHay = (m: number) => [...visitasBase.filter((v) => puma.some((x) => x.id === v.suc)), ...fijas].filter((v) => +v.f.slice(5, 7) === m + 1).length;
    const gen: G[] = [...fijas];
    let cola: typeof puma = [];
    META.forEach((meta, m) => {
      const ult = m === 9 ? 5 : new Date(2026, m + 1, 0).getDate();
      const dias = shuffle(Array.from({ length: ult }, (_, i) => i + 1).filter((d) => ![0, 6].includes(new Date(2026, m, d).getDay())));
      dias.slice(0, Math.max(0, meta - yaHay(m))).forEach((d) => {
        const f = `2026-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        let suc = cola.find((x) => x.inst <= f);
        if (!suc) { cola = shuffle(puma); suc = cola.find((x) => x.inst <= f)!; }
        cola = cola.filter((x) => x !== suc);
        const r = rnd();
        gen.push(G(suc.id, f, r < 0.58 ? "Mantención preventiva" : r < 0.84 ? "Correctiva" : "Calibración remota"));
      });
    });
    const usados = new Set(visitasBase.map((v) => v.id));
    const nuevas = gen.sort((x, y) => x.f.localeCompare(y.f)).map((g, k): Visita => {
      let n = 19700 + k * 10 + Math.floor(rnd() * 9);
      while (usados.has(`V-${n}`)) n++;
      usados.add(`V-${n}`);
      return { id: `V-${n}`, ...g };
    });
    return [...visitasBase, ...nuevas].sort((x, y) => y.f.localeCompare(x.f) || y.id.localeCompare(x.id));
  })();

  /* Visitas de noviembre (prototipo, folios V-2026-xxxxx): 16 completadas (4 en la última semana), 4 canceladas y 1 programada hoy.
     Solo V-2026-01064 y V-20961 traen detalle (fotos, firma, trabajos); las demás se muestran como resumen. */
  const FOTOS = (n: number, tema: (i: number) => string, hora: string): VisitaFoto[] => Array.from({ length: n }, (_, i) => ({ tema: tema(i), hora }));
  const detalle01064: VisitaDetalle = {
    inicio: "14:43", fin: "14:54", solicitadoPor: "rcarvajal@grupodmc.cl",
    // La nota original traía el nombre y la clave del Wi-Fi de la tienda: no se guardan ni se muestran.
    solicitud: "Dejar todas las antenas conectadas por Wi-Fi a la red de la tienda y enviar foto de las MAC.",
    credencialesOcultas: true,
    trabajos: [
      { tipo: "Visita de calibración", titulo: "Conectividad de antenas", items: [{ n: "Módulo Wi-Fi", c: 7 }] },
      { tipo: "Visita de calibración", titulo: "Modelo de antenas instaladas", items: [{ n: "SD-201&202", c: 7 }, { n: "MDG Tx 1.6", c: 7 }] },
    ],
    problemas: [], fotos: FOTOS(18, (i) => (i < 2 ? "tienda" : "modulo"), "14:54"),
    videos: [{ dur: "0:25", res: "360×480", tema: "acceso" }, { dur: "0:09", res: "360×480", tema: "tienda" }],
    firma: { nombre: "Diego Loubies", cargo: "Responsable de tienda", rut: "19.454.295-K" },
  };
  const detalle20961: VisitaDetalle = {
    inicio: "10:05", fin: "10:52", solicitadoPor: "pcontreras@grupodmc.cl",
    solicitud: "Mantención preventiva semestral de antenas y desactivadores.", credencialesOcultas: false,
    trabajos: [
      { tipo: "Mantención preventiva", titulo: "Limpieza y ajuste de antenas", items: [{ n: "EVO-AM 58 kHz Dual", c: 2 }] },
      { tipo: "Mantención preventiva", titulo: "Prueba de detección", items: [{ n: "Etiquetas de prueba", c: 12 }] },
    ],
    problemas: [{ titulo: "Letrero LED cerca de la antena derecha", detalle: "Genera interferencia leve. Se recomienda reubicarlo.", resuelto: false }],
    fotos: FOTOS(6, (i) => (i < 2 ? "tienda" : "modulo"), "10:52"), videos: [{ dur: "0:14", res: "360×480", tema: "acceso" }],
    firma: { nombre: "Camila Rojas", cargo: "Jefa de tienda", rut: fmtRut(17234567) },
  };
  const N = (id: string, suc: string, f: string, tec: string, tipo: string, estado: EstadoVisita, res: string, detalle?: VisitaDetalle): Visita =>
    ({ id: "V-2026-" + id, suc, f, tec, tipo, res, estado, ...(detalle ? { detalle } : {}) });
  const CAL = "Visita de calibración", OK = "Calibración de antenas y verificación de conectividad. Equipos operativos y sin observaciones.";
  const NOCAN = "Visita cancelada: el local no pudo recibir al técnico.";
  const visitasNov: Visita[] = [
    N("01012", "s1", "2026-11-02", "Cristián Morales", "Mantención preventiva", "completada", "Limpieza y ajuste de sensibilidad. Prueba de detección con etiquetas: OK."),
    N("01016", "s21", "2026-11-03", "Nicolás Araya", CAL, "completada", OK),
    N("01019", "s22", "2026-11-04", "Nicolás Araya", CAL, "completada", OK),
    N("01023", "s6", "2026-11-05", "Nicolás Araya", CAL, "completada", OK),
    N("01027", "s4", "2026-11-06", "Alexis Abarzua", "Correctiva", "completada", "Antena con detección intermitente. Se reemplaza el cable coaxial y se prueba con 12 etiquetas: OK."),
    N("01031", "s2", "2026-11-09", "Manuel Zambrano", CAL, "completada", OK),
    N("01035", "s26", "2026-11-10", "Alexis Abarzua", CAL, "completada", OK),
    N("01038", "s29", "2026-11-11", "Manuel Zambrano", CAL, "completada", OK),
    N("01044", "s31", "2026-11-12", "Sebastián Lillo", "Mantención preventiva", "completada", "Revisión general del sistema EAS. Cableado y desactivadores sin observaciones."),
    N("01049", "s32", "2026-11-16", "Sebastián Lillo", CAL, "completada", OK),
    N("01053", "s30", "2026-11-17", "Sebastián Lillo", CAL, "completada", OK),
    N("01056", "s34", "2026-11-18", "Sebastián Lillo", CAL, "completada", OK),
    N("01068", "s25", "2026-11-19", "Alexis Abarzua", CAL, "completada", OK),
    N("01059", "s4", "2026-11-20", "Alexis Abarzua", CAL, "cancelada", NOCAN),
    N("01060", "s1", "2026-11-20", "Alexis Abarzua", CAL, "completada", OK),
    N("01061", "s5", "2026-11-20", "Alexis Abarzua", CAL, "cancelada_admin", "Visita cancelada por la administración del cliente."),
    N("01062", "s28", "2026-11-20", "Manuel Zambrano", CAL, "completada", OK),
    N("01064", "s7", "2026-11-20", "Manuel Zambrano", CAL, "completada", "Antenas conectadas por Wi-Fi a la red de la tienda y registro de MAC enviado.", detalle01064),
    N("01065", "s5", "2026-11-20", "Manuel Zambrano", CAL, "cancelada", NOCAN),
    N("01069", "s24", "2026-11-20", "Alexis Abarzua", CAL, "cancelada", NOCAN),
    N("01071", "s5", "2026-11-23", "Alexis Abarzua", CAL, "programada", "Visita programada. El informe estará disponible al terminar."),
  ];
  const visitas: Visita[] = [...visitasHist, ...visitasNov]
    .map((v) => (v.id === "V-20961" ? { ...v, detalle: detalle20961 } : v))
    .sort((x, y) => y.f.localeCompare(x.f) || y.id.localeCompare(x.id));
  const T = (id: string, suc: string, f: string, prob: string, estado: string, prio: string, desc: string): Ticket => ({ id, suc, f, prob, estado, prio, desc });
  const tickets: Ticket[] = [
    // Tickets de Puma: tiendas que se dejan en remoto hoy (19-11-2026) y mañana (20-11-2026), prioridad baja.
    ...([
      ["TK-4901", "s4", "2026-11-19"], ["TK-4902", "s1", "2026-11-19"], ["TK-4903", "s24", "2026-11-19"], ["TK-4904", "s28", "2026-11-19"],
      ["TK-4905", "s29", "2026-11-20"], ["TK-4906", "s7", "2026-11-20"], ["TK-4907", "s5", "2026-11-20"], ["TK-4908", "s25", "2026-11-20"],
    ] as const).map(([id, suc, f]): Ticket => ({ ...T(id, suc, f, "Dejar remoto", "Abierto", "Baja", `Dejar la tienda en modo remoto el ${f.slice(8)}-${f.slice(5, 7)}-${f.slice(0, 4)}.`), nom: "Sofia Ayala" })),
    T("TK-4815", "s11", "2026-09-30", "No detecta", "En curso", "Alta", "Pasamos con una prenda con etiqueta y no suena."),
    T("TK-4772", "s9", "2026-09-14", "No detecta", "Cerrado", "Media", "No detecta etiquetas duras."),
    T("TK-4741", "s12", "2026-08-30", "Contador sin datos", "Cerrado", "Media", "Contador sin datos desde el fin de semana."),
  ];
  const cotizaciones: Cotizacion[] = [
    { id: "COT-1192", suc: "s3", f: "2026-09-28", desc: "Reposición antena EVO-AM 58 kHz (daño físico)", monto: "$ 1.240.000", estado: "En revisión" },
    { id: "COT-1185", suc: "s6", f: "2026-09-15", desc: "Contador de personas acceso lateral", monto: "$ 680.000", estado: "Aprobada" },
    { id: "COT-1170", suc: "s1", f: "2026-08-20", desc: "Ampliación a 3 antenas entrada principal", monto: "$ 1.890.000", estado: "Enviada" },
    { id: "COT-1144", suc: "s7", f: "2026-07-11", desc: "Renovación sistema EAS completo", monto: "$ 3.450.000", estado: "Rechazada" },
    { id: "COT-1131", suc: "s9", f: "2026-07-02", desc: "Calibración remota anual", monto: "$ 210.000", estado: "Aprobada" },
  ];
  const despachos: Despacho[] = [
    { id: "DES-0568", suc: "s6", f: "2026-10-03", items: "1 contador Vision 3D Count v2", estado: "En tránsito" },
    { id: "DES-0561", suc: "s3", f: "2026-09-29", items: "Etiquetas duras AM × 2.000", estado: "Preparando" },
    { id: "DES-0549", suc: "s1", f: "2026-09-12", items: "Desactivador DA-58", estado: "Entregado" },
    { id: "DES-0533", suc: "s9", f: "2026-08-21", items: "Antena EVO-AM 58 kHz Single", estado: "Entregado" },
  ];
  const plan: Plan[] = [
    { f: "2026-10-07", suc: "s3", trabajo: "Reposición de antena dañada", tec: "Nicolás Araya", estado: "Confirmado" },
    { f: "2026-10-14", suc: "s6", trabajo: "Instalación contador acceso lateral", tec: "Sebastián Lillo", estado: "Por confirmar" },
    { f: "2026-10-21", suc: "s2", trabajo: "Mantención preventiva semestral", tec: "Cristián Morales", estado: "Confirmado" },
    { f: "2026-10-28", suc: "s1", trabajo: "Calibración remota anual", tec: "Sebastián Lillo", estado: "Por confirmar" },
    { f: "2026-10-12", suc: "s11", trabajo: "Visita correctiva TK-4815", tec: "Nicolás Araya", estado: "Confirmado" },
    ...([
      ["TK-4901", "s4", "2026-11-19"], ["TK-4902", "s1", "2026-11-19"], ["TK-4903", "s24", "2026-11-19"], ["TK-4904", "s28", "2026-11-19"],
      ["TK-4905", "s29", "2026-11-20"], ["TK-4906", "s7", "2026-11-20"], ["TK-4907", "s5", "2026-11-20"], ["TK-4908", "s25", "2026-11-20"],
    ] as const).map(([id, suc, f], i): Plan => ({ f, suc, trabajo: `Dejar tienda en remoto · ${id}`, tec: i % 2 ? "Javier Tapia" : "Cristián Morales", estado: "Confirmado" })),
  ];
  const usuariosDmc: UsuarioDmc[] = [
    { id: "u1", n: "Paula Contreras", m: "pcontreras@grupodmc.cl", rol: "r1", activo: true, ult: "2026-10-05" },
    { id: "u2", n: "Rocío Henríquez", m: "rhenriquez@grupodmc.cl", rol: "r2", activo: true, ult: "2026-10-05" },
    { id: "u3", n: "Cristián Morales", m: "cmorales@grupodmc.cl", rol: "r3", activo: true, ult: "2026-10-04" },
    { id: "u4", n: "Matías Silva", m: "msilva@grupodmc.cl", rol: "r4", activo: true, ult: "2026-10-02" },
    { id: "u5", n: "Daniela Pérez", m: "dperez@grupodmc.cl", rol: "r2", activo: false, ult: "2026-05-14" },
  ];
  /* Usuarios del portal de Puma. Los datos legados rol/alc/val se derivan del rol nuevo (legacyDe). `locales` = ids de sucursal. */
  const pumaIds = (f: (x: Sucursal) => boolean) => sucursales.filter((x) => x.cli === "c1" && f(x)).map((x) => x.id);
  const UP = (id: string, n: string, m: string, rolKey: RolPortal, o: {
    zonaId?: string; locales?: string[]; extras?: PermisoId[]; estado?: EstadoUsuarioPortal; ult: string | null; cargo?: string; tel?: string; legacy?: Pick<UsuarioPortal, "rol" | "alc" | "val">;
  }): UsuarioPortal => {
    const locales = o.locales ?? [], estado = o.estado ?? "activo";
    const zn = Z1.find((z) => z.id === o.zonaId)?.n ?? null;
    return {
      id, cli: "c1", n, m, ...(o.legacy ?? legacyDe(rolKey, zn, locales.map((l) => sucursales.find((x) => x.id === l)?.n ?? l))),
      activo: estado !== "suspendido", ult: o.ult, rolKey, zonaId: o.zonaId ?? null, locales, extras: o.extras ?? [], estado,
      cargo: o.cargo ?? "", tel: o.tel ?? "", foto: null,
    };
  };
  const usuariosPortal: UsuarioPortal[] = [
    UP("p1", "Sofia Ayala", "sayala@retailandes.cl", "admin", { ult: "2026-11-23", cargo: "Gerente de operaciones", tel: "+56 9 9876 5432" }),
    UP("p2", "Rodrigo Saavedra", "rsaavedra@retailandes.cl", "zona", { zonaId: "norte", ult: "2026-11-20", cargo: "Jefe zonal", tel: "+56 9 8455 1290" }),
    UP("p3", "Ignacio Lagos", "ilagos@retailandes.cl", "locales", {
      locales: pumaIds((x) => x.marca === "Puma Outlet"), ult: "2026-11-18", cargo: "Encargado de outlets",
      legacy: { rol: "Supervisor", alc: "Marca", val: "Puma Outlet" },
    }),
    UP("p4", "Camila Rojas", "crojas@retailandes.cl", "encargado", { locales: ["s1"], ult: "2026-11-19", cargo: "Jefa de tienda", tel: "+56 9 8123 4567" }),
    UP("p5", "Andrés Lobos", "alobos@retailandes.cl", "zona", { zonaId: "sur", estado: "suspendido", ult: "2026-03-02", cargo: "Jefe zonal", tel: "+56 9 5544 3322" }),
    UP("p6", "Carla Muñoz", "cmunoz@retailandes.cl", "zona", { zonaId: "norte", ult: "2026-11-17", cargo: "Jefa zonal" }),
    UP("p7", "Rodrigo Pérez", "rperez@retailandes.cl", "zona", { zonaId: "oriente", extras: ["cuentas"], ult: "2026-11-22", cargo: "Jefe zonal" }),
    UP("p8", "Valentina Rojas", "vrojas@retailandes.cl", "locales", { locales: ["s5", "s7"], extras: ["reportes"], ult: "2026-11-21", cargo: "Jefa de locales" }),
    UP("p9", "Matías Soto", "msoto@retailandes.cl", "encargado", { locales: ["s4"], estado: "invitado", ult: null, cargo: "Encargado de local" }),
  ];
  const notif: Record<string, NotifRow[]> = {
    c1: [
      { n: "Sofia Ayala", tipo: "Contacto", m: "sayala@retailandes.cl", ev: { tn: true, tc: true, vr: true, gv: true, cv: true } },
      { n: "Rodrigo Saavedra", tipo: "Contacto", m: "rsaavedra@retailandes.cl", ev: { tn: true, tc: true, vr: false, gv: false, cv: false } },
      { n: "Felipe Muñoz", tipo: "Contacto", m: "fmunoz@retailandes.cl", ev: { tn: false, tc: false, vr: false, gv: true, cv: true } },
      { n: "Rocío Henríquez", tipo: "Usuario DMC", m: "rhenriquez@grupodmc.cl", ev: { tn: true, tc: false, vr: false, gv: true, cv: true } },
    ],
  };
  const envios: Envio[] = [
    { f: "2026-10-04 18:42", ev: "Ticket nuevo", cli: "c1", dest: "sayala@retailandes.cl", estado: "Enviado" },
    { f: "2026-10-04 18:42", ev: "Ticket nuevo", cli: "c1", dest: "rhenriquez@grupodmc.cl", estado: "Enviado" },
    { f: "2026-10-02 17:10", ev: "Visita realizada", cli: "c1", dest: "sayala@retailandes.cl", estado: "Enviado" },
    { f: "2026-09-28 09:00", ev: "Calibración por vencer", cli: "c1", dest: "fmunoz@retailandes.cl", estado: "Enviado" },
    { f: "2026-09-28 09:00", ev: "Calibración por vencer", cli: "c2", dest: "iherrera@pacificosport.cl", estado: "Rebotado" },
    { f: "2026-09-21 09:00", ev: "Garantía por vencer", cli: "c2", dest: "iherrera@pacificosport.cl", estado: "Enviado" },
    { f: "2026-09-14 16:25", ev: "Ticket cerrado", cli: "c2", dest: "iherrera@pacificosport.cl", estado: "Enviado" },
  ];
  const audit: Audit[] = [
    { f: "2026-10-05 10:14", u: "Paula Contreras", ent: "Cliente", reg: "Puma Chile S.A.", acc: "Editar", det: "Condición de pago: 45 días → 30 días" },
    { f: "2026-10-05 09:52", u: "Rocío Henríquez", ent: "Equipo", reg: "Puma Costanera Center · Contador", acc: "Editar", det: "Destino actualizado a plataforma DMC" },
    { f: "2026-10-04 17:30", u: "Paula Contreras", ent: "Contacto", reg: "Andrés Lobos", acc: "Desactivar", det: "Contacto desactivado" },
    { f: "2026-10-04 12:05", u: "Rocío Henríquez", ent: "Sucursal", reg: "Puma Mall Plaza Antofagasta", acc: "Crear", det: "Sucursal creada en Mall Plaza Antofagasta" },
    { f: "2026-10-03 16:48", u: "Matías Silva", ent: "Cliente", reg: "Óptica Visión Sur SpA", acc: "Crear", det: "Cliente creado" },
    { f: "2026-10-03 11:20", u: "Paula Contreras", ent: "Catálogo", reg: "Cargos", acc: "Crear", det: "Nuevo cargo: Contacto de facturación" },
    { f: "2026-10-02 15:02", u: "Paula Contreras", ent: "Rol", reg: "Coordinador de operaciones", acc: "Editar", det: "Permiso Exportar en Auditoría: activado" },
    { f: "2026-09-30 10:41", u: "Rocío Henríquez", ent: "Mall", reg: "Mall Plaza La Serena", acc: "Editar", det: "Dirección corregida" },
    { f: "2026-08-19 14:12", u: "Javier Tapia", ent: "Equipo", reg: "Puma Costanera Center · Contador", acc: "Editar", det: "IP 192.168.10.32 → 192.168.10.45" },
    { f: "2026-06-03 13:30", u: "Cristián Morales", ent: "Equipo", reg: "Puma Costanera Center · Antena", acc: "Reemplazar", det: "Antena derecha reemplazada por falla de bobina" },
  ];
  void addM;

  /* Reportes que enviaron los locales (id R-0148…). `suc` = id de sucursal. */
  const R = (id: string, suc: string, f: string, tipo: string, detalle: string, estado: EstadoReporte): Reporte => ({ id, suc, f, tipo, detalle, estado, prioridad: null });
  const reportes: Reporte[] = [
    R("R-0148", "s5", "2026-11-23 09:40", "Falsa alarma", "La antena del acceso principal suena sin que pase ningún cliente.", "nuevo"),
    R("R-0147", "s4", "2026-11-23 10:20", "Antena no detecta", "Una prenda con etiqueta pasó sin que sonara la antena izquierda.", "nuevo"),
    R("R-0145", "s1", "2026-11-22 18:45", "Desactivador no funciona", "El desactivador de la caja 2 no quita la alarma de las etiquetas.", "revision"),
    R("R-0141", "s24", "2026-11-21 12:10", "Cable suelto", "Hay un cable expuesto en la base de la antena derecha.", "revision"),
    R("R-0139", "s5", "2026-11-20 15:05", "Falsa alarma", "Suena cada vez que se abre la puerta lateral.", "revision"),
    R("R-0132", "s4", "2026-11-18 11:30", "Antena dañada", "La antena fue golpeada por un carro de reposición.", "ticket"),
    R("R-0128", "s25", "2026-11-17 16:50", "Antena no detecta", "No suena con etiquetas duras en la antena central.", "ticket"),
    R("R-0121", "s1", "2026-11-12 10:05", "Falsa alarma", "Sonó varias veces durante la mañana.", "resuelto"),
    R("R-0117", "s7", "2026-10-30 19:12", "Desactivador no funciona", "El desactivador no enciende.", "resuelto"),
  ];

  /* Avisos del portal (los de Puma, vistos por el administrador); cada usuario recibe los de su alcance. */
  const A = (id: string, tipo: TipoAviso, titulo: string, texto: string, f: string, leida: boolean, href: string | null, suc?: string): AvisoPortal =>
    ({ id, tipo, titulo, texto, f, leida, href, ...(suc ? { suc } : {}) });
  const avisosPuma: AvisoPortal[] = [
    A("n8", "reporte_nuevo", "Reporte nuevo R-0147", "Puma Mall Plaza Norte: antena no detecta.", "2026-11-23 10:20", false, "/portal/sucursales/pu-004", "s4"),
    A("n7", "reporte_nuevo", "Reporte nuevo R-0148", "Puma Mall Plaza Vespucio: falsa alarma en el acceso principal.", "2026-11-23 09:40", false, "/portal/sucursales/pu-005", "s5"),
    A("n6", "visita_programada", "Visita programada V-2026-01071", "Visita de calibración en Puma Mall Plaza Vespucio para el 23-11-2026.", "2026-11-21 12:00", false, "/portal/visitas/v-2026-01071", "s5"),
    A("n5", "visita_realizada", "Visita realizada V-2026-01064", "Visita de calibración en Puma Mall Plaza Tobalaba. Sin problemas registrados.", "2026-11-20 14:54", true, "/portal/visitas/v-2026-01064", "s7"),
    A("n4", "ticket_nuevo", "Ticket nuevo TK-4905", "Puma Nucleo Puente: dejar la tienda en remoto el 20-11-2026. Prioridad baja.", "2026-11-19 08:30", true, "/portal/tickets", "s29"),
    A("n3", "ticket_nuevo", "Ticket nuevo TK-4901", "Puma Mall Plaza Norte: dejar la tienda en remoto el 19-11-2026. Prioridad baja.", "2026-11-19 08:30", true, "/portal/tickets", "s4"),
    A("n2", "visita_realizada", "Visita realizada V-20961", "Mantención preventiva en Puma Costanera Center.", "2026-10-02 17:10", true, "/portal/sucursales/pu-001", "s1"),
    A("n1", "calibracion", "Calibración remota por vencer", "La calibración anual de tus 23 sucursales vence el 28-10-2026.", "2026-09-28 09:00", true, null),
  ];

  const db: Db = {
    malls, clients, sucursales, inst, personal, contacts, cat, visitas, tickets, cotizaciones, despachos, plan, usuariosDmc, usuariosPortal, notif, envios, audit,
    reportes, cuentas, avisos: {}, prefs: {},
  };
  usuariosPortal.forEach((u) => {
    const ids = new Set(sucursalesVisibles(db, u).map(sucKey));
    db.avisos[u.id] = avisosPuma.filter((a) => !a.suc || ids.has(a.suc)).map((a) => ({ ...a }));
    db.prefs[u.id] = prefsPorDefecto();
  });
  return db;
}

/* Roles y permisos (panel interno y portal cliente) */
export const MOD_IN = ["Clientes", "Sucursales", "Malls", "Catálogos", "Garantías y calibraciones", "Notificaciones", "Usuarios y permisos", "Auditoría"];
export const MOD_PO = ["Dashboard", "Mis sucursales", "Visitas", "Tickets", "Cotizaciones y despachos", "Trabajos planificados", "Credenciales de locales", "Usuarios y roles"];
export const ACC = ["Ver", "Crear", "Editar", "Desactivar", "Exportar"] as const;
export type Perms = Record<string, Record<string, Record<string, boolean>>>;
const mk = (mods: string[], fn: (m: string, a: string) => boolean) =>
  Object.fromEntries(mods.map((m) => [m, Object.fromEntries(ACC.map((a) => [a, fn(m, a)]))]));
export const seedPerms = (): Perms => ({
  r1: mk(MOD_IN, () => true),
  r2: mk(MOD_IN, (m, a) => m !== "Usuarios y permisos" || a === "Ver"),
  r3: mk(MOD_IN, (m, a) => a === "Ver" || (m === "Sucursales" && a === "Editar")),
  r4: mk(MOD_IN, (m, a) => (a === "Ver" && m !== "Auditoría") || (m === "Clientes" && a !== "Desactivar")),
  q1: mk(MOD_PO, () => true),
  q2: mk(MOD_PO, (m, a) => a === "Ver" || a === "Exportar" || (m === "Tickets" && a === "Crear") || (m === "Credenciales de locales" && a !== "Desactivar")),
  q3: mk(MOD_PO, (m, a) => a === "Ver" && m !== "Usuarios y roles" && m !== "Credenciales de locales"),
});
export const seedRoles = () => ({
  rolesIn: [{ id: "r1", n: "Administrador" }, { id: "r2", n: "Coordinador de operaciones" }, { id: "r3", n: "Técnico" }, { id: "r4", n: "Comercial" }],
  rolesPo: [{ id: "q1", n: "Administrador cliente" }, { id: "q2", n: "Supervisor" }, { id: "q3", n: "Consulta" }],
});

/* Tipos del contrato del portal (definidos en lib/portal.ts), reexportados para importar todo desde un solo lugar. */
export type {
  EstadoCuentaLocal, EstadoReporte, EstadoUsuarioPortal, EstadoVisita, FrecuenciaAviso, NivelPrioridad, PermisoId, RolPortal, TipoAviso,
} from "./portal";
