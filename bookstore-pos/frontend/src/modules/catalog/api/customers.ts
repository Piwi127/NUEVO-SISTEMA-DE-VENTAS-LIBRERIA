import { api } from "../../shared/api";
import { Customer } from "../../shared/types";

export const listCustomers = async (): Promise<Customer[]> => {
  const res = await api.get("/customers");
  return res.data;
};

export const createCustomer = async (data: Omit<Customer, "id">) => {
  const res = await api.post("/customers", data);
  return res.data as Customer;
};

export const updateCustomer = async (id: number, data: Omit<Customer, "id">) => {
  const res = await api.put(`/customers/${id}`, data);
  return res.data as Customer;
};

export const deleteCustomer = async (id: number) => {
  const res = await api.delete(`/customers/${id}`);
  return res.data;
};
