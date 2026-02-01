import { api } from "./client";

export type AuditLog = {
  id: number;
  user_id: number | null;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  created_at: string;
};

export const listAuditLogs = async (): Promise<AuditLog[]> => {
  const res = await api.get("/audit");
  return res.data;
};
