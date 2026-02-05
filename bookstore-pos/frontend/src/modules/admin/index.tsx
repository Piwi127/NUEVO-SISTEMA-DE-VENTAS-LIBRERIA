import React from "react";
import { lazy } from "react";
import GroupIcon from "@mui/icons-material/Group";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import type { AppRoute, MenuSection } from "../shared/registryTypes";

const Users = lazy(() => import("./pages/Users"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

export const adminRoutes: AppRoute[] = [
  { path: "/users", component: Users, roles: ["admin"], layout: true },
  { path: "/admin", component: AdminPanel, roles: ["admin"], layout: true },
];

export const adminMenu: MenuSection = {
  title: "Administracion",
  items: [
    { label: "Usuarios", path: "/users", roles: ["admin"], icon: <GroupIcon fontSize="small" /> },
    { label: "Administracion", path: "/admin", roles: ["admin"], icon: <AdminPanelSettingsIcon fontSize="small" /> },
  ],
};
