import { api } from "@/modules/shared/api";

export type Promotion = { id: number; name: string; type: string; value: number; is_active: boolean };
export type ProductPromotionRule = {
  id: number;
  name: string;
  product_id: number;
  rule_type: "BUNDLE_PRICE";
  bundle_qty: number;
  bundle_price: number;
  is_active: boolean;
  created_at: string;
};
export type ProductPromotionRuleCreate = Omit<ProductPromotionRule, "id" | "created_at">;
export type ProductPromotionRuleUpdate = Partial<ProductPromotionRuleCreate>;

export const listPromotions = async (): Promise<Promotion[]> => {
  const res = await api.get("/promotions");
  return res.data;
};

export const listActivePromotions = async (): Promise<Promotion[]> => {
  const res = await api.get("/promotions/active");
  return res.data;
};

export const createPromotion = async (data: Promotion) => {
  const res = await api.post("/promotions", data);
  return res.data as Promotion;
};

export const listProductPromotionRules = async (): Promise<ProductPromotionRule[]> => {
  const res = await api.get("/promotions/pack-rules");
  return res.data;
};

export const listActiveProductPromotionRules = async (productIds?: number[]): Promise<ProductPromotionRule[]> => {
  const params =
    productIds && productIds.length
      ? { product_ids: productIds.join(",") }
      : undefined;
  const res = await api.get("/promotions/pack-rules/active", { params });
  return res.data;
};

export const createProductPromotionRule = async (data: ProductPromotionRuleCreate): Promise<ProductPromotionRule> => {
  const res = await api.post("/promotions/pack-rules", data);
  return res.data;
};

export const updateProductPromotionRule = async (
  ruleId: number,
  data: ProductPromotionRuleUpdate
): Promise<ProductPromotionRule> => {
  const res = await api.put(`/promotions/pack-rules/${ruleId}`, data);
  return res.data;
};
