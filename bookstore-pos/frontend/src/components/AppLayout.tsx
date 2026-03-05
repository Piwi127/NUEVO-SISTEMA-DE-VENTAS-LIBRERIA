import React, { useEffect, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useSettings } from "@/app/store";
import { getPublicSettings } from "@/modules/admin/api";
import { api } from "@/modules/shared/api";
import { menuSections } from "@/modules/registry";

const NAV_WIDTH = 296;

const getRoleLabel = (role: string | null | undefined) => {
  if (role === "admin") return "Administrador";
  if (role === "cashier") return "Caja";
  if (role === "stock") return "Inventario";
  return "Sin rol";
};

export const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
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

  let activeSection = filteredSections[0];
  let activeItem = activeSection?.items[0];

  filteredSections.forEach((section) => {
    section.items.forEach((item) => {
      if (location.pathname.startsWith(item.path)) {
        if (!activeItem || item.path.length > activeItem.path.length) {
          activeSection = section;
          activeItem = item;
        }
      }
    });
  });

  const homePath = filteredSections[0]?.items[0]?.path || "/";
  const activeTab = activeItem?.path || false;
  const currentSectionPath = activeSection?.items[0]?.path || homePath;

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigationContent = (closeAfterNavigate: boolean) => (
    <Box sx={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%" }}>
      <Box sx={{ px: 1, pt: 1, pb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="logo" sx={{ width: 40, height: 40, borderRadius: 1.5, objectFit: "cover" }} />
          ) : (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(255,255,255,0.12)",
                color: "#fff6dd",
              }}
            >
              <StorefrontIcon fontSize="small" />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: "rgba(241,245,251,0.7)", letterSpacing: 1 }}>
              Operacion activa
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#f8fbff", fontWeight: 800 }} noWrap>
              {projectName}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ overflowY: "auto", pb: 2 }}>
        {filteredSections.map((section) => (
          <Box key={section.title} sx={{ pb: 1.25 }}>
            <Typography
              variant="caption"
              sx={{
                px: 2,
                pb: 0.75,
                display: "block",
                color: "rgba(241,245,251,0.62)",
                letterSpacing: 0.9,
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
                  selected={activeItem?.path === item.path}
                  onClick={() => {
                    if (closeAfterNavigate) setMobileOpen(false);
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
                </ListItemButton>
              ))}
            </List>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 2, mt: 1.25 }} />
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 1, pb: 1 }}>
        <Paper
          sx={{
            p: 1.5,
            bgcolor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "none",
          }}
        >
          <Typography variant="body2" sx={{ color: "#f8fbff", fontWeight: 700 }}>
            {username || "Usuario"}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(241,245,251,0.74)" }}>
            Perfil: {getRoleLabel(role)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "background.default",
        backgroundImage:
          "linear-gradient(180deg, rgba(18,53,90,0.06) 0%, rgba(18,53,90,0) 24%), radial-gradient(900px 360px at 100% -10%, rgba(154,123,47,0.12), transparent)",
      }}
    >
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width: NAV_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: NAV_WIDTH,
            boxSizing: "border-box",
            p: 1.5,
          },
        }}
      >
        {navigationContent(false)}
      </Drawer>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: 286,
            boxSizing: "border-box",
            p: 1.5,
          },
        }}
      >
        {navigationContent(true)}
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Paper
          component="header"
          elevation={0}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            borderRadius: 0,
            borderLeft: 0,
            borderRight: 0,
            borderTop: 0,
            bgcolor: "rgba(248,250,252,0.88)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <Toolbar
            sx={{
              minHeight: { xs: 76, md: 80 },
              px: { xs: 2, md: 3 },
              gap: 1.5,
              alignItems: "center",
              flexWrap: { xs: "wrap", md: "nowrap" },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
              {compact ? (
                <IconButton color="primary" onClick={() => setMobileOpen(true)} aria-label="Abrir navegacion">
                  <MenuIcon />
                </IconButton>
              ) : null}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                  Panel principal
                </Typography>
                <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 800 }} noWrap>
                  {projectName}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Tooltip title="Fecha local">
                <Chip
                  icon={<CalendarMonthIcon sx={{ color: "inherit !important" }} />}
                  label={new Date().toLocaleDateString("es-PE")}
                  size="small"
                  sx={{ bgcolor: "rgba(18,53,90,0.08)", color: "text.primary" }}
                />
              </Tooltip>
              <Chip label={username ?? "Usuario"} size="small" sx={{ bgcolor: "rgba(18,53,90,0.08)", color: "text.primary" }} />
              <Chip label={getRoleLabel(role)} size="small" sx={{ bgcolor: "rgba(18,53,90,0.08)", color: "text.primary" }} />
              {!healthOk ? <Chip label="API offline" size="small" color="error" /> : null}
              {compactMode ? <Chip label="Vista compacta" size="small" color="secondary" /> : null}
              <Tooltip title="Cerrar sesion">
                <IconButton color="primary" onClick={handleLogout} aria-label="Cerrar sesion">
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </Paper>

        <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", gap: 2 }}>
          <Paper
            sx={{
              p: { xs: 2, md: 2.5 },
              background:
                "linear-gradient(160deg, rgba(18,53,90,0.045) 0%, rgba(18,53,90,0.018) 56%, rgba(154,123,47,0.08) 100%)",
            }}
          >
            <Stack spacing={1.75}>
              <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
                <Link component={RouterLink} to={homePath} underline="hover" color="inherit">
                  Panel
                </Link>
                {activeSection ? (
                  <Link component={RouterLink} to={currentSectionPath} underline="hover" color="inherit">
                    {activeSection.title}
                  </Link>
                ) : null}
                <Typography color="text.primary" sx={{ fontWeight: 700 }}>
                  {activeItem?.label || projectName}
                </Typography>
              </Breadcrumbs>

              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                  Ubicacion actual
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {activeItem?.label || projectName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeSection ? `Area: ${activeSection.title}` : "Navegacion principal"}
                </Typography>
              </Box>

              {activeSection && activeSection.items.length > 1 ? (
                <Tabs value={activeTab} variant="scrollable" allowScrollButtonsMobile>
                  {activeSection.items.map((item) => (
                    <Tab
                      key={item.path}
                      value={item.path}
                      component={RouterLink}
                      to={item.path}
                      icon={React.isValidElement(item.icon) ? item.icon : undefined}
                      iconPosition={React.isValidElement(item.icon) ? "start" : undefined}
                      label={item.label}
                    />
                  ))}
                </Tabs>
              ) : null}
            </Stack>
          </Paper>

          {children}
        </Box>
      </Box>
    </Box>
  );
};
