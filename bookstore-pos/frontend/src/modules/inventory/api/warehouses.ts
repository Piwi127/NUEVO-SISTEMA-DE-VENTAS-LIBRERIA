import { api } from "../../shared/api";

export type Warehouse = { id: number; name: string; location: string };

export const listWarehouses = async (): Promise<Warehouse[]> => {
  const res = await api.get("/warehouses");
  return res.data;
};

export const createWarehouse = async (data: { name: string; location: string }) => {
  const res = await api.post("/warehouses", data);
  return res.data as Warehouse;
};

export const createTransfer = async (data: { from_warehouse_id: number; to_warehouse_id: number; items: { product_id: number; qty: number }[] }) => {
  const res = await api.post("/warehouses/transfer", data);
  return res.data;
};

export const createBatch = async (data: { product_id: number; warehouse_id: number; lot: string; expiry_date: string; qty: number }) => {
  const res = await api.post("/warehouses/batch", data);
  return res.data;
};

export const createCount = async (data: { warehouse_id: number; product_id: number; counted_qty: number }) => {
  const res = await api.post("/warehouses/count", data);
  return res.data;
};
