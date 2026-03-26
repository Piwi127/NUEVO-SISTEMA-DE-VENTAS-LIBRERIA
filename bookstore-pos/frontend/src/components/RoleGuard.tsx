import React from "react";
import { useAuth } from "@/auth/AuthProvider";

type Props = {
  roles: string[];
  children: React.ReactNode;
};

// Componente de protección por rol
// Renderiza hijos solo si el usuario tiene el rol requerido
// Props: roles - array de roles permitidos, children - contenido a renderizar
  const { role } = useAuth();
  if (!role || !roles.includes(role)) return null;
  return <>{children}</>;
};
