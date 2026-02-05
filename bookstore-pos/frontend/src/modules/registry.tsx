import { authRoutes } from "./auth";
import { posRoutes, posMenu } from "./pos";
import { catalogRoutes, catalogMenu } from "./catalog";
import { inventoryRoutes, inventoryMenu } from "./inventory";
import { reportsRoutes, reportsMenu } from "./reports";
import { adminRoutes, adminMenu } from "./admin";
import type { AppRoute, MenuSection } from "./shared/registryTypes";

export const appRoutes: AppRoute[] = [
  ...authRoutes,
  ...posRoutes,
  ...catalogRoutes,
  ...inventoryRoutes,
  ...reportsRoutes,
  ...adminRoutes,
];

export const menuSections: MenuSection[] = [
  posMenu,
  catalogMenu,
  inventoryMenu,
  reportsMenu,
  adminMenu,
];
