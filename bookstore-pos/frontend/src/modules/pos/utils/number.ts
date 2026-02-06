export const parseDecimalInput = (raw: string): number => {
  const normalized = raw.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
};
