import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import { PageHeader } from "../../../components/PageHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReceipt, returnSale, listReturns } from "../api";
import { useToast } from "../../../components/ToastProvider";
import { EmptyState } from "../../../components/EmptyState";
import { CardTable } from "../../../components/CardTable";
import { useSettings } from "../../../store/useSettings";
import { openReceiptWindow } from "../utils/receiptWindow";
import { detectTimeContext, formatDateTimeRegional } from "../../../utils/datetime";

const Returns: React.FC = () => {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [limit, setLimit] = useState(100);
  const { timeZone } = detectTimeContext();

  const returnsQuery = useQuery({
    queryKey: ["returns-history", limit],
    queryFn: () => listReturns(limit),
  });
  const rows = returnsQuery.data || [];

  const handleOpenReceipt = async (saleId: number) => {
    try {
      const receipt = await getReceipt(saleId);
      const opened = openReceiptWindow(receipt);
      if (!opened) {
        showToast({ message: "Permite ventanas emergentes para ver el comprobante", severity: "warning" });
      }
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === "string"
          ? (err as { response?: { data?: { detail?: string } } }).response!.data!.detail!
          : "No se pudo abrir el comprobante";
      showToast({ message, severity: "error" });
    }
  };

  const handleReturn = async () => {
    try {
      await returnSale(Number(saleId), reason);
      showToast({ message: "Devolucion registrada", severity: "success" });
      setSaleId("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["returns-history"] });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error", severity: "error" });
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Devoluciones"
        subtitle="Anulaciones y notas de credito."
        icon={<ReplayIcon color="primary" />}
        chips={[`Registros: ${rows.length}`, `Hora: ${timeZone}`]}
      />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Devolucion / Nota de credito</Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField
            label="ID Venta"
            placeholder="Ej: 12345"
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
            error={saleId.length > 0 && isNaN(Number(saleId))}
            helperText={saleId.length > 0 && isNaN(Number(saleId)) ? "Debe ser numerico" : "Ingrese el ID exacto de la venta"}
          />
          <TextField
            label="Motivo"
            placeholder="Detalle del motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={!reason.trim() && reason.length > 0}
            helperText={!reason.trim() && reason.length > 0 ? "Motivo requerido" : "Max 200 caracteres"}
          />
          <Button variant="contained" onClick={handleReturn} disabled={!saleId || !reason.trim()}>Procesar</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
          <Typography variant="h6">Historial de devoluciones</Typography>
          <TextField
            type="number"
            label="Limite"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 100)}
            size="small"
            sx={{ maxWidth: 140 }}
          />
          <Button variant="outlined" onClick={() => returnsQuery.refetch()} disabled={returnsQuery.isFetching}>
            Refrescar
          </Button>
        </Box>

        {returnsQuery.isFetching ? (
          <Typography variant="body2" color="text.secondary">Cargando devoluciones...</Typography>
        ) : rows.length === 0 ? (
          <EmptyState title="Sin devoluciones" description="Aun no hay registros de devolucion." />
        ) : isCompact ? (
          <CardTable
            rows={rows.map((r) => ({
              key: r.id,
              title: `Devolucion #${r.id}`,
              subtitle: formatDateTimeRegional(r.created_at),
              right: <Typography sx={{ fontWeight: 700 }}>Venta #{r.sale_id}</Typography>,
              fields: [
                {
                  label: "Comprobante",
                  value: r.invoice_number ? (
                    <Link component="button" underline="hover" onClick={() => handleOpenReceipt(r.sale_id)}>
                      {r.invoice_number}
                    </Link>
                  ) : "-",
                },
                {
                  label: "Validacion",
                  value: r.sale_status === "VOID" ? (
                    <Chip label="Validado" color="success" size="small" />
                  ) : (
                    <Chip label="Pendiente" color="warning" size="small" />
                  ),
                },
                { label: "Motivo", value: r.reason || "-" },
              ],
            }))}
          />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Venta</TableCell>
                <TableCell>Comprobante</TableCell>
                <TableCell>Validacion</TableCell>
                <TableCell>Motivo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{formatDateTimeRegional(r.created_at)}</TableCell>
                  <TableCell>{r.sale_id}</TableCell>
                  <TableCell>
                    {r.invoice_number ? (
                      <Link component="button" underline="hover" onClick={() => handleOpenReceipt(r.sale_id)}>
                        {r.invoice_number}
                      </Link>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {r.sale_status === "VOID" ? (
                      <Chip label="Validado" color="success" size="small" />
                    ) : (
                      <Chip label="Pendiente" color="warning" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{r.reason || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default Returns;
