import React from "react";
import AssessmentIcon from "@mui/icons-material/Assessment";

import Reports from "./pages/Reports";
import type { AppRoute, MenuSection } from "../shared/registryTypes";

export const reportsRoutes: AppRoute[] = [
  { path: "/reports", component: Reports, roles: ["admin"], layout: true },
];

export const reportsMenu: MenuSection = {
  title: "Reportes",
  items: [
    { label: "Reportes", path: "/reports", roles: ["admin"], icon: <AssessmentIcon fontSize="small" /> },
  ],
};
