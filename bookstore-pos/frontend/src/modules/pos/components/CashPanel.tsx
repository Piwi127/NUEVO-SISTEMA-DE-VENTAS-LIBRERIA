import React, { ChangeEvent, SyntheticEvent } from "react";
import { Alert, Box, Button, Chip, Grid, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { EmptyState, PageHeader } from "@/app/components";
import { detectTimeContext, formatDateTimeRegional } from "@/app/utils";
import { useCashOperations } from "@/modules/pos/hooks";
import { parseDecimalInput } from "@/modules/pos/utils/number";
import type { CashAuditValidation } from "@/modules/shared/types";

const surfaceSx = {
  p: { xs: 1.5, md: 1.75 },
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(18,53,90,0.08)",
  boxShadow: "0 10px 24px rgba(12,31,51,0.05)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const panelLabelSx = {
  display: "block",
  color: "text.secondary",
  letterSpacing: 1.1,
  textTransform: "uppercase",
  mb: 0.45,
};

const metaChipSx = {
  bgcolor: "rgba(18,53,90,0.05)",
  color: "text.primary",
  border: "1px solid rgba(18,53,90,0.08)",
};

const statTileSx = {
  p: 1.15,
  borderRadius: 3,
  bgcolor: "rgba(18,53,90,0.04)",
  border: "1px solid rgba(18,53,90,0.08)",
  boxShadow: "none",
};

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
  const cashStatusChip = currentCashQuery.isLoading ? "Cargando caja..." : cash?.is_open ? "Caja abierta" : "Caja cerrada";

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Caja y arqueos"
        subtitle="Control de apertura, movimientos, arqueos X/Z y reportes de cierre."
        chips={[cashStatusChip, `Zona horaria: ${timeZone}`]}
      />

      <Paper sx={surfaceSx}>
        <Tabs
          value={tab}
          onChange={(_event: SyntheticEvent, value: number) => setTab(value)}
          sx={{
            minHeight: "auto",
            "& .MuiTabs-indicator": { display: "none" },
            "& .MuiTabs-flexContainer": { gap: 0.75 },
          }}
        >
          <Tab
            label="Operacion"
            sx={{
              minHeight: 36,
              px: 1.5,
              py: 0.6,
              borderRadius: 999,
              minWidth: 0,
              border: tab === 0 ? "1px solid rgba(18,53,90,0.12)" : "1px solid rgba(18,53,90,0.06)",
              bgcolor: tab === 0 ? "rgba(18,53,90,0.08)" : "transparent",
            }}
          />
          <Tab
            label="Historial"
            sx={{
              minHeight: 36,
              px: 1.5,
              py: 0.6,
              borderRadius: 999,
              minWidth: 0,
              border: tab === 1 ? "1px solid rgba(18,53,90,0.12)" : "1px solid rgba(18,53,90,0.06)",
              bgcolor: tab === 1 ? "rgba(18,53,90,0.08)" : "transparent",
            }}
          />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <>
          <Paper sx={surfaceSx}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25} justifyContent="space-between" alignItems={{ lg: "flex-start" }}>
                <Box sx={{ minWidth: 0, maxWidth: 760 }}>
                  <Typography variant="caption" sx={panelLabelSx}>
                    Estado operativo
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Estado de caja
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.65 }}>
                    {currentCashQuery.isLoading
                      ? "Verificando si la sesion de caja esta disponible para operar."
                      : currentCashQuery.isError
                        ? "No se pudo consultar el estado actual de caja."
                        : cash?.is_open
                          ? `Caja abierta desde ${formatDateTimeRegional(cash.opened_at)}.`
                          : "No hay una caja abierta. Debes abrir caja para poder registrar cobros y movimientos."}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={cashStatusChip} sx={metaChipSx} />
                  <Chip size="small" label={`Zona ${timeZone}`} sx={metaChipSx} />
                </Stack>
              </Stack>

              {currentCashQuery.isLoading ? (
                <Typography color="text.secondary">Cargando estado de caja...</Typography>
              ) : currentCashQuery.isError ? (
                <Alert
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={() => currentCashQuery.refetch()}>
                      Reintentar
                    </Button>
                  }
                >
                  No se pudo cargar el estado de caja.
                </Alert>
              ) : cash?.is_open ? (
                <Stack spacing={1.25}>
                  <Alert severity="warning" sx={{ py: 0 }}>
                    Para cerrar caja debes registrar un arqueo tipo Z.
                  </Alert>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button variant="contained" color="warning" onClick={handlePrepareCloseZ} disabled={!summary}>
                      Preparar cierre Z
                    </Button>
                    <Button variant="outlined" color="error" onClick={handleForceClose}>
                      Forzar cierre
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "center" }}>
                  <TextField
                    label="Monto apertura"
                    type="number"
                    value={opening}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setOpening(parseDecimalInput(e.target.value))}
                    fullWidth
                  />
                  <Button variant="contained" onClick={handleOpen} sx={{ width: { xs: "100%", md: "auto" } }}>
                    Abrir caja
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>

          {cash?.is_open && summary ? (
            <Paper sx={surfaceSx}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" sx={panelLabelSx}>
                    Resumen financiero
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Resumen de caja
                  </Typography>
                </Box>
                <Grid container spacing={1.25}>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Paper sx={statTileSx}>
                      <Typography variant="caption" color="text.secondary">
                        Apertura
                      </Typography>
                      <Typography sx={{ fontWeight: 800, mt: 0.35 }}>{summary.opening_amount.toFixed(2)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Paper sx={statTileSx}>
                      <Typography variant="caption" color="text.secondary">
                        Ingresos
                      </Typography>
                      <Typography sx={{ fontWeight: 800, mt: 0.35 }}>{summary.movements_in.toFixed(2)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Paper sx={statTileSx}>
                      <Typography variant="caption" color="text.secondary">
                        Retiros
                      </Typography>
                      <Typography sx={{ fontWeight: 800, mt: 0.35 }}>{summary.movements_out.toFixed(2)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Paper sx={statTileSx}>
                      <Typography variant="caption" color="text.secondary">
                        Ventas efectivo
                      </Typography>
                      <Typography sx={{ fontWeight: 800, mt: 0.35 }}>{summary.sales_cash.toFixed(2)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper sx={{ ...statTileSx, bgcolor: "rgba(18,53,90,0.07)" }}>
                      <Typography variant="caption" color="text.secondary">
                        Esperado al cierre
                      </Typography>
                      <Typography sx={{ fontWeight: 900, mt: 0.35, fontSize: 18 }}>{summary.expected_amount.toFixed(2)}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Stack>
            </Paper>
          ) : null}

          <Paper sx={surfaceSx}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" sx={panelLabelSx}>
                  Operacion manual
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Movimiento
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gap: 2, width: "100%", maxWidth: 460 }}>
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
            </Stack>
          </Paper>

          {cash?.is_open ? (
            <Paper sx={surfaceSx}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" sx={panelLabelSx}>
                    Validacion de cierre
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Arqueo X/Z
                  </Typography>
                </Box>
                <Box sx={{ display: "grid", gap: 2, width: "100%", maxWidth: 460 }}>
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
              </Stack>
            </Paper>
          ) : null}
        </>
      ) : null}

      {tab === 1 ? (
        <Paper sx={surfaceSx}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="caption" sx={panelLabelSx}>
                Seguimiento de sesiones
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Historial de arqueos
              </Typography>
            </Box>
            {auditsQuery.isFetching ? (
              <Typography variant="body2" color="text.secondary">
                Cargando arqueos...
              </Typography>
            ) : auditsQuery.isError ? (
              <EmptyState title="No se pudo cargar" description="Error consultando historial de arqueos." />
            ) : auditsQuery.data && auditsQuery.data.length > 0 ? (
              <Box sx={{ display: "grid", gap: 1.25 }}>
                {auditsQuery.data.map((audit: CashAuditValidation) => (
                  <Paper
                    key={audit.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      flexWrap: "wrap",
                      bgcolor: "rgba(248,250,252,0.82)",
                      border: "1px solid rgba(18,53,90,0.08)",
                      boxShadow: "none",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>
                        {formatDateTimeRegional(audit.created_at)} - {audit.type} - Sesion #{audit.cash_session_id}
                      </Typography>
                      <Typography color="text.secondary">
                        Esperado {audit.expected_amount.toFixed(2)} | Contado {audit.counted_amount.toFixed(2)} | Dif {audit.difference.toFixed(2)}
                      </Typography>
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button size="small" variant="outlined" onClick={() => handleOpenSessionReport(audit.cash_session_id)}>
                        Ver documento
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => handleDownloadSessionReport(audit.cash_session_id)}>
                        Descargar
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            ) : (
              <EmptyState title="Sin arqueos" description="No hay arqueos registrados para mostrar." />
            )}
          </Stack>
        </Paper>
      ) : null}
    </Box>
  );
};

