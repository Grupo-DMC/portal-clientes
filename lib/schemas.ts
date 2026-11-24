import { z } from "zod";

/* Esquemas compartidos entre formularios (cliente) y Server Actions. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .pipe(z.email("El correo no tiene un formato válido. Ejemplo: nombre@empresa.cl"));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña.").max(128),
  remember: z.boolean().default(false),
});

export const clientKeySchema = z
  .string()
  .min(8, "Al menos 8 caracteres")
  .max(64)
  .regex(/[A-ZÑ]/, "Una letra mayúscula")
  .regex(/\d/, "Un número")
  .regex(/^\S+$/, "Sin espacios");

export const localLoginSchema = z.object({
  cod: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Ingresa el código de tu sucursal.")
    .max(12)
    .regex(/^[A-Z0-9-]+$/, "Código no válido."),
  clave: z.string().min(1, "Ingresa la clave del local.").max(64),
});

export const TIPOS_REPORTE = ["Antena suena sin motivo", "No detecta", "Equipo apagado", "Daño físico", "Contador sin datos", "Otro"] as const;
export const reporteSchema = z
  .object({
    tipo: z.enum(TIPOS_REPORTE, { error: "Elige qué está pasando." }),
    acc: z.string().trim().min(1, "Indica el acceso afectado.").max(80),
    desc: z.string().trim().max(1000).default(""),
    urg: z.enum(["Baja", "Media", "Alta"]),
    nom: z.string().trim().min(2, "Ingresa tu nombre.").max(80),
    fotos: z.number().int().min(0).max(3).default(0),
  })
  .refine((v) => v.tipo !== "Otro" || v.desc.length > 0, { message: "Describe el problema.", path: ["desc"] });

export const ipSchema = z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "IP no válida. Usa el formato 192.168.x.x o activa DHCP");

/* ---- Portal cliente: formularios de perfil, usuarios, prioridad de reporte y avisos ---- */
export const telefonoSchema = z.string().trim().regex(/^\+?[\d\s]{8,15}$/, "Teléfono no válido. Ejemplo: +56 9 1234 5678");

/** Reglas de contraseña del portal (mismas de PASSWORD_RULES en lib/portal.ts). */
export const passwordPortalSchema = z
  .string()
  .min(8, "Al menos 8 caracteres")
  .max(128)
  .regex(/[A-ZÁÉÍÓÚÑ]/, "Una mayúscula")
  .regex(/\d/, "Un número")
  .regex(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/, "Un símbolo");

export const perfilPortalSchema = z.object({
  n: z.string().trim().min(2, "Ingresa tu nombre.").max(80),
  m: emailSchema,
  cargo: z.string().trim().max(80).default(""),
  tel: z.union([z.literal(""), telefonoSchema]).default(""),
  foto: z.string().max(300).nullable().default(null),
});

export const ROLES_PORTAL = ["admin", "zona", "locales", "encargado"] as const;
export const PERMISOS_PORTAL = ["ver", "visitas", "tickets", "reportes", "cuentas", "usuarios"] as const;
export const usuarioPortalSchema = z
  .object({
    n: z.string().trim().min(2, "Ingresa el nombre.").max(80),
    m: emailSchema,
    rolKey: z.enum(ROLES_PORTAL, { error: "Elige un rol." }),
    zonaId: z.string().max(40).nullable().default(null),
    locales: z.array(z.string().max(20)).max(100).default([]),
    extras: z.array(z.enum(PERMISOS_PORTAL)).default([]),
  })
  .refine((v) => v.rolKey !== "zona" || !!v.zonaId, { message: "Elige la zona.", path: ["zonaId"] })
  .refine((v) => v.rolKey !== "locales" || v.locales.length > 0, { message: "Elige al menos una sucursal.", path: ["locales"] })
  .refine((v) => v.rolKey !== "encargado" || v.locales.length === 1, { message: "Elige la sucursal del encargado.", path: ["locales"] });

export const prioridadReporteSchema = z.object({
  nivel: z.enum(["alta", "urgente"], { error: "Elige la prioridad." }),
  motivo: z.string().trim().min(5, "Cuéntanos por qué es prioritario.").max(300),
});

const prefTipo = z.object({ portal: z.boolean(), correo: z.boolean() });
export const preferenciasAvisosSchema = z.object({
  tipos: z.object({
    ticket_nuevo: prefTipo, ticket_cerrado: prefTipo, visita_programada: prefTipo, visita_realizada: prefTipo,
    reporte_nuevo: prefTipo, garantia: prefTipo, calibracion: prefTipo,
  }),
  frecuencia: z.enum(["inmediato", "diario", "semanal"]),
  silencio: z.boolean(),
});
