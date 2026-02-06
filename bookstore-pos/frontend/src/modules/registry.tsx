import { authRoutes } from "@/modules/auth";
import { posRoutes, posMenu } from "@/modules/pos";
import { catalogRoutes, catalogMenu } from "@/modules/catalog";
import { inventoryRoutes, inventoryMenu } from "@/modules/inventory";
import { reportsRoutes, reportsMenu } from "@/modules/reports";
import { adminRoutes, adminMenu } from "@/modules/admin";
import type { AppRoute, MenuSection } from "@/modules/shared/registryTypes";

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
