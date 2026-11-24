/* Validaciones de formularios del portal. */

export const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const phoneValid = (v) => /^\+?[\d\s]{8,15}$/.test(v);
/** Campo numérico opcional: vacío o hasta 5 dígitos. */
export const optionalIntValid = (v) => String(v).trim() === '' || /^\d{1,5}$/.test(String(v).trim());
export const intOrNull = (v) => (String(v).trim() === '' ? null : Number(v));

export const PASSWORD_RULES = [
  { id: 'len', label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'up', label: 'Una mayúscula', test: (v) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { id: 'num', label: 'Un número', test: (v) => /\d/.test(v) },
  { id: 'sym', label: 'Un símbolo', test: (v) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(v) }
];
