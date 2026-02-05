import { api } from "../../shared/api";

export type RolePermissions = {
  role: string;
  permissions: string[];
};

export const getRolePermissions = async (role: string): Promise<RolePermissions> => {
  const res = await api.get(`/permissions/${role}`);
  return res.data;
};

export const updateRolePermissions = async (role: string, permissions: string[]): Promise<RolePermissions> => {
  const res = await api.put(`/permissions/${role}`, { permissions });
  return res.data;
};
