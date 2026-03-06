import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import DownloadIcon from "@mui/icons-material/Download";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useNavigate } from "react-router-dom";
import { ErrorState, KpiCard, LoadingState, PageHeader, ResizableTable } from "@/app/components";
import { useSettings } from "@/app/store";
import { formatMoney, todayISO } from "@/app/utils";
import {
  exportDaily,
  exportLow,
  exportProfitabilityProducts,
  exportProfitabilitySummary,
  exportTop,
  getDailyReport,
  getLowStock,
  getProfitabilityProducts,
  getProfitabilitySummary,
  getTopProducts,
  hasProfitabilitySupport,
} from "@/modules/reports/api";
import type {
  DailyReport,
  LowStockItem,
  ProfitabilityProductReport,
  ProfitabilitySummaryReport,
  TopProductReport,
} from "@/modules/reports/types";

type ExecutiveAlert = {
  title: string;
  body: string;
  severity: "success" | "info" | "warning" | "error";
  actionLabel?: string;
  actionPath?: string;
};

type QuickAction = {
  title: string;
  caption: string;
  path: string;
  icon: React.ReactNode;
  tone: string;
};

const shiftDateISO = (days: number) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

const Reports: React.FC = () => {
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const navigate = useNavigate();
  const isCompact = compactMode || compact;

  const today = todayISO();
  const last7 = shiftDateISO(-7);
  const last30 = shiftDateISO(-30);

  const [tab, setTab] = useState(0);
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState(last30);
  const [to, setTo] = useState(today);
  const [profitFrom, setProfitFrom] = useState(last30);
  const [profitTo, setProfitTo] = useState(today);

  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [top, setTop] = useState<TopProductReport[]>([]);
  const [low, setLow] = useState<LowStockItem[]>([]);
  const [profitabilitySummary, setProfitabilitySummary] = useState<ProfitabilitySummaryReport | null>(null);
  const [profitabilityProducts, setProfitabilityProducts] = useState<ProfitabilityProductReport[]>([]);

  const [loadingExecutive, setLoadingExecutive] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingLow, setLoadingLow] = useState(false);
  const [loadingProfitability, setLoadingProfitability] = useState(false);

  const [errorExecutive, setErrorExecutive] = useState(false);
  const [errorDaily, setErrorDaily] = useState(false);
  const [errorTop, setErrorTop] = useState(false);
  const [errorLow, setErrorLow] = useState(false);
  const [errorProfitability, setErrorProfitability] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Record<number, boolean>>({});
  const [profitabilitySupported, setProfitabilitySupported] = useState(true);

  const filterGridSx = {
    display: "grid",
    gap: 1,
    gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(180px, 1fr))" },
    alignItems: "start",
    "& > *": { minWidth: 0 },
  } as const;

  const kpiGridSx = {
    mt: 2,
    display: "grid",
    gap: 1.2,
    gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(180px, 1fr))" },
  } as const;

  const executiveSplitSx = {
    display: "grid",
    gap: 1.2,
    gridTemplateColumns: { xs: "1fr", xl: "1.25fr 0.95fr" },
    alignItems: "start",
  } as const;

  const previewGridSx = {
    display: "grid",
    gap: 1.2,
    gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
    alignItems: "start",
  } as const;

  const fetchDaily = (targetDate: string) => getDailyReport(targetDate);
  const fetchTop = (targetFrom: string, targetTo: string) => getTopProducts(targetFrom, targetTo);
  const fetchLow = () => getLowStock();
  const fetchProfitability = async (targetFrom: string, targetTo: string) => {
    const supported = await hasProfitabilitySupport();
    if (!supported) {
      return { supported: false, summary: null, rows: [] as ProfitabilityProductReport[] };
    }
    const [summary, rows] = await Promise.all([
      getProfitabilitySummary(targetFrom, targetTo),
      getProfitabilityProducts(targetFrom, targetTo, 100),
    ]);
    return { supported: true, summary, rows };
  };

  const markTabsLoaded = (...keys: number[]) => {
    setLoadedTabs((current) => {
      const next = { ...current };
      keys.forEach((key) => {
        next[key] = true;
      });
      return next;
    });
  };

  const download = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const loadExecutive = async () => {
    setLoadingExecutive(true);
    setErrorExecutive(false);
    try {
      const [dailyData, topData, lowData, profitabilityData] = await Promise.all([
        fetchDaily(date),
        fetchTop(from, to),
        fetchLow(),
        fetchProfitability(profitFrom, profitTo),
      ]);
      setDaily(dailyData);
      setTop(topData);
      setLow(lowData);
      setProfitabilitySupported(profitabilityData.supported);
      setProfitabilitySummary(profitabilityData.summary);
      setProfitabilityProducts(profitabilityData.rows);
      setErrorDaily(false);
      setErrorTop(false);
      setErrorLow(false);
      setErrorProfitability(false);
      markTabsLoaded(0, 1, 2, 3, 4);
    } catch {
      setErrorExecutive(true);
    } finally {
      setLoadingExecutive(false);
    }
  };

  const loadDaily = async () => {
    setLoadingDaily(true);
    setErrorDaily(false);
    try {
      setDaily(await fetchDaily(date));
      markTabsLoaded(1);
    } catch {
      setErrorDaily(true);
    } finally {
      setLoadingDaily(false);
    }
  };

  const loadTop = async () => {
    setLoadingTop(true);
    setErrorTop(false);
    try {
      setTop(await fetchTop(from, to));
      markTabsLoaded(2);
    } catch {
      setErrorTop(true);
    } finally {
      setLoadingTop(false);
    }
  };

  const loadLow = async () => {
    setLoadingLow(true);
    setErrorLow(false);
    try {
      setLow(await fetchLow());
      markTabsLoaded(3);
    } catch {
      setErrorLow(true);
    } finally {
      setLoadingLow(false);
    }
  };

  const loadProfitability = async () => {
    setLoadingProfitability(true);
    setErrorProfitability(false);
    try {
      const result = await fetchProfitability(profitFrom, profitTo);
      setProfitabilitySupported(result.supported);
      setProfitabilitySummary(result.summary);
      setProfitabilityProducts(result.rows);
      markTabsLoaded(4);
    } catch {
      setErrorProfitability(true);
    } finally {
      setLoadingProfitability(false);
    }
  };

  useEffect(() => {
    if (loadedTabs[tab]) return;

    const loadByTab = async () => {
      if (tab === 0) await loadExecutive();
      if (tab === 1) await loadDaily();
      if (tab === 2) await loadTop();
      if (tab === 3) await loadLow();
      if (tab === 4) await loadProfitability();
    };

    void loadByTab();
  }, [tab, loadedTabs]);

  const topTotal = useMemo(() => top.reduce((acc, item) => acc + Number(item.total_sold || 0), 0), [top]);
  const topUnits = useMemo(() => top.reduce((acc, item) => acc + Number(item.qty_sold || 0), 0), [top]);
  const lowCriticalCount = useMemo(() => low.filter((item) => Number(item.stock || 0) <= 0).length, [low]);
  const lowWarningCount = useMemo(() => low.filter((item) => Number(item.stock || 0) > 0).length, [low]);
  const missingUnits = useMemo(
    () => low.reduce((acc, item) => acc + Math.max(Number(item.stock_min || 0) - Number(item.stock || 0), 0), 0),
    [low]
  );
  const leadingProduct = top[0] ?? null;
  const marginPercent = Number(profitabilitySummary?.margin_percent || 0);
  const lowPreview = low.slice(0, 5);
  const topPreview = top.slice(0, 5);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        title: "Abrir POS",
        caption: "Cobro rapido y ventas del dia.",
        path: "/pos",
        icon: <PointOfSaleRoundedIcon fontSize="small" />,
        tone: "#103a5f",
      },
      {
        title: "Ver inventario",
        caption: "Control de stock y movimientos.",
        path: "/inventory",
        icon: <Inventory2RoundedIcon fontSize="small" />,
        tone: "#12746b",
      },
      {
        title: "Comprar reposicion",
        caption: "Ir directo a compras y abastecimiento.",
        path: "/inventory/purchases",
        icon: <LocalShippingRoundedIcon fontSize="small" />,
        tone: "#9a7b2f",
      },
      {
        title: "Ajustar catalogo",
        caption: "Productos, precios y margenes.",
        path: "/catalog/products",
        icon: <TrendingUpRoundedIcon fontSize="small" />,
        tone: "#375a7f",
      },
    ],
    []
  );

  const executiveAlerts = useMemo<ExecutiveAlert[]>(() => {
    const alerts: ExecutiveAlert[] = [];

    if (!profitabilitySupported) {
      alerts.push({
        title: "Rentabilidad no disponible",
        body: "La API que esta activa no expone aun los endpoints de rentabilidad. Reinicia o actualiza el backend en ejecucion para habilitarlos.",
        severity: "info",
      });
    }

    if (lowCriticalCount > 0) {
      alerts.push({
        title: "Reposicion urgente",
        body: `${lowCriticalCount} productos ya estan sin stock y necesitan atencion inmediata.`,
        severity: "error",
        actionLabel: "Ir a inventario",
        actionPath: "/inventory",
      });
    }

    if (low.length > 0) {
      alerts.push({
        title: "Stock por debajo del minimo",
        body: `${low.length} productos estan en riesgo. Faltan al menos ${missingUnits} unidades para volver al minimo.`,
        severity: lowCriticalCount > 0 ? "warning" : "info",
        actionLabel: "Planificar compra",
        actionPath: "/inventory/purchases",
      });
    }

    if (profitabilitySummary && marginPercent < 18) {
      alerts.push({
        title: "Margen ajustado",
        body: `El margen bruto del periodo esta en ${marginPercent.toFixed(2)}%. Conviene revisar costos y precios.`,
        severity: "warning",
        actionLabel: "Revisar productos",
        actionPath: "/catalog/products",
      });
    }

    if (daily && daily.sales_count === 0) {
      alerts.push({
        title: "Sin movimientos hoy",
        body: "Todavia no hay ventas registradas en la fecha consultada. Verifica caja o POS si esto no es esperado.",
        severity: "info",
        actionLabel: "Abrir POS",
        actionPath: "/pos",
      });
    }

    if (!alerts.length) {
      alerts.push({
        title: "Operacion estable",
        body: "No hay alertas criticas en este corte. El tablero muestra un panorama operativo limpio.",
        severity: "success",
      });
    }

    return alerts;
  }, [daily, low.length, lowCriticalCount, marginPercent, missingUnits, profitabilitySummary, profitabilitySupported]);

  const headerChips = useMemo(
    () => [
      daily ? `${daily.sales_count} tickets hoy` : "Corte diario",
      profitabilitySupported ? (profitabilitySummary ? `${marginPercent.toFixed(1)}% margen` : "Margen del periodo") : "Rentabilidad no disponible",
      low.length > 0 ? `${low.length} alertas de stock` : "Stock estable",
    ],
    [daily, low.length, marginPercent, profitabilitySummary, profitabilitySupported]
  );

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <PageHeader
        title="Centro ejecutivo"
        subtitle="Pulso comercial, alertas operativas y reportes clave desde una sola vista de control."
        icon={<AssessmentIcon color="primary" />}
        chips={headerChips}
        loading={loadingExecutive || loadingDaily || loadingTop || loadingLow || loadingProfitability}
        right={
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 0.85,
              width: "100%",
              maxWidth: { md: 420 },
              "& .MuiButton-root": {
                width: "100%",
                minWidth: 0,
                justifyContent: "center",
              },
            }}
          >
            <Button variant="outlined" startIcon={<Inventory2RoundedIcon />} onClick={() => navigate("/inventory")}>
              Inventario
            </Button>
            <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={loadExecutive}>
              Actualizar tablero
            </Button>
          </Box>
        }
      />

      <Paper sx={{ p: { xs: 0.9, md: 1.05 } }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Centro ejecutivo" />
          <Tab label="Diario" />
          <Tab label="Top productos" />
          <Tab label="Alertas de stock" />
          <Tab label="Rentabilidad" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <>
          {loadingExecutive ? (
            <LoadingState title="Construyendo tablero ejecutivo..." rows={4} />
          ) : errorExecutive ? (
            <Paper sx={{ p: 2 }}>
              <ErrorState title="No se pudo construir el centro ejecutivo" onRetry={loadExecutive} />
            </Paper>
          ) : (
            <>
              <Paper
                sx={{
                  p: { xs: 1.2, md: 1.45 },
                  background:
                    "linear-gradient(135deg, rgba(16,58,95,0.98) 0%, rgba(28,84,143,0.96) 48%, rgba(18,116,107,0.94) 100%)",
                  color: "common.white",
                  border: "1px solid rgba(16,58,95,0.14)",
                  boxShadow: "0 26px 42px rgba(13,32,56,0.16)",
                }}
              >
                <Stack
                  direction={{ xs: "column", lg: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "flex-start", lg: "center" }}
                  justifyContent="space-between"
                >
                  <Box sx={{ maxWidth: 760 }}>
                    <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.78)", letterSpacing: 1.15 }}>
                      Vista central de control
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.45, fontWeight: 800, letterSpacing: "-0.03em" }}>
                      Estado comercial del negocio en un solo panel
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.65, color: "rgba(255,255,255,0.82)", maxWidth: 700 }}>
                      Este tablero combina ventas del dia, rentabilidad reciente, productos en alerta y accesos directos a las
                      areas donde normalmente se toman decisiones.
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", lg: "auto" } }}>
                    <Button
                      variant="contained"
                      startIcon={<PointOfSaleRoundedIcon />}
                      onClick={() => navigate("/pos")}
                      sx={{ bgcolor: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
                    >
                      Abrir POS
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AutoGraphRoundedIcon />}
                      onClick={() => setTab(4)}
                      disabled={!profitabilitySupported}
                      sx={{ borderColor: "rgba(255,255,255,0.34)", color: "common.white" }}
                    >
                      Ver margen
                    </Button>
                  </Stack>
                </Stack>

                <Box sx={kpiGridSx}>
                  <KpiCard label="Venta del dia" value={formatMoney(daily?.total || 0)} accent="#d8b86b" />
                  <KpiCard label="Tickets hoy" value={`${daily?.sales_count || 0}`} accent="#dbeafe" />
                  <KpiCard
                    label="Utilidad del periodo"
                    value={profitabilitySupported ? formatMoney(profitabilitySummary?.gross_profit || 0) : "No disponible"}
                    accent="#7dd3c7"
                  />
                  <KpiCard label="Margen del periodo" value={profitabilitySupported ? `${marginPercent.toFixed(2)}%` : "N/D"} accent="#fbbf24" />
                  <KpiCard label="Alertas de stock" value={`${low.length}`} accent="#f97316" />
                  <KpiCard
                    label="Producto lider"
                    value={leadingProduct ? `${leadingProduct.name}` : "Sin ventas"}
                    accent="#c7d2fe"
                  />
                </Box>
              </Paper>

              <Box sx={{ ...executiveSplitSx, mt: 1.2 }}>
                <Paper sx={{ p: { xs: 1.1, md: 1.25 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                    <WarningAmberRoundedIcon color="warning" fontSize="small" />
                    <Typography variant="h6">Radar operativo</Typography>
                    <Chip size="small" label={`${executiveAlerts.length} alertas`} sx={{ ml: "auto" }} />
                  </Stack>
                  <Stack spacing={1}>
                    {executiveAlerts.map((item) => (
                      <Alert
                        key={item.title}
                        severity={item.severity}
                        action={
                          item.actionPath && item.actionLabel ? (
                            <Button color="inherit" size="small" onClick={() => navigate(item.actionPath || "/reports")}>
                              {item.actionLabel}
                            </Button>
                          ) : undefined
                        }
                        sx={{ alignItems: "center" }}
                      >
                        <Typography sx={{ fontWeight: 700, mb: 0.2 }}>{item.title}</Typography>
                        <Typography variant="body2">{item.body}</Typography>
                      </Alert>
                    ))}
                  </Stack>
                </Paper>

                <Paper sx={{ p: { xs: 1.1, md: 1.25 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                    <TrendingUpRoundedIcon color="primary" fontSize="small" />
                    <Typography variant="h6">Accesos rapidos</Typography>
                  </Stack>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                    }}
                  >
                    {quickActions.map((action) => (
                      <Paper
                        key={action.title}
                        variant="outlined"
                        sx={{
                          p: 1.05,
                          borderColor: `${action.tone}22`,
                          background: `linear-gradient(160deg, rgba(255,255,255,0.98) 0%, ${action.tone}0F 100%)`,
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 2,
                              display: "grid",
                              placeItems: "center",
                              bgcolor: `${action.tone}18`,
                              color: action.tone,
                              flexShrink: 0,
                            }}
                          >
                            {action.icon}
                          </Box>
                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography sx={{ fontWeight: 700 }}>{action.title}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {action.caption}
                            </Typography>
                            <Button size="small" variant="text" onClick={() => navigate(action.path)} sx={{ px: 0 }}>
                              Abrir
                            </Button>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Box>
                </Paper>
              </Box>

              <Box sx={{ ...previewGridSx, mt: 1.2 }}>
                <Paper sx={{ p: { xs: 1.1, md: 1.25 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                    <PointOfSaleRoundedIcon color="primary" fontSize="small" />
                    <Typography variant="h6">Top productos del periodo</Typography>
                    <Chip size="small" label={`${topUnits} unidades`} sx={{ ml: "auto" }} />
                  </Stack>
                  {topPreview.length ? (
                    <Stack spacing={0.9}>
                      {topPreview.map((item, index) => (
                        <Paper key={`${item.product_id}-${index}`} variant="outlined" sx={{ p: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={`#${index + 1}`} color={index === 0 ? "primary" : "default"} />
                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                              <Typography sx={{ fontWeight: 700 }} noWrap>
                                {item.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {item.qty_sold} unidades | {formatMoney(item.total_sold)}
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info">No hay ventas registradas para el periodo seleccionado.</Alert>
                  )}
                </Paper>

                <Paper sx={{ p: { xs: 1.1, md: 1.25 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                    <Inventory2RoundedIcon color="warning" fontSize="small" />
                    <Typography variant="h6">Resumen de reposicion</Typography>
                    <Chip size="small" label={`${lowCriticalCount} criticos`} sx={{ ml: "auto" }} />
                  </Stack>
                  <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, mb: 1.2 }}>
                    <Paper variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="overline">Sin stock</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{lowCriticalCount}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="overline">En alerta</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{lowWarningCount}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="overline">Faltante</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{missingUnits}</Typography>
                    </Paper>
                  </Box>
                  {lowPreview.length ? (
                    <Stack spacing={0.9}>
                      {lowPreview.map((item) => {
                        const shortage = Math.max(Number(item.stock_min || 0) - Number(item.stock || 0), 0);
                        return (
                          <Paper key={item.product_id} variant="outlined" sx={{ p: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip size="small" color={Number(item.stock || 0) <= 0 ? "error" : "warning"} label={item.sku} />
                              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                <Typography sx={{ fontWeight: 700 }} noWrap>
                                  {item.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Stock {item.stock}/{item.stock_min} | faltan {shortage}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Alert severity="success">No hay productos en stock bajo en este momento.</Alert>
                  )}
                </Paper>
              </Box>
            </>
          )}
        </>
      ) : null}

      {tab === 1 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Cierre diario</Typography>
          <Box sx={filterGridSx}>
            <TextField type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <Button variant="contained" onClick={loadDaily}>Consultar</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={async () => download(await exportDaily(date), "reporte_diario.csv")}>
              Exportar CSV
            </Button>
          </Box>

          {loadingDaily ? (
            <LoadingState title="Cargando reporte diario..." rows={2} />
          ) : errorDaily ? (
            <ErrorState title="No se pudo cargar el reporte diario" onRetry={loadDaily} />
          ) : daily ? (
            <>
              <Box sx={kpiGridSx}>
                <KpiCard label="Ventas" value={`${daily.sales_count}`} accent="#103a5f" />
                <KpiCard label="Total" value={formatMoney(daily.total)} accent="#9a7b2f" />
                <KpiCard label="Fecha" value={date} accent="#12746b" />
              </Box>
              <Alert severity={daily.sales_count > 0 ? "success" : "info"} sx={{ mt: 2 }}>
                {daily.sales_count > 0
                  ? `Se registran ${daily.sales_count} ventas con un total de ${formatMoney(daily.total)}.`
                  : "No hay ventas registradas para la fecha consultada."}
              </Alert>
            </>
          ) : null}
        </Paper>
      ) : null}

      {tab === 2 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Top productos</Typography>
          <Box sx={filterGridSx}>
            <TextField type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <TextField type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            <Button variant="outlined" onClick={() => { setFrom(last7); setTo(today); }}>
              Ultimos 7 dias
            </Button>
            <Button variant="outlined" onClick={() => { setFrom(last30); setTo(today); }}>
              Ultimos 30 dias
            </Button>
            <Button variant="contained" onClick={loadTop}>Consultar</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={async () => download(await exportTop(from, to), "top_productos.csv")}>
              Exportar CSV
            </Button>
          </Box>

          {loadingTop ? (
            <LoadingState title="Cargando top productos..." rows={2} />
          ) : errorTop ? (
            <ErrorState title="No se pudo cargar top productos" onRetry={loadTop} />
          ) : (
            <>
              {top.length > 0 ? (
                <Box sx={kpiGridSx}>
                  <KpiCard label="Unidades" value={`${topUnits}`} accent="#103a5f" />
                  <KpiCard label="Total vendido" value={formatMoney(topTotal)} accent="#9a7b2f" />
                  <KpiCard label="Rango" value={`${from} a ${to}`} accent="#12746b" />
                </Box>
              ) : null}

              {isCompact ? (
                <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
                  {top.map((item, index) => (
                    <Paper key={`${item.product_id}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                      <Typography variant="body2">Cantidad: {item.qty_sold}</Typography>
                      <Typography variant="body2">Total: {formatMoney(item.total_sold)}</Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <ResizableTable minHeight={240} sx={{ mt: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Producto</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {top.map((item, index) => (
                        <TableRow key={`${item.product_id}-${index}`}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell align="right">{item.qty_sold}</TableCell>
                          <TableCell align="right">{formatMoney(item.total_sold)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResizableTable>
              )}
            </>
          )}
        </Paper>
      ) : null}

      {tab === 3 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Alertas de stock</Typography>
          <Box sx={filterGridSx}>
            <Button variant="contained" onClick={loadLow}>Consultar</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={async () => download(await exportLow(), "stock_bajo.csv")}>
              Exportar CSV
            </Button>
          </Box>

          {!loadingLow && !errorLow && low.length > 0 ? (
            <Box sx={kpiGridSx}>
              <KpiCard label="Productos en alerta" value={`${low.length}`} accent="#f97316" />
              <KpiCard label="Sin stock" value={`${lowCriticalCount}`} accent="#dc2626" />
              <KpiCard label="Faltante estimado" value={`${missingUnits} uds.`} accent="#9a7b2f" />
            </Box>
          ) : null}

          {loadingLow ? (
            <LoadingState title="Cargando stock bajo..." rows={2} />
          ) : errorLow ? (
            <ErrorState title="No se pudo cargar stock bajo" onRetry={loadLow} />
          ) : isCompact ? (
            <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
              {low.map((item) => (
                <Paper key={item.product_id} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  <Typography variant="body2">SKU: {item.sku}</Typography>
                  <Typography variant="body2">Stock: {item.stock}/{item.stock_min}</Typography>
                </Paper>
              ))}
            </Box>
          ) : (
            <ResizableTable minHeight={240} sx={{ mt: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Minimo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {low.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">{item.stock}</TableCell>
                      <TableCell align="right">{item.stock_min}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResizableTable>
          )}
        </Paper>
      ) : null}

      {tab === 4 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Rentabilidad</Typography>
          {!profitabilitySupported ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              La API activa no expone aun esta ruta. Reinicia o actualiza el backend que esta corriendo para habilitar la rentabilidad.
            </Alert>
          ) : null}
          <Box sx={filterGridSx}>
            <TextField type="date" value={profitFrom} onChange={(event) => setProfitFrom(event.target.value)} disabled={!profitabilitySupported} />
            <TextField type="date" value={profitTo} onChange={(event) => setProfitTo(event.target.value)} disabled={!profitabilitySupported} />
            <Button variant="outlined" onClick={() => { setProfitFrom(last7); setProfitTo(today); }} disabled={!profitabilitySupported}>
              Ultimos 7 dias
            </Button>
            <Button variant="outlined" onClick={() => { setProfitFrom(last30); setProfitTo(today); }} disabled={!profitabilitySupported}>
              Ultimos 30 dias
            </Button>
            <Button variant="contained" onClick={loadProfitability} disabled={!profitabilitySupported}>Consultar</Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={async () => download(await exportProfitabilitySummary(profitFrom, profitTo), "rentabilidad_resumen.csv")}
              disabled={!profitabilitySupported}
            >
              Exportar resumen
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={async () => download(await exportProfitabilityProducts(profitFrom, profitTo, 100), "rentabilidad_productos.csv")}
              disabled={!profitabilitySupported}
            >
              Exportar productos
            </Button>
          </Box>

          {loadingProfitability ? (
            <LoadingState title="Cargando rentabilidad..." rows={2} />
          ) : errorProfitability ? (
            <ErrorState title="No se pudo cargar rentabilidad" onRetry={loadProfitability} />
          ) : (
            <>
              {profitabilitySummary ? (
                <Box sx={kpiGridSx}>
                  <KpiCard label="Ventas" value={formatMoney(profitabilitySummary.sales_total)} accent="#103a5f" />
                  <KpiCard label="Costo estimado" value={formatMoney(profitabilitySummary.estimated_cost_total)} accent="#375a7f" />
                  <KpiCard label="Utilidad bruta" value={formatMoney(profitabilitySummary.gross_profit)} accent="#12746b" />
                  <KpiCard label="Margen" value={`${Number(profitabilitySummary.margin_percent || 0).toFixed(2)}%`} accent="#9a7b2f" />
                </Box>
              ) : null}

              {isCompact ? (
                <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
                  {profitabilityProducts.map((row, index) => (
                    <Paper key={`${row.product_id}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
                      <Typography variant="body2">Unidades: {row.qty_sold}</Typography>
                      <Typography variant="body2">Ventas: {formatMoney(row.sales_total)}</Typography>
                      <Typography variant="body2">Costo: {formatMoney(row.estimated_cost_total)}</Typography>
                      <Typography variant="body2">Utilidad: {formatMoney(row.gross_profit)}</Typography>
                      <Typography variant="body2">Margen: {Number(row.margin_percent || 0).toFixed(2)}%</Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <ResizableTable minHeight={240} sx={{ mt: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Producto</TableCell>
                        <TableCell align="right">Unidades</TableCell>
                        <TableCell align="right">Ventas</TableCell>
                        <TableCell align="right">Costo est.</TableCell>
                        <TableCell align="right">Utilidad</TableCell>
                        <TableCell align="right">Margen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profitabilityProducts.map((row, index) => (
                        <TableRow key={`${row.product_id}-${index}`}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell align="right">{row.qty_sold}</TableCell>
                          <TableCell align="right">{formatMoney(row.sales_total)}</TableCell>
                          <TableCell align="right">{formatMoney(row.estimated_cost_total)}</TableCell>
                          <TableCell align="right">{formatMoney(row.gross_profit)}</TableCell>
                          <TableCell align="right">{Number(row.margin_percent || 0).toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResizableTable>
              )}
            </>
          )}
        </Paper>
      ) : null}
    </Box>
  );
};

export default Reports;


