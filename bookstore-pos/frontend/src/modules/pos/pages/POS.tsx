import React, { useEffect, useRef, useState } from "react";
import { Alert, Badge, Box, Button, Divider, Drawer, Fab, Paper, Typography, Grid, MenuItem, TextField, useMediaQuery, Stack, Chip } from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { KpiCard, PageHeader } from "@/app/components";
import { calcTotals, formatMoney } from "@/app/utils";
import {
  selectCanCharge,
  selectCartItemCount,
  selectCustomerLabel,
  selectPaymentMethods,
  useCartStore,
  useSettings,
} from "@/app/store";
import { listActivePromotions } from "@/modules/catalog/api";
import { listCustomers } from "@/modules/catalog/api";
import { getCurrentCash } from "@/modules/pos/api";
import { Cart, PaymentDialog, ProductSearch } from "@/modules/pos/components";
import { usePosCheckout, usePosPricing } from "@/modules/pos/hooks";
import type { Payment } from "@/modules/pos/types";

const wsBase = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace("http", "ws");

const makeSessionId = () => {
  const cryptoAny = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoAny?.randomUUID) return cryptoAny.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const POS: React.FC = () => {
  const cart = useCartStore();
  const { taxRate, taxIncluded, paymentMethods, compactMode } = useSettings();
  const { subtotal, total, tax } = calcTotals(cart.items, cart.discount, taxRate, taxIncluded);
  const compact = useMediaQuery("(max-width:900px)");
  const isCompact = compactMode || compact;

  const [sessionId] = useState(() => makeSessionId());
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  const cashQuery = useQuery({ queryKey: ["cash-current"], queryFn: getCurrentCash, staleTime: 10_000 });
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: listCustomers, staleTime: 60_000 });
  const promosQuery = useQuery({ queryKey: ["promotions"], queryFn: listActivePromotions, staleTime: 60_000 });

  const cash = cashQuery.data;
  const customers = customersQuery.data;
  const promos = promosQuery.data;
  const isLoading = cashQuery.isLoading || customersQuery.isLoading || promosQuery.isLoading;

  const { customerId, setCustomerId, promoId, setPromoId, priceMap } = usePosPricing({
    customers,
    promos,
    subtotal,
    setCartDiscount: cart.setDiscount,
  });

  const { payOpen, setPayOpen, lastSaleId, handlePayment, handleBarcode, handlePrint, handleEscpos } = usePosCheckout({
    cart,
    cashIsOpen: !!cash?.is_open,
    customerId,
    promoId,
    priceMap,
    totals: { subtotal, tax, discount: cart.discount, total },
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
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const prevItemCountRef = useRef(0);

  useEffect(() => {
    const ws = new WebSocket(`${wsBase}/ws/display/${sessionId}`);
    wsRef.current = ws;
    return () => ws.close();
  }, [sessionId]);

  useEffect(() => {
    const payload = {
      type: "CART_UPDATE",
      items: cart.items,
      totals: { subtotal, tax, discount: cart.discount, total },
    };
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, [cart.discount, cart.items, subtotal, tax, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (itemCount > 0) setPayOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [itemCount, setPayOpen]);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (itemCount > prevItemCountRef.current && itemCount > 0) {
      setCartOpen(true);
    }
    prevItemCountRef.current = itemCount;
  }, [itemCount]);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Punto de venta"
        subtitle="Cobro rapido, promociones y facturacion."
        icon={<PointOfSaleIcon color="primary" />}
        chips={[cash?.is_open ? "Caja abierta" : "Caja cerrada", `Items: ${itemCount}`, isCompact ? "Compacto" : "Normal"]}
        loading={isLoading}
      />

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
          <Chip color={cash?.is_open ? "success" : "warning"} label={cash?.is_open ? "Caja abierta" : "Caja cerrada"} />
          <Chip label={`Cliente: ${selectCustomerLabel(customers, customerId)}`} />
          <Chip label={`Items: ${itemCount}`} />
          <Chip label={`Total: ${formatMoney(total)}`} />
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Chip icon={<QrCodeScannerIcon />} label="1) Escanear o buscar producto" />
          <Chip icon={<PersonOutlineIcon />} label="2) Seleccionar cliente (opcional)" />
          <Chip icon={<LocalOfferIcon />} label="3) Aplicar promo (opcional)" />
          <Chip icon={<ShoppingCartCheckoutIcon />} label="4) Cobrar" />
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Busqueda de productos
        </Typography>
        <ProductSearch priceMap={priceMap} inputRef={searchRef} />
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2,
              mb: 2,
              background: "linear-gradient(125deg, rgba(18,53,90,0.06) 0%, rgba(18,53,90,0.02) 48%, rgba(154,123,47,0.08) 100%)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Centro de venta
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  inputRef={barcodeRef}
                  label="Escaner (SKU)"
                  placeholder="Escanea y Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleBarcode((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Cliente" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
                  <MenuItem value="">Sin cliente</MenuItem>
                  {(customers || []).map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Promo" value={promoId} onChange={(e) => setPromoId(Number(e.target.value))}>
                  <MenuItem value="">Sin promo</MenuItem>
                  {(promos || []).map((promo) => (
                    <MenuItem key={promo.id} value={promo.id}>
                      {promo.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" size="large" disabled={!canCharge} onClick={() => setPayOpen(true)} sx={{ height: "100%" }}>
                  Cobrar
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Venta" value={formatMoney(total)} accent="#0b1e3b" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Descuento" value={formatMoney(cart.discount)} accent="#c9a227" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Impuesto" value={formatMoney(tax)} accent="#2f4858" />
        </Grid>
      </Grid>

      <PaymentDialog
        open={payOpen}
        total={total}
        methods={selectPaymentMethods(paymentMethods)}
        onClose={() => setPayOpen(false)}
        onConfirm={(payments: Payment[]) => handlePayment(payments)}
      />

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

      <Drawer
        anchor="right"
        open={cartOpen}
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
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <ReceiptLongIcon sx={{ color: "#ffffff" }} />
            <Typography variant="h6">Carrito</Typography>
            {lastSaleId ? <Chip size="small" color="success" label={`Ultima venta #${lastSaleId}`} sx={{ ml: "auto" }} /> : null}
          </Stack>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <Button size="small" variant="text" onClick={() => cart.clear()} disabled={itemCount === 0}>
              Limpiar carrito
            </Button>
          </Box>
          <Cart />
          <Divider sx={{ my: 2 }} />
          {!cashQuery.isLoading && !cash?.is_open ? (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => navigate("/cash")}>
                  Ir a Caja
                </Button>
              }
            >
              Caja cerrada. Debes abrir caja para poder cobrar.
            </Alert>
          ) : null}
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Button fullWidth variant="contained" size="large" disabled={!canCharge} onClick={() => setPayOpen(true)}>
              Cobrar
            </Button>
            <Button fullWidth variant="outlined" disabled={!lastSaleId} onClick={handlePrint}>
              Imprimir ticket
            </Button>
            <Button fullWidth variant="outlined" disabled={!lastSaleId} onClick={handleEscpos}>
              Descargar ESC/POS
            </Button>
            {!canCharge ? (
              <Typography variant="caption" color="text.secondary">
                Para cobrar necesitas una caja abierta y al menos un producto en el carrito.
              </Typography>
            ) : null}
            {canCharge ? (
              <Typography variant="caption" color="success.main">
                Listo para cobrar. Atajo rapido: F4
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default POS;
