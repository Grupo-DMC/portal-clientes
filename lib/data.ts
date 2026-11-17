import { addM, fmtRut } from "./format";

/* Datos estáticos de demostración. Cuando se conecte SQL Server (lib/db.ts),
   solo hay que reemplazar `seed()` por consultas parametrizadas. */

export type Mall = { id: string; n: string; dir: string; reg: string; com: string; activo: boolean };
export type Zona = { n: string; regs: string[] };
export type Direccion = { id: string; tipo: string; dir: string; reg: string; com: string; principal: boolean; activo: boolean };
export type Cliente = {
  id: string; tipo: "Empresa" | "Persona natural"; rs: string; rutStr: string; giro: string; dte: string; pago: string;
  marcas: string[]; activo: boolean; plan: boolean; planMeses: number; planDesde: string; calTodas: boolean;
  calSuc: string[]; calVence: string; zonas: Zona[]; dirs: Direccion[];
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
export type Visita = { id: string; suc: string; f: string; tec: string; tipo: string; res: string };
export type Ticket = { id: string; suc: string; f: string; prob: string; estado: string; prio: string; desc: string; nom?: string; isNew?: boolean };
export type Cotizacion = { id: string; suc: string; f: string; desc: string; monto: string; estado: string };
export type Despacho = { id: string; suc: string; f: string; items: string; estado: string };
export type Plan = { f: string; suc: string; trabajo: string; tec: string; estado: string };
export type UsuarioDmc = { id: string; n: string; m: string; rol: string; activo: boolean; ult: string };
export type UsuarioPortal = { id: string; cli: string; n: string; m: string; rol: string; alc: string; val: string; activo: boolean; ult: string | null };
export type NotifRow = { n: string; tipo: string; m: string; ev: Record<string, boolean> };
export type Envio = { f: string; ev: string; cli: string; dest: string; estado: string };
export type Audit = { f: string; u: string; ent: string; reg: string; acc: string; det: string };

export type Db = {
  malls: Mall[]; clients: Cliente[]; sucursales: Sucursal[]; inst: Record<string, Acceso[]>; personal: Record<string, Persona[]>;
  contacts: Contacto[]; cat: Catalogos; visitas: Visita[]; tickets: Ticket[]; cotizaciones: Cotizacion[]; despachos: Despacho[];
  plan: Plan[]; usuariosDmc: UsuarioDmc[]; usuariosPortal: UsuarioPortal[]; notif: Record<string, NotifRow[]>; envios: Envio[]; audit: Audit[];
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
  ];
  const Z1: Zona[] = [
    { n: "Zona Norte", regs: NORTE },
    { n: "Zona Centro", regs: ["Valparaíso", "Metropolitana", "O'Higgins"] },
    { n: "Zona Sur", regs: ["Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes"] },
  ];
  const C = (id: string, tipo: Cliente["tipo"], rs: string, rut: number, giro: string, dte: string, pago: string, marcas: string[], o: Partial<Cliente>): Cliente => ({
    id, tipo, rs, rutStr: fmtRut(rut), giro, dte, pago, marcas, activo: true, plan: false, planMeses: 12, planDesde: "2026-01-01",
    calTodas: false, calSuc: [], calVence: "2027-01-15", zonas: [], dirs: [], ...o,
  });
  const D = (id: string, tipo: string, dir: string, reg: string, com: string, principal = true, activo = true): Direccion => ({ id, tipo, dir, reg, com, principal, activo });
  const clients: Cliente[] = [
    C("c1", "Empresa", "Retail Andes S.A.", 76384120, "Venta al por menor de vestuario y artículos para el hogar", "dte@retailandes.cl", "30 días", ["Andes Moda", "Andes Kids", "Andes Home"], {
      plan: true, planDesde: "2026-03-01", calTodas: true, calVence: "2026-10-28", zonas: Z1,
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
    ["s1", "c1", "Andes Moda", "AM-012", "Andes Moda Costanera", "m1", "", "", "", "2025-10-20", "Activo"],
    ["s2", "c1", "Andes Moda", "AM-018", "Andes Moda Parque Arauco", "m2", "", "", "", "2024-06-11", "Activo"],
    ["s3", "c1", "Andes Moda", "AM-031", "Andes Moda Antofagasta", "m4", "", "", "", "2026-04-08", "Sin clave"],
    ["s4", "c1", "Andes Moda", "AM-044", "Andes Moda Viña", "m5", "", "", "", "2025-01-15", "Activo"],
    ["s5", "c1", "Andes Kids", "AK-003", "Andes Kids Vespucio", "m3", "", "", "", "2025-11-02", "Bloqueado"],
    ["s6", "c1", "Andes Kids", "AK-007", "Andes Kids La Serena", "m7", "", "", "", "2026-07-21", "Activo"],
    ["s7", "c1", "Andes Home", "AH-101", "Andes Home Ahumada", "", "Paseo Ahumada 312", "Metropolitana", "Santiago", "2023-09-04", "Sin clave"],
    ["s8", "c1", "Andes Home", "AH-104", "Andes Home Trébol", "m6", "", "", "", "2026-01-19", "Activo"],
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
  const sucursales: Sucursal[] = B.map(([id, cli, marca, cod, n, mall, calle, reg, com, inst, cred]) => {
    const m = malls.find((x) => x.id === mall);
    const num = +id.slice(1);
    return {
      id, cli, marca, cod, n, mall, calle, reg: m ? m.reg : reg, com: m ? m.com : com,
      local: m ? "Local " + (100 + num * 7) : "", inst, meses: 12, cred, activo: cli !== "c8", zona: "",
      ultimoAcceso: cred === "Activo" ? "2026-10-0" + (1 + (num % 4)) : null,
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
        { id: s.id + "e1", kind: "antena", modelo: i % 3 === 2 ? "RF Neo 8.2 MHz" : "EVO-AM 58 kHz Dual", cant: 2, remota: i % 3 !== 0 || i === 0, uuid: uuid(), mac: mac(), serie: `EA58-${2400 + i * 13}-01`, fecha: s.inst,
          hist: H(i === 0 ? [
            { f: "2026-02-11", u: "Rocío Henríquez", a: "Cambio de MAC", d: "Reemplazo de tarjeta de red. MAC anterior 00:1A:3F:2C:91:0E." },
            { f: "2026-06-03", u: "Cristián Morales", a: "Reemplazado", d: "Se reemplaza antena derecha por falla de bobina (serie EA58-2400-02)." },
          ] : []) },
        { id: s.id + "e2", kind: "contador", modelo: "Vision 3D Count v2", cant: 1, ip: `192.168.${sub}.45`, dhcp: i % 2 === 1, destino: "Plataforma", url: "https://conteo.dmc.cl/t/" + s.cod, mac: mac(), uuid: "", serie: `V3D-${8800 + i * 5}`, fecha: s.inst,
          hist: H(i === 0 ? [{ f: "2026-08-19", u: "Javier Tapia", a: "Cambio de IP", d: "IP 192.168.10.32 → 192.168.10.45 por cambio de router del mall." }] : []) },
        { id: s.id + "e3", kind: "otro", tipo: "Desactivador AM", modelo: "Desactivador DA-58", cant: i === 0 ? 2 : 1, serie: `DA58-${310 + i}`, mac: "", uuid: "", fecha: s.inst, hist: H() },
        { id: s.id + "e4", kind: "otro", tipo: "Alarma sonora", modelo: "Sirena SX-110", cant: 1, serie: `SX-${5021 + i}`, mac: "", uuid: "", fecha: s.inst, hist: H() },
      ],
    }];
    if (i % 2 === 0) acc.push({
      id: s.id + "a2", n: i === 0 ? "Acceso bodega" : "Acceso lateral", eq: [
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
    { id: "k1", cli: "c1", n: "María José Fuentes", tel: "+56 9 9876 5432", mail: "mjfuentes@retailandes.cl", activo: true, cargos: [{ cargo: "Gerente de operaciones", alc: "Todo el cliente", val: "" }, { cargo: "Encargada/o de mantención", alc: "Marca", val: "Andes Home" }] },
    { id: "k2", cli: "c1", n: "Rodrigo Saavedra", tel: "+56 9 8455 1290", mail: "rsaavedra@retailandes.cl", activo: true, cargos: [{ cargo: "Jefe zonal", alc: "Zona", val: "Zona Norte" }] },
    { id: "k3", cli: "c1", n: "Camila Rojas", tel: "+56 9 8123 4567", mail: "crojas@retailandes.cl", activo: true, cargos: [{ cargo: "Jefa/e de tienda", alc: "Sucursal", val: "Andes Moda Costanera" }] },
    { id: "k4", cli: "c1", n: "Felipe Muñoz", tel: "+56 2 2940 1100", mail: "fmunoz@retailandes.cl", activo: true, cargos: [{ cargo: "Prevención de pérdidas", alc: "Región", val: "Metropolitana" }, { cargo: "Contacto de facturación", alc: "Todo el cliente", val: "" }] },
    { id: "k5", cli: "c1", n: "Constanza Vera", tel: "+56 9 7321 0098", mail: "cvera@retailandes.cl", activo: true, cargos: [{ cargo: "Jefa/e de tienda", alc: "Sucursal", val: "Andes Kids La Serena" }] },
    { id: "k6", cli: "c1", n: "Andrés Lobos", tel: "+56 9 5544 3322", mail: "alobos@retailandes.cl", activo: false, cargos: [{ cargo: "Jefe zonal", alc: "Zona", val: "Zona Sur" }] },
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
  const V = (id: string, suc: string, f: string, tec: string, tipo: string, res: string): Visita => ({ id, suc, f, tec, tipo, res });
  const visitas: Visita[] = [
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
  const T = (id: string, suc: string, f: string, prob: string, estado: string, prio: string, desc: string): Ticket => ({ id, suc, f, prob, estado, prio, desc });
  const tickets: Ticket[] = [
    T("TK-4831", "s5", "2026-10-04", "Antena suena sin motivo", "Abierto", "Alta", "La antena de la entrada suena cada vez que pasa gente aunque no lleven productos."),
    T("TK-4827", "s1", "2026-10-03", "Contador sin datos", "En curso", "Media", "El dashboard de conteo no muestra datos desde el jueves."),
    T("TK-4820", "s7", "2026-10-01", "Equipo apagado", "Abierto", "Alta", "Las antenas no encienden después del corte de luz."),
    T("TK-4815", "s11", "2026-09-30", "No detecta", "En curso", "Alta", "Pasamos con una prenda con etiqueta y no suena."),
    T("TK-4809", "s3", "2026-09-27", "Daño físico", "Abierto", "Media", "Un carro golpeó la antena izquierda, está suelta."),
    T("TK-4790", "s2", "2026-09-20", "Antena suena sin motivo", "Cerrado", "Baja", "Suena de forma intermitente en la tarde."),
    T("TK-4772", "s9", "2026-09-14", "No detecta", "Cerrado", "Media", "No detecta etiquetas duras."),
    T("TK-4760", "s8", "2026-09-09", "Otro", "Cerrado", "Baja", "Solicitan capacitación para uso de desactivador."),
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
    { f: "2026-10-08", suc: "s5", trabajo: "Visita correctiva TK-4831", tec: "Javier Tapia", estado: "Confirmado" },
    { f: "2026-10-09", suc: "s7", trabajo: "Visita correctiva TK-4820", tec: "Javier Tapia", estado: "Por confirmar" },
    { f: "2026-10-14", suc: "s6", trabajo: "Instalación contador acceso lateral", tec: "Sebastián Lillo", estado: "Por confirmar" },
    { f: "2026-10-21", suc: "s2", trabajo: "Mantención preventiva semestral", tec: "Cristián Morales", estado: "Confirmado" },
    { f: "2026-10-28", suc: "s1", trabajo: "Calibración remota anual", tec: "Sebastián Lillo", estado: "Por confirmar" },
    { f: "2026-10-12", suc: "s11", trabajo: "Visita correctiva TK-4815", tec: "Nicolás Araya", estado: "Confirmado" },
  ];
  const usuariosDmc: UsuarioDmc[] = [
    { id: "u1", n: "Paula Contreras", m: "pcontreras@grupodmc.cl", rol: "r1", activo: true, ult: "2026-10-05" },
    { id: "u2", n: "Rocío Henríquez", m: "rhenriquez@grupodmc.cl", rol: "r2", activo: true, ult: "2026-10-05" },
    { id: "u3", n: "Cristián Morales", m: "cmorales@grupodmc.cl", rol: "r3", activo: true, ult: "2026-10-04" },
    { id: "u4", n: "Matías Silva", m: "msilva@grupodmc.cl", rol: "r4", activo: true, ult: "2026-10-02" },
    { id: "u5", n: "Daniela Pérez", m: "dperez@grupodmc.cl", rol: "r2", activo: false, ult: "2026-05-14" },
  ];
  const usuariosPortal: UsuarioPortal[] = [
    { id: "p1", cli: "c1", n: "María José Fuentes", m: "mjfuentes@retailandes.cl", rol: "Administrador cliente", alc: "Todo el cliente", val: "", activo: true, ult: "2026-10-05" },
    { id: "p2", cli: "c1", n: "Rodrigo Saavedra", m: "rsaavedra@retailandes.cl", rol: "Supervisor", alc: "Zona", val: "Zona Norte", activo: true, ult: "2026-10-03" },
    { id: "p3", cli: "c1", n: "Ignacio Lagos", m: "ilagos@retailandes.cl", rol: "Supervisor", alc: "Marca", val: "Andes Home", activo: true, ult: "2026-09-29" },
    { id: "p4", cli: "c1", n: "Camila Rojas", m: "crojas@retailandes.cl", rol: "Consulta", alc: "Región", val: "Metropolitana", activo: true, ult: "2026-09-30" },
    { id: "p5", cli: "c1", n: "Andrés Lobos", m: "alobos@retailandes.cl", rol: "Supervisor", alc: "Zona", val: "Zona Sur", activo: false, ult: "2026-03-02" },
  ];
  const notif: Record<string, NotifRow[]> = {
    c1: [
      { n: "María José Fuentes", tipo: "Contacto", m: "mjfuentes@retailandes.cl", ev: { tn: true, tc: true, vr: true, gv: true, cv: true } },
      { n: "Rodrigo Saavedra", tipo: "Contacto", m: "rsaavedra@retailandes.cl", ev: { tn: true, tc: true, vr: false, gv: false, cv: false } },
      { n: "Felipe Muñoz", tipo: "Contacto", m: "fmunoz@retailandes.cl", ev: { tn: false, tc: false, vr: false, gv: true, cv: true } },
      { n: "Rocío Henríquez", tipo: "Usuario DMC", m: "rhenriquez@grupodmc.cl", ev: { tn: true, tc: false, vr: false, gv: true, cv: true } },
    ],
  };
  const envios: Envio[] = [
    { f: "2026-10-04 18:42", ev: "Ticket nuevo", cli: "c1", dest: "mjfuentes@retailandes.cl", estado: "Enviado" },
    { f: "2026-10-04 18:42", ev: "Ticket nuevo", cli: "c1", dest: "rhenriquez@grupodmc.cl", estado: "Enviado" },
    { f: "2026-10-02 17:10", ev: "Visita realizada", cli: "c1", dest: "mjfuentes@retailandes.cl", estado: "Enviado" },
    { f: "2026-09-28 09:00", ev: "Calibración por vencer", cli: "c1", dest: "fmunoz@retailandes.cl", estado: "Enviado" },
    { f: "2026-09-28 09:00", ev: "Calibración por vencer", cli: "c2", dest: "iherrera@pacificosport.cl", estado: "Rebotado" },
    { f: "2026-09-21 09:00", ev: "Garantía por vencer", cli: "c2", dest: "iherrera@pacificosport.cl", estado: "Enviado" },
    { f: "2026-09-14 16:25", ev: "Ticket cerrado", cli: "c2", dest: "iherrera@pacificosport.cl", estado: "Enviado" },
  ];
  const audit: Audit[] = [
    { f: "2026-10-05 10:14", u: "Paula Contreras", ent: "Cliente", reg: "Retail Andes S.A.", acc: "Editar", det: "Condición de pago: 45 días → 30 días" },
    { f: "2026-10-05 09:52", u: "Rocío Henríquez", ent: "Equipo", reg: "Andes Moda Costanera · Contador", acc: "Editar", det: "Destino actualizado a plataforma DMC" },
    { f: "2026-10-04 17:30", u: "Paula Contreras", ent: "Contacto", reg: "Andrés Lobos", acc: "Desactivar", det: "Contacto desactivado" },
    { f: "2026-10-04 12:05", u: "Rocío Henríquez", ent: "Sucursal", reg: "Andes Moda Antofagasta", acc: "Crear", det: "Sucursal creada en Mall Plaza Antofagasta" },
    { f: "2026-10-03 16:48", u: "Matías Silva", ent: "Cliente", reg: "Óptica Visión Sur SpA", acc: "Crear", det: "Cliente creado" },
    { f: "2026-10-03 11:20", u: "Paula Contreras", ent: "Catálogo", reg: "Cargos", acc: "Crear", det: "Nuevo cargo: Contacto de facturación" },
    { f: "2026-10-02 15:02", u: "Paula Contreras", ent: "Rol", reg: "Coordinador de operaciones", acc: "Editar", det: "Permiso Exportar en Auditoría: activado" },
    { f: "2026-09-30 10:41", u: "Rocío Henríquez", ent: "Mall", reg: "Mall Plaza La Serena", acc: "Editar", det: "Dirección corregida" },
    { f: "2026-08-19 14:12", u: "Javier Tapia", ent: "Equipo", reg: "Andes Moda Costanera · Contador", acc: "Editar", det: "IP 192.168.10.32 → 192.168.10.45" },
    { f: "2026-06-03 13:30", u: "Cristián Morales", ent: "Equipo", reg: "Andes Moda Costanera · Antena", acc: "Reemplazar", det: "Antena derecha reemplazada por falla de bobina" },
  ];
  void addM;
  return { malls, clients, sucursales, inst, personal, contacts, cat, visitas, tickets, cotizaciones, despachos, plan, usuariosDmc, usuariosPortal, notif, envios, audit };
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
