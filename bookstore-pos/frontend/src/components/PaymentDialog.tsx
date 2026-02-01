import React, { useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography } from "@mui/material";
import { formatMoney } from "../utils/money";

export type Payment = { method: "CASH" | "CARD" | "TRANSFER"; amount: number };

type Props = {
  open: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (payments: Payment[]) => void;
};

export const PaymentDialog: React.FC<Props> = ({ open, total, onClose, onConfirm }) => {
  const [cash, setCash] = useState(0);
  const [card, setCard] = useState(0);
  const [transfer, setTransfer] = useState(0);

  const parseAmount = (raw: string) => {
    const v = raw.replace(",", ".");
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const sum = useMemo(() => cash + card + transfer, [cash, card, transfer]);
  const nonCash = card + transfer;
  const valid =
    total > 0 &&
    sum > 0 &&
    (nonCash > 0 ? Math.abs(sum - total) < 0.01 : sum + 0.0001 >= total);
  const change = Math.max(0, sum - total);

  const handleConfirm = () => {
    const payments: Payment[] = [];
    if (cash > 0) payments.push({ method: "CASH", amount: cash });
    if (card > 0) payments.push({ method: "CARD", amount: card });
    if (transfer > 0) payments.push({ method: "TRANSFER", amount: transfer });
    onConfirm(payments);
  };

  const handleExact = () => {
    setCash(total);
    setCard(0);
    setTransfer(0);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Pago</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>Total: {formatMoney(total)}</Typography>
        <Box sx={{ display: "grid", gap: 2 }}>
          <TextField
            label="Efectivo"
            type="number"
            value={cash}
            onChange={(e) => setCash(e.target.value === "" ? 0 : parseAmount(e.target.value))}
          />
          <TextField
            label="Tarjeta"
            type="number"
            value={card}
            onChange={(e) => setCard(e.target.value === "" ? 0 : parseAmount(e.target.value))}
          />
          <TextField
            label="Transferencia"
            type="number"
            value={transfer}
            onChange={(e) => setTransfer(e.target.value === "" ? 0 : parseAmount(e.target.value))}
          />
        </Box>
        <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
          <Button variant="outlined" onClick={handleExact}>
            Pagar exacto
          </Button>
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
