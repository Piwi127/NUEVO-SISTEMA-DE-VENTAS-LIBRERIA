import React, { useState } from "react";
import { Alert, Box, Button, Grid, MenuItem, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCashAudit,
  createCashMovement,
  downloadCashSessionReport,
  forceCloseCash,
  getCashSessionReport,
  getCashSummary,
  getCurrentCash,
  listCashAudits,
  openCash,
} from "../api";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { useToast } from "../../../components/ToastProvider";
import { detectTimeContext, formatDateTimeRegional } from "../../../utils/datetime";
import { CashSessionReport } from "../../shared/types";

export const CashPanel: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ["cash-current"], queryFn: getCurrentCash });
  const { data: summary } = useQuery({ queryKey: ["cash-summary"], queryFn: getCashSummary, enabled: !!data?.is_open });
  const { data: audits, isFetching: loadingAudits, isError: errorAudits } = useQuery({ queryKey: ["cash-audits"], queryFn: listCashAudits });

  const [opening, setOpening] = useState(0);
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementReason, setMovementReason] = useState("");
  const [movementType, setMovementType] = useState("IN");
  const [auditType, setAuditType] = useState("X");
  const [counted, setCounted] = useState(0);
  const [tab, setTab] = useState(0);

  const { timeZone } = detectTimeContext();

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

  const handlePrepareCloseZ = () => {
    setAuditType("Z");
    setCounted(summary?.expected_amount || 0);
    showToast({ message: "Preparado cierre Z. Confirma el monto contado y registra el arqueo.", severity: "info" });
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

  const openReportWindow = (report: CashSessionReport) => {
    const popup = window.open("", "_blank", "width=900,height=780");
    if (!popup) {
      showToast({ message: "Permite ventanas emergentes para ver el reporte", severity: "warning" });
      return;
    }

    const movementsRows = report.movements.length
      ? report.movements
          .map(
            (m) => `<tr>
              <td>${formatDateTimeRegional(m.created_at)}</td>
              <td>${m.type}</td>
              <td style="text-align:right">${m.amount.toFixed(2)}</td>
              <td>${m.reason}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="4">Sin movimientos</td></tr>`;

    const auditsRows = report.audits.length
      ? report.audits
          .map(
            (a) => `<tr>
              <td>${formatDateTimeRegional(a.created_at)}</td>
              <td>${a.type}</td>
              <td style="text-align:right">${a.expected_amount.toFixed(2)}</td>
              <td style="text-align:right">${a.counted_amount.toFixed(2)}</td>
              <td style="text-align:right">${a.difference.toFixed(2)}</td>
              <td>${a.validated ? "OK" : "DIF"}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="6">Sin arqueos</td></tr>`;

    const notes = report.validation.notes.length
      ? `<ul>${report.validation.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`
      : "<div>Sin observaciones.</div>";

    popup.document.write(`
      <html>
      <head>
        <title>Reporte Caja #${report.session.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
          h2, h3 { margin: 0 0 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px; font-size: 13px; }
          th { background: #f4f6f8; text-align: left; }
          .grid { display: grid; gap: 4px; margin-bottom: 10px; }
          .strong { font-weight: 700; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h2>Reporte de Caja - Sesion #${report.session.id}</h2>
        <div class="grid">
          <div>Usuario: ${report.session.user_id}</div>
          <div>Apertura: ${formatDateTimeRegional(report.period_start)}</div>
          <div>Cierre: ${formatDateTimeRegional(report.period_end)}</div>
          <div>Estado: ${report.session.is_open ? "ABIERTA" : "CERRADA"}</div>
        </div>
        <h3>Resumen</h3>
        <table>
          <tr><th>Apertura</th><td>${report.summary.opening_amount.toFixed(2)}</td></tr>
          <tr><th>Movimientos IN</th><td>${report.summary.movements_in.toFixed(2)}</td></tr>
          <tr><th>Movimientos OUT</th><td>${report.summary.movements_out.toFixed(2)}</td></tr>
          <tr><th>Ventas efectivo</th><td>${report.summary.sales_cash.toFixed(2)}</td></tr>
          <tr><th>Esperado final</th><td class="strong">${report.summary.expected_amount.toFixed(2)}</td></tr>
        </table>
        <h3>Movimientos</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Motivo</th></tr></thead>
          <tbody>${movementsRows}</tbody>
        </table>
        <h3>Arqueos</h3>
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Esperado</th><th>Contado</th><th>Diferencia</th><th>Estado</th></tr></thead>
          <tbody>${auditsRows}</tbody>
        </table>
        <h3>Validacion</h3>
        <div>Movimientos contabilizados: ${report.validation.movement_count}</div>
        <div>Arqueos registrados: ${report.validation.audit_count}</div>
        <div>Balance final validado: <strong>${report.validation.is_balanced ? "SI" : "NO"}</strong></div>
        ${notes}
        <button onclick="window.print()">Imprimir</button>
      </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
  };

  const handleOpenSessionReport = async (cashSessionId: number) => {
    try {
      const report = await getCashSessionReport(cashSessionId);
      openReportWindow(report);
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "No se pudo abrir el reporte", severity: "error" });
    }
  };

  const handleDownloadSessionReport = async (cashSessionId: number) => {
    try {
      const blob = await downloadCashSessionReport(cashSessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cash_session_${cashSessionId}_report.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "No se pudo descargar el reporte", severity: "error" });
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Caja y arqueos"
        subtitle="Control de apertura, movimientos, arqueos X/Z y reportes de cierre."
        chips={[data?.is_open ? "Caja abierta" : "Caja cerrada", `Zona horaria: ${timeZone}`]}
      />

      <Paper sx={{ p: 1.5 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Operacion" />
          <Tab label="Historial" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Estado de Caja
            </Typography>
            {data?.is_open ? (
              <Box sx={{ mb: 2 }}>
                <Typography>Caja abierta desde: {formatDateTimeRegional(data.opened_at)}</Typography>
                <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
                  Para cerrar caja debes registrar un arqueo tipo Z.
                </Alert>
                <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                  <Button variant="contained" color="warning" onClick={handlePrepareCloseZ} disabled={!summary}>
                    Preparar cierre Z
                  </Button>
                  <Button variant="outlined" color="error" onClick={handleForceClose}>
                    Forzar cierre
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
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
        </>
      ) : null}

      {tab === 1 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Historial de arqueos
          </Typography>
          {loadingAudits ? (
            <Typography variant="body2" color="text.secondary">
              Cargando arqueos...
            </Typography>
          ) : errorAudits ? (
            <EmptyState title="No se pudo cargar" description="Error consultando historial de arqueos." />
          ) : audits && audits.length > 0 ? (
            <Box sx={{ display: "grid", gap: 1.5 }}>
              {audits.map((a) => (
                <Paper
                  key={a.id}
                  variant="outlined"
                  sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}
                >
                  <Box>
                    <Typography>
                      {formatDateTimeRegional(a.created_at)} - {a.type} - Sesion #{a.cash_session_id}
                    </Typography>
                    <Typography color="text.secondary">
                      Esperado {a.expected_amount.toFixed(2)} | Contado {a.counted_amount.toFixed(2)} | Dif {a.difference.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => handleOpenSessionReport(a.cash_session_id)}>
                      Ver documento
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => handleDownloadSessionReport(a.cash_session_id)}>
                      Descargar
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <EmptyState title="Sin arqueos" description="No hay arqueos registrados para mostrar." />
          )}
        </Paper>
      ) : null}
    </Box>
  );
};
