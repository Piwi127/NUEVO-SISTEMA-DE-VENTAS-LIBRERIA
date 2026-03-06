import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Paper,
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
import DownloadIcon from "@mui/icons-material/Download";
import { KpiCard, ResizableTable } from "@/app/components";
import { LoadingState } from "@/app/components";
import { ErrorState } from "@/app/components";
import { PageHeader } from "@/app/components";
import { useSettings } from "@/app/store";
import { todayISO } from "@/app/utils";
import { formatMoney } from "@/app/utils";
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
} from "@/modules/reports/api";

const Reports: React.FC = () => {
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const [tab, setTab] = useState(0);

  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [profitFrom, setProfitFrom] = useState(todayISO());
  const [profitTo, setProfitTo] = useState(todayISO());

  const [daily, setDaily] = useState<any>(null);
  const [top, setTop] = useState<any[]>([]);
  const [low, setLow] = useState<any[]>([]);
  const [profitabilitySummary, setProfitabilitySummary] = useState<any>(null);
  const [profitabilityProducts, setProfitabilityProducts] = useState<any[]>([]);

  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingLow, setLoadingLow] = useState(false);
  const [loadingProfitability, setLoadingProfitability] = useState(false);

  const [errorDaily, setErrorDaily] = useState(false);
  const [errorTop, setErrorTop] = useState(false);
  const [errorLow, setErrorLow] = useState(false);
  const [errorProfitability, setErrorProfitability] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Record<number, boolean>>({});

  const topTotal = useMemo(() => top.reduce((acc, t) => acc + Number(t.total_sold || 0), 0), [top]);
  const topUnits = useMemo(() => top.reduce((acc, t) => acc + Number(t.qty_sold || 0), 0), [top]);

  const download = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const loadDaily = async () => {
    setLoadingDaily(true);
    setErrorDaily(false);
    try {
      setDaily(await getDailyReport(date));
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
      setTop(await getTopProducts(from, to));
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
      setLow(await getLowStock());
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
      const [summary, rows] = await Promise.all([
        getProfitabilitySummary(profitFrom, profitTo),
        getProfitabilityProducts(profitFrom, profitTo, 100),
      ]);
      setProfitabilitySummary(summary);
      setProfitabilityProducts(rows);
    } catch {
      setErrorProfitability(true);
    } finally {
      setLoadingProfitability(false);
    }
  };

  React.useEffect(() => {
    const loadByTab = async () => {
      if (loadedTabs[tab]) return;
      if (tab === 0) await loadDaily();
      if (tab === 1) await loadTop();
      if (tab === 2) await loadLow();
      if (tab === 3) await loadProfitability();
      setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    };
    void loadByTab();
  }, [tab, loadedTabs]);

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <PageHeader
        title="Reportes ejecutivos"
        subtitle="Indicadores operativos y exportaciones para gestion."
        icon={<AssessmentIcon color="primary" />}
        chips={["Consulta bajo demanda"]}
        loading={loadingDaily || loadingTop || loadingLow || loadingProfitability}
      />

      <Paper sx={{ p: { xs: 0.9, md: 1.05 } }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Diario" />
          <Tab label="Top productos" />
          <Tab label="Stock bajo" />
          <Tab label="Rentabilidad" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Reporte diario</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
            <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(3, 1fr)" }}>
              <KpiCard label="Ventas" value={`${daily.sales_count}`} accent="#0b1e3b" />
              <KpiCard label="Total" value={formatMoney(daily.total)} accent="#9a7b2f" />
              <KpiCard label="Fecha" value={date} accent="#2f4858" />
            </Box>
          ) : null}
        </Paper>
      ) : null}

      {tab === 1 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Top productos</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button variant="outlined" onClick={() => { const d = new Date(); const t = d.toISOString().slice(0, 10); d.setDate(d.getDate() - 7); setFrom(d.toISOString().slice(0, 10)); setTo(t); }}>
              Ultimos 7 dias
            </Button>
            <Button variant="outlined" onClick={() => { const d = new Date(); const t = d.toISOString().slice(0, 10); d.setDate(d.getDate() - 30); setFrom(d.toISOString().slice(0, 10)); setTo(t); }}>
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
                <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(3, 1fr)" }}>
                  <KpiCard label="Unidades" value={`${topUnits}`} accent="#0b1e3b" />
                  <KpiCard label="Total vendido" value={formatMoney(topTotal)} accent="#9a7b2f" />
                  <KpiCard label="Rango" value={`${from} a ${to}`} accent="#2f4858" />
                </Box>
              ) : null}

              {isCompact ? (
                <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
                  {top.map((t, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography sx={{ fontWeight: 700 }}>{t.name}</Typography>
                      <Typography variant="body2">Cantidad: {t.qty_sold}</Typography>
                      <Typography variant="body2">Total: {formatMoney(t.total_sold)}</Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <ResizableTable minHeight={240} sx={{ mt: 2 }}><Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {top.map((t, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell align="right">{t.qty_sold}</TableCell>
                        <TableCell align="right">{formatMoney(t.total_sold)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></ResizableTable>
              )}
            </>
          )}
        </Paper>
      ) : null}

      {tab === 2 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Stock bajo</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button variant="contained" onClick={loadLow}>Consultar</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={async () => download(await exportLow(), "stock_bajo.csv")}>
              Exportar CSV
            </Button>
          </Box>

          {loadingLow ? (
            <LoadingState title="Cargando stock bajo..." rows={2} />
          ) : errorLow ? (
            <ErrorState title="No se pudo cargar stock bajo" onRetry={loadLow} />
          ) : isCompact ? (
            <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
              {low.map((l, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>{l.name}</Typography>
                  <Typography variant="body2">SKU: {l.sku}</Typography>
                  <Typography variant="body2">Stock: {l.stock}/{l.stock_min}</Typography>
                </Paper>
              ))}
            </Box>
          ) : (
            <ResizableTable minHeight={240} sx={{ mt: 2 }}><Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Minimo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {low.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{l.sku}</TableCell>
                    <TableCell>{l.name}</TableCell>
                    <TableCell align="right">{l.stock}</TableCell>
                    <TableCell align="right">{l.stock_min}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></ResizableTable>
          )}
        </Paper>
      ) : null}

      {tab === 3 ? (
        <Paper sx={{ p: { xs: 1, md: 1.15 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Rentabilidad</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField type="date" value={profitFrom} onChange={(e) => setProfitFrom(e.target.value)} />
            <TextField type="date" value={profitTo} onChange={(e) => setProfitTo(e.target.value)} />
            <Button variant="contained" onClick={loadProfitability}>Consultar</Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={async () => download(await exportProfitabilitySummary(profitFrom, profitTo), "rentabilidad_resumen.csv")}
            >
              Exportar resumen
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={async () => download(await exportProfitabilityProducts(profitFrom, profitTo, 100), "rentabilidad_productos.csv")}
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
                <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(4, 1fr)" }}>
                  <KpiCard label="Ventas" value={formatMoney(profitabilitySummary.sales_total)} accent="#0b1e3b" />
                  <KpiCard label="Costo estimado" value={formatMoney(profitabilitySummary.estimated_cost_total)} accent="#2f4858" />
                  <KpiCard label="Utilidad bruta" value={formatMoney(profitabilitySummary.gross_profit)} accent="#2a5d34" />
                  <KpiCard label="Margen" value={`${Number(profitabilitySummary.margin_percent || 0).toFixed(2)}%`} accent="#9a7b2f" />
                </Box>
              ) : null}

              {isCompact ? (
                <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
                  {profitabilityProducts.map((row, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
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
                <ResizableTable minHeight={240} sx={{ mt: 2 }}><Table size="small" stickyHeader>
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
                    {profitabilityProducts.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">{row.qty_sold}</TableCell>
                        <TableCell align="right">{formatMoney(row.sales_total)}</TableCell>
                        <TableCell align="right">{formatMoney(row.estimated_cost_total)}</TableCell>
                        <TableCell align="right">{formatMoney(row.gross_profit)}</TableCell>
                        <TableCell align="right">{Number(row.margin_percent || 0).toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></ResizableTable>
              )}
            </>
          )}
        </Paper>
      ) : null}
    </Box>
  );
};

export default Reports;

