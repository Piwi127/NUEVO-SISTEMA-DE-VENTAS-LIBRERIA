import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useAuth } from "@/auth/AuthProvider";

type Props = {
  children: React.ReactNode;
  roles?: string[];
};

export const ProtectedRoute: React.FC<Props> = ({ children, roles }) => {
  const { role, ready } = useAuth();
  const navigate = useNavigate();
  if (!ready) return null;
  if (!role) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role)) {
    return (
      <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center", p: 2 }}>
        <Paper sx={{ p: 3, maxWidth: 480, textAlign: "center" }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Acceso restringido
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Usted no tiene permisos para ingresar a este apartado. Consulte con el administrador del sistema.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/pos")}>Volver al inicio</Button>
        </Paper>
      </Box>
    );
  }
  return <>{children}</>;
};
