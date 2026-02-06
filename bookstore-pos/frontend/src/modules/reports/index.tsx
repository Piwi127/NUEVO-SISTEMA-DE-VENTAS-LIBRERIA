import React from "react";
import { lazy } from "react";
import AssessmentIcon from "@mui/icons-material/Assessment";

import type { AppRoute, MenuSection } from "@/modules/shared/registryTypes";

const Reports = lazy(() => import("@/modules/reports/pages/Reports"));

export const reportsRoutes: AppRoute[] = [
  { path: "/reports", component: Reports, roles: ["admin"], layout: true },
];

export const reportsMenu: MenuSection = {
  title: "Reportes",
  items: [
    { label: "Reportes", path: "/reports", roles: ["admin"], icon: <AssessmentIcon fontSize="small" /> },
  ],
};
