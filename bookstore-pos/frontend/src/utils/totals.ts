import { CartItem } from "../store/useCartStore";

export const calcTotals = (
  items: CartItem[],
  discount: number,
  taxRate: number,
  taxIncluded: boolean
) => {
  const base = items.reduce((acc, i) => acc + i.price * i.qty, 0);
  const rate = Number(taxRate) || 0;
  let tax = 0;
  let subtotal = base;
  if (rate > 0) {
    if (taxIncluded) {
      tax = base - base / (1 + rate / 100);
      subtotal = base - tax;
    } else {
      tax = base * (rate / 100);
      subtotal = base;
    }
  }
  const total = Math.max(0, (taxIncluded ? base : subtotal + tax) - (Number(discount) || 0));
  return { base, subtotal, tax, total };
};
