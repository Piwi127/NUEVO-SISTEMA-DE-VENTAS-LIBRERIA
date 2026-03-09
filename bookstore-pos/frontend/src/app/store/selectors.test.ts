import { describe, expect, it } from "vitest";

import {
  selectCanCharge,
  selectCartItemCount,
  selectCustomerLabel,
  selectPaymentMethods,
} from "@/app/store/selectors";

describe("POS selectors", () => {
  it("evaluates charge permissions correctly", () => {
    expect(selectCanCharge({ itemCount: 1, cashIsOpen: true, cashLoading: false, cashError: false })).toBe(true);
    expect(selectCanCharge({ itemCount: 0, cashIsOpen: true, cashLoading: false, cashError: false })).toBe(false);
    expect(selectCanCharge({ itemCount: 2, cashIsOpen: false, cashLoading: false, cashError: false })).toBe(false);
  });

  it("normalizes payment methods and customer label", () => {
    expect(selectPaymentMethods("cash, card, yape")).toEqual(["CASH", "CARD", "YAPE"]);
    expect(selectCartItemCount([{ product_id: 1, sku: "A", name: "Libro", price: 10, qty: 1 }])).toBe(1);

    const customers = [
      { id: 1, name: "Ana", phone: null, price_list_id: null },
      { id: 2, name: "Luis", phone: null, price_list_id: null },
    ];
    expect(selectCustomerLabel(customers, 2)).toBe("Luis");
    expect(selectCustomerLabel(customers, "")).toBe("Mostrador");
  });
});
