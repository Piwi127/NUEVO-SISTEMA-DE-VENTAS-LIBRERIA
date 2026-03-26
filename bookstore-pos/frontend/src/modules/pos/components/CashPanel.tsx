import React, { ChangeEvent, SyntheticEvent } from "react";
import { Alert, Box, Button, Chip, Grid, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { EmptyState, PageHeader } from "@/app/components";
import { detectTimeContext, formatDateTimeRegional, formatMoney } from "@/app/utils";
import { useCashOperations } from "@/modules/pos/hooks";
import { parseDecimalInput } from "@/modules/pos/utils/number";
import type { CashAuditValidation } from "@/modules/shared/types";

// Componente de panel de caja
// Maneja operaciones de apertura, cierre, arqueo y validación de caja
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import DownloadIcon from '@mui/icons-material/Download';
import AssignmentIcon from '@mui/icons-material/Assignment';

const surfaceSx = {
  p: { xs: 2.5, md: 3 },
  borderRadius: 4,
  background: "rgba(255,255,255,0.85)",
  border: "1px solid var(--border-subtle)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

const panelLabelSx = {
  display: "block",
  color: "primary.main",
  letterSpacing: 1.5,
  textTransform: "uppercase",
  fontWeight: 800,
  mb: 0.5,
};

const metaChipSx = {
  background: "linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.6) 100%)",
  color: "#334155",
  border: "1px solid rgba(255,255,255,0.4)",
  fontWeight: 700,
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
};

const statTileSx = {
  p: 2,
  borderRadius: 3,
  background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(248,250,252,0.6) 100%)",
  border: "1px solid rgba(226, 232, 240, 0.8)",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)"
  }
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: "rgba(255,255,255,0.6)",
    "&:hover fieldset": { borderColor: "primary.main" },
  }
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

  const cashStatusChip = currentCashQuery.isLoading ? "Sincronizando..." : cash?.is_open ? "SESIÓN ACTIVA" : "CAJA CERRADA";
  const isOpen = Boolean(cash?.is_open);

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <PageHeader
        title="Gestión de Caja"
        subtitle="Centro de control para aperturas, arqueos X/Z, inyecciones de liquidez y cierres."
        icon={<PointOfSaleIcon color="primary" sx={{ fontSize: 32 }} />}
        chips={[]}
      />

      <Paper className="glass-panel" sx={{ p: 1, borderRadius: 4 }}>
        <Tabs
          value={tab}
          onChange={(_event: SyntheticEvent, value: number) => setTab(value)}
          sx={{
            minHeight: "auto",
            "& .MuiTabs-indicator": { display: "none" },
            "& .MuiTabs-flexContainer": { gap: 1 },
          }}
        >
          <Tab
            label="Centro de Operaciones"
            icon={<PointOfSaleIcon fontSize="small" />}
            iconPosition="start"
            sx={{
              minHeight: 44,
              px: { xs: 2, md: 3 },
              borderRadius: 3,
              fontWeight: 800,
              color: tab === 0 ? "white" : "text.secondary",
              bgcolor: tab === 0 ? "primary.main" : "transparent",
              transition: "all 0.3s ease",
              "&.Mui-selected": { color: "white" }
            }}
          />
          <Tab
            label="Historial y Arqueos"
            icon={<AssignmentIcon fontSize="small" />}
            iconPosition="start"
            sx={{
              minHeight: 44,
              px: { xs: 2, md: 3 },
              borderRadius: 3,
              fontWeight: 800,
              color: tab === 1 ? "white" : "text.secondary",
              bgcolor: tab === 1 ? "primary.main" : "transparent",
              transition: "all 0.3s ease",
              "&.Mui-selected": { color: "white" }
            }}
          />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Box sx={{ display: "grid", gap: 3 }}>
          <Paper className="glass-panel" sx={surfaceSx}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between" alignItems={{ lg: "flex-start" }}>
                <Box sx={{ minWidth: 0, maxWidth: 800 }}>
                  <Typography variant="caption" sx={panelLabelSx}>
                    Estado del Turno
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
                    {isOpen ? <LockOpenIcon color="success" /> : <LockIcon color="error" />}
                    Sesión de Caja Físico
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6, fontWeight: 500 }}>
                    {currentCashQuery.isLoading
                      ? "Verificando conexión con transacciones locales..."
                      : currentCashQuery.isError
                        ? "Hemos perdido la comunicación con el módulo de caja. Reintente."
                        : isOpen
                          ? `Tu turno empezó a las ${formatDateTimeRegional(cash!.opened_at)}. Todo ingreso y retiro afectará esta sesión.`
                          : "Actualmente no existen turnos de caja en progreso. Introduce el saldo inicial para comenzar a facturar."}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip
                    label={cashStatusChip}
                    sx={{ ...metaChipSx, bgcolor: isOpen ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)", color: isOpen ? "#059669" : "#e11d48", borderColor: isOpen ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)" }}
                  />
                  <Chip label={`TZ: ${timeZone}`} sx={metaChipSx} />
                </Stack>
              </Stack>

              {currentCashQuery.isLoading ? (
                <Typography color="text.secondary" fontWeight="600">Procesando disponibilidad...</Typography>
              ) : currentCashQuery.isError ? (
                <Alert
                  severity="error"
                  variant="outlined"
                  sx={{ borderRadius: 3 }}
                  action={<Button variant="contained" color="error" size="small" onClick={() => currentCashQuery.refetch()}>Reintentar Conexión</Button>}
                >
                  Fallo crítico. No se pudo cargar el bloque de caja.
                </Alert>
              ) : isOpen ? (
                <Stack spacing={2}>
                  <Alert severity="info" sx={{ borderRadius: 2, bgcolor: "rgba(14, 165, 233, 0.1)", color: "#0369a1", '& .MuiAlert-icon': { color: "#0ea5e9" } }}>
                    El recuento de liquidez es obligatorio antes del cierre (Arqueo Z).
                  </Alert>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button variant="contained" size="large" sx={{ bgcolor: "#f59e0b", '&:hover': { bgcolor: "#d97706" }, fontWeight: 800 }} onClick={handlePrepareCloseZ} disabled={!summary}>
                      Inicia Cierre de Jornada (Z)
                    </Button>
                    <Button variant="outlined" size="large" color="error" onClick={handleForceClose} sx={{ fontWeight: 800 }}>
                      Forzar Cierre de Emergencia
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ p: 2.5, bgcolor: "rgba(255,255,255,0.6)", borderRadius: 3, border: "1px dashed var(--border-subtle)" }}>
                  <TextField
                    label="Declaración de base mínima en billetes/monedas"
                    placeholder="0.00"
                    type="number"
                    value={opening}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setOpening(parseDecimalInput(e.target.value))}
                    fullWidth
                    sx={inputSx}
                    InputProps={{ startAdornment: <Typography fontWeight="800" color="text.secondary" sx={{ mr: 1 }}>$</Typography> }}
                  />
                  <Button variant="contained" size="large" onClick={handleOpen} sx={{ width: { xs: "100%", md: "240px" }, height: 56, fontWeight: 900, borderRadius: 2, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}>
                    Autorizar Apertura
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>

          {isOpen && summary ? (
            <Paper className="glass-panel" sx={surfaceSx}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" sx={panelLabelSx}>
                    Dashboards Financieros
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
                    <ReceiptLongIcon color="primary" /> Balance Operativo de la Sesión
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Paper sx={statTileSx}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" display="block" mb={0.5}>
                        Base de Inicio
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.5rem", color: "#334155" }}>{formatMoney(summary.opening_amount)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Paper sx={statTileSx}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" display="block" mb={0.5}>
                        Ingresos Extra
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.5rem", color: "success.main" }}>{formatMoney(summary.movements_in)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Paper sx={statTileSx}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" display="block" mb={0.5}>
                        Extracciones / Gastos
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.5rem", color: "error.main" }}>{formatMoney(summary.movements_out)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} lg={3}>
                    <Paper sx={statTileSx}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" display="block" mb={0.5}>
                        Total Facturado (Efectivo)
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.5rem", color: "primary.main" }}>{formatMoney(summary.sales_cash)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2.5, borderRadius: 3, background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                      <Typography variant="caption" fontWeight="800" color="#059669" display="flex" alignItems="center" gap={0.5} mb={0.5}>
                        CUADRE DEL SISTEMA (EFECTIVO ESPERADO)
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "2rem", color: "#064e3b" }}>{formatMoney(summary.expected_amount)}</Typography>
                      <Typography variant="caption" sx={{ color: "#047857", fontWeight: 600, display: "block", mt: 0.5 }}>
                        Este valor es la suma de: Base + Ingresos Extra + Ventas Efectivo - Retiros.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Stack>
            </Paper>
          ) : null}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: isOpen ? "repeat(2, 1fr)" : "1fr" }, gap: 3 }}>
            <Paper className="glass-panel" sx={{ ...surfaceSx, height: '100%' }}>
              <Stack spacing={2.5} sx={{ height: '100%' }}>
                <Box>
                  <Typography variant="caption" sx={panelLabelSx}>
                    Libro Banco Interactivo
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
                    <SyncAltIcon color="primary" /> Asiento de Caja Libre
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField select label="Sentido Contable" value={movementType} onChange={(e: ChangeEvent<HTMLInputElement>) => setMovementType(e.target.value)} sx={{ ...inputSx, minWidth: 160 }}>
                      <MenuItem value="IN">Entrada (IN)</MenuItem>
                      <MenuItem value="OUT">Salida (OUT)</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      label="Volumen a trasladar"
                      type="number"
                      value={movementAmount}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setMovementAmount(parseDecimalInput(e.target.value))}
                      sx={inputSx}
                      InputProps={{ startAdornment: <Typography fontWeight="800" color="text.secondary" sx={{ mr: 1 }}>$</Typography> }}
                    />
                  </Stack>
                  <TextField label="Causa u Origen del movimiento (Obligatorio)" value={movementReason} onChange={(e: ChangeEvent<HTMLInputElement>) => setMovementReason(e.target.value)} sx={inputSx} multiline minRows={2} />

                  <Box sx={{ mt: "auto", pt: 1 }}>
                    <Button variant="contained" size="large" fullWidth onClick={handleMovement} disabled={!canOperate || movementAmount <= 0 || !movementReason.trim()} sx={{ fontWeight: 800, height: 48 }}>
                      Grabar en la Sesión
                    </Button>
                    {!canOperate ? (
                      <Typography variant="caption" color="warning.main" fontWeight="600" display="block" textAlign="center" mt={1}>
                        Operativa bloqueada: se requiere que el POS abra la jornada.
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              </Stack>
            </Paper>

            {isOpen ? (
              <Paper className="glass-panel" sx={{ ...surfaceSx, height: '100%' }}>
                <Stack spacing={2.5} sx={{ height: '100%' }}>
                  <Box>
                    <Typography variant="caption" sx={panelLabelSx}>
                      Punto de Auditoría
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
                      <AssignmentIcon color="primary" /> Generar Arqueo (X / Z)
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1 }}>

                    <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                      El Arqueo X es referencial. El Arqueo Z bloquea transacciones preparándose para cerrar sesión.
                    </Alert>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
                      <TextField select label="Modelo de Auditoría" value={auditType} onChange={(e: ChangeEvent<HTMLInputElement>) => setAuditType(e.target.value)} sx={{ ...inputSx, minWidth: 200 }}>
                        <MenuItem value="X">Arqueo Parcial (X)</MenuItem>
                        <MenuItem value="Z">Arqueo Finalizador (Z)</MenuItem>
                      </TextField>
                      <TextField
                        fullWidth
                        label="Conteo Total de Billetaje Local"
                        type="number"
                        value={counted}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setCounted(parseDecimalInput(e.target.value))}
                        sx={inputSx}
                        InputProps={{ startAdornment: <Typography fontWeight="800" color="text.secondary" sx={{ mr: 1 }}>$</Typography> }}
                      />
                    </Stack>

                    <Box sx={{ mt: "auto", pt: 1 }}>
                      <Button variant="contained" color={auditType === 'Z' ? 'warning' : 'primary'} size="large" fullWidth onClick={handleAudit} disabled={counted <= 0} sx={{ fontWeight: 800, height: 48 }}>
                        Fijar y Emitir Documento {auditType}
                      </Button>
                    </Box>
                  </Box>
                </Stack>
              </Paper>
            ) : null}
          </Box>
        </Box>
      ) : null}

      {tab === 1 ? (
        <Paper className="glass-panel" sx={surfaceSx}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="caption" sx={panelLabelSx}>
                Histórico Operativo
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1, color: "#1e293b" }}>
                <AssignmentIcon color="primary" /> Memoria de Arqueos e Informes
              </Typography>
            </Box>

            {auditsQuery.isFetching ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="primary" fontWeight="700">Explorando base de datos...</Typography>
              </Box>
            ) : auditsQuery.isError ? (
              <EmptyState title="Corte de Enlace" description="Nuestros sistemas fallaron en contactar el archivo historico." />
            ) : auditsQuery.data && auditsQuery.data.length > 0 ? (
              <Box sx={{ display: "grid", gap: 2 }}>
                {auditsQuery.data.map((audit: CashAuditValidation) => (
                  <Paper
                    key={audit.id}
                    sx={{
                      p: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      flexWrap: "wrap",
                      bgcolor: "rgba(255,255,255,0.7)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(18,53,90,0.08)",
                      borderRadius: 3,
                      boxShadow: "0 4px 6px rgba(0,0,0,0.02)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": { transform: "translateY(-2px)", boxShadow: "0 10px 15px rgba(0,0,0,0.05)" }
                    }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 260 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Chip
                          label={`Arqueo ${audit.type}`}
                          size="small"
                          color={audit.type === 'Z' ? 'secondary' : 'primary'}
                          sx={{ fontWeight: 800 }}
                        />
                        <Typography sx={{ fontWeight: 800, color: "#1e293b", fontSize: "1.05rem" }}>
                          Sesion de Caja #{audit.cash_session_id}
                        </Typography>
                      </Stack>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 2 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight="600">
                          <Box component="span" sx={{ color: "text.primary", display: "inline-block", mr: 0.5 }}>Fecha:</Box> {formatDateTimeRegional(audit.created_at)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight="600">
                          <Box component="span" sx={{ color: "text.primary", display: "inline-block", mr: 0.5 }}>Digital:</Box> {formatMoney(audit.expected_amount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight="600">
                          <Box component="span" sx={{ color: "text.primary", display: "inline-block", mr: 0.5 }}>Físico:</Box> {formatMoney(audit.counted_amount)}
                        </Typography>
                        {audit.difference !== 0 ? (
                          <Typography variant="body2" fontWeight="800" color={audit.difference > 0 ? "success.main" : "error.main"}>
                            Dif: {audit.difference > 0 ? "+" : ""}{formatMoney(audit.difference)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" fontWeight="800" color="success.main">
                            ★ Cuadre Exacto
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexShrink={0}>
                      <Button size="small" variant="outlined" startIcon={<ReceiptLongIcon />} onClick={() => handleOpenSessionReport(audit.cash_session_id)} sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Visualizar
                      </Button>
                      <Button size="small" variant="contained" color="primary" startIcon={<DownloadIcon />} onClick={() => handleDownloadSessionReport(audit.cash_session_id)} sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Archivo PDF
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            ) : (
              <EmptyState title="Vacío Histórico" description="El control de tesorería aún no capta reportes definitivos de operaciones pasadas." />
            )}
          </Stack>
        </Paper>
      ) : null}
    </Box>
  );
};
