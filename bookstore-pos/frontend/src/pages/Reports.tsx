import React, { useMemo, useState } from "react";
import { Box, Button, Paper, TextField, Typography, useMediaQuery, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getDailyReport, getLowStock, getTopProducts, exportDaily, exportTop, exportLow } from "../api/reports";
import { todayISO } from "../utils/dates";
import { formatMoney } from "../utils/money";
import { KpiCard } from "../components/KpiCard";

const Reports: React.FC = () => {
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [daily, setDaily] = useState<any>(null);
  const [top, setTop] = useState<any[]>([]);
  const [low, setLow] = useState<any[]>([]);
  const compact = useMediaQuery("(max-width:900px)");

  const topTotal = useMemo(() => top.reduce((acc, t) => acc + Number(t.total_sold || 0), 0), [top]);
  const topUnits = useMemo(() => top.reduce((acc, t) => acc + Number(t.qty_sold || 0), 0), [top]);
  const lowCount = useMemo(() => low.length, [low]);

  const loadDaily = async () => setDaily(await getDailyReport(date));
  const loadTop = async () => setTop(await getTopProducts(from, to));
  const loadLow = async () => setLow(await getLowStock());

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
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Reporte diario</Typography>
        <Accordion sx={{ mt: 1 }} defaultExpanded={!compact}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">Filtros</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button variant="contained" onClick={loadDaily}>Consultar</Button>
              <Button variant="outlined" onClick={async () => download(await exportDaily(date), "reporte_diario.csv")}>Exportar CSV</Button>
            </Box>
          </AccordionDetails>
        </Accordion>
        {daily && (
          <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: compact ? "1fr" : "repeat(3, 1fr)" }}>
            <KpiCard label="Ventas" value={`${daily.sales_count}`} accent="#0b1e3b" />
            <KpiCard label="Total" value={formatMoney(daily.total)} accent="#c9a227" />
            <KpiCard label="Fecha" value={date} accent="#2f4858" />
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Top productos</Typography>
        <Accordion sx={{ mt: 1 }} defaultExpanded={!compact}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">Filtros</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <TextField type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <Button variant="contained" onClick={loadTop}>Consultar</Button>
              <Button variant="outlined" onClick={async () => download(await exportTop(from, to), "top_productos.csv")}>Exportar CSV</Button>
            </Box>
          </AccordionDetails>
        </Accordion>
        {(top.length > 0) && (
          <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: compact ? "1fr" : "repeat(3, 1fr)" }}>
            <KpiCard label="Items vendidos" value={`${topUnits}`} accent="#0b1e3b" />
            <KpiCard label="Total vendido" value={formatMoney(topTotal)} accent="#c9a227" />
            <KpiCard label="Rango" value={`${from} → ${to}`} accent="#2f4858" />
          </Box>
        )}
        {compact ? (
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
          top.map((t, idx) => (
            <Typography key={idx} variant="body2">{t.name} - {t.qty_sold} - {t.total_sold}</Typography>
          ))
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Stock bajo</Typography>
        <Accordion sx={{ mt: 1 }} defaultExpanded={!compact}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">Filtros</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button variant="contained" onClick={loadLow}>Consultar</Button>
              <Button variant="outlined" onClick={async () => download(await exportLow(), "stock_bajo.csv")}>Exportar CSV</Button>
            </Box>
          </AccordionDetails>
        </Accordion>
        {compact ? (
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
          low.map((l, idx) => (
            <Typography key={idx} variant="body2">{l.sku} - {l.name} - {l.stock}/{l.stock_min}</Typography>
          ))
        )}
        {lowCount > 0 && (
          <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: compact ? "1fr" : "repeat(3, 1fr)" }}>
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
