import { api } from "@/modules/shared/api";

export type Promotion = { id: number; name: string; type: string; value: number; is_active: boolean };
export type ProductPromotionRuleType = "BUNDLE_PRICE" | "UNIT_PRICE_BY_QTY";

type ProductPromotionRuleCommon = {
  id: number;
  name: string;
  product_id: number;
  priority: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type PackPromotionRule = ProductPromotionRuleCommon & {
  rule_type: "BUNDLE_PRICE";
  bundle_qty: number;
  bundle_price: number;
};

export type UnitPriceByQtyPromotionRule = ProductPromotionRuleCommon & {
  rule_type: "UNIT_PRICE_BY_QTY";
  min_qty: number;
  unit_price: number;
};

export type ProductPromotionRule = PackPromotionRule | UnitPriceByQtyPromotionRule;
export type ProductPromotionRuleCreate =
  | Omit<PackPromotionRule, "id" | "created_at" | "updated_at">
  | Omit<UnitPriceByQtyPromotionRule, "id" | "created_at" | "updated_at">;
export type ProductPromotionRuleUpdate = Partial<ProductPromotionRuleCreate>;
export type PackPromotionRuleCreate = Omit<PackPromotionRule, "id" | "created_at" | "updated_at">;
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

export const updatePromotion = async (promotionId: number, data: Partial<Omit<Promotion, "id">>) => {
  const res = await api.put(`/promotions/${promotionId}`, data);
  return res.data as Promotion;
};

export const deletePromotion = async (promotionId: number) => {
  const res = await api.delete(`/promotions/${promotionId}`);
  return res.data as { ok: boolean };
};

export const listProductPromotionRules = async (ruleType?: ProductPromotionRuleType): Promise<ProductPromotionRule[]> => {
  const res = await api.get("/promotions/rules", { params: ruleType ? { rule_type: ruleType } : undefined });
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

export const createProductPromotionRule = async (data: ProductPromotionRuleCreate): Promise<ProductPromotionRule> => {
  const res = await api.post("/promotions/rules", data);
  return res.data;
};

export const updateProductPromotionRule = async (
  ruleId: number,
  data: ProductPromotionRuleUpdate
): Promise<ProductPromotionRule> => {
  const res = await api.put(`/promotions/rules/${ruleId}`, data);
  return res.data;
};

export const deleteProductPromotionRule = async (ruleId: number) => {
  const res = await api.delete(`/promotions/rules/${ruleId}`);
  return res.data as { ok: boolean };
};
