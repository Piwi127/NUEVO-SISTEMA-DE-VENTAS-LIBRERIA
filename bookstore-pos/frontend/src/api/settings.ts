import { api } from "./client";

export type SystemSettings = {
  project_name: string;
  currency: string;
  tax_rate: number;
  tax_included: boolean;
  store_address: string;
  store_phone: string;
  store_tax_id: string;
  logo_url: string;
  payment_methods: string;
  invoice_prefix: string;
  invoice_next: number;
  receipt_header: string;
  receipt_footer: string;
  paper_width_mm: number;
};

export const getSettings = async (): Promise<SystemSettings> => {
  const res = await api.get("/settings");
  return res.data;
};

export const updateSettings = async (data: SystemSettings): Promise<SystemSettings> => {
  const res = await api.put("/settings", data);
  return res.data;
};

export const downloadBackup = async (): Promise<Blob> => {
  const res = await api.get("/admin/backup", { responseType: "blob" });
  return res.data;
};
