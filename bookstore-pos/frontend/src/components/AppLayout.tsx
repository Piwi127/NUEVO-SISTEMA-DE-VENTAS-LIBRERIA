import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  ButtonBase,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useSettings } from "@/app/store";
import { getPublicSettings } from "@/modules/admin/api";
import { api } from "@/modules/shared/api";
import { menuSections } from "@/modules/registry";
import type { MenuSection } from "@/modules/shared/registryTypes";

const matchesPath = (pathname: string, itemPath: string) => pathname === itemPath || pathname.startsWith(`${itemPath}/`);

type SectionVisual = {
  description: string;
  accent: string;
  glow: string;
  panel: string;
};

const SECTION_VISUALS: Record<string, SectionVisual> = {
  Operacion: {
    description: "Ventas, caja y flujo rapido de mostrador.",
    accent: "#B45309",
    glow: "rgba(180,83,9,0.18)",
    panel: "linear-gradient(135deg, rgba(255,248,239,0.99) 0%, rgba(251,240,224,0.95) 100%)",
  },
  Catalogo: {
    description: "Productos, clientes, proveedores y promociones.",
    accent: "#254B67",
    glow: "rgba(37,75,103,0.18)",
    panel: "linear-gradient(135deg, rgba(245,250,255,0.99) 0%, rgba(236,245,251,0.95) 100%)",
  },
  "Inventario y compras": {
    description: "Movimientos, compras, recepcion y kardex.",
    accent: "#0F766E",
    glow: "rgba(15,118,110,0.18)",
    panel: "linear-gradient(135deg, rgba(239,250,248,0.99) 0%, rgba(230,246,243,0.95) 100%)",
  },
  Reportes: {
    description: "Indicadores operativos y vistas ejecutivas.",
    accent: "#415A6F",
    glow: "rgba(65,90,111,0.16)",
    panel: "linear-gradient(135deg, rgba(245,248,252,0.99) 0%, rgba(236,242,248,0.95) 100%)",
  },
  Administracion: {
    description: "Usuarios, permisos, seguridad y configuracion.",
    accent: "#6B4C2F",
    glow: "rgba(107,76,47,0.16)",
    panel: "linear-gradient(135deg, rgba(250,247,241,0.99) 0%, rgba(243,236,226,0.95) 100%)",
  },
};

const DEFAULT_SECTION_VISUAL: SectionVisual = {
  description: "Accesos del sistema.",
  accent: "#13293D",
  glow: "rgba(19,41,61,0.16)",
  panel: "linear-gradient(135deg, rgba(250,248,244,0.99) 0%, rgba(242,236,226,0.95) 100%)",
};

const getSectionVisual = (title?: string) => (title ? SECTION_VISUALS[title] ?? DEFAULT_SECTION_VISUAL : DEFAULT_SECTION_VISUAL);

