import { z } from "zod";

const PHONE_REGEX = /^[0-9+\-()\s]{6,24}$/;

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(24, "El telefono no puede exceder 24 caracteres.")
  .refine((value) => !value || PHONE_REGEX.test(value), "Ingresa un telefono valido.");

export const normalizeOptionalText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const hasRequiredPasswordStrength = (value: string) =>
  value.length >= 10 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);

export const getPasswordStrengthScore = (value: string) =>
  [
    value.length >= 10,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;

export const getPasswordStrengthLabel = (value: string) => {
  const score = getPasswordStrengthScore(value);
  if (score >= 5) return "Fuerte";
  if (score >= 4) return "Media";
  return "Debil";
};
