import React from "react";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReplayIcon from "@mui/icons-material/Replay";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

import POS from "./pages/POS";
import Display from "./pages/Display";
import Cash from "./pages/Cash";
import Returns from "./pages/Returns";
import SalesHistory from "./pages/SalesHistory";
import type { AppRoute, MenuSection } from "../shared/registryTypes";

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
