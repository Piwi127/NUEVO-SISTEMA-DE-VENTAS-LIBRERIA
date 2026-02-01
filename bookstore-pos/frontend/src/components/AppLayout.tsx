import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Box,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useSettings } from "../store/useSettings";

const menuItems = [
  { label: "POS", path: "/pos", roles: ["admin", "cashier"] },
  { label: "Devoluciones", path: "/returns", roles: ["admin", "cashier"] },
  { label: "Productos", path: "/products", roles: ["admin", "stock"] },
  { label: "Inventario", path: "/inventory", roles: ["admin", "stock"] },
  { label: "Caja", path: "/cash", roles: ["admin", "cashier"] },
  { label: "Compras", path: "/purchases", roles: ["admin", "stock"] },
  { label: "Clientes", path: "/customers", roles: ["admin", "cashier"] },
  { label: "Proveedores", path: "/suppliers", roles: ["admin", "stock"] },
  { label: "Usuarios", path: "/users", roles: ["admin"] },
  { label: "Listas de precio", path: "/price-lists", roles: ["admin"] },
  { label: "Promociones", path: "/promotions", roles: ["admin"] },
  { label: "Administracion", path: "/admin", roles: ["admin"] },
  { label: "Reportes", path: "/reports", roles: ["admin"] },
];

export const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { role, username, logout } = useAuth();
  const { projectName, logoUrl } = useSettings();
  const navigate = useNavigate();

  const filtered = menuItems.filter((item) => role && item.roles.includes(role));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(1200px 500px at 80% -10%, rgba(29,78,216,0.12), transparent), radial-gradient(900px 400px at -10% 10%, rgba(15,118,110,0.12), transparent)",
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(true)}>
            <MenuIcon />
          </IconButton>
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="logo" sx={{ height: 28, mr: 2, borderRadius: 1 }} />
          ) : null}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            {projectName}
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
            {username} ? {role}
          </Typography>
          <Button color="inherit" onClick={() => { logout(); navigate("/login"); }}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation" onClick={() => setOpen(false)}>
          <List>
            {filtered.map((item) => (
              <ListItemButton key={item.path} component={RouterLink} to={item.path}>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
    </Box>
  );
};
