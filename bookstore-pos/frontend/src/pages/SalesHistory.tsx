import React, { useMemo, useState } from "react";
import { Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { listSales } from "../api/sales";
import { todayISO } from "../utils/dates";
import { formatMoney } from "../utils/money";

const SalesHistory: React.FC = () => {
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [limit, setLimit] = useState(200);
  const compact = useMediaQuery("(max-width:900px)");

  const params = useMemo(() => ({
    status: status || undefined,
    from_date: from || undefined,
    to_date: to || undefined,
    limit,
  }), [status, from, to, limit]);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["sales-history", params],
    queryFn: () => listSales(params),
  });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Historial de ventas</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField select label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="PAID">PAID</MenuItem>
            <MenuItem value="VOID">VOID</MenuItem>
          </TextField>
          <TextField type="date" label="Desde" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" label="Hasta" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="number" label="Limite" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
          <Button variant="contained" onClick={() => refetch()} disabled={isFetching}>Consultar</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        {compact ? (
          <Box sx={{ display: "grid", gap: 1 }}>
            {(data || []).map((s) => (
              <Paper key={s.id} sx={{ p: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontWeight: 600 }}>#{s.id} {s.invoice_number || "-"}</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{formatMoney(s.total)}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{s.created_at}</Typography>
                <Typography variant="body2">Usuario: {s.user_id} | Cliente: {s.customer_id ?? "-"}</Typography>
                <Typography variant="body2">Estado: {s.status}</Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Comprobante</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data || []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell>{s.created_at}</TableCell>
                  <TableCell>{s.invoice_number || "-"}</TableCell>
                  <TableCell>{s.user_id}</TableCell>
                  <TableCell>{s.customer_id ?? "-"}</TableCell>
                  <TableCell>{s.status}</TableCell>
                  <TableCell align="right">{formatMoney(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default SalesHistory;
