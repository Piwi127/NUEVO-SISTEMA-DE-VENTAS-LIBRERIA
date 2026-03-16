import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
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
import { listActiveProductPromotionRules, listActivePromotions, listCustomers } from "@/modules/catalog/api";
import { getCurrentCash } from "@/modules/pos/api";
import { calculatePackPricing, calculatePosTotalsSummary } from "@/modules/pos/utils/pricing";
import { Cart, PaymentDialog, ProductSearch } from "@/modules/pos/components";
import { useHeldCarts, usePosCheckout, usePosKeyboard, usePosPricing, usePosWebSocket } from "@/modules/pos/hooks";

const makeSessionId = () => {
  const cryptoAny = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoAny?.randomUUID) return cryptoAny.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const panelSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 4,
  border: "1px solid rgba(19,41,61,0.08)",
  boxShadow: "0 18px 32px rgba(19,41,61,0.08)",
};

const POS: React.FC = () => {
  const cart = useCartStore();
  const { role } = useAuth();
  const { taxRate, taxIncluded, paymentMethods, compactMode } = useSettings();
  const compact = useMediaQuery("(max-width:900px)");
  const isCompact = compactMode || compact;
  const isCashierMode = role === "cashier";

  const [sessionId] = useState(() => makeSessionId());
  const [cartOpen, setCartOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const prevItemCountRef = useRef(0);

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
  const isLoading = cashQuery.isLoading || customersQuery.isLoading || promosQuery.isLoading || packRulesQuery.isLoading;

  const packPricing = useMemo(() => calculatePackPricing(cart.items, packRules), [cart.items, packRules]);
  const totalsSummary = useMemo(
    () =>
      calculatePosTotalsSummary({
        grossSubtotal: packPricing.grossSubtotal,
        subtotalAfterPacks: packPricing.subtotalAfterPacks,
        packDiscount: packPricing.packDiscountTotal,
        promotionDiscount: cart.discount,
        taxRate,
        taxIncluded,
      }),
    [cart.discount, packPricing, taxIncluded, taxRate]
  );

  const { customerId, setCustomerId, promoId, setPromoId, priceMap } = usePosPricing({
    customers,
    promos,
    subtotal: packPricing.subtotalAfterPacks,
    setCartDiscount: cart.setDiscount,
  });

  const selectedCustomer = customers?.find((customer) => customer.id === customerId);
  const availableLoyaltyPoints = Math.max(0, Number(selectedCustomer?.loyalty_points || 0));
  const loyaltyPointValue = 0.05;
  const loyaltyMinRedeemPoints = 50;
  const safeRedeemPoints = customerId ? Math.min(Math.max(0, Math.floor(redeemPoints)), availableLoyaltyPoints) : 0;
  const loyaltyDiscountPreview = safeRedeemPoints >= loyaltyMinRedeemPoints ? safeRedeemPoints * loyaltyPointValue : 0;
  const adjustedTotalsSummary = useMemo(
    () => ({
      ...totalsSummary,
      promotionDiscount: totalsSummary.promotionDiscount + loyaltyDiscountPreview,
      totalDiscount: totalsSummary.totalDiscount + loyaltyDiscountPreview,
      total: Math.max(0, totalsSummary.total - loyaltyDiscountPreview),
    }),
    [loyaltyDiscountPreview, totalsSummary]
  );

  const subtotal = adjustedTotalsSummary.subtotal;
  const tax = adjustedTotalsSummary.tax;
  const total = adjustedTotalsSummary.total;

  const { wsRef } = usePosWebSocket({
    sessionId,
    cartItems: cart.items,
    subtotal,
    tax,
    totalDiscount: adjustedTotalsSummary.totalDiscount,
    total,
  });

  const { payOpen, setPayOpen, lastSale, clearLastSale, handlePayment, handlePrint, handlePdf, handleEscpos } = usePosCheckout({
    cart,
    cashIsOpen: !!cash?.is_open,
    customerId,
    promoId,
    redeemPoints: safeRedeemPoints,
    priceMap,
    totals: { subtotal, tax, discount: adjustedTotalsSummary.promotionDiscount, total },
    wsRef,
  });

  const itemCount = selectCartItemCount(cart.items);
  const canCharge = selectCanCharge({
    itemCount,
    cashIsOpen: !!cash?.is_open,
    cashLoading: cashQuery.isLoading,
    cashError: !!cashQuery.isError,
  });

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
    if (isCompact && itemCount > prevItemCountRef.current && itemCount > 0) {
      setCartOpen(true);
    }
    prevItemCountRef.current = itemCount;
  }, [isCompact, itemCount]);

  const selectedCustomerName = selectCustomerLabel(customers, customerId);
  const selectedPromo = promos?.find((promo) => promo.id === promoId);
  const promoSummaryLabel =
    selectedPromo?.name || (adjustedTotalsSummary.promotionDiscount > 0 ? "Descuento aplicado" : "Sin promocion");
  const primaryActionLabel = cash?.is_open ? "Cobrar venta" : "Abrir caja";
  const primaryActionDisabled = cash?.is_open ? !canCharge : cashQuery.isLoading || cashQuery.isError;
  const saleComplete = !!lastSale && itemCount === 0;
  const lastSaleTimeLabel = lastSale
    ? new Date(lastSale.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
    : "";

  const handleCustomerChange = (value: string) => {
    setCustomerId(value === "" ? "" : Number(value));
    setRedeemPoints(0);
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
    setRedeemPoints(0);
    setCartOpen(false);
    setDetailsOpen(false);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const renderCheckoutSelectors = () => (
    <Grid container spacing={1.25}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          select
          label="Cliente"
          value={customerId}
          onChange={(event) => handleCustomerChange(String(event.target.value))}
          helperText="Opcional. Asocia la venta a un cliente."
        >
          <MenuItem value="">Venta sin cliente</MenuItem>
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
          label="Promocion"
          value={promoId}
          onChange={(event) => handlePromoChange(String(event.target.value))}
          helperText="Opcional. Aplica un descuento adicional."
        >
          <MenuItem value="">Sin promocion</MenuItem>
          {(promos || []).map((promo) => (
            <MenuItem key={promo.id} value={promo.id}>
              {promo.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          type="number"
          label="Canjear puntos"
          value={safeRedeemPoints}
          onChange={(event) => setRedeemPoints(Math.max(0, Math.floor(Number(event.target.value || 0))))}
          disabled={!customerId}
          inputProps={{ min: 0, max: availableLoyaltyPoints, step: 1 }}
          helperText={
            customerId
              ? `Disponibles: ${availableLoyaltyPoints}. Minimo: ${loyaltyMinRedeemPoints}. Descuento estimado: ${formatMoney(loyaltyDiscountPreview)}`
              : "Selecciona un cliente para usar puntos."
          }
        />
      </Grid>
    </Grid>
  );

  const renderLastSaleActions = () =>
    lastSale ? (
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Documentos de la ultima venta
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button fullWidth variant="outlined" onClick={handlePrint}>
            Imprimir ticket
          </Button>
          <Button fullWidth variant="outlined" onClick={handlePdf}>
            Descargar PDF
          </Button>
          <Button fullWidth variant="outlined" onClick={handleEscpos}>
            Exportar ESC/POS
          </Button>
        </Stack>
      </Stack>
    ) : null;

  const renderCheckoutPanel = () => (
    <Stack spacing={2}>
      <Paper sx={panelSx}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 1.1, color: "secondary.main" }}>
              Paso 2
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 800 }}>
              Revisar la compra
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
              Verifica productos, cantidades y total antes de cobrar.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip label={`${itemCount} item${itemCount === 1 ? "" : "s"}`} size="small" />
              {customerId ? <Chip label={selectedCustomerName} size="small" color="secondary" variant="outlined" /> : null}
              {(promoId || adjustedTotalsSummary.promotionDiscount > 0) ? (
                <Chip label={promoSummaryLabel} size="small" variant="outlined" />
              ) : null}
            </Stack>

            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Total actual
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main", lineHeight: 1.05 }}>
                {formatMoney(total)}
              </Typography>
            </Box>
          </Stack>

          <Cart packPricingLines={packPricing.linesByProductId} totalsSummary={adjustedTotalsSummary} tone="light" minimal />
        </Stack>
      </Paper>

      <Paper sx={panelSx}>
        <Stack spacing={1.6}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 1.1, color: "primary.main" }}>
              Paso 3
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 800 }}>
              Cobrar o guardar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
              Finaliza la venta o guardala para retomarla despues.
            </Typography>
          </Box>

          {!cashQuery.isLoading && !cash?.is_open ? (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={() => navigate("/cash")}>
                  Ir a caja
                </Button>
              }
            >
              La caja esta cerrada. Abrela antes de cobrar.
            </Alert>
          ) : null}

          <Button fullWidth variant="contained" disabled={primaryActionDisabled} onClick={handlePrimaryAction} sx={{ minHeight: 54 }}>
            {primaryActionLabel}
          </Button>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button fullWidth variant="outlined" startIcon={<PauseCircleIcon />} disabled={itemCount === 0} onClick={holdCurrentCart}>
              Guardar venta
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PlaylistAddCheckIcon />}
              disabled={heldCarts.length === 0}
              onClick={() => setHeldOpen(true)}
            >
              Recuperar ({heldCarts.length})
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              fullWidth
              variant="text"
              color="secondary"
              startIcon={<TuneIcon />}
              onClick={() => setDetailsOpen((current) => !current)}
            >
              {detailsOpen ? "Ocultar opciones extra" : "Ver cliente, promo y otras opciones"}
            </Button>
            <Button
              fullWidth
              variant="text"
              color="secondary"
              startIcon={<RestartAltIcon />}
              disabled={itemCount === 0 && !lastSale}
              onClick={handleStartFreshSale}
            >
              Nueva venta
            </Button>
          </Stack>

          <Collapse in={detailsOpen} timeout={180}>
            <Stack spacing={2} sx={{ pt: 0.5 }}>
              {renderCheckoutSelectors()}
              {renderLastSaleActions()}
              {lastSale ? (
                <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => navigate("/sales-history")}>
                  Ver historial de ventas
                </Button>
              ) : null}
            </Stack>
          </Collapse>

          {!canCharge && cash?.is_open ? (
            <Typography variant="caption" color="text.secondary">
              Agrega productos para habilitar el cobro.
            </Typography>
          ) : null}
          {canCharge ? (
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
              Todo listo. Puedes usar la tecla F4 para cobrar.
            </Typography>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <Box sx={{ display: "grid", gap: 2 }} className="fade-in">
      <PageHeader
        title="Punto de venta"
        subtitle="Trabaja en 3 pasos: busca el producto, revisa la compra y cobra de forma sencilla."
        loading={isLoading}
        chips={[
          cash?.is_open ? "Caja abierta" : "Caja cerrada",
          `${heldCarts.length} venta${heldCarts.length === 1 ? "" : "s"} guardada${heldCarts.length === 1 ? "" : "s"}`,
          isCashierMode ? "Modo caja" : "Modo supervision",
        ]}
      />

      {saleComplete ? (
        <Paper
          sx={{
            ...panelSx,
            background: "linear-gradient(135deg, rgba(22,163,74,0.1) 0%, rgba(255,255,255,0.98) 100%)",
            borderColor: "rgba(22,163,74,0.18)",
          }}
        >
          <Stack spacing={1.25}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "success.main" }}>
              Venta realizada con exito
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ticket {lastSale?.invoiceNumber} registrado a las {lastSaleTimeLabel}. Total cobrado: {lastSale ? formatMoney(lastSale.total) : formatMoney(0)}.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" color="success" startIcon={<RestartAltIcon />} onClick={handleStartFreshSale}>
                Empezar nueva venta
              </Button>
              <Button variant="outlined" color="success" onClick={handlePrint}>
                Imprimir ticket
              </Button>
              <Button variant="outlined" color="success" onClick={handlePdf}>
                Descargar PDF
              </Button>
              <Button variant="text" color="success" startIcon={<HistoryIcon />} onClick={() => navigate("/sales-history")}>
                Ver historial
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper sx={panelSx}>
            <Stack spacing={1.75}>
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: 1.1, color: "warning.main" }}>
                  Paso 1
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 800 }}>
                  Buscar productos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                  Usa el lector de codigo de barras o escribe nombre, SKU, ISBN o categoria.
                </Typography>
              </Box>

              <ProductSearch priceMap={priceMap} inputRef={searchRef} view="panel" minimal={isCashierMode} />
            </Stack>
          </Paper>
        </Grid>

        {!isCompact ? (
          <Grid item xs={12} lg={5}>
            <Box sx={{ position: "sticky", top: 12 }}>{renderCheckoutPanel()}</Box>
          </Grid>
        ) : null}
      </Grid>

      <PaymentDialog
        open={payOpen}
        total={total}
        methods={selectPaymentMethods(paymentMethods)}
        onClose={() => setPayOpen(false)}
        onConfirm={(payload) => handlePayment(payload)}
        customerName={selectedCustomer?.name || ""}
        customerTaxId={selectedCustomer?.tax_id || ""}
      />

      <ConfirmDialog
        open={holdDialogOpen}
        title="Guardar venta temporalmente"
        description="La venta se guardara en este navegador para retomarla despues. Escribe un nombre facil de reconocer."
        content={
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            label="Nombre de referencia"
            value={holdLabel}
            onChange={(event) => setHoldLabel(event.target.value)}
            placeholder="Ej. Cliente Juan"
          />
        }
        onCancel={() => {
          setHoldDialogOpen(false);
          setHoldLabel("");
        }}
        onConfirm={handleConfirmHoldCurrentCart}
        confirmText="Guardar venta"
      />

      {isCompact ? (
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setCartOpen(true)}
          sx={{ position: "fixed", right: 20, bottom: 20, zIndex: (theme) => theme.zIndex.drawer + 1, boxShadow: 6 }}
        >
          <Badge badgeContent={itemCount} color="error" sx={{ mr: 1.25 }}>
            <ReceiptLongIcon />
          </Badge>
          Ver compra ({formatMoney(total)})
        </Fab>
      ) : null}

      <Drawer
        anchor="right"
        open={isCompact ? cartOpen : false}
        onClose={() => setCartOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 520 },
            maxWidth: "100vw",
            bgcolor: "rgba(252,250,246,0.98)",
            borderLeft: "1px solid rgba(19,41,61,0.1)",
          },
        }}
      >
        <Box sx={{ p: 2 }}>{renderCheckoutPanel()}</Box>
      </Drawer>

      <Dialog open={heldOpen} onClose={() => setHeldOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Ventas guardadas</DialogTitle>
        <DialogContent>
          {heldCarts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay ventas guardadas por ahora.
            </Typography>
          ) : (
            <List>
              {heldCarts.map((held) => (
                <ListItemButton
                  key={held.id}
                  onClick={() => restoreHeldCart(held)}
                  sx={{ border: "1px solid rgba(19,41,61,0.1)", borderRadius: 2.5, mb: 1 }}
                >
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 800 }}>{held.label}</Typography>}
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {`${new Date(held.created_at || "").toLocaleString("es-PE")} | ${held.items.length} item${held.items.length === 1 ? "" : "s"} | Total: ${formatMoney(
                          held.items.reduce((acc, item) => acc + item.price * item.qty, 0)
                        )}`}
                      </Typography>
                    }
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteHeldCart(held.id);
                    }}
                  >
                    Eliminar
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
