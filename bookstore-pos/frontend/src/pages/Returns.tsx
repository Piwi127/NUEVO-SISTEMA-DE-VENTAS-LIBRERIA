import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { returnSale } from "../api/returns";
import { useToast } from "../components/ToastProvider";

const Returns: React.FC = () => {
  const { showToast } = useToast();
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");

  const handleReturn = async () => {
    try {
      await returnSale(Number(saleId), reason);
      showToast({ message: "Devolucion registrada", severity: "success" });
      setSaleId("");
      setReason("");
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error", severity: "error" });
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Devolucion / Nota de credito</Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField label="ID Venta" value={saleId} onChange={(e) => setSaleId(e.target.value)} />
          <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button variant="contained" onClick={handleReturn}>Procesar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Returns;
