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
  Chip,
  Divider,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useSettings } from "../store/useSettings";
import { getPublicSettings } from "../modules/admin/api";
import { api } from "../modules/shared/api";
import { menuSections } from "../modules/registry";

export const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const compact = useMediaQuery("(max-width:900px)");
  const [healthOk, setHealthOk] = useState(true);
  const { role, username, logout } = useAuth();
  const {
    projectName,
    logoUrl,
    compactMode,
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

  const location = useLocation();
  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => role && item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

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

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        await api.get("/healthz");
        if (mounted) setHealthOk(true);
      } catch {
        if (mounted) setHealthOk(false);
      }
    };
    check();
    const timer = window.setInterval(check, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

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
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(true)}>
            <MenuIcon />
          </IconButton>
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="logo" sx={{ height: 28, mr: 2, borderRadius: 1 }} />
          ) : null}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            {projectName}
          </Typography>
          <Chip
            label={`${username ?? ""} · ${role ?? ""}`}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.12)",
              color: "white",
              mr: 1.5,
            }}
          />
          <IconButton
            color="inherit"
            onClick={() => { logout(); navigate("/login"); }}
            sx={{ mr: 1 }}
            aria-label="Cerrar sesion"
          >
            <LogoutIcon />
          </IconButton>
          {!healthOk ? (
            <Chip
              label="API offline"
              size="small"
              color="secondary"
              sx={{ mr: 1.5 }}
            />
          ) : null}
          {compactMode ? (
            <Chip
              label="Compacto"
              size="small"
              color="secondary"
              sx={{ mr: 1.5 }}
            />
          ) : null}
          
        </Toolbar>
      </AppBar>
      <Drawer open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: compact ? 220 : 270, py: 1 }} role="presentation" onClick={() => setOpen(false)}>
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: "rgba(230,237,247,0.72)", letterSpacing: 0.6 }}>
              Menu
            </Typography>
          </Box>
          {filteredSections.map((section) => (
            <Box key={section.title} sx={{ pb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 2.5,
                  pb: 0.5,
                  display: "block",
                  color: "rgba(230,237,247,0.62)",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {section.title}
              </Typography>
              <List disablePadding>
                {section.items.map((item) => (
                  <ListItemButton
                    key={item.path}
                    component={RouterLink}
                    to={item.path}
                    selected={location.pathname === item.path}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
                  </ListItemButton>
                ))}
              </List>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mx: 2, mt: 1 }} />
            </Box>
          ))}
        </Box>
      </Drawer>
      <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
    </Box>
  );
};
