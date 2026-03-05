import { api } from "@/modules/shared/api";
import { Product } from "@/modules/shared/types";

export type PricingPreviewPayload = {
  cost_total: string;
  qty: number;
  direct_costs_breakdown: Record<string, string>;
  desired_margin: string;
};

export type PricingPreviewResponse = {
  qty: number;
  desired_margin: number;
  direct_costs_total: number;
  cost_total_all: number;
  unit_cost: number;
  sale_price_unit: number;
  profit_unit: number;
};

export type PricingApplyResponse = {
  product_id: number;
  unit_cost: number;
  sale_price: number;
  profit_unit: number;
  direct_costs_total: number;
  cost_total_all: number;
};

export type PricingBulkApplyPayload = {
  desired_margin: string;
  category?: string;
  product_ids?: number[];
};

export type PricingBulkApplyItem = {
  product_id: number;
  sku: string;
  name: string;
  old_sale_price: number;
  new_sale_price: number;
  old_margin: number;
  new_margin: number;
  unit_cost: number;
  profit_unit: number;
};

export type PricingBulkApplyResponse = {
  updated_count: number;
  desired_margin: number;
  scope: string;
  items: PricingBulkApplyItem[];
};

export const listProducts = async (
  search?: string,
  limit?: number,
  offset?: number,
  category?: string,
  inStock?: boolean,
  smart?: boolean
): Promise<Product[]> => {
  const params: Record<string, string | number> = {};
  if (search) params.search = search;
  if (category) params.category = category;
  if (typeof inStock === "boolean") params.in_stock = inStock ? 1 : 0;
  if (typeof smart === "boolean") params.smart = smart ? 1 : 0;
  if (typeof limit === "number") params.limit = limit;
  if (typeof offset === "number") params.offset = offset;
  const res = await api.get("/products", { params: Object.keys(params).length ? params : undefined });
  return res.data;
};

export const listProductCategories = async (): Promise<string[]> => {
  const res = await api.get("/products/categories");
  return res.data;
};

export const getProduct = async (id: number): Promise<Product> => {
  const res = await api.get(`/products/${id}`);
  return res.data as Product;
};

export const createProduct = async (data: Omit<Product, "id">) => {
  const res = await api.post("/products", data);
  return res.data as Product;
};

export const updateProduct = async (id: number, data: Omit<Product, "id">) => {
  const res = await api.put(`/products/${id}`, data);
  return res.data as Product;
};

export const deleteProduct = async (id: number) => {
  const res = await api.delete(`/products/${id}`);
  return res.data;
};

export const previewProductPricing = async (payload: PricingPreviewPayload): Promise<PricingPreviewResponse> => {
  const res = await api.post("/catalog/pricing/preview", payload);
  return res.data;
};

export const applyProductPricing = async (productId: number, payload: PricingPreviewPayload): Promise<PricingApplyResponse> => {
  const res = await api.post(`/catalog/products/${productId}/pricing/apply`, payload);
  return res.data;
};

export const applyBulkProductPricing = async (payload: PricingBulkApplyPayload): Promise<PricingBulkApplyResponse> => {
  const res = await api.post("/catalog/pricing/bulk-apply", payload);
  return res.data;
};
