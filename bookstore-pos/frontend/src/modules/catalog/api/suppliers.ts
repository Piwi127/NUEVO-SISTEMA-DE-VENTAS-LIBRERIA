import { api } from "../../shared/api";
import { Supplier } from "../../shared/types";

export const listSuppliers = async (): Promise<Supplier[]> => {
  const res = await api.get("/suppliers");
  return res.data;
};

export const createSupplier = async (data: Omit<Supplier, "id">) => {
  const res = await api.post("/suppliers", data);
  return res.data as Supplier;
};

export const updateSupplier = async (id: number, data: Omit<Supplier, "id">) => {
  const res = await api.put(`/suppliers/${id}`, data);
  return res.data as Supplier;
};

export const deleteSupplier = async (id: number) => {
  const res = await api.delete(`/suppliers/${id}`);
  return res.data;
};
