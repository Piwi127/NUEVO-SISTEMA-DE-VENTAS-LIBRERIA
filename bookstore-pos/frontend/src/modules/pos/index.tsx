import React from "react";
import { lazy } from "react";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReplayIcon from "@mui/icons-material/Replay";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

import type { AppRoute, MenuSection } from "@/modules/shared/registryTypes";

const POS = lazy(() => import("@/modules/pos/pages/POS"));
const Display = lazy(() => import("@/modules/pos/pages/Display"));
const Cash = lazy(() => import("@/modules/pos/pages/Cash"));
const Returns = lazy(() => import("@/modules/pos/pages/Returns"));
const SalesHistory = lazy(() => import("@/modules/pos/pages/SalesHistory"));

export const posRoutes: AppRoute[] = [
  { path: "/display/:sessionId", component: Display, public: true },
  { path: "/pos", component: POS, roles: ["admin", "cashier"], layout: true },
  { path: "/returns", component: Returns, roles: ["admin", "cashier"], layout: true },
  { path: "/sales-history", component: SalesHistory, roles: ["admin", "cashier"], layout: true },
  { path: "/cash", component: Cash, roles: ["admin", "cashier"], layout: true },
];

export const posMenu: MenuSection = {
  title: "Operacion",
  items: [
    { label: "POS", path: "/pos", roles: ["admin", "cashier"], icon: <PointOfSaleIcon fontSize="small" /> },
    { label: "Ventas", path: "/sales-history", roles: ["admin", "cashier"], icon: <ReceiptLongIcon fontSize="small" /> },
    { label: "Devoluciones", path: "/returns", roles: ["admin", "cashier"], icon: <ReplayIcon fontSize="small" /> },
    { label: "Caja", path: "/cash", roles: ["admin", "cashier"], icon: <AccountBalanceIcon fontSize="small" /> },
  ],
};
