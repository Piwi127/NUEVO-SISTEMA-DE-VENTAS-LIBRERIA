import type { CartItem } from "@/app/store";
import type { ProductPromotionRule } from "@/modules/catalog/api/promotions";

export type PackPricingLine = {
  product_id: number;
  base_total: number;
  pack_discount: number;
  final_total: number;
  applied_rule_id?: number;
  applied_rule_name?: string;
  applied_rule_type?: "BUNDLE_PRICE" | "UNIT_PRICE_BY_QTY";
  bundle_qty?: number;
  bundle_price?: number;
  bundles_applied?: number;
  min_qty?: number;
  promo_unit_price?: number;
};

export type PackPricingResult = {
  linesByProductId: Record<number, PackPricingLine>;
  grossSubtotal: number;
  subtotalAfterPacks: number;
  packDiscountTotal: number;
};

export type PosTotalsSummary = {
  subtotal: number;
  tax: number;
  total: number;
  packDiscount: number;
  promotionDiscount: number;
  totalDiscount: number;
  subtotalAfterPacks: number;
  grossSubtotal: number;
};

const calculateBundleDiscount = (qty: number, unitPrice: number, bundleQty: number, bundlePrice: number) => {
  if (qty <= 0 || unitPrice <= 0 || bundleQty <= 0 || bundlePrice <= 0) return { discount: 0, bundles: 0 };
  const bundles = Math.floor(qty / bundleQty);
  if (bundles <= 0) return { discount: 0, bundles: 0 };
  const regularBundleTotal = unitPrice * bundleQty;
  const rawBundleDiscount = regularBundleTotal - bundlePrice;
  if (rawBundleDiscount <= 0) return { discount: 0, bundles: 0 };
  const lineTotal = unitPrice * qty;
  const discount = Math.max(0, Math.min(lineTotal, bundles * rawBundleDiscount));
  return { discount, bundles };
};

const calculateUnitPriceByQtyDiscount = (qty: number, unitPrice: number, minQty: number, promoUnitPrice: number) => {
  if (qty <= 0 || unitPrice <= 0 || minQty <= 0 || promoUnitPrice <= 0) return 0;
  if (qty < minQty) return 0;
  const rawUnitDiscount = unitPrice - promoUnitPrice;
  if (rawUnitDiscount <= 0) return 0;
  const lineTotal = unitPrice * qty;
  return Math.max(0, Math.min(lineTotal, qty * rawUnitDiscount));
};

const getRuleSpecificity = (rule?: ProductPromotionRule) => {
  if (!rule) return -1;
  if (rule.rule_type === "UNIT_PRICE_BY_QTY") return Number(rule.min_qty || 0);
  return Number(rule.bundle_qty || 0);
};

const getRulePriority = (rule?: ProductPromotionRule) => {
  if (!rule) return [-1, -1] as const;
  const typePriority = rule.rule_type === "UNIT_PRICE_BY_QTY" ? 1 : 0;
  return [getRuleSpecificity(rule), typePriority] as const;
};

const selectBestRule = (item: CartItem, rules: ProductPromotionRule[]) => {
  let bestRule: ProductPromotionRule | undefined;
  let bestDiscount = 0;
  let bestBundles = 0;

  for (const rule of rules) {
    let discount = 0;
    let bundles = 0;
    if (rule.rule_type === "BUNDLE_PRICE" && rule.bundle_qty && rule.bundle_price) {
      const bundleResult = calculateBundleDiscount(item.qty, item.price, rule.bundle_qty, rule.bundle_price);
      discount = bundleResult.discount;
      bundles = bundleResult.bundles;
    } else if (rule.rule_type === "UNIT_PRICE_BY_QTY" && rule.min_qty && rule.unit_price) {
      discount = calculateUnitPriceByQtyDiscount(item.qty, item.price, rule.min_qty, rule.unit_price);
    }

    if (discount > bestDiscount) {
      bestRule = rule;
      bestDiscount = discount;
      bestBundles = bundles;
    } else if (discount === bestDiscount && discount > 0) {
      const currentPriority = getRulePriority(rule);
      const bestPriority = getRulePriority(bestRule);
      if (
        currentPriority[0] > bestPriority[0] ||
        (currentPriority[0] === bestPriority[0] && currentPriority[1] > bestPriority[1])
      ) {
        bestRule = rule;
        bestBundles = bundles;
      }
    }
  }

  return { rule: bestRule, discount: bestDiscount, bundles: bestBundles };
};