export const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSectionTitle, setExpandedSectionTitle] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState(true);
  const headerRef = useRef<HTMLDivElement | null>(null);

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
  const location = useLocation();

  const filteredSections = useMemo(
    () =>
      menuSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => role && item.roles.includes(role)),
        }))
        .filter((section) => section.items.length > 0),
    [role]
  );

  const activeItem =
    filteredSections
      .flatMap((section) => section.items)
      .filter((item) => matchesPath(location.pathname, item.path))
      .sort((a, b) => b.path.length - a.path.length)[0] || filteredSections[0]?.items[0];

  const activeSection = filteredSections.find((section) => section.items.some((item) => item.path === activeItem?.path)) || filteredSections[0];
  const expandedSection = filteredSections.find((section) => section.title === expandedSectionTitle) || activeSection;
  const projectLabel = projectName || "Sistema";

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

  useEffect(() => {
    setExpandedSectionTitle(activeSection?.title ?? null);
    setDesktopMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, activeSection?.title]);

  useEffect(() => {
    if (!desktopMenuOpen && !mobileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) {
        setDesktopMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDesktopMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [desktopMenuOpen, mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSelectItem = (path: string) => {
    setDesktopMenuOpen(false);
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleSectionToggle = (title: string) => {
    setExpandedSectionTitle(title);
    if (compact) {
      setMobileMenuOpen((current) => (expandedSectionTitle === title ? !current : true));
      return;
    }
    setDesktopMenuOpen((current) => (expandedSectionTitle === title ? !current : true));
  };

  const renderMenuItems = (section: MenuSection, dense = false) => {
    const visual = getSectionVisual(section.title);
    return (
      <Box
        sx={{
          display: "grid",
          gap: dense ? 0.75 : 1,
          gridTemplateColumns: dense
            ? "1fr"
            : {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                xl: `repeat(${Math.min(section.items.length, 3)}, minmax(0, 1fr))`,
              },
        }}
      >
        {section.items.map((item) => {
          const selected = activeItem?.path === item.path;
          return (
            <ButtonBase
              key={item.path}
              onClick={() => handleSelectItem(item.path)}
              sx={{
                justifyContent: "flex-start",
                textAlign: "left",
                width: "100%",
                p: dense ? 1 : 1.05,
                borderRadius: 2.5,
                border: `1px solid ${selected ? alpha(visual.accent, 0.4) : "rgba(19,41,61,0.12)"}`,
                bgcolor: selected ? alpha(visual.accent, 0.12) : "rgba(255,255,255,0.92)",
                boxShadow: selected ? `0 10px 24px ${alpha(visual.accent, 0.16)}` : "none",
                transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  borderColor: alpha(visual.accent, 0.36),
                  boxShadow: `0 10px 22px ${alpha(visual.accent, 0.16)}`,
                },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    color: visual.accent,
                    bgcolor: alpha(visual.accent, selected ? 0.18 : 0.1),
                  }}
                >
                  {item.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, lineHeight: 1.15, color: "text.primary" }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.15 }}>
                    {selected ? "Vista actual" : "Abrir modulo"}
                  </Typography>
                </Box>
              </Stack>
            </ButtonBase>
          );
        })}
      </Box>
    );
  };

  const currentVisual = getSectionVisual(expandedSection?.title || activeSection?.title);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at top left, rgba(19,41,61,0.1) 0%, rgba(19,41,61,0) 28%), radial-gradient(circle at top right, rgba(15,118,110,0.12) 0%, rgba(15,118,110,0) 32%), linear-gradient(180deg, #fbf8f2 0%, #f4f0e8 54%, #efe6d6 100%)",
      }}
    >
      <Paper
        ref={headerRef}
        component="header"
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: (currentTheme) => currentTheme.zIndex.appBar,
          borderRadius: 0,
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
          overflow: "visible",
          background: "linear-gradient(180deg, rgba(255,253,248,0.97) 0%, rgba(248,241,230,0.95) 100%)",
          borderBottom: `1px solid ${alpha("#13293D", 0.12)}`,
          boxShadow: "0 18px 40px rgba(19,41,61,0.12)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: "auto 0 0 0",
            height: 3,
            background: `linear-gradient(90deg, ${currentVisual.accent} 0%, ${alpha(currentVisual.accent, 0.25)} 60%, transparent 100%)`,
          }}
        />

        <Box sx={{ px: { xs: 1, sm: 1.5, md: 2.25 }, pt: { xs: 0.9, md: 1.1 }, pb: { xs: 0.85, md: 0.95 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 0.9, md: 1.25 }} alignItems={{ xs: "stretch", md: "center" }}>
            <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0, flexGrow: 1 }}>
              {logoUrl ? (
                <Box
                  component="img"
                  src={logoUrl}
                  alt="logo"
                  sx={{
                    width: { xs: 42, md: 46 },
                    height: { xs: 42, md: 46 },
                    borderRadius: 2.5,
                    objectFit: "cover",
                    border: `1px solid ${alpha("#17344e", 0.1)}`,
                    boxShadow: "0 8px 20px rgba(19,41,61,0.12)",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: { xs: 42, md: 46 },
                    height: { xs: 42, md: 46 },
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    color: currentVisual.accent,
                    bgcolor: alpha(currentVisual.accent, 0.12),
                    border: `1px solid ${alpha(currentVisual.accent, 0.16)}`,
                  }}
                >
                  <StorefrontIcon />
                </Box>
              )}

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.15, lineHeight: 1 }}>
                  Centro de control
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    mt: 0.25,
                    color: "text.primary",
                    fontWeight: 800,
                    fontSize: { xs: "1.05rem", md: "1.18rem" },
                    lineHeight: 1.08,
                  }}
                  noWrap
                >
                  {projectLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                  {activeSection?.title || "Modulo"}  -  {activeItem?.label || "Inicio"}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ alignItems: "center", justifyContent: { xs: "space-between", md: "flex-end" } }}>
              {compact ? (
                <IconButton
                  color="primary"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                  aria-label="Abrir menu principal"
                  sx={{
                    border: `1px solid ${alpha("#17344e", 0.14)}`,
                    bgcolor: alpha(currentVisual.accent, 0.08),
                  }}
                >
                  <MenuIcon />
                </IconButton>
              ) : null}

              {username ? (
                <Chip
                  label={username}
                  size="small"
                  sx={{
                    bgcolor: alpha("#13293D", 0.08),
                    border: `1px solid ${alpha("#13293D", 0.14)}`,
                    color: "text.primary",
                    fontWeight: 800,
                  }}
                />
              ) : null}

              {!healthOk ? <Chip label="API offline" size="small" color="error" /> : null}

              <IconButton
                color="primary"
                onClick={handleLogout}
                aria-label="Cerrar sesion"
                sx={{
                  border: `1px solid ${alpha("#13293D", 0.14)}`,
                  bgcolor: "rgba(255,252,246,0.95)",
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {!compact ? (
          <Box sx={{ px: { md: 2.25 }, pb: 1.05 }}>
            <Box
              sx={{
                display: "flex",
                gap: 0.9,
                overflowX: "auto",
                pb: 0.2,
                scrollbarWidth: "thin",
              }}
            >
              {filteredSections.map((section) => {
                const visual = getSectionVisual(section.title);
                const isExpanded = desktopMenuOpen && expandedSection?.title === section.title;
                const isActiveSection = activeSection?.title === section.title;
                return (
                  <ButtonBase
                    key={section.title}
                    onClick={() => handleSectionToggle(section.title)}
                    onMouseEnter={() => {
                      if (desktopMenuOpen) {
                        setExpandedSectionTitle(section.title);
                      }
                    }}
                    sx={{
                      position: "relative",
                      flexShrink: 0,
                      minWidth: { md: 148, lg: 170 },
                      px: 1.1,
                      py: 0.9,
                      borderRadius: 2.6,
                      border: `1px solid ${isExpanded ? alpha(visual.accent, 0.34) : alpha("#17344e", 0.12)}`,
                      bgcolor: isExpanded ? alpha(visual.accent, 0.12) : isActiveSection ? alpha(visual.accent, 0.08) : "rgba(255,255,255,0.92)",
                      boxShadow: isExpanded ? `0 12px 28px ${visual.glow}` : "none",
                      transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        bgcolor: alpha(visual.accent, isExpanded ? 0.14 : 0.1),
                      },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 10,
                        right: 10,
                        height: 3,
                        borderBottomLeftRadius: 999,
                        borderBottomRightRadius: 999,
                        bgcolor: isExpanded || isActiveSection ? visual.accent : "transparent",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={0.9} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          color: visual.accent,
                          bgcolor: alpha(visual.accent, 0.12),
                          flexShrink: 0,
                        }}
                      >
                        {section.items[0]?.icon}
                      </Box>
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.1 }} noWrap>
                          {section.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.1 }} noWrap>
                          {section.items.length} acceso{section.items.length === 1 ? "" : "s"}
                        </Typography>
                      </Box>
                      <KeyboardArrowDownRoundedIcon
                        sx={{
                          fontSize: 18,
                          color: alpha(visual.accent, 0.95),
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 160ms ease",
                        }}
                      />
                    </Stack>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>
        ) : null}

        <Collapse in={desktopMenuOpen && !compact && !!expandedSection} timeout={180} unmountOnExit>
          {expandedSection ? (
            <Box sx={{ px: { md: 2.25 }, pb: 1.25 }}>
              <Paper
                sx={{
                  overflow: "hidden",
                  background: currentVisual.panel,
                  border: `1px solid ${alpha(currentVisual.accent, 0.18)}`,
                  boxShadow: `0 24px 44px ${currentVisual.glow}`,
                }}
              >
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "280px minmax(0, 1fr)" } }}>
                  <Box
                    sx={{
                      p: 1.35,
                      color: "#0c1f33",
                      background: `linear-gradient(180deg, ${alpha(currentVisual.accent, 0.16)} 0%, ${alpha(currentVisual.accent, 0.06)} 100%)`,
                      borderRight: { lg: `1px solid ${alpha(currentVisual.accent, 0.16)}` },
                      borderBottom: { xs: `1px solid ${alpha(currentVisual.accent, 0.16)}`, lg: 0 },
                    }}
                  >
                    <Typography variant="overline" sx={{ letterSpacing: 1.1, color: alpha("#17344e", 0.78) }}>
                      Menu principal
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.3, fontWeight: 800, lineHeight: 1.05 }}>
                      {expandedSection.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.55 }}>
                      {getSectionVisual(expandedSection.title).description}
                    </Typography>
                    <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mt: 1.1 }}>
                      <Chip label={`${expandedSection.items.length} opciones`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.6)" }} />
                      {activeSection?.title === expandedSection.title && activeItem ? (
                        <Chip label={`Actual: ${activeItem.label}`} size="small" sx={{ bgcolor: alpha(currentVisual.accent, 0.12), color: currentVisual.accent }} />
                      ) : null}
                    </Stack>
                  </Box>

                  <Box sx={{ p: 1.1 }}>{renderMenuItems(expandedSection)}</Box>
                </Box>
              </Paper>
            </Box>
          ) : null}
        </Collapse>

        <Collapse in={mobileMenuOpen && compact} timeout={180} unmountOnExit>
          <Box sx={{ px: 1, pb: 1.1 }}>
            <Stack spacing={0.85}>
              {filteredSections.map((section) => {
                const visual = getSectionVisual(section.title);
                const isExpanded = expandedSectionTitle === section.title;
                return (
                  <Paper
                    key={section.title}
                    sx={{
                      overflow: "hidden",
                      border: `1px solid ${alpha(visual.accent, 0.16)}`,
                      background: isExpanded ? visual.panel : "rgba(255,255,255,0.92)",
                    }}
                  >
                    <ButtonBase
                      onClick={() => {
                        setExpandedSectionTitle((current) => (current === section.title ? null : section.title));
                      }}
                      sx={{ width: "100%", justifyContent: "flex-start", px: 1, py: 0.95, textAlign: "left" }}
                    >
                      <Stack direction="row" spacing={0.9} alignItems="center" sx={{ width: "100%" }}>
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: 2,
                            display: "grid",
                            placeItems: "center",
                            color: visual.accent,
                            bgcolor: alpha(visual.accent, 0.1),
                            flexShrink: 0,
                          }}
                        >
                          {section.items[0]?.icon}
                        </Box>
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>{section.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getSectionVisual(section.title).description}
                          </Typography>
                        </Box>
                        <KeyboardArrowDownRoundedIcon
                          sx={{
                            color: visual.accent,
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 160ms ease",
                          }}
                        />
                      </Stack>
                    </ButtonBase>
                    <Collapse in={isExpanded} timeout={160} unmountOnExit>
                      <Box sx={{ px: 1, pb: 1 }}>{renderMenuItems(section, true)}</Box>
                    </Collapse>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        </Collapse>
      </Paper>

      <Box sx={{ width: "100%", maxWidth: { xl: 1720 }, mx: "auto", p: { xs: 1, sm: 1.5, md: 2.2 }, pb: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box sx={{ display: "grid", gap: { xs: 1, md: 1.2 } }}>{children}</Box>
      </Box>
    </Box>
  );
};





