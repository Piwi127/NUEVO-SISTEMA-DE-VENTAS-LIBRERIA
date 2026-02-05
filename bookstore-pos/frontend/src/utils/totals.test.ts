import { describe, expect, it } from "vitest";

import { calcTotals } from "./totals";

describe("calcTotals", () => {
  it("calculates tax over subtotal when tax is not included", () => {
    const result = calcTotals(
      [
        { product_id: 1, sku: "A", name: "Libro A", price: 20, qty: 2 },
        { product_id: 2, sku: "B", name: "Libro B", price: 10, qty: 1 },
      ],
      0,
      18,
      false
    );

    expect(result.base).toBe(50);
    expect(result.subtotal).toBe(50);
    expect(result.tax).toBeCloseTo(9);
    expect(result.total).toBeCloseTo(59);
  });

  it("extracts tax when tax is included and applies discount", () => {
    const result = calcTotals(
      [{ product_id: 3, sku: "C", name: "Libro C", price: 118, qty: 1 }],
      8,
      18,
      true
    );

    expect(result.base).toBe(118);
    expect(result.tax).toBeCloseTo(18);
    expect(result.subtotal).toBeCloseTo(100);
    expect(result.total).toBeCloseTo(110);
  });
});
