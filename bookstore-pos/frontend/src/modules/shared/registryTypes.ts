import React from "react";

export type AppRoute = {
  path: string;
  component: React.ComponentType;
  roles?: string[];
  layout?: boolean;
  public?: boolean;
};

export type MenuItem = {
  label: string;
  path: string;
  roles: string[];
  icon: React.ReactNode;
};

export type MenuSection = {
  title: string;
  items: MenuItem[];
};
