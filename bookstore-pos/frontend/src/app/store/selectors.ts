import type { CartItem } from "@/store/useCartStore";
import type { Customer } from "@/modules/shared/types";

export const selectCartItemCount = (items: CartItem[]): number => items.length;

export const selectCanCharge = (args: {
  itemCount: number;
  cashIsOpen: boolean;
  cashLoading: boolean;
  cashError: boolean;
}): boolean => args.itemCount > 0 && args.cashIsOpen && !args.cashLoading && !args.cashError;

export const selectPaymentMethods = (raw: string | null | undefined): string[] =>
  (raw || "CASH,CARD,TRANSFER")
    .split(",")
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);

export const selectCustomerLabel = (customers: Customer[] | undefined, customerId: number | ""): string => {
  if (!customerId) return "Mostrador";
  const customer = customers?.find((c) => c.id === customerId);
  return customer?.name || String(customerId);
};
