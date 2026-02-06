import React, { lazy } from "react";
import GroupIcon from "@mui/icons-material/Group";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SecurityIcon from "@mui/icons-material/Security";

import type { AppRoute, MenuSection } from "@/modules/shared/registryTypes";

const Users = lazy(() => import("@/modules/admin/pages/Users"));
const AdminPanel = lazy(() => import("@/modules/admin/pages/AdminPanel"));
const RolePermissions = lazy(() => import("@/modules/admin/pages/RolePermissions"));

export const adminRoutes: AppRoute[] = [
  { path: "/users", component: Users, roles: ["admin"], layout: true },
  { path: "/admin", component: AdminPanel, roles: ["admin"], layout: true },
  { path: "/admin/permissions", component: RolePermissions, roles: ["admin"], layout: true },
];

export const adminMenu: MenuSection = {
  title: "Administracion",
  items: [
    { label: "Usuarios", path: "/users", roles: ["admin"], icon: <GroupIcon fontSize="small" /> },
    { label: "Administracion", path: "/admin", roles: ["admin"], icon: <AdminPanelSettingsIcon fontSize="small" /> },
    { label: "Permisos por rol", path: "/admin/permissions", roles: ["admin"], icon: <SecurityIcon fontSize="small" /> },
  ],
};
