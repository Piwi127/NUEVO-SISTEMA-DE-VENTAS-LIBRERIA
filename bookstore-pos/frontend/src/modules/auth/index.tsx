import { lazy } from "react";
import type { AppRoute } from "@/modules/shared/registryTypes";

const Login = lazy(() => import("@/modules/auth/pages/Login"));

export const authRoutes: AppRoute[] = [
  { path: "/login", component: Login, public: true },
];
