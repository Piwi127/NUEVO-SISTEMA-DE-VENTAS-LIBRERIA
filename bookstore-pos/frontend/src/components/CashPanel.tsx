import React, { useState } from "react";
import { Box, Button, TextField, Typography, Paper, Grid, MenuItem } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCashMovement,
  getCurrentCash,
  openCash,
  closeCash,
  getCashSummary,
  createCashAudit,
  listCashAudits,
  forceCloseCash,
} from "../api/cash";
import { useToast } from "./ToastProvider";

export const CashPanel: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ["cash-current"], queryFn: getCurrentCash });
  const { data: summary } = useQuery({ queryKey: ["cash-summary"], queryFn: getCashSummary, enabled: !!data?.is_open });
  const { data: audits } = useQuery({ queryKey: ["cash-audits"], queryFn: listCashAudits });
  const [opening, setOpening] = useState(0);
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementReason, setMovementReason] = useState("");
  const [movementType, setMovementType] = useState("IN");
  const [auditType, setAuditType] = useState("X");
  const [counted, setCounted] = useState(0);

  const parseAmount = (raw: string) => {
    const v = raw.replace(",", ".");
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const handleOpen = async () => {
    try {
      await openCash(opening);
      showToast({ message: "Caja abierta", severity: "success" });
      qc.invalidateQueries({ queryKey: ["cash-current"] });
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error abriendo caja", severity: "error" });
    }
  };

  const handleClose = async () => {
    try {
      await closeCash();
      showToast({ message: "Caja cerrada", severity: "success" });
      qc.invalidateQueries({ queryKey: ["cash-current"] });
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error cerrando caja", severity: "error" });
    }
  };

  const handleForceClose = async () => {
    try {
      await forceCloseCash();
      showToast({ message: "Caja forzada a cerrar", severity: "success" });
      qc.invalidateQueries({ queryKey: ["cash-current"] });
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error forzando cierre", severity: "error" });
    }
  };

  const handleMovement = async () => {
    try {
      await createCashMovement({ type: movementType, amount: movementAmount, reason: movementReason });
      showToast({ message: "Movimiento registrado", severity: "success" });
      setMovementAmount(0);
      setMovementReason("");
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error registrando movimiento", severity: "error" });
    }
  };

  const handleAudit = async () => {
    try {
      await createCashAudit({ type: auditType, counted_amount: counted });
      showToast({ message: "Arqueo registrado", severity: "success" });
      qc.invalidateQueries({ queryKey: ["cash-audits"] });
      qc.invalidateQueries({ queryKey: ["cash-current"] });
      qc.invalidateQueries({ queryKey: ["cash-summary"] });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error en arqueo", severity: "error" });
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Estado de Caja
        </Typography>
        {data?.is_open ? (
          <Box sx={{ mb: 2 }}>
            <Typography>Caja abierta desde: {data.opened_at}</Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <Button variant="contained" color="error" onClick={handleClose}>
                Cerrar caja
              </Button>
              <Button variant="outlined" color="error" onClick={handleForceClose}>
                Forzar cierre
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField label="Monto apertura" type="number" value={opening} onChange={(e) => setOpening(parseAmount(e.target.value))} />
            <Button variant="contained" onClick={handleOpen}>
              Abrir caja
            </Button>
          </Box>
        )}
      </Paper>

      {data?.is_open && summary ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Resumen de Caja
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography>Apertura: {summary.opening_amount.toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography>Ingresos: {summary.movements_in.toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography>Retiros: {summary.movements_out.toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography>Ventas efectivo: {summary.sales_cash.toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography sx={{ fontWeight: 700 }}>Esperado: {summary.expected_amount.toFixed(2)}</Typography>
            </Grid>
          </Grid>
        </Paper>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Movimiento
        </Typography>
        <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
          <TextField select label="Tipo" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
            <MenuItem value="IN">IN</MenuItem>
            <MenuItem value="OUT">OUT</MenuItem>
          </TextField>
          <TextField label="Monto" type="number" value={movementAmount} onChange={(e) => setMovementAmount(parseAmount(e.target.value))} />
          <TextField label="Motivo" value={movementReason} onChange={(e) => setMovementReason(e.target.value)} />
          <Button variant="outlined" onClick={handleMovement}>
            Registrar
          </Button>
        </Box>
      </Paper>

      {data?.is_open ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Arqueo X/Z
          </Typography>
          <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
            <TextField select label="Tipo" value={auditType} onChange={(e) => setAuditType(e.target.value)}>
              <MenuItem value="X">X (parcial)</MenuItem>
              <MenuItem value="Z">Z (cierre)</MenuItem>
            </TextField>
            <TextField label="Monto contado" type="number" value={counted} onChange={(e) => setCounted(parseAmount(e.target.value))} />
            <Button variant="contained" onClick={handleAudit}>
              Registrar arqueo
            </Button>
          </Box>
        </Paper>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Historial de arqueos
        </Typography>
        <Box sx={{ display: "grid", gap: 1 }}>
          {(audits || []).map((a) => (
            <Box key={a.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <Typography>
                {a.created_at} • {a.type}
              </Typography>
              <Typography>
                Esperado {a.expected_amount.toFixed(2)} | Contado {a.counted_amount.toFixed(2)} | Dif {a.difference.toFixed(2)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};
