import React from "react";
import { lazy } from "react";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

import type { AppRoute, MenuSection } from "@/modules/shared/registryTypes";

const Inventory = lazy(() => import("@/modules/inventory/pages/Inventory"));
const Purchases = lazy(() => import("@/modules/inventory/pages/Purchases"));

export const inventoryRoutes: AppRoute[] = [
  { path: "/inventory", component: Inventory, roles: ["admin", "stock"], layout: true },
  { path: "/purchases", component: Purchases, roles: ["admin", "stock"], layout: true },
];

export const inventoryMenu: MenuSection = {
  title: "Inventario y compras",
  items: [
    { label: "Inventario", path: "/inventory", roles: ["admin", "stock"], icon: <Inventory2Icon fontSize="small" /> },
    { label: "Compras", path: "/purchases", roles: ["admin", "stock"], icon: <LocalShippingIcon fontSize="small" /> },
  ],
};
