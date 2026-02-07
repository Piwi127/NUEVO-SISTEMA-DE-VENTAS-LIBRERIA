import { api } from "@/modules/shared/api";
import { Product } from "@/modules/shared/types";

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
