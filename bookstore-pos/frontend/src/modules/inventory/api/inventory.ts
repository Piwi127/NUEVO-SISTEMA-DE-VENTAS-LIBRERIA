import { api } from "@/modules/shared/api";
import { StockMovement } from "@/modules/shared/types";

export const createInventoryMovement = async (data: { product_id: number; type: string; qty: number; ref: string }) => {
  const res = await api.post("/inventory/movement", data);
  return res.data as StockMovement;
};

export const getKardex = async (product_id: number): Promise<StockMovement[]> => {
  const res = await api.get(`/inventory/kardex/${product_id}`);
  return res.data;
};

export const uploadInventory = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/inventory/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as { ok: boolean; count: number };
};

export const downloadInventoryTemplate = async (): Promise<Blob> => {
  const res = await api.get("/inventory/template", { responseType: "blob" });
  return res.data;
};

export const downloadInventoryTemplateXlsx = async (): Promise<Blob> => {
  const res = await api.get("/inventory/template/xlsx", { responseType: "blob" });
  return res.data;
};
