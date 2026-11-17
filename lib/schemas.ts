import { z } from "zod";

/* Esquemas compartidos entre formularios (cliente) y Server Actions. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .pipe(z.email("El correo no tiene un formato válido. Ejemplo: nombre@empresa.cl"));

export const loginSchema = z.object({
  surface: z.enum(["panel", "portal"]),
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña.").max(128),
  remember: z.boolean().default(false),
});
export const codeSchema = z.string().regex(/^\d{6}$/, "Ingresa los 6 dígitos del código.");

export const passwordSchema = z
  .string()
  .min(8, "Al menos 8 caracteres")
  .max(128)
  .regex(/[A-ZÑ]/, "Una letra mayúscula")
  .regex(/\d/, "Un número");
export const newPasswordSchema = z
  .object({ np: passwordSchema, np2: z.string() })
  .refine((v) => v.np === v.np2, { message: "Las contraseñas no coinciden", path: ["np2"] });

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
