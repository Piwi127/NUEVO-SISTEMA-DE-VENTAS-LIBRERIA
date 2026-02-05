import { lazy } from "react";
import type { AppRoute } from "../shared/registryTypes";

const Login = lazy(() => import("./pages/Login"));

export const authRoutes: AppRoute[] = [
  { path: "/login", component: Login, public: true },
];
