import { api } from "./client";
import { Product } from "../types/dto";

export const listProducts = async (search?: string): Promise<Product[]> => {
  const res = await api.get("/products", { params: search ? { search } : undefined });
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
