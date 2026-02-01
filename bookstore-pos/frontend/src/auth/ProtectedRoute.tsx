import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

type Props = {
  children: React.ReactNode;
  roles?: string[];
};

export const ProtectedRoute: React.FC<Props> = ({ children, roles }) => {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role)) return <Navigate to="/pos" replace />;
  return <>{children}</>;
};
