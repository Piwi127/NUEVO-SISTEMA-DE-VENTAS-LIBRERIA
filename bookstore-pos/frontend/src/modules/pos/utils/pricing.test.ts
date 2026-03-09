import { describe, expect, it } from "vitest";

import { calculatePackPricing, calculatePosTotalsSummary } from "@/modules/pos/utils/pricing";

describe("POS pricing utils", () => {
  it("applies best bundle rule per product", () => {
    const result = calculatePackPricing(
      [{ product_id: 1, sku: "BK-1", name: "Libro 1", price: 10, qty: 6 }],
      [
        {
          id: 1,
          name: "3x25",
          product_id: 1,
          rule_type: "BUNDLE_PRICE",
          bundle_qty: 3,
          bundle_price: 25,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "2x18",
          product_id: 1,
          rule_type: "BUNDLE_PRICE",
          bundle_qty: 2,
          bundle_price: 18,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
      ]
    );

    expect(result.grossSubtotal).toBe(60);
    expect(result.packDiscountTotal).toBe(10);
    expect(result.subtotalAfterPacks).toBe(50);
    expect(result.linesByProductId[1].applied_rule_id).toBe(1);
  });

  it("calculates totals with tax excluded and discounts", () => {
    const summary = calculatePosTotalsSummary({
      grossSubtotal: 100,
      subtotalAfterPacks: 90,
      packDiscount: 10,
      promotionDiscount: 5,
      taxRate: 18,
      taxIncluded: false,
    });

    expect(summary.subtotal).toBe(90);
    expect(summary.tax).toBeCloseTo(16.2);
    expect(summary.total).toBeCloseTo(101.2);
    expect(summary.totalDiscount).toBe(15);
  });
});
