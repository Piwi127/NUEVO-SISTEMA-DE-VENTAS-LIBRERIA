import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
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
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import HistoryIcon from "@mui/icons-material/History";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, PageHeader, useToast } from "@/app/components";
import { formatMoney } from "@/app/utils";
import {
  type CartItem,
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
import { getWsBaseUrl } from "@/modules/shared/api/runtime";
import { Cart, PaymentDialog, ProductSearch } from "@/modules/pos/components";
import { usePosCheckout, usePosPricing } from "@/modules/pos/hooks";
import type { Payment } from "@/modules/pos/types";

const wsBase = getWsBaseUrl();
const HELD_CARTS_KEY = "pos-held-carts-v1";
const MAX_HELD_CARTS = 20;

type HeldCart = {
  id: string;
  label: string;
  created_at: string;
  customer_id: number | null;
  promo_id: number | null;
  discount: number;
  tax: number;
  items: CartItem[];
};

const makeSessionId = () => {
  const cryptoAny = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoAny?.randomUUID) return cryptoAny.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getSuggestedHeldCartLabel = () =>
  `Pedido ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;

const POS: React.FC = () => {
  const cart = useCartStore();
  const { taxRate, taxIncluded, paymentMethods, compactMode } = useSettings();
  const { showToast } = useToast();
  const compact = useMediaQuery("(max-width:900px)");
  const isCompact = compactMode || compact;

  const [sessionId] = useState(() => makeSessionId());
  const wsRef = useRef<WebSocket | null>(null);
  const latestDisplayPayloadRef = useRef<string>("");
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
  const [heldOpen, setHeldOpen] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [holdLabel, setHoldLabel] = useState("");
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const prevItemCountRef = useRef(0);

  const persistHeldCarts = (next: HeldCart[]) => {
    setHeldCarts(next);
    try {
      window.localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures on restricted browsers
    }
  };

  const loadHeldCarts = () => {
    try {
      const raw = window.localStorage.getItem(HELD_CARTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HeldCart[];
      if (Array.isArray(parsed)) {
        setHeldCarts(parsed.filter((cartItem) => cartItem && typeof cartItem.id === "string" && Array.isArray(cartItem.items)));
      }
    } catch {
      // ignore malformed data
    }
  };

  const holdCurrentCart = () => {
    if (!cart.items.length) {
      showToast({ message: "No hay items para guardar en espera", severity: "warning" });
      return;
    }
    setHoldLabel(getSuggestedHeldCartLabel());
    setHoldDialogOpen(true);
  };

  const handleConfirmHoldCurrentCart = () => {
    if (!cart.items.length) {
      setHoldDialogOpen(false);
      setHoldLabel("");
      showToast({ message: "No hay items para guardar en espera", severity: "warning" });
      return;
    }
    const label = holdLabel.trim() || getSuggestedHeldCartLabel();
    const nextHold: HeldCart = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      created_at: new Date().toISOString(),
      customer_id: customerId ? Number(customerId) : null,
      promo_id: promoId ? Number(promoId) : null,
      discount: Number(cart.discount || 0),
      tax: Number(cart.tax || 0),
      items: cart.items.map((item) => ({ ...item })),
    };
    persistHeldCarts([nextHold, ...heldCarts].slice(0, MAX_HELD_CARTS));
    cart.clear();
    setCustomerId("");
    setPromoId("");
    setHoldDialogOpen(false);
    setHoldLabel("");
    showToast({ message: `Venta guardada en espera: ${label}`, severity: "success" });
  };

  const restoreHeldCart = (held: HeldCart) => {
    cart.replaceCart({ items: held.items, discount: held.discount, tax: held.tax });
    setCustomerId(held.customer_id ?? "");
    setPromoId(held.promo_id ?? "");
    persistHeldCarts(heldCarts.filter((item) => item.id !== held.id));
    setHeldOpen(false);
    showToast({ message: `Venta recuperada: ${held.label}`, severity: "success" });
  };

  const deleteHeldCart = (heldId: string) => {
    persistHeldCarts(heldCarts.filter((item) => item.id !== heldId));
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      const ws = new WebSocket(`${wsBase}/ws/display/${sessionId}`);
      wsRef.current = ws;
      ws.onopen = () => {
        if (latestDisplayPayloadRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(latestDisplayPayloadRef.current);
        }
      };
      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      };
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        ws.close(1000, "cleanup");
      }
    };
  }, [sessionId]);

  useEffect(() => {
    const payload = JSON.stringify({
      type: "CART_UPDATE",
      items: cart.items,
      totals: { subtotal, tax, discount: totalsSummary.totalDiscount, total },
    });
    latestDisplayPayloadRef.current = payload;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }, [cart.items, subtotal, tax, total, totalsSummary.totalDiscount]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "F4") {
        event.preventDefault();
        if (itemCount > 0) setPayOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [itemCount, setPayOpen]);

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
  }, [itemCount, isCompact]);

  useEffect(() => {
    loadHeldCarts();
  }, []);

  const selectedCustomerName = selectCustomerLabel(customers, customerId);
  const selectedPromo = promos?.find((promo) => promo.id === promoId);
  const primaryActionLabel = cash?.is_open ? "Cobrar" : "Abrir caja";
  const primaryActionDisabled = cash?.is_open ? !canCharge : cashQuery.isLoading || cashQuery.isError;

  const statusTitle = cashQuery.isLoading
    ? "Verificando estado de caja"
    : cashQuery.isError
      ? "No se pudo validar el estado de caja"
      : cash?.is_open
        ? "Caja abierta y lista para cobrar"
        : "Caja cerrada";

  const statusDescription = cashQuery.isError
    ? "Revisa la conexion con el servicio de caja antes de procesar cobros."
    : cash?.is_open
      ? lastSale && itemCount === 0
        ? "La ultima venta ya fue registrada. Puedes imprimir el ticket o iniciar una nueva venta de inmediato."
        : itemCount > 0
          ? "La venta ya esta en curso. Ajusta cliente o promocion si aplica y pasa a cobro."
          : "Busca o escanea un producto para comenzar una venta nueva."
      : "Abre caja antes de cobrar. Puedes seguir armando el carrito mientras tanto.";

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
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const summaryCards = [
    { label: "Items", value: String(itemCount), accent: false },
    { label: "Cliente", value: selectedCustomerName, accent: false },
    { label: "Promo", value: selectedPromo?.name || (totalsSummary.promotionDiscount > 0 ? "Manual" : "Sin promo"), accent: false },
    { label: "Total", value: formatMoney(total), accent: true },
  ];

  const renderCheckoutSelectors = (surface: "light" | "dark") => (
    <Grid container spacing={1.5}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          select
          label="Cliente"
          value={customerId}
          onChange={(event) => handleCustomerChange(String(event.target.value))}
          sx={{
            "& .MuiInputLabel-root": { color: surface === "dark" ? "rgba(255,255,255,0.85)" : undefined },
          }}
        >
          <MenuItem value="">Sin cliente</MenuItem>
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
          sx={{
            "& .MuiInputLabel-root": { color: surface === "dark" ? "rgba(255,255,255,0.85)" : undefined },
          }}
        >
          <MenuItem value="">Sin promo</MenuItem>
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
    <Box sx={{ display: "grid", gap: 1.25 }}>
      <Button fullWidth variant="outlined" startIcon={<PauseCircleIcon />} disabled={itemCount === 0} onClick={holdCurrentCart}>
        Guardar en espera
      </Button>
      <Button
        fullWidth
        variant="outlined"
        startIcon={<PlaylistAddCheckIcon />}
        disabled={heldCarts.length === 0}
        onClick={() => setHeldOpen(true)}
      >
        Recuperar en espera ({heldCarts.length})
      </Button>
      <Button fullWidth variant="contained" size="large" disabled={primaryActionDisabled} onClick={handlePrimaryAction}>
        {primaryActionLabel}
      </Button>
      <Button fullWidth variant="outlined" disabled={!lastSale} onClick={handlePrint}>
        Imprimir ticket
      </Button>
      <Button fullWidth variant="outlined" disabled={!lastSale} onClick={handleEscpos}>
        Descargar ESC/POS
      </Button>
    </Box>
  );

  const renderCheckoutPanelContent = (surface: "light" | "dark") => {
    const isDark = surface === "dark";
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ReceiptLongIcon sx={{ color: isDark ? "#ffffff" : "primary.main" }} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="overline" sx={{ color: isDark ? "rgba(255,255,255,0.78)" : "text.secondary", letterSpacing: 1 }}>
              Cobro
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Carrito y pago
            </Typography>
          </Box>
          {lastSale ? <Chip size="small" color="success" label={lastSale.invoiceNumber} /> : null}
        </Stack>

        <Grid container spacing={1.25}>
          <Grid item xs={4}>
            <Paper sx={{ p: 1.25, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(18,53,90,0.05)", boxShadow: "none" }}>
              <Typography variant="caption" color={isDark ? "inherit" : "text.secondary"}>
                Items
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>{itemCount}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 1.25, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(18,53,90,0.05)", boxShadow: "none" }}>
              <Typography variant="caption" color={isDark ? "inherit" : "text.secondary"}>
                Descuento
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>{formatMoney(totalsSummary.totalDiscount)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper
              sx={{
                p: 1.25,
                bgcolor: isDark ? "rgba(255,255,255,0.14)" : "rgba(18,53,90,0.08)",
                border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(18,53,90,0.08)",
                boxShadow: "none",
              }}
            >
              <Typography variant="caption" color={isDark ? "inherit" : "text.secondary"}>
                Total
              </Typography>
              <Typography sx={{ fontWeight: 900 }}>{formatMoney(total)}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {renderCheckoutSelectors(surface)}

        <Typography variant="caption" color={isDark ? "rgba(255,255,255,0.82)" : "text.secondary"}>
          Cliente y promocion se aplican solo a la venta actual.
        </Typography>

        <Cart packPricingLines={packPricing.linesByProductId} totalsSummary={totalsSummary} tone={surface} />

        {!cashQuery.isLoading && !cash?.is_open ? (
          <Alert
            severity="warning"
            sx={{ mb: 0.5 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate("/cash")}>
                Ir a caja
              </Button>
            }
          >
            Caja cerrada. Debes abrir caja para poder cobrar.
          </Alert>
        ) : null}

        {renderCheckoutActions()}

        {!canCharge && cash?.is_open ? (
          <Typography variant="caption" color={isDark ? "rgba(255,255,255,0.82)" : "text.secondary"}>
            Agrega al menos un producto al carrito para habilitar el cobro.
          </Typography>
        ) : null}
        {canCharge ? (
          <Typography variant="caption" color={isDark ? "#b8f7d4" : "success.main"}>
            Listo para cobrar. Atajo rapido: F4
          </Typography>
        ) : null}
      </Stack>
    );
  };

  const lastSaleTimeLabel = lastSale
    ? new Date(lastSale.createdAt).toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Punto de venta"
        subtitle="Busca, arma el carrito y cobra desde una sola pantalla."
        icon={<PointOfSaleIcon color="primary" />}
        chips={[]}
        loading={isLoading}
      />

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          background: "linear-gradient(135deg, rgba(18,53,90,0.06) 0%, rgba(18,53,90,0.025) 52%, rgba(154,123,47,0.1) 100%)",
        }}
      >
        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} lg={7}>
            <Stack spacing={1.5} sx={{ height: "100%", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                  Operacion actual
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {statusTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statusDescription}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <Chip color={cash?.is_open ? "success" : "warning"} label={cash?.is_open ? "Caja abierta" : "Caja cerrada"} />
                <Chip icon={<QrCodeScannerIcon />} label="F2 buscar" />
                <Chip icon={<ShoppingCartCheckoutIcon />} label="F4 cobrar" />
                <Chip icon={<LocalOfferIcon />} label={`Pack ${formatMoney(totalsSummary.packDiscount)}`} />
                <Chip icon={<PersonOutlineIcon />} label={selectedCustomerName} />
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Grid container spacing={1.25}>
              {summaryCards.map((card) => (
                <Grid key={card.label} item xs={6} sm={3} lg={6}>
                  <Paper
                    sx={{
                      p: 1.5,
                      minHeight: 88,
                      display: "grid",
                      alignContent: "center",
                      bgcolor: card.accent ? "rgba(18,53,90,0.08)" : "rgba(255,255,255,0.72)",
                      border: card.accent ? "1px solid rgba(18,53,90,0.12)" : "1px solid rgba(18,53,90,0.08)",
                      boxShadow: "none",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: card.accent ? "#334e68" : "text.secondary", fontWeight: 700 }}>
                      {card.label}
                    </Typography>
                    <Typography sx={{ fontWeight: card.accent ? 900 : 800, color: "text.primary" }} noWrap>
                      {card.value}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              {isCompact ? (
                <Button variant="outlined" startIcon={<ReceiptLongIcon />} onClick={() => setCartOpen(true)}>
                  Ver carrito
                </Button>
              ) : null}
              <Button variant="outlined" startIcon={<PauseCircleIcon />} disabled={itemCount === 0} onClick={holdCurrentCart}>
                Guardar en espera
              </Button>
              <Button
                variant="outlined"
                startIcon={<PlaylistAddCheckIcon />}
                disabled={heldCarts.length === 0}
                onClick={() => setHeldOpen(true)}
              >
                Recuperar en espera ({heldCarts.length})
              </Button>
              <Button variant="contained" disabled={primaryActionDisabled} onClick={handlePrimaryAction} sx={{ ml: { md: "auto" } }}>
                {primaryActionLabel}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {lastSale && itemCount === 0 ? (
        <Paper
          sx={{
            p: { xs: 2, md: 2.25 },
            border: "1px solid rgba(82, 183, 136, 0.35)",
            bgcolor: "rgba(240, 253, 244, 0.94)",
          }}
        >
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="overline" sx={{ color: "success.dark", letterSpacing: 1 }}>
                  Postventa rapida
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Venta {lastSale.invoiceNumber} registrada correctamente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total {formatMoney(lastSale.total)}. Registrada a las {lastSaleTimeLabel}. Puedes imprimir el ticket o arrancar la siguiente venta.
                </Typography>
              </Box>
              <Chip color="success" label="Venta completada" />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" startIcon={<RestartAltIcon />} onClick={handleStartFreshSale}>
                Nueva venta
              </Button>
              <Button variant="outlined" onClick={handlePrint}>
                Imprimir ticket
              </Button>
              <Button variant="outlined" onClick={handleEscpos}>
                Descargar ESC/POS
              </Button>
              <Button variant="text" startIcon={<HistoryIcon />} onClick={() => navigate("/sales-history")}>
                Ver ventas
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: { xs: 1.5, md: 2 }, border: "1px solid #cbd2d9", bgcolor: "#f8fbff" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 1.5 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Busqueda de productos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Escanea o escribe codigo, SKU o nombre para agregar items al carrito.
                </Typography>
              </Box>
              <Chip icon={<QrCodeScannerIcon />} label="F2 enfoca la busqueda" />
            </Stack>
            <ProductSearch priceMap={priceMap} inputRef={searchRef} view="panel" />
          </Paper>
        </Grid>

        {!isCompact ? (
          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: 2, border: "1px solid #cbd2d9", bgcolor: "#f8fbff", position: "sticky", top: 12 }}>
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
        title="Guardar venta en espera"
        description="Asigna un nombre corto para recuperar esta venta rapidamente."
        content={
          <TextField
            autoFocus
            fullWidth
            label="Nombre de la venta"
            value={holdLabel}
            onChange={(event) => setHoldLabel(event.target.value)}
            placeholder="Pedido mostrador"
          />
        }
        onCancel={() => {
          setHoldDialogOpen(false);
          setHoldLabel("");
        }}
        onConfirm={handleConfirmHoldCurrentCart}
        confirmText="Guardar en espera"
      />

      {isCompact ? (
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setCartOpen(true)}
          sx={{ position: "fixed", right: 20, bottom: 20, zIndex: (theme) => theme.zIndex.drawer + 1 }}
        >
          <Badge badgeContent={itemCount} color="error" sx={{ mr: 1 }}>
            <ReceiptLongIcon />
          </Badge>
          Carrito
        </Fab>
      ) : null}

      <Drawer
        anchor="right"
        open={isCompact ? cartOpen : false}
        onClose={() => setCartOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "rgba(11, 42, 74, 0.72)",
            color: "#ffffff",
            borderLeft: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            backgroundImage: "linear-gradient(180deg, rgba(7,31,56,0.78) 0%, rgba(11,42,74,0.68) 100%)",
          },
        }}
      >
        <Box
          sx={{
            width: { xs: "100vw", sm: 470 },
            maxWidth: "100vw",
            p: 2,
            color: "#ffffff",
            "& .MuiTypography-root": { color: "#ffffff", fontWeight: 700 },
            "& .MuiTableCell-root": { color: "#ffffff", borderColor: "rgba(255,255,255,0.22)", fontWeight: 700 },
            "& .MuiInputBase-input": { color: "#ffffff", fontWeight: 700 },
            "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.85)", fontWeight: 700 },
            "& .MuiSvgIcon-root": { color: "#ffffff" },
            "& .MuiButton-text": { color: "#ffffff", fontWeight: 700 },
            "& .MuiButton-outlined": { borderColor: "rgba(255,255,255,0.5)", color: "#ffffff", fontWeight: 700 },
            "& .MuiChip-label": { color: "#ffffff", fontWeight: 700 },
            "& .MuiFormLabel-root": { color: "rgba(255,255,255,0.85)", fontWeight: 700 },
            "& .MuiTypography-colorTextSecondary": { color: "rgba(255,255,255,0.9)" },
            "& .MuiButton-contained.Mui-disabled": { bgcolor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.72)" },
            "& .MuiButton-outlined.Mui-disabled": { borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.62)" },
          }}
        >
          {renderCheckoutPanelContent("dark")}
        </Box>
      </Drawer>

      <Dialog open={heldOpen} onClose={() => setHeldOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Ventas en espera</DialogTitle>
        <DialogContent>
          {heldCarts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay ventas guardadas.
            </Typography>
          ) : (
            <List>
              {heldCarts.map((held) => (
                <ListItemButton key={held.id} onClick={() => restoreHeldCart(held)}>
                  <ListItemText
                    primary={held.label}
                    secondary={`${new Date(held.created_at).toLocaleString("es-PE")} - ${held.items.length} items - ${formatMoney(
                      held.items.reduce((acc, item) => acc + item.price * item.qty, 0)
                    )}`}
                  />
                  <Button
                    size="small"
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
