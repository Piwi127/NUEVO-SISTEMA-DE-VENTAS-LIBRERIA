import React from "react";

export type RouteComponent =
  | React.ComponentType
  | React.LazyExoticComponent<React.ComponentType<any>>;

export type AppRoute = {
  path: string;
  component: RouteComponent;
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
