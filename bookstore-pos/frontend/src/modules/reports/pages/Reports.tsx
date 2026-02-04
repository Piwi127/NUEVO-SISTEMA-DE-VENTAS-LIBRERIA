import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssessmentIcon from "@mui/icons-material/Assessment";
import DownloadIcon from "@mui/icons-material/Download";
import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { getDailyReport, getLowStock, getTopProducts, exportDaily, exportTop, exportLow } from "../api";
import { todayISO } from "../../../utils/dates";
import { formatMoney } from "../../../utils/money";
import { KpiCard } from "../../../components/KpiCard";
import { useSettings } from "../../../store/useSettings";

const Reports: React.FC = () => {
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [daily, setDaily] = useState<any>(null);
  const [top, setTop] = useState<any[]>([]);
  const [low, setLow] = useState<any[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingLow, setLoadingLow] = useState(false);
  const [errorDaily, setErrorDaily] = useState(false);
  const [errorTop, setErrorTop] = useState(false);
  const [errorLow, setErrorLow] = useState(false);
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const topTotal = useMemo(() => top.reduce((acc, t) => acc + Number(t.total_sold || 0), 0), [top]);
  const topUnits = useMemo(() => top.reduce((acc, t) => acc + Number(t.qty_sold || 0), 0), [top]);
  const lowCount = useMemo(() => low.length, [low]);

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

  const download = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Reportes ejecutivos"
        subtitle="Indicadores, exportaciones y stock critico."
        icon={<AssessmentIcon color="primary" />}
        chips={["Actualizado bajo demanda"]}
        loading={loadingDaily || loadingTop || loadingLow}
      />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Reporte diario</Typography>
        <Accordion sx={{ mt: 1 }} defaultExpanded={!isCompact}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">Filtros</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button variant="contained" onClick={loadDaily}>Consultar</Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={async () => download(await exportDaily(date), "reporte_diario.csv")}
              >
                Exportar CSV
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
        {loadingDaily ? (
          <LoadingState title="Cargando reporte diario..." rows={2} />
        ) : errorDaily ? (
          <ErrorState title="No se pudo cargar el reporte diario" onRetry={loadDaily} />
        ) : daily ? (
          <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(3, 1fr)" }}>
            <KpiCard label="Ventas" value={`${daily.sales_count}`} accent="#0b1e3b" />
            <KpiCard label="Total" value={formatMoney(daily.total)} accent="#c9a227" />
            <KpiCard label="Fecha" value={date} accent="#2f4858" />
          </Box>
        ) : null}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Top productos</Typography>
        <Accordion sx={{ mt: 1 }} defaultExpanded={!isCompact}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">Filtros</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <TextField type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <Button variant="contained" onClick={loadTop}>Consultar</Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={async () => download(await exportTop(from, to), "top_productos.csv")}
              >
                Exportar CSV
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
        {loadingTop ? (
          <LoadingState title="Cargando top productos..." rows={2} />
        ) : errorTop ? (
          <ErrorState title="No se pudo cargar top productos" onRetry={loadTop} />
        ) : (top.length > 0) && (
          <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(3, 1fr)" }}>
            <KpiCard label="Items vendidos" value={`${topUnits}`} accent="#0b1e3b" />
            <KpiCard label="Total vendido" value={formatMoney(topTotal)} accent="#c9a227" />
            <KpiCard label="Rango" value={`${from} → ${to}`} accent="#2f4858" />
          </Box>
        )}
        {loadingTop || errorTop ? null : isCompact ? (
          <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
            {top.map((t, idx) => (
              <Paper key={idx} sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 600 }}>{t.name}</Typography>
                <Typography variant="body2">Cantidad: {t.qty_sold}</Typography>
                <Typography variant="body2">Total: {t.total_sold}</Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <Table size="small" sx={{ mt: 2 }}>
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
          </Table>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Stock bajo</Typography>
        <Accordion sx={{ mt: 1 }} defaultExpanded={!isCompact}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">Filtros</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button variant="contained" onClick={loadLow}>Consultar</Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={async () => download(await exportLow(), "stock_bajo.csv")}
              >
                Exportar CSV
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
        {loadingLow ? (
          <LoadingState title="Cargando stock bajo..." rows={2} />
        ) : errorLow ? (
          <ErrorState title="No se pudo cargar stock bajo" onRetry={loadLow} />
        ) : isCompact ? (
          <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
            {low.map((l, idx) => (
              <Paper key={idx} sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 600 }}>{l.name}</Typography>
                <Typography variant="body2">SKU: {l.sku}</Typography>
                <Typography variant="body2">Stock: {l.stock}/{l.stock_min}</Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <Table size="small" sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right">Min</TableCell>
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
          </Table>
        )}
        {lowCount > 0 && (
          <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(3, 1fr)" }}>
            <KpiCard label="Items en riesgo" value={`${lowCount}`} accent="#c9a227" />
            <KpiCard label="Accion sugerida" value="Reponer" accent="#0b1e3b" />
            <KpiCard label="Estado" value="Atencion" accent="#2f4858" />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Reports;
