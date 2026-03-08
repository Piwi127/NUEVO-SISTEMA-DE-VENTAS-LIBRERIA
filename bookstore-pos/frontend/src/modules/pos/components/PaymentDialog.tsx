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
  IconButton
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import PaidIcon from '@mui/icons-material/Paid';
import CalculateIcon from '@mui/icons-material/Calculate';
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
  CARD: "Tarjeta de Crédito / Débito",
  TRANSFER: "Transferencia Bancaria",
  YAPE: "Billetera Yape",
  PLIN: "Billetera Plin",
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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isCompact}
      PaperProps={{
        className: "glass-panel",
        sx: {
          backgroundImage: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2.5, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <PaidIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h6" fontWeight="800">Pasarela de Cobro</Typography>
        </Stack>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "rgba(255,255,255,0.7)" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: "8px !important" }}>
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: 1 }}>TOTAL A PAGAR</Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "white", lineHeight: 1 }}>
                {formatMoney(total)}
              </Typography>
            </Box>

            <Box sx={{ height: 1, bgcolor: "rgba(255,255,255,0.1)" }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block", mb: 0.5 }}>INGRESADO</Typography>
                <Typography sx={{ fontWeight: 800, color: "rgba(255,255,255,0.9)", fontSize: "1.1rem" }}>{formatMoney(sum)}</Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block", mb: 0.5 }}>
                  {change > 0 ? "VUELTO A ENTREGAR" : "SALDO PENDIENTE"}
                </Typography>
                <Typography sx={{
                  fontWeight: 900,
                  fontSize: "1.2rem",
                  color: change > 0 ? "#34d399" : remaining > 0 ? "#f87171" : "white"
                }}>
                  {formatMoney(change > 0 ? change : remaining)}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Box>
            <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.8)", mb: 2, fontWeight: 700 }}>
              Distribución del Pago
            </Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
              {methods.map((method) => (
                <TextField
                  key={method}
                  label={getMethodLabel(method)}
                  type="number"
                  variant="outlined"
                  size="medium"
                  value={amounts[method] || 0}
                  onChange={(event) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [method]: event.target.value === "" ? 0 : parseDecimalInput(event.target.value),
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgba(0,0,0,0.15)",
                      color: "white",
                      fontWeight: 700,
                      "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                      "&.Mui-focused fieldset": { borderColor: "primary.main" },
                    },
                    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.6)", fontWeight: 600 },
                    "& .MuiInputLabel-root.Mui-focused": { color: "primary.light" }
                  }}
                />
              ))}
            </Box>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
            {methods.includes("CASH") ? (
              <Button
                variant="outlined"
                startIcon={<CalculateIcon />}
                onClick={handleExact}
                sx={{
                  color: "white",
                  borderColor: "rgba(255,255,255,0.3)",
                  "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" }
                }}
              >
                Autocompletar Efectivo
              </Button>
            ) : <Box />}

            <Typography variant="body2" sx={{
              fontWeight: 700,
              textAlign: { xs: "center", sm: "right" },
              color: valid ? "#34d399" : hasCash ? "rgba(255,255,255,0.6)" : "#f87171"
            }}>
              {valid ? "✓ Balance cubierto. Listo para emitir." : hasCash ? "Falta cubrir el saldo total." : "La suma de los métodos debe ser exacta."}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: { xs: 2.5, sm: 3 }, pt: 1, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {isCompact ? (
          <Stack direction="column" spacing={1.5} sx={{ width: "100%" }}>
            <Button
              onClick={handleConfirm}
              variant="contained"
              size="large"
              disabled={!valid}
              fullWidth
              sx={{ py: 1.5, fontWeight: 800, fontSize: "1.1rem" }}
            >
              Confirmar y Emitir
            </Button>
            <Button onClick={onClose} variant="text" sx={{ color: "rgba(255,255,255,0.7)" }} fullWidth>
              Volver Atrás
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={2} sx={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose} sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, px: 3 }}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              size="large"
              disabled={!valid}
              sx={{ px: 4, fontWeight: 800 }}
            >
              Procesar Pago
            </Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
};
