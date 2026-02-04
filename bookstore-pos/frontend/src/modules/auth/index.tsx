import Login from "./pages/Login";
import type { AppRoute } from "../shared/registryTypes";

export const authRoutes: AppRoute[] = [
  { path: "/login", component: Login, public: true },
];
