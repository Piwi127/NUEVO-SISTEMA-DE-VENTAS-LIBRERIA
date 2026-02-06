import React, { ChangeEvent, SyntheticEvent } from "react";
import { Alert, Box, Button, Grid, MenuItem, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import { EmptyState, PageHeader } from "@/app/components";
import { detectTimeContext, formatDateTimeRegional } from "@/app/utils";
import { useCashOperations } from "@/modules/pos/hooks";
import { parseDecimalInput } from "@/modules/pos/utils/number";
import type { CashAuditValidation } from "@/modules/shared/types";

export const CashPanel: React.FC = () => {
  const {
    currentCashQuery,
    summaryQuery,
    auditsQuery,
    opening,
    setOpening,
    movementAmount,
    setMovementAmount,
    movementReason,
    setMovementReason,
    movementType,
    setMovementType,
    auditType,
    setAuditType,
    counted,
    setCounted,
    tab,
    setTab,
    canOperate,
    handleOpen,
    handlePrepareCloseZ,
    handleForceClose,
    handleMovement,
    handleAudit,
    handleOpenSessionReport,
    handleDownloadSessionReport,
  } = useCashOperations();

  const { timeZone } = detectTimeContext();
  const cash = currentCashQuery.data;
  const summary = summaryQuery.data;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Caja y arqueos"
        subtitle="Control de apertura, movimientos, arqueos X/Z y reportes de cierre."
        chips={[cash?.is_open ? "Caja abierta" : "Caja cerrada", `Zona horaria: ${timeZone}`]}
      />

      <Paper sx={{ p: 1.5 }}>
        <Tabs value={tab} onChange={(_event: SyntheticEvent, value: number) => setTab(value)}>
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
            {cash?.is_open ? (
              <Box sx={{ mb: 2 }}>
                <Typography>Caja abierta desde: {formatDateTimeRegional(cash.opened_at)}</Typography>
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
                <TextField
                  label="Monto apertura"
                  type="number"
                  value={opening}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setOpening(parseDecimalInput(e.target.value))}
                />
                <Button variant="contained" onClick={handleOpen}>
                  Abrir caja
                </Button>
              </Box>
            )}
          </Paper>

          {cash?.is_open && summary ? (
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
              <TextField select label="Tipo" value={movementType} onChange={(e: ChangeEvent<HTMLInputElement>) => setMovementType(e.target.value)}>
                <MenuItem value="IN">IN</MenuItem>
                <MenuItem value="OUT">OUT</MenuItem>
              </TextField>
              <TextField
                label="Monto"
                type="number"
                value={movementAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMovementAmount(parseDecimalInput(e.target.value))}
              />
              <TextField label="Motivo" value={movementReason} onChange={(e: ChangeEvent<HTMLInputElement>) => setMovementReason(e.target.value)} />
              <Button variant="outlined" onClick={handleMovement} disabled={!canOperate || movementAmount <= 0 || !movementReason.trim()}>
                Registrar
              </Button>
              {!canOperate ? (
                <Typography variant="caption" color="warning.main">
                  Debes abrir caja para registrar movimientos.
                </Typography>
              ) : null}
            </Box>
          </Paper>

          {cash?.is_open ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Arqueo X/Z
              </Typography>
              <Box sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
                <TextField select label="Tipo" value={auditType} onChange={(e: ChangeEvent<HTMLInputElement>) => setAuditType(e.target.value)}>
                  <MenuItem value="X">X (parcial)</MenuItem>
                  <MenuItem value="Z">Z (cierre)</MenuItem>
                </TextField>
                <TextField
                  label="Monto contado"
                  type="number"
                  value={counted}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCounted(parseDecimalInput(e.target.value))}
                />
                <Button variant="contained" onClick={handleAudit} disabled={counted <= 0}>
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
          {auditsQuery.isFetching ? (
            <Typography variant="body2" color="text.secondary">
              Cargando arqueos...
            </Typography>
          ) : auditsQuery.isError ? (
            <EmptyState title="No se pudo cargar" description="Error consultando historial de arqueos." />
          ) : auditsQuery.data && auditsQuery.data.length > 0 ? (
            <Box sx={{ display: "grid", gap: 1.5 }}>
              {auditsQuery.data.map((audit: CashAuditValidation) => (
                <Paper
                  key={audit.id}
                  variant="outlined"
                  sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}
                >
                  <Box>
                    <Typography>
                      {formatDateTimeRegional(audit.created_at)} - {audit.type} - Sesion #{audit.cash_session_id}
                    </Typography>
                    <Typography color="text.secondary">
                      Esperado {audit.expected_amount.toFixed(2)} | Contado {audit.counted_amount.toFixed(2)} | Dif {audit.difference.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => handleOpenSessionReport(audit.cash_session_id)}>
                      Ver documento
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => handleDownloadSessionReport(audit.cash_session_id)}>
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
