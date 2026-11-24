import { z } from "zod";

/* Reporte que envía el personal del local (tipos y validación compartidos entre el formulario y la Server Action). */
export const TIPOS_REPORTE_LOCAL = [
  "Falsa alarma", "Antena no detecta", "Antena dañada", "Cable suelto", "Desactivador no funciona", "Otro",
] as const;
export type TipoReporteLocal = (typeof TIPOS_REPORTE_LOCAL)[number];

export const reporteLocalSchema = z
  .object({
    tipo: z.enum(TIPOS_REPORTE_LOCAL, { error: "Elige qué está pasando." }),
    /** Acceso afectado (opcional); se antepone al detalle para que el técnico sepa dónde ir. */
    acc: z.string().trim().max(80).default(""),
    detalle: z.string().trim().max(500, "Máximo 500 caracteres.").default(""),
  })
  .refine((v) => v.tipo !== "Otro" || v.detalle.length >= 5, { message: "Describe el problema.", path: ["detalle"] });
export type ReporteLocalInput = z.input<typeof reporteLocalSchema>;
