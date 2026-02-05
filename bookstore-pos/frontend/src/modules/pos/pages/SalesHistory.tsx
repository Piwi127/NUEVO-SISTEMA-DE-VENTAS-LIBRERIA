import React, { useMemo, useState } from "react";
import { Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { PageHeader } from "../../../components/PageHeader";
import { TableToolbar } from "../../../components/TableToolbar";
import { EmptyState } from "../../../components/EmptyState";
import { CardTable } from "../../../components/CardTable";
import { useQuery } from "@tanstack/react-query";
import { listSales } from "../api";
import { todayISO } from "../../../utils/dates";
import { formatMoney } from "../../../utils/money";
import { useSettings } from "../../../store/useSettings";

const SalesHistory: React.FC = () => {
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [limit, setLimit] = useState(200);
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

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

  const rows = data || [];
  const hasRows = rows.length > 0;
  const cardRows = rows.map((s) => ({
    key: s.id,
    title: `#${s.id} ${s.invoice_number || "-"}`,
    subtitle: s.created_at,
    right: <Typography sx={{ fontWeight: 700 }}>{formatMoney(s.total)}</Typography>,
    fields: [
      { label: "Usuario", value: s.user_id },
      { label: "Cliente", value: s.customer_id ?? "-" },
      { label: "Estado", value: s.status },
    ],
  }));

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Historial de ventas"
        subtitle="Filtros por fecha, estado y limites."
        icon={<ReceiptLongIcon color="primary" />}
        chips={[`Registros: ${data?.length ?? 0}`]}
      />

      <TableToolbar title="Filtros" subtitle="Consulta por fechas y estado.">
        <TextField select label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="PAID">PAID</MenuItem>
          <MenuItem value="VOID">VOID</MenuItem>
        </TextField>
        <TextField type="date" label="Desde" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="Hasta" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField
          type="number"
          label="Limite"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          helperText="Max 500"
        />
        <Button variant="contained" onClick={() => refetch()} disabled={isFetching}>Consultar</Button>
      </TableToolbar>

      <Paper sx={{ p: 2 }}>
        {isFetching && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Cargando ventas...
          </Typography>
        )}
        {!isFetching && !hasRows ? (
          <EmptyState
            title="Sin ventas"
            description="No hay ventas en el rango seleccionado."
            actionLabel="Reintentar"
            onAction={() => refetch()}
            icon={<ReceiptLongIcon color="disabled" />}
          />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
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
              {rows.map((s) => (
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
