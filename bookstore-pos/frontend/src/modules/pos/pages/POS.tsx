import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  Fab,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import HistoryIcon from "@mui/icons-material/History";
import TuneIcon from "@mui/icons-material/Tune";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { ConfirmDialog, PageHeader } from "@/app/components";
import { formatMoney } from "@/app/utils";
import {
  selectCanCharge,
  selectCartItemCount,
  selectCustomerLabel,
  selectPaymentMethods,
  useCartStore,
  useSettings,
} from "@/app/store";
import { listActiveProductPromotionRules, listActivePromotions } from "@/modules/catalog/api";
import { listCustomers } from "@/modules/catalog/api";
import { getCurrentCash } from "@/modules/pos/api";
import { calculatePackPricing, calculatePosTotalsSummary } from "@/modules/pos/utils/pricing";
import {
  Cart,
  PaymentDialog,
  ProductSearch,
} from "@/modules/pos/components";
import {
  useHeldCarts,
  usePosCheckout,
  usePosKeyboard,
  usePosPricing,
  usePosWebSocket,
} from "@/modules/pos/hooks";
import type { Payment } from "@/modules/pos/types";

const makeSessionId = () => {
  const cryptoAny = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoAny?.randomUUID) return cryptoAny.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const POS: React.FC = () => {
  const cart = useCartStore();
  const { role } = useAuth();
  const { taxRate, taxIncluded, paymentMethods, compactMode } = useSettings();
  const compact = useMediaQuery("(max-width:900px)");
  const isCompact = compactMode || compact;
  const isCashierMode = role === "cashier";

  const [sessionId] = useState(() => makeSessionId());
  const navigate = useNavigate();

  const cashQuery = useQuery({ queryKey: ["cash-current"], queryFn: getCurrentCash, staleTime: 10_000 });
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers, staleTime: 60_000 });
  const promosQuery = useQuery({ queryKey: ["promotions-active"], queryFn: listActivePromotions, staleTime: 60_000 });
  const packRulesQuery = useQuery({
    queryKey: ["promotion-pack-rules-active"],
    queryFn: () => listActiveProductPromotionRules(),
    staleTime: 60_000,
  });

  const cash = cashQuery.data;
  const customers = customersQuery.data;
  const promos = promosQuery.data;
  const packRules = packRulesQuery.data || [];
  const packPricing = React.useMemo(() => calculatePackPricing(cart.items, packRules), [cart.items, packRules]);
  const totalsSummary = React.useMemo(
    () =>
      calculatePosTotalsSummary({
        grossSubtotal: packPricing.grossSubtotal,
        subtotalAfterPacks: packPricing.subtotalAfterPacks,
        packDiscount: packPricing.packDiscountTotal,
        promotionDiscount: cart.discount,
        taxRate,
        taxIncluded,
      }),
    [packPricing, cart.discount, taxRate, taxIncluded]
  );
  const subtotal = totalsSummary.subtotal;
  const total = totalsSummary.total;
  const tax = totalsSummary.tax;

  const isLoading = cashQuery.isLoading || customersQuery.isLoading || promosQuery.isLoading || packRulesQuery.isLoading;

  const { customerId, setCustomerId, promoId, setPromoId, priceMap } = usePosPricing({
    customers,
    promos,
    subtotal: packPricing.subtotalAfterPacks,
    setCartDiscount: cart.setDiscount,
  });

  const { wsRef } = usePosWebSocket({
    sessionId,
    cartItems: cart.items,
    subtotal,
    tax,
    totalDiscount: totalsSummary.totalDiscount,
    total,
  });

  const { payOpen, setPayOpen, lastSale, clearLastSale, handlePayment, handlePrint, handleEscpos } = usePosCheckout({
    cart,
    cashIsOpen: !!cash?.is_open,
    customerId,
    promoId,
    priceMap,
    totals: { subtotal, tax, discount: totalsSummary.promotionDiscount, total },
    wsRef,
  });

  const itemCount = selectCartItemCount(cart.items);
  const canCharge = selectCanCharge({
    itemCount,
    cashIsOpen: !!cash?.is_open,
    cashLoading: cashQuery.isLoading,
    cashError: !!cashQuery.isError,
  });

  const searchRef = useRef<HTMLInputElement | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cashierOptionsOpen, setCashierOptionsOpen] = useState(false);
  const prevItemCountRef = useRef(0);

  const {
    heldOpen,
    setHeldOpen,
    holdDialogOpen,
    setHoldDialogOpen,
    holdLabel,
    setHoldLabel,
    heldCarts,
    holdCurrentCart,
    handleConfirmHoldCurrentCart,
    restoreHeldCart,
    deleteHeldCart,
  } = useHeldCarts({
    cartItems: cart.items,
    cartDiscount: cart.discount,
    cartTax: cart.tax,
    customerId,
    promoId,
    clearCart: cart.clear,
    setCustomerId: setCustomerId as (id: string | number | "") => void,
    setPromoId: setPromoId as (id: string | number | "") => void,
    replaceCart: cart.replaceCart,
    searchRef,
  });

  usePosKeyboard({
    itemCount,
    searchRef,
    setPayOpen,
  });

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (lastSale) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [lastSale]);

  useEffect(() => {
    if (!isCashierMode && isCompact && itemCount > prevItemCountRef.current && itemCount > 0) {
      setCartOpen(true);
    }
    prevItemCountRef.current = itemCount;
  }, [itemCount, isCompact, isCashierMode]);

  const selectedCustomerName = selectCustomerLabel(customers, customerId);
  const selectedPromo = promos?.find((promo) => promo.id === promoId);
  const promoSummaryLabel = selectedPromo?.name || (totalsSummary.promotionDiscount > 0 ? "Manual" : "Sin promo");
  const primaryActionLabel = cash?.is_open ? "Cobrar / Facturar" : "Abrir Cajón";
  const primaryActionDisabled = cash?.is_open ? !canCharge : cashQuery.isLoading || cashQuery.isError;

  const handleCustomerChange = (value: string) => {
    setCustomerId(value === "" ? "" : Number(value));
  };

  const handlePromoChange = (value: string) => {
    setPromoId(value === "" ? "" : Number(value));
  };

  const handlePrimaryAction = () => {
    if (cash?.is_open) {
      setPayOpen(true);
      return;
    }
    navigate("/cash");
  };

  const handleStartFreshSale = () => {
    clearLastSale();
    cart.clear();
    setCustomerId("");
    setPromoId("");
    setCartOpen(false);
    setCashierOptionsOpen(false);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const renderCheckoutSelectors = (surface: "light" | "dark") => (
    <Grid container spacing={1.5}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          select
          label="Cliente Asociado"
          value={customerId}
          onChange={(event) => handleCustomerChange(String(event.target.value))}
          size={isCashierMode ? "small" : "medium"}
          sx={{
            "& .MuiInputLabel-root": { color: surface === "dark" ? "rgba(255,255,255,0.85)" : undefined },
          }}
        >
          <MenuItem value="">Sin Identificar</MenuItem>
          {(customers || []).map((customer) => (
            <MenuItem key={customer.id} value={customer.id}>
              {customer.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          select
          label="Aplicar Promo"
          value={promoId}
          onChange={(event) => handlePromoChange(String(event.target.value))}
          size={isCashierMode ? "small" : "medium"}
          sx={{
            "& .MuiInputLabel-root": { color: surface === "dark" ? "rgba(255,255,255,0.85)" : undefined },
          }}
        >
          <MenuItem value="">Sin Descuentos Extra</MenuItem>
          {(promos || []).map((promo) => (
            <MenuItem key={promo.id} value={promo.id}>
              {promo.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  );

  const renderCheckoutActions = () => (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={primaryActionDisabled}
        onClick={handlePrimaryAction}
        sx={{
          py: 1.5,
          fontWeight: 800,
          background: "linear-gradient(45deg, #10B981, #059669)",
          boxShadow: primaryActionDisabled ? "none" : "0 8px 16px rgba(16, 185, 129, 0.2)",
          "&:hover": {
            background: "linear-gradient(45deg, #059669, #047857)",
          }
        }}
      >
        {primaryActionLabel}
      </Button>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button fullWidth variant="outlined" startIcon={<PauseCircleIcon />} disabled={itemCount === 0} onClick={holdCurrentCart} color="secondary">
          Guardar Venta
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="secondary"
          startIcon={<PlaylistAddCheckIcon />}
          disabled={heldCarts.length === 0}
          onClick={() => setHeldOpen(true)}
        >
          Recuperar ({heldCarts.length})
        </Button>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button fullWidth variant="outlined" disabled={!lastSale} onClick={handlePrint} color="inherit">
          Ticket Físico
        </Button>
        <Button fullWidth variant="outlined" disabled={!lastSale} onClick={handleEscpos} color="inherit">
          Protocolo ESC/POS
        </Button>
      </Stack>
    </Box>
  );

  const renderCheckoutPanelContent = (surface: "light" | "dark") => {
    const isDark = surface === "dark";

    return (
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="overline" sx={{ color: isDark ? "rgba(255,255,255,0.7)" : "primary.main", fontWeight: 700, letterSpacing: 1.2 }}>
              BOLETA EN CURSO
            </Typography>
            <Typography variant="body2" color={isDark ? "rgba(255,255,255,0.9)" : "text.secondary"}>
              {itemCount > 0 ? `${itemCount} items agregados` : "No hay productos listados"}
              {customerId ? ` | ${selectedCustomerName}` : ""}
              {(promoId || totalsSummary.promotionDiscount > 0) ? ` | ${promoSummaryLabel}` : ""}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Typography variant="caption" color={isDark ? "rgba(255,255,255,0.7)" : "text.secondary"}>
              {cash?.is_open ? "A Pagar (Total)" : "Pendiente"}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: isDark ? "white" : "success.main" }}>
              {formatMoney(total)}
            </Typography>
          </Box>
        </Stack>

        {renderCheckoutSelectors(surface)}

        <Cart packPricingLines={packPricing.linesByProductId} totalsSummary={totalsSummary} tone={surface} minimal />

        {!cashQuery.isLoading && !cash?.is_open ? (
          <Alert
            severity="warning"
            sx={{ mb: 0.25, py: 0.5, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate("/cash")}>
                Ir a Caja
              </Button>
            }
          >
            La caja registradora está cerrada. Inicializa el cajón para emitir cobros.
          </Alert>
        ) : null}

        {renderCheckoutActions()}

        {!canCharge && cash?.is_open ? (
          <Typography variant="caption" color={isDark ? "rgba(255,255,255,0.7)" : "text.secondary"} sx={{ display: 'block', textAlign: 'center' }}>
            Añade productos para habilitar la pasarela de pago.
          </Typography>
        ) : null}
        {canCharge ? (
          <Typography variant="caption" color={isDark ? "#b8f7d4" : "success.main"} fontWeight="600" sx={{ display: 'block', textAlign: 'center' }}>
            ✓ Cajón listo. Presiona [ F4 ] para pagar.
          </Typography>
        ) : null}
      </Stack>
    );
  };

  const lastSaleTimeLabel = lastSale
    ? new Date(lastSale.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
    : "";


  // ============================================
  // LAYOUT DE CAJERO (MODO ESTRECHO / FOCUS ROW)
  // ============================================
  if (isCashierMode) {
    return (
      <Box sx={{ display: "grid", gap: 2 }} className="fade-in">
        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" fontWeight="800">Búsqueda Global</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Utilice el lector de código de barras o ingrese el identificador a mano.
                  </Typography>
                </Box>
                <ProductSearch priceMap={priceMap} inputRef={searchRef} view="panel" minimal splitTabs />
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 }, position: { lg: "sticky" }, top: { lg: 12 } }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "flex-start" }}>
                  <Box>
                    <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1 }}>RESUMEN CHECKOUT</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {itemCount > 0 ? `${itemCount} items en progreso` : "Esperando artículos"}
                      {lastSale && itemCount === 0 ? ` | Previa: ${lastSale.invoiceNumber}` : ""}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="700">SUBTOTAL ESTIMATIVO</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1 }}>{formatMoney(total)}</Typography>
                  </Box>
                </Stack>

                {!cashQuery.isLoading && !cash?.is_open ? (
                  <Alert severity="warning" variant="outlined" sx={{ py: 0.5, borderRadius: 2 }} action={<Button color="inherit" size="small" onClick={() => navigate("/cash")}>Abrir Turno</Button>}>
                    Sesión de caja desactivada.
                  </Alert>
                ) : null}

                <Cart packPricingLines={packPricing.linesByProductId} totalsSummary={totalsSummary} tone="light" minimal />

                <Stack spacing={1.5} mt={2}>
                  <Button fullWidth variant="contained" size="large" disabled={primaryActionDisabled} onClick={handlePrimaryAction} sx={{ py: 1.5, fontWeight: 800 }}>
                    {primaryActionLabel}
                  </Button>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button fullWidth variant="outlined" startIcon={<PauseCircleIcon />} disabled={itemCount === 0} onClick={holdCurrentCart}>
                      Hold
                    </Button>
                    <Button fullWidth variant="outlined" startIcon={<PlaylistAddCheckIcon />} disabled={heldCarts.length === 0} onClick={() => setHeldOpen(true)}>
                      Recargar
                    </Button>
                  </Stack>
                  <Button variant="text" size="small" color="secondary" startIcon={<TuneIcon />} onClick={() => setCashierOptionsOpen((prev) => !prev)}>
                    {cashierOptionsOpen ? "Cerrar Panel Avanzado" : "Ver Panel Avanzado (Descuentos)"}
                  </Button>
                </Stack>

                {cashierOptionsOpen ? (
                  <Paper elevation={0} sx={{ p: 2, bgcolor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: 2 }}>
                    <Stack spacing={2}>
                      {renderCheckoutSelectors("light")}
                      {lastSale ? (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <Button fullWidth variant="outlined" color="primary" startIcon={<RestartAltIcon />} onClick={handleStartFreshSale}>
                            Finalizar Op.
                          </Button>
                          <Button fullWidth variant="outlined" color="secondary" onClick={handlePrint}>Re-Imprimir</Button>
                          <Button fullWidth variant="outlined" color="secondary" onClick={handleEscpos}>POS DLL</Button>
                        </Stack>
                      ) : null}
                      {lastSale ? (
                        <Button variant="contained" color="secondary" startIcon={<HistoryIcon />} onClick={() => navigate("/sales-history")}>
                          Historial de Turno
                        </Button>
                      ) : null}
                    </Stack>
                  </Paper>
                ) : null}

                {lastSale && itemCount === 0 ? (
                  <Typography variant="caption" color="success.main" textAlign="center" sx={{ display: 'block', mt: 1 }}>
                    Operación {lastSale.invoiceNumber} exitosa ({lastSaleTimeLabel}).  Inicia un nuevo escaneo para facturar.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // ============================================
  // LAYOUT ADMINISTRATIVO (COMPLETO)
  // ============================================
  return (
    <Box sx={{ display: "grid", gap: 2 }} className="fade-in">
      <PageHeader
        title="Terminal Point of Sale"
        subtitle="Módulo de recaudación y facturación simultánea."
        loading={isLoading}
      />

      {lastSale && itemCount === 0 ? (
        <Paper className="glass-panel" sx={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)", borderColor: "rgba(16, 185, 129, 0.2)" }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="h6" fontWeight="800" color="success.main">
                  Venta Confirmada — Ticket Nro. {lastSale.invoiceNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valor Recaudado: {formatMoney(lastSale.total)} | Marca temporal: {lastSaleTimeLabel}
                </Typography>
              </Box>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button variant="contained" color="success" size="large" startIcon={<RestartAltIcon />} onClick={handleStartFreshSale}>
                Limpiar Buffer & Continuar
              </Button>
              <Button variant="outlined" color="success" onClick={handlePrint}>
                Emitir Duplicado
              </Button>
              <Button variant="outlined" color="success" onClick={handleEscpos}>
                Exportar Binario ESC/POS
              </Button>
              <Button variant="text" color="success" startIcon={<HistoryIcon />} onClick={() => navigate("/sales-history")}>
                Explorar Trazabilidad
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight="800">Terminal de Ingreso de Ítems</Typography>
                <Typography variant="body2" color="text.secondary">
                  Utilice el lector infrarrojo directamente o busque digitando la referencia en el espacio inferior.
                </Typography>
              </Box>
              <ProductSearch priceMap={priceMap} inputRef={searchRef} view="panel" minimal />
            </Stack>
          </Paper>
        </Grid>

        {!isCompact ? (
          <Grid item xs={12} lg={5}>
            <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 }, position: "sticky", top: 12 }}>
              {renderCheckoutPanelContent("light")}
            </Paper>
          </Grid>
        ) : null}
      </Grid>

      <PaymentDialog
        open={payOpen}
        total={total}
        methods={selectPaymentMethods(paymentMethods)}
        onClose={() => setPayOpen(false)}
        onConfirm={(payments: Payment[]) => handlePayment(payments)}
      />

      <ConfirmDialog
        open={holdDialogOpen}
        title="Suspender Venta (Hold)"
        description="El documento quedará guardado temporalmente en la memoria del navegador. Asígnele un nombre para facilitar su posterior identificación."
        content={
          <TextField
            autoFocus fullWidth variant="outlined"
            label="Identificador de la suspensión"
            value={holdLabel}
            onChange={(event) => setHoldLabel(event.target.value)}
            placeholder="E.j. Cliente Juan P."
          />
        }
        onCancel={() => { setHoldDialogOpen(false); setHoldLabel(""); }}
        onConfirm={handleConfirmHoldCurrentCart}
        confirmText="Confirmar Suspensión"
      />

      {!isCashierMode && isCompact ? (
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setCartOpen(true)}
          sx={{ position: "fixed", right: 24, bottom: 24, zIndex: (theme) => theme.zIndex.drawer + 1, boxShadow: 6 }}
        >
          <Badge badgeContent={itemCount} color="error" sx={{ mr: 1.5 }}>
            <ReceiptLongIcon />
          </Badge>
          Completar ({formatMoney(total)})
        </Fab>
      ) : null}

      {!isCashierMode ? (
        <Drawer
          anchor="right"
          open={isCompact ? cartOpen : false}
          onClose={() => setCartOpen(false)}
          PaperProps={{
            sx: {
              bgcolor: "rgba(15, 23, 42, 0.95)",
              color: "#ffffff",
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            },
          }}
        >
          <Box
            sx={{
              width: { xs: "100vw", sm: 500 },
              maxWidth: "100vw",
              p: 3,
              "& .MuiTypography-root": { color: "#ffffff" },
              "& .MuiTableCell-root": { color: "#ffffff", borderColor: "rgba(255,255,255,0.1)" },
              "& .MuiInputBase-input": { color: "#ffffff" },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
              "& .MuiSvgIcon-root": { color: "#ffffff" },
              "& .MuiButton-text": { color: "#ffffff" },
              "& .MuiButton-outlined": { borderColor: "rgba(255,255,255,0.3)", color: "white" },
            }}
          >
            {renderCheckoutPanelContent("dark")}
          </Box>
        </Drawer>
      ) : null}

      <Dialog open={heldOpen} onClose={() => setHeldOpen(false)} fullWidth maxWidth="sm" PaperProps={{ className: "glass-panel" }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Manejo de Operaciones Suspendidas</DialogTitle>
        <DialogContent>
          {heldCarts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              La cola se encuentra vacía.
            </Typography>
          ) : (
            <List>
              {heldCarts.map((held) => (
                <ListItemButton key={held.id} onClick={() => restoreHeldCart(held)} sx={{ border: "1px solid var(--border-subtle)", borderRadius: 2, mb: 1 }}>
                  <ListItemText
                    primary={<Typography fontWeight="700">{held.label}</Typography>}
                    secondary={<Typography variant="caption" color="text.secondary">{`${new Date(held.created_at || held.create_at || "").toLocaleString("es-PE")} | ${held.items.length} articulos | Neto: ${formatMoney(held.items.reduce((acc, item) => acc + item.price * item.qty, 0))}`}</Typography>}
                  />
                  <Button size="small" variant="outlined" color="error" onClick={(event) => { event.stopPropagation(); deleteHeldCart(held.id); }}>
                    Descartar
                  </Button>
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default POS;
