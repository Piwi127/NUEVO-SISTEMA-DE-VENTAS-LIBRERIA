import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Box,
  Button,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReplayIcon from "@mui/icons-material/Replay";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CategoryIcon from "@mui/icons-material/Category";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import CampaignIcon from "@mui/icons-material/Campaign";
import AssessmentIcon from "@mui/icons-material/Assessment";
import GroupIcon from "@mui/icons-material/Group";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useSettings } from "../store/useSettings";
import { getPublicSettings } from "../api/settings";

const menuItems = [
  { label: "POS", path: "/pos", roles: ["admin", "cashier"], icon: <PointOfSaleIcon fontSize="small" /> },
  { label: "Ventas", path: "/sales-history", roles: ["admin", "cashier"], icon: <ReceiptLongIcon fontSize="small" /> },
  { label: "Devoluciones", path: "/returns", roles: ["admin", "cashier"], icon: <ReplayIcon fontSize="small" /> },
  { label: "Caja", path: "/cash", roles: ["admin", "cashier"], icon: <AccountBalanceIcon fontSize="small" /> },
  { label: "Clientes", path: "/customers", roles: ["admin", "cashier"], icon: <PeopleAltIcon fontSize="small" /> },
  { label: "Productos", path: "/products", roles: ["admin", "stock"], icon: <CategoryIcon fontSize="small" /> },
  { label: "Inventario", path: "/inventory", roles: ["admin", "stock"], icon: <Inventory2Icon fontSize="small" /> },
  { label: "Compras", path: "/purchases", roles: ["admin", "stock"], icon: <LocalShippingIcon fontSize="small" /> },
  { label: "Proveedores", path: "/suppliers", roles: ["admin", "stock"], icon: <LocalShippingIcon fontSize="small" /> },
  { label: "Listas de precio", path: "/price-lists", roles: ["admin"], icon: <PriceChangeIcon fontSize="small" /> },
  { label: "Promociones", path: "/promotions", roles: ["admin"], icon: <CampaignIcon fontSize="small" /> },
  { label: "Reportes", path: "/reports", roles: ["admin"], icon: <AssessmentIcon fontSize="small" /> },
  { label: "Usuarios", path: "/users", roles: ["admin"], icon: <GroupIcon fontSize="small" /> },
  { label: "Administracion", path: "/admin", roles: ["admin"], icon: <AdminPanelSettingsIcon fontSize="small" /> },
];

export const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const compact = useMediaQuery("(max-width:900px)");
  const { role, username, logout } = useAuth();
  const {
    projectName,
    logoUrl,
    setProjectName,
    setCurrency,
    setTaxRate,
    setTaxIncluded,
    setStoreAddress,
    setStorePhone,
    setStoreTaxId,
    setLogoUrl,
    setPaymentMethods,
    setInvoicePrefix,
    setInvoiceNext,
    setReceiptHeader,
    setReceiptFooter,
    setPaperWidthMm,
    setDefaultWarehouseId,
  } = useSettings();
  const navigate = useNavigate();

  const filtered = menuItems.filter((item) => role && item.roles.includes(role));

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getPublicSettings();
        setProjectName(s.project_name);
        setCurrency(s.currency as any);
        setTaxRate(s.tax_rate);
        setTaxIncluded(s.tax_included);
        setStoreAddress(s.store_address);
        setStorePhone(s.store_phone);
        setStoreTaxId(s.store_tax_id);
        setLogoUrl(s.logo_url);
        setPaymentMethods(s.payment_methods);
        setInvoicePrefix(s.invoice_prefix);
        setInvoiceNext(s.invoice_next);
        setReceiptHeader(s.receipt_header);
        setReceiptFooter(s.receipt_footer);
        setPaperWidthMm(s.paper_width_mm);
        setDefaultWarehouseId(s.default_warehouse_id ?? null);
      } catch {
        // ignore
      }
    };
    load();
  }, [
    setProjectName,
    setCurrency,
    setTaxRate,
    setTaxIncluded,
    setStoreAddress,
    setStorePhone,
    setStoreTaxId,
    setLogoUrl,
    setPaymentMethods,
    setInvoicePrefix,
    setInvoiceNext,
    setReceiptHeader,
    setReceiptFooter,
    setPaperWidthMm,
    setDefaultWarehouseId,
  ]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(1200px 500px at 85% -10%, rgba(11,30,59,0.12), transparent), radial-gradient(900px 420px at -10% 10%, rgba(201,162,39,0.12), transparent)",
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
        <Box sx={{ width: compact ? 220 : 260 }} role="presentation" onClick={() => setOpen(false)}>
          <List>
            {filtered.map((item) => (
              <ListItemButton key={item.path} component={RouterLink} to={item.path}>
                <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>{item.icon}</ListItemIcon>
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
