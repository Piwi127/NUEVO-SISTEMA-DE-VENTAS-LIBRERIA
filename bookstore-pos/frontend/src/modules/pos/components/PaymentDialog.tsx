import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { formatMoney } from "@/app/utils";
import { useSettings } from "@/app/store";
import { parseDecimalInput } from "@/modules/pos/utils/number";
import type { Payment } from "@/modules/pos/types";

type Props = {
  open: boolean;
  total: number;
  methods: string[];
  onClose: () => void;
  onConfirm: (payments: Payment[]) => void;
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  YAPE: "Yape",
  PLIN: "Plin",
};

const getMethodLabel = (method: string) => METHOD_LABELS[method] || method;

export const PaymentDialog: React.FC<Props> = ({ open, total, methods, onClose, onConfirm }) => {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const { compactMode } = useSettings();
  const compact = useMediaQuery("(max-width:900px)");
  const isCompact = compactMode || compact;

  useEffect(() => {
    if (open) {
      const next: Record<string, number> = {};
      methods.forEach((method) => {
        next[method] = amounts[method] ?? 0;
      });
      setAmounts(next);
    }
  }, [open, methods]);

  const sum = useMemo(() => methods.reduce((acc, method) => acc + (amounts[method] || 0), 0), [amounts, methods]);
  const hasCash = methods.includes("CASH");
  const valid = total > 0 && sum > 0 && (hasCash ? sum + 0.0001 >= total : Math.abs(sum - total) < 0.01);
  const change = hasCash ? Math.max(0, sum - total) : 0;
  const remaining = Math.max(0, total - sum);

  const handleConfirm = () => {
    const payments: Payment[] = [];
    methods.forEach((method) => {
      const amount = amounts[method] || 0;
      if (amount > 0) payments.push({ method, amount });
    });
    onConfirm(payments);
  };

  const handleExact = () => {
    if (!methods.includes("CASH")) return;
    const other = methods.reduce((acc, method) => (method === "CASH" ? acc : acc + (amounts[method] || 0)), 0);
    setAmounts((prev) => ({
      ...prev,
      CASH: Math.max(0, total - other),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isCompact}>
      <DialogTitle>Cobrar venta</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Paper
            sx={{
              p: 2,
              background: "linear-gradient(155deg, rgba(18,53,90,0.06) 0%, rgba(18,53,90,0.02) 52%, rgba(154,123,47,0.08) 100%)",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {formatMoney(total)}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">
                  Ingresado
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>{formatMoney(sum)}</Typography>
              </Box>
              <Box sx={{ minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">
                  {change > 0 ? "Vuelto" : "Pendiente"}
                </Typography>
                <Typography sx={{ fontWeight: 800, color: change > 0 ? "success.main" : remaining > 0 ? "error.main" : "text.primary" }}>
                  {formatMoney(change > 0 ? change : remaining)}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Typography variant="body2" color="text.secondary">
            Registra uno o varios medios de pago. Si usas efectivo, puedes completar el faltante automaticamente.
          </Typography>

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
            {methods.map((method) => (
              <TextField
                key={method}
                label={getMethodLabel(method)}
                type="number"
                size={isCompact ? "small" : "medium"}
                value={amounts[method] || 0}
                onChange={(event) =>
                  setAmounts((prev) => ({
                    ...prev,
                    [method]: event.target.value === "" ? 0 : parseDecimalInput(event.target.value),
                  }))
                }
                helperText="Ingresa 0 si no aplica."
              />
            ))}
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            {methods.includes("CASH") ? (
              <Button variant="outlined" onClick={handleExact}>
                Completar efectivo exacto
              </Button>
            ) : null}
          </Stack>

          <Typography color={valid ? "success.main" : "error.main"} sx={{ fontWeight: 700 }}>
            {valid ? "Pago listo para confirmar." : hasCash ? "El monto recibido debe cubrir el total." : "La suma debe coincidir exactamente con el total."}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        {isCompact ? (
          <Stack direction="column" spacing={1} sx={{ width: "100%", px: 2, pb: 2 }}>
            <Button onClick={handleConfirm} variant="contained" disabled={!valid} fullWidth>
              Confirmar cobro
            </Button>
            <Button onClick={onClose} variant="outlined" fullWidth>
              Cancelar
            </Button>
          </Stack>
        ) : (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button onClick={handleConfirm} variant="contained" disabled={!valid}>
              Confirmar cobro
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
