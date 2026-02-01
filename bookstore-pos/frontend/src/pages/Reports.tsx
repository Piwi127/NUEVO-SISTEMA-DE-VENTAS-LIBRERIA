import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { getDailyReport, getLowStock, getTopProducts, exportDaily, exportTop, exportLow } from "../api/reports";
import { todayISO } from "../utils/dates";

const Reports: React.FC = () => {
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [daily, setDaily] = useState<any>(null);
  const [top, setTop] = useState<any[]>([]);
  const [low, setLow] = useState<any[]>([]);

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
        <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
          <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant="contained" onClick={loadDaily}>Consultar</Button>
          <Button variant="outlined" onClick={async () => download(await exportDaily(date), "reporte_diario.csv")}>Exportar CSV</Button>
        </Box>
        {daily && (
          <Typography sx={{ mt: 2 }}>
            Ventas: {daily.sales_count} | Total: {daily.total}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Top productos</Typography>
        <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
          <TextField type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button variant="contained" onClick={loadTop}>Consultar</Button>
          <Button variant="outlined" onClick={async () => download(await exportTop(from, to), "top_productos.csv")}>Exportar CSV</Button>
        </Box>
        {top.map((t, idx) => (
          <Typography key={idx} variant="body2">{t.name} - {t.qty_sold} - {t.total_sold}</Typography>
        ))}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Stock bajo</Typography>
        <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
          <Button variant="contained" onClick={loadLow}>Consultar</Button>
          <Button variant="outlined" onClick={async () => download(await exportLow(), "stock_bajo.csv")}>Exportar CSV</Button>
        </Box>
        {low.map((l, idx) => (
          <Typography key={idx} variant="body2">{l.sku} - {l.name} - {l.stock}/{l.stock_min}</Typography>
        ))}
      </Paper>
    </Box>
  );
};

export default Reports;
