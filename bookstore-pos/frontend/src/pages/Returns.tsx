import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, Stack, Chip } from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
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
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <ReplayIcon color="primary" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Devoluciones
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Anulaciones y notas de credito.
              </Typography>
            </Box>
          </Stack>
          <Chip label="Revision requerida" size="small" sx={{ ml: { md: "auto" } }} />
        </Stack>
      </Paper>

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
    </Box>
  );
};

export default Returns;
