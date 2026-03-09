import { api } from "@/modules/shared/api";

export type Promotion = { id: number; name: string; type: string; value: number; is_active: boolean };
export type ProductPromotionRuleType = "BUNDLE_PRICE" | "UNIT_PRICE_BY_QTY";

export type PackPromotionRule = {
  id: number;
  name: string;
  product_id: number;
  rule_type: "BUNDLE_PRICE";
  bundle_qty: number;
  bundle_price: number;
  is_active: boolean;
  created_at: string;
};

export type UnitPriceByQtyPromotionRule = {
  id: number;
  name: string;
  product_id: number;
  rule_type: "UNIT_PRICE_BY_QTY";
  min_qty: number;
  unit_price: number;
  is_active: boolean;
  created_at: string;
};

export type ProductPromotionRule = PackPromotionRule | UnitPriceByQtyPromotionRule;
export type ProductPromotionRuleCreate = Omit<ProductPromotionRule, "id" | "created_at">;
export type ProductPromotionRuleUpdate = Partial<ProductPromotionRuleCreate>;
export type PackPromotionRuleCreate = Omit<PackPromotionRule, "id" | "created_at">;
export type PackPromotionRuleUpdate = Partial<PackPromotionRuleCreate>;

let supportsGenericPromotionRulesEndpoint: boolean | null = null;

export const listPromotions = async (): Promise<Promotion[]> => {
  const res = await api.get("/promotions");
  return res.data;
};

export const listActivePromotions = async (): Promise<Promotion[]> => {
  const res = await api.get("/promotions/active");
  return res.data;
};

export const createPromotion = async (data: Omit<Promotion, "id">) => {
  const res = await api.post("/promotions", data);
  return res.data as Promotion;
};

export const listProductPromotionRules = async (): Promise<PackPromotionRule[]> => {
  const res = await api.get("/promotions/pack-rules");
  return res.data;
};

export const listActiveProductPromotionRules = async (productIds?: number[]): Promise<ProductPromotionRule[]> => {
  const params =
    productIds && productIds.length
      ? { product_ids: productIds.join(",") }
      : undefined;

  if (supportsGenericPromotionRulesEndpoint === false) {
    const fallback = await api.get("/promotions/pack-rules/active", { params });
    return fallback.data;
  }

  try {
    const res = await api.get("/promotions/rules/active", { params });
    supportsGenericPromotionRulesEndpoint = true;
    return res.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      supportsGenericPromotionRulesEndpoint = false;
      const fallback = await api.get("/promotions/pack-rules/active", { params });
      return fallback.data;
    }
    throw error;
  }
};

export const createProductPromotionRule = async (data: PackPromotionRuleCreate): Promise<PackPromotionRule> => {
  const res = await api.post("/promotions/pack-rules", data);
  return res.data;
};

export const updateProductPromotionRule = async (
  ruleId: number,
  data: PackPromotionRuleUpdate
): Promise<PackPromotionRule> => {
  const res = await api.put(`/promotions/pack-rules/${ruleId}`, data);
  return res.data;
};
