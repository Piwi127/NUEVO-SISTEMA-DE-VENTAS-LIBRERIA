import React from "react";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CategoryIcon from "@mui/icons-material/Category";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import CampaignIcon from "@mui/icons-material/Campaign";

import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Promotions from "./pages/Promotions";
import PriceLists from "./pages/PriceLists";
import type { AppRoute, MenuSection } from "../shared/registryTypes";

export const catalogRoutes: AppRoute[] = [
  { path: "/customers", component: Customers, roles: ["admin", "cashier"], layout: true },
  { path: "/products", component: Products, roles: ["admin", "stock"], layout: true },
  { path: "/suppliers", component: Suppliers, roles: ["admin", "stock"], layout: true },
  { path: "/promotions", component: Promotions, roles: ["admin"], layout: true },
  { path: "/price-lists", component: PriceLists, roles: ["admin"], layout: true },
];

export const catalogMenu: MenuSection = {
  title: "Catalogo",
  items: [
    { label: "Clientes", path: "/customers", roles: ["admin", "cashier"], icon: <PeopleAltIcon fontSize="small" /> },
    { label: "Productos", path: "/products", roles: ["admin", "stock"], icon: <CategoryIcon fontSize="small" /> },
    { label: "Proveedores", path: "/suppliers", roles: ["admin", "stock"], icon: <LocalShippingIcon fontSize="small" /> },
    { label: "Listas de precio", path: "/price-lists", roles: ["admin"], icon: <PriceChangeIcon fontSize="small" /> },
    { label: "Promociones", path: "/promotions", roles: ["admin"], icon: <CampaignIcon fontSize="small" /> },
  ],
};
