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
  Tabs,
  Tab,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
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

  const activeSection =
    filteredSections.find((section) => section.items.some((item) => location.pathname.startsWith(item.path))) ||
    filteredSections[0];
  const activeTab =
    activeSection?.items
      .filter((item) => location.pathname.startsWith(item.path))
      .sort((a, b) => b.path.length - a.path.length)[0]?.path || false;

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
          "linear-gradient(180deg, rgba(18,53,90,0.06) 0%, rgba(18,53,90,0) 25%), radial-gradient(900px 360px at 100% -10%, rgba(154,123,47,0.12), transparent)",
      }}
    >
      <AppBar position="static">
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(true)}>
            <MenuIcon />
          </IconButton>
          {logoUrl ? <Box component="img" src={logoUrl} alt="logo" sx={{ height: 28, mr: 1.5, borderRadius: 1 }} /> : null}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800, letterSpacing: 0.2 }}>
            {projectName}
          </Typography>
          <Tooltip title="Fecha local">
            <Chip
              icon={<CalendarMonthIcon sx={{ color: "inherit !important" }} />}
              label={new Date().toLocaleDateString("es-PE")}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white", mr: 1 }}
            />
          </Tooltip>
          <Chip
            label={`${username ?? ""} - ${role ?? ""}`}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "white", mr: 1 }}
          />
          <IconButton
            color="inherit"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            sx={{ mr: 1 }}
            aria-label="Cerrar sesion"
          >
            <LogoutIcon />
          </IconButton>
          {!healthOk ? <Chip label="API offline" size="small" color="secondary" sx={{ mr: 1 }} /> : null}
          {compactMode ? <Chip label="Compacto" size="small" color="secondary" /> : null}
        </Toolbar>

        {activeSection && activeSection.items.length > 1 ? (
          <Box sx={{ px: { xs: 1, md: 2 }, pb: 1 }}>
            <Tabs value={activeTab} variant="scrollable" allowScrollButtonsMobile textColor="inherit">
              {activeSection.items.map((item) => (
                <Tab
                  key={item.path}
                  value={item.path}
                  component={RouterLink}
                  to={item.path}
                  icon={React.isValidElement(item.icon) ? item.icon : undefined}
                  iconPosition={React.isValidElement(item.icon) ? "start" : undefined}
                  label={item.label}
                  sx={{ color: "rgba(255,255,255,0.9)" }}
                />
              ))}
            </Tabs>
          </Box>
        ) : null}
      </AppBar>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: compact ? 230 : 285, py: 1 }} role="presentation" onClick={() => setOpen(false)}>
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: "rgba(241,245,251,0.75)", letterSpacing: 0.8, textTransform: "uppercase" }}>
              Navegacion
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
                  color: "rgba(241,245,251,0.6)",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {section.title}
              </Typography>
              <List disablePadding>
                {section.items.map((item) => (
                  <ListItemButton key={item.path} component={RouterLink} to={item.path} selected={location.pathname === item.path}>
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
                  </ListItemButton>
                ))}
              </List>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 2, mt: 1 }} />
            </Box>
          ))}
        </Box>
      </Drawer>

      <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
    </Box>
  );
};