export const calculatePackPricing = (items: CartItem[], rules: ProductPromotionRule[]): PackPricingResult => {
  const rulesByProduct: Record<number, ProductPromotionRule[]> = {};
  rules
    .filter((rule) => rule.is_active)
    .forEach((rule) => {
      if (!rulesByProduct[rule.product_id]) rulesByProduct[rule.product_id] = [];
      rulesByProduct[rule.product_id].push(rule);
    });

  const linesByProductId: Record<number, PackPricingLine> = {};
  let grossSubtotal = 0;
  let subtotalAfterPacks = 0;
  let packDiscountTotal = 0;

  items.forEach((item) => {
    const baseTotal = item.price * item.qty;
    const { rule, discount, bundles } = selectBestRule(item, rulesByProduct[item.product_id] || []);
    const safeDiscount = Math.max(0, Math.min(baseTotal, discount));
    const finalTotal = baseTotal - safeDiscount;
    grossSubtotal += baseTotal;
    subtotalAfterPacks += finalTotal;
    packDiscountTotal += safeDiscount;

    const bundleMeta =
      rule?.rule_type === "BUNDLE_PRICE"
        ? {
            bundle_qty: rule.bundle_qty,
            bundle_price: rule.bundle_price,
            bundles_applied: bundles,
          }
        : {};

    const unitMeta =
      rule?.rule_type === "UNIT_PRICE_BY_QTY"
        ? {
            min_qty: rule.min_qty,
            promo_unit_price: rule.unit_price,
          }
        : {};

    linesByProductId[item.product_id] = {
      product_id: item.product_id,
      base_total: baseTotal,
      pack_discount: safeDiscount,
      final_total: finalTotal,
      applied_rule_id: rule?.id,
      applied_rule_name: rule?.name,
      applied_rule_type: rule?.rule_type,
      ...bundleMeta,
      ...unitMeta,
    };
  });

  return {
    linesByProductId,
    grossSubtotal,
    subtotalAfterPacks,
    packDiscountTotal,
  };
};

export const calculatePosTotalsSummary = (args: {
  grossSubtotal: number;
  subtotalAfterPacks: number;
  packDiscount: number;
  promotionDiscount: number;
  taxRate: number;
  taxIncluded: boolean;
}): PosTotalsSummary => {
  const subtotalAfterPacks = Math.max(0, args.subtotalAfterPacks);
  const packDiscount = Math.max(0, args.packDiscount);
  const promotionDiscount = Math.max(0, Math.min(subtotalAfterPacks, args.promotionDiscount));
  const rate = Number(args.taxRate) || 0;

  let subtotal = subtotalAfterPacks;
  let tax = 0;
  let total = 0;
  if (args.taxIncluded) {
    if (rate > 0) {
      tax = subtotalAfterPacks - subtotalAfterPacks / (1 + rate / 100);
    }
    subtotal = subtotalAfterPacks - tax;
    total = subtotalAfterPacks - promotionDiscount;
  } else {
    subtotal = subtotalAfterPacks;
    tax = subtotal * (rate / 100);
    total = subtotal + tax - promotionDiscount;
  }
  total = Math.max(0, total);

  return {
    grossSubtotal: Math.max(0, args.grossSubtotal),
    subtotalAfterPacks,
    subtotal,
    tax,
    total,
    packDiscount,
    promotionDiscount,
    totalDiscount: packDiscount + promotionDiscount,
  };
};
