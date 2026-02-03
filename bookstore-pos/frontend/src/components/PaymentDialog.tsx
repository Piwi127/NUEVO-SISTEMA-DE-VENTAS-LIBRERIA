import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography } from "@mui/material";
import { formatMoney } from "../utils/money";

export type Payment = { method: string; amount: number };

type Props = {
  open: boolean;
  total: number;
  methods: string[];
  onClose: () => void;
  onConfirm: (payments: Payment[]) => void;
};

export const PaymentDialog: React.FC<Props> = ({ open, total, methods, onClose, onConfirm }) => {
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const next: Record<string, number> = {};
      methods.forEach((m) => {
        next[m] = amounts[m] ?? 0;
      });
      setAmounts(next);
    }
  }, [open, methods]);

  const parseAmount = (raw: string) => {
    const v = raw.replace(",", ".");
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const sum = useMemo(() => methods.reduce((acc, m) => acc + (amounts[m] || 0), 0), [amounts, methods]);
  const cashAmount = amounts["CASH"] || 0;
  const hasCash = methods.includes("CASH");
  const valid = total > 0 && sum > 0 && (hasCash ? sum + 0.0001 >= total : Math.abs(sum - total) < 0.01);
  const change = hasCash ? Math.max(0, sum - total) : 0;

  const handleConfirm = () => {
    const payments: Payment[] = [];
    methods.forEach((m) => {
      const amt = amounts[m] || 0;
      if (amt > 0) payments.push({ method: m, amount: amt });
    });
    onConfirm(payments);
  };

  const handleExact = () => {
    if (!methods.includes("CASH")) return;
    const other = methods.reduce((acc, m) => (m === "CASH" ? acc : acc + (amounts[m] || 0)), 0);
    setAmounts((prev) => ({
      ...prev,
      CASH: Math.max(0, total - other),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Pago</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>Total: {formatMoney(total)}</Typography>
        <Box sx={{ display: "grid", gap: 2 }}>
          {methods.map((m) => (
            <TextField
              key={m}
              label={m}
              type="number"
              value={amounts[m] || 0}
              onChange={(e) =>
                setAmounts((prev) => ({
                  ...prev,
                  [m]: e.target.value === "" ? 0 : parseAmount(e.target.value),
                }))
              }
            />
          ))}
        </Box>
        <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
          {methods.includes("CASH") ? (
            <Button variant="outlined" onClick={handleExact}>
              Pagar exacto
            </Button>
          ) : null}
        </Box>
        <Typography sx={{ mt: 2 }} color={valid ? "success.main" : "error.main"}>
          Suma: {formatMoney(sum)}
        </Typography>
        {valid && change > 0 ? (
          <Typography sx={{ mt: 1 }} color="success.main">
            Vuelto: {formatMoney(change)}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!valid}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
