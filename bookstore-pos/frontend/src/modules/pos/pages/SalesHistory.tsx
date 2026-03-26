import React, { useDeferredValue, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';

import { CardTable, EmptyState, PageHeader, ResizableTable, useToast } from "@/app/components";
import { useQuery } from "@tanstack/react-query";
import { getReceipt, listSales } from "@/modules/pos/api";
import { searchSalesHistoryRows } from "@/modules/shared/search/presets";
import { todayISO, detectTimeContext, formatDateTimeRegional, formatMoney } from "@/app/utils";
import { useSettings } from "@/app/store";
import { openReceiptWindow } from "@/modules/pos/utils/receiptWindow";

const daysAgoISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const inputStyles = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "rgba(255,255,255,0.7)",
    borderRadius: 2,
    backdropFilter: "blur(4px)",
    "& fieldset": { borderColor: "rgba(18,53,90,0.15)" },
    "&:hover fieldset": { borderColor: "primary.main" },
    "&.Mui-focused fieldset": { borderColor: "primary.main", borderWidth: "1px" },
  },
  "& .MuiInputLabel-root": { fontWeight: 600, color: "text.secondary" },
};

const SalesHistory: React.FC = () => {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [limit, setLimit] = useState(200);
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const { showToast } = useToast();
  const { timeZone } = detectTimeContext();
  const invalidDateRange = !!from && !!to && from > to;
  const deferredSearch = useDeferredValue(search);

  const params = useMemo(
    () => ({
      search: deferredSearch.trim() || undefined,
      status: status || undefined,
      from_date: from || undefined,
      to_date: to || undefined,
      limit,
    }),
    [deferredSearch, status, from, to, limit]
  );

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["sales-history", params],
    queryFn: () => listSales(params),
  });

  const rawRows = data || [];
  const searchResult = useMemo(() => searchSalesHistoryRows(rawRows, deferredSearch), [rawRows, deferredSearch]);
  const rows = useMemo(() => (searchResult.canSearch ? searchResult.items.map((entry) => entry.item) : rawRows), [searchResult, rawRows]);
  const hasRows = rows.length > 0;
  const smartHint = useMemo(() => {
    if (!searchResult.canSearch || !searchResult.correctedQuery) return null;
    if (rows.length > 0) return null;
    return searchResult.correctedQuery;
  }, [searchResult, rows.length]);

  const handleOpenReceipt = async (saleId: number) => {
    try {
      const receipt = await getReceipt(saleId);
      const opened = openReceiptWindow(receipt);
      if (!opened) {
        showToast({ message: "Permite ventanas emergentes en tu navegador para visualizar el ticket.", severity: "warning" });
      }
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === "string"
          ? (err as { response?: { data?: { detail?: string } } }).response!.data!.detail!
          : "Fallo al generar la representación visual del comprobante.";
      showToast({ message, severity: "error" });
    }
  };

  const cardRows = rows.map((sale) => ({
    key: sale.id,
    title: `Documento de Venta #${sale.id}`,
    subtitle: formatDateTimeRegional(sale.created_at),
    right: <Typography sx={{ fontWeight: 900, color: "primary.main", fontSize: "1.1rem" }}>{formatMoney(sale.total)}</Typography>,
    fields: [
      {
        label: "Comp. Electrónico",
        value: sale.invoice_number ? (
          <Button
            variant="text"
            size="small"
            onClick={() => handleOpenReceipt(sale.id)}
            sx={{ p: 0, minWidth: 0, fontWeight: 700, textTransform: "none", color: "secondary.main" }}
          >
            {sale.invoice_number}
          </Button>
        ) : <Typography variant="caption" color="text.disabled" fontWeight="600">No Emitido</Typography>,
      },
      { label: "Ejecutivo / Cajero", value: sale.user_name || sale.user_id },
      { label: "Cliente", value: sale.customer_name || sale.customer_id || "-" },
      {
        label: "Fase de Documento",
        value: <Chip size="small" label={sale.status} color={sale.status === 'PAID' ? 'success' : sale.status === 'VOID' ? 'error' : 'default'} sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} />
      },
    ],
  }));

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Repositorio de Ventas"
        subtitle="Visualiza, filtra y descarga el registro histórico de todas las transacciones procesadas."
        icon={<ReceiptLongIcon color="primary" sx={{ fontSize: 32 }} />}
        chips={[
          `${rows.length} tickets cargados`,
          `Horario Local: ${timeZone}`
        ]}
      />

      <Paper className="glass-panel" sx={{ p: 2.5, borderRadius: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "flex-end" }}>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color="primary" fontWeight="800" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <FilterListIcon fontSize="small" /> Opciones de Búsqueda
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
              <TextField
                label="Buscar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                placeholder="Ticket, cliente, RUC, telefono o cajero"
                sx={{ ...inputStyles, minWidth: { xs: "100%", sm: 280 } }}
              />
              <TextField
                select
                label="Fase"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                size="small"
                sx={{ ...inputStyles, minWidth: 160 }}
              >
                <MenuItem value="">Todos los Estados</MenuItem>
                <MenuItem value="PAID">Cobrado (PAID)</MenuItem>
                <MenuItem value="VOID">Anulado (VOID)</MenuItem>
              </TextField>
              <TextField
                type="date"
                label="Fecha de Inicio"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ ...inputStyles, width: { xs: "100%", sm: 160 } }}
              />
              <TextField
                type="date"
                label="Fecha de Corte"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ ...inputStyles, width: { xs: "100%", sm: 160 } }}
              />
              <TextField
                type="number"
                label="Límite"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                size="small"
                sx={{ ...inputStyles, width: { xs: "100%", sm: 140 } }}
              />
            </Stack>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: { xs: 2, md: 0 } }}>
            <Button variant="text" color="inherit" onClick={() => { setSearch(""); setFrom(""); setTo(""); setStatus(""); }} startIcon={<RestartAltIcon />} sx={{ fontWeight: 700 }}>
              Resetear
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SearchIcon />}
              onClick={() => {
                if (invalidDateRange) {
                  showToast({ message: "La fecha de inicio no puede ser posterior a la fecha de corte.", severity: "warning" });
                  return;
                }
                refetch();
              }}
              disabled={isFetching}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              Auditar
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", rowGap: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center", mr: 1, fontWeight: 700 }}>Presets Rápidos:</Typography>
          <Chip label="Hoy" onClick={() => { setFrom(todayISO()); setTo(todayISO()); }} size="small" icon={<CalendarTodayIcon fontSize="small" />} sx={{ fontWeight: 600 }} />
          <Chip label="Últimos 7 días" onClick={() => { setFrom(daysAgoISO(7)); setTo(todayISO()); }} size="small" icon={<CalendarTodayIcon fontSize="small" />} sx={{ fontWeight: 600 }} />
          <Chip label="Últimos 30 días" onClick={() => { setFrom(daysAgoISO(30)); setTo(todayISO()); }} size="small" icon={<CalendarTodayIcon fontSize="small" />} sx={{ fontWeight: 600 }} />
        </Stack>

        {searchResult.canSearch ? (
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", rowGap: 1 }}>
            <Chip label={`${rows.length} coincidencias`} color="primary" size="small" variant="outlined" />
            {searchResult.suggestions.slice(0, 3).map((term) => (
              <Chip key={term} label={term} size="small" onClick={() => setSearch((prev) => `${prev} ${term}`.trim())} sx={{ fontWeight: 600 }} />
            ))}
          </Stack>
        ) : null}

        {smartHint ? (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            No hubo coincidencias exactas. Prueba con{" "}
            <Button size="small" onClick={() => setSearch(smartHint)} sx={{ fontWeight: 800, textTransform: "none", minWidth: 0, p: 0 }}>
              {smartHint}
            </Button>
            .
          </Alert>
        ) : null}

        {invalidDateRange && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            El rango de fechas ingresado presenta una incoherencia temporal. Modifíquelo para iniciar la extracción.
          </Alert>
        )}
      </Paper>

      <Paper className="glass-panel" sx={{ border: "1px solid var(--border-subtle)", borderRadius: 4, overflow: "hidden" }}>
        {isFetching ? (
          <Box sx={{ p: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Typography variant="body1" color="primary" fontWeight="700">
              Desplegando historial transaccional...
            </Typography>
          </Box>
        ) : null}

        {!isFetching && !hasRows ? (
          <Box sx={{ py: 6 }}>
            <EmptyState
              title="Repositorio Vacío"
              description="El motor de búsqueda no encontró tickets bajo las directrices de filtro proporcionadas."
              actionLabel="Recargar Datos"
              onAction={() => refetch()}
              icon={<ReceiptLongIcon sx={{ fontSize: 48, color: "text.disabled" }} />}
            />
          </Box>
        ) : isCompact && !isFetching ? (
          <CardTable rows={cardRows} />
        ) : !isFetching ? (
          <ResizableTable minHeight={400} sx={{ background: "transparent", boxShadow: "none" }}>
            <Table size="medium" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: "text.primary", bgcolor: "rgba(248,250,252,0.9)" }}>ID Interno</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.primary", bgcolor: "rgba(248,250,252,0.9)" }}>Procesamiento (TZ)</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.primary", bgcolor: "rgba(248,250,252,0.9)" }}>Ticket Físico</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.primary", bgcolor: "rgba(248,250,252,0.9)" }}>Operador</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.primary", bgcolor: "rgba(248,250,252,0.9)" }}>Cod. Cliente</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.primary", bgcolor: "rgba(248,250,252,0.9)" }}>Fase</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: "text.primary", bgcolor: "rgba(248,250,252,0.9)" }}>Facturado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((sale) => (
                  <TableRow key={sale.id} hover sx={{ "&:hover": { bgcolor: "rgba(18,53,90,0.02)" } }}>
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>#{sale.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{formatDateTimeRegional(sale.created_at)}</TableCell>
                    <TableCell>
                      {sale.invoice_number ? (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenReceipt(sale.id)}
                          sx={{ borderRadius: 4, fontWeight: 700, textTransform: "none", fontSize: "0.75rem", px: 2 }}
                        >
                          {sale.invoice_number}
                        </Button>
                      ) : <Typography variant="caption" color="text.disabled" fontWeight="600">N/A</Typography>}
                    </TableCell>
                    <TableCell>{sale.user_name || sale.user_id}</TableCell>
                    <TableCell>{sale.customer_id ?? <Typography variant="caption" color="text.secondary">Cliente Genérico</Typography>}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={sale.status}
                        color={sale.status === 'PAID' ? 'success' : sale.status === 'VOID' ? 'error' : 'default'}
                        variant="filled"
                        sx={{ height: 22, fontSize: "0.7rem", fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: "primary.dark", fontSize: "1.05rem" }}>{formatMoney(sale.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResizableTable>
        ) : null}
      </Paper>
    </Box>
  );
};

export default SalesHistory;
