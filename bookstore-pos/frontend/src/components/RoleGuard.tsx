import React from "react";
import { useAuth } from "../auth/AuthProvider";

type Props = {
  roles: string[];
  children: React.ReactNode;
};

export const RoleGuard: React.FC<Props> = ({ roles, children }) => {
  const { role } = useAuth();
  if (!role || !roles.includes(role)) return null;
  return <>{children}</>;
};
