import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Divider, Paper, Typography, Grid, MenuItem, TextField, useMediaQuery, Stack, Chip } from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { PageHeader } from "../components/PageHeader";
import * as QRCode from "qrcode";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductSearch } from "../components/ProductSearch";
import { Cart } from "../components/Cart";
import { PaymentDialog, Payment } from "../components/PaymentDialog";
import { useCartStore } from "../store/useCartStore";
import { createSale, getReceipt } from "../api/sales";
import { getCurrentCash } from "../api/cash";
import { listCustomers } from "../api/customers";
import { listActivePromotions } from "../api/promotions";
import { getPriceListItems } from "../api/priceLists";
import { listProducts } from "../api/products";
import { downloadEscpos } from "../api/printing";
import { useToast } from "../components/ToastProvider";
import { useSettings } from "../store/useSettings";
import { calcTotals } from "../utils/totals";
import { KpiCard } from "../components/KpiCard";
import { formatMoney } from "../utils/money";

const wsBase = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace("http", "ws");

const makeSessionId = () => {
  const cryptoAny = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoAny?.randomUUID) return cryptoAny.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const POS: React.FC = () => {
  const cart = useCartStore();
  const { taxRate, taxIncluded, paymentMethods } = useSettings();
  const discount = cart.discount;
  const { subtotal, total, tax } = calcTotals(cart.items, discount, taxRate, taxIncluded);
  const compact = useMediaQuery("(max-width:900px)");
  const [payOpen, setPayOpen] = useState(false);
  const [sessionId] = useState(() => makeSessionId());
  const wsRef = useRef<WebSocket | null>(null);
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { data: cash } = useQuery({ queryKey: ["cash-current"], queryFn: getCurrentCash });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const { data: promos } = useQuery({ queryKey: ["promotions"], queryFn: listActivePromotions });

  const [customerId, setCustomerId] = useState<number | "">("");
  const [promoId, setPromoId] = useState<number | "">("");
  const [priceMap, setPriceMap] = useState<Record<number, number>>({});
  const searchRef = useRef<HTMLInputElement | null>(null);
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);

  const lastPromo = useRef<number | "">("");

  useEffect(() => {
    const promo = promos?.find((p) => p.id === promoId);
    if (promo) {
      if (promo.type === "PERCENT") {
        cart.setDiscount((subtotal * promo.value) / 100);
      } else if (promo.type === "AMOUNT") {
        cart.setDiscount(promo.value);
      }
    } else if (!promoId && lastPromo.current) {
      cart.setDiscount(0);
    }
    lastPromo.current = promoId;
  }, [promoId, promos, subtotal]);

  useEffect(() => {
    const loadPriceList = async () => {
      const customer = customers?.find((c) => c.id === customerId);
      if (!customer?.price_list_id) {
        setPriceMap({});
        return;
      }
      const items = await getPriceListItems(customer.price_list_id);
      const map: Record<number, number> = {};
      items.forEach((i) => (map[i.product_id] = i.price));
      setPriceMap(map);
    };
    if (customerId) loadPriceList();
  }, [customerId, customers]);

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (res) => {
      cart.clear();
      wsRef.current?.send(JSON.stringify({ type: "SALE_OK" }));
      showToast({ message: `Venta registrada ${res.invoice_number || ""}`, severity: "success" });
      setLastSaleId(res.id);
      qc.invalidateQueries({ queryKey: ["cash-current"] });
    },
    onError: (err: any) => {
      showToast({ message: err?.response?.data?.detail || "Error en venta", severity: "error" });
    },
  });

  useEffect(() => {
    const ws = new WebSocket(`${wsBase}/ws/display/${sessionId}`);
    wsRef.current = ws;
    return () => {
      ws.close();
    };
  }, [sessionId]);

  useEffect(() => {
    const payload = {
      type: "CART_UPDATE",
      items: cart.items,
      totals: { subtotal, tax, discount, total },
    };
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, [cart.items, subtotal, tax, discount, total]);

  const handlePayment = (payments: Payment[]) => {
    if (!cash?.is_open) {
      showToast({ message: "No hay caja abierta", severity: "error" });
      return;
    }
    setPayOpen(false);
    mutation.mutate({
      customer_id: customerId ? Number(customerId) : null,
      items: cart.items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      payments: payments.map((p) => ({ method: p.method, amount: p.amount })),
      subtotal,
      tax,
      discount,
      total,
      promotion_id: promoId ? Number(promoId) : null,
    });
  };

  const handleBarcode = async (code: string) => {
    if (!code.trim()) return;
    const list = await listProducts(code.trim());
    const exact = list.find((p) => p.sku === code.trim());
    if (exact) {
      const price = priceMap[exact.id] ?? exact.price;
      cart.addItem({ product_id: exact.id, sku: exact.sku, name: exact.name, price });
    } else {
      showToast({ message: "Producto no encontrado", severity: "error" });
    }
  };

  const handlePrint = async () => {
    if (!lastSaleId) return;
    const receipt = await getReceipt(lastSaleId);
    const header = receipt.receipt?.header || "";
    const footer = receipt.receipt?.footer || "Gracias por su compra";
    const paperWidth = receipt.receipt?.paper_width_mm || 80;
    const qrPayload = JSON.stringify({
      invoice: receipt.invoice_number,
      total: receipt.total,
      date: receipt.created_at,
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload);
    const html = `
      <html>
      <head><title>Ticket</title></head>
      <body style="font-family: Arial; max-width: ${paperWidth}mm;">
        <style>
          @media print {
            body { width: ${paperWidth}mm; }
          }
          .ticket { font-size: 12px; }
          .center { text-align: center; }
          .qr { margin-top: 8px; }
        </style>
        <div class="ticket">
        ${header ? `<div class="center">${header.replace(/\n/g, "<br/>")}</div><hr />` : ""}
        <h3>${receipt.store?.name || ""}</h3>
        <div>${receipt.store?.address || ""}</div>
        <div>${receipt.store?.phone || ""}</div>
        <div>${receipt.store?.tax_id || ""}</div>
        <hr />
        <div>Venta: ${receipt.invoice_number}</div>
        <div>Fecha: ${receipt.created_at}</div>
        <hr />
        ${receipt.items
          .map((i: any) => `<div>${i.name || i.product_id} x${i.qty} - ${i.line_total.toFixed(2)}</div>`)
          .join("")}
        <hr />
        <div>Subtotal: ${receipt.subtotal.toFixed(2)}</div>
        <div>Impuesto: ${receipt.tax.toFixed(2)}</div>
        <div>Descuento: ${receipt.discount.toFixed(2)}</div>
        <h4>Total: ${receipt.total.toFixed(2)}</h4>
        <div class="center qr"><img src="${qrDataUrl}" width="120" height="120" /></div>
        <div class="center">${footer}</div>
        </div>
      </body>
      </html>
    `;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleEscpos = async () => {
    if (!lastSaleId) return;
    const blob = await downloadEscpos(lastSaleId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket_${lastSaleId}.bin`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (cart.items.length > 0) setPayOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart.items.length]);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Punto de venta"
        subtitle="Cobro rapido, promociones y facturacion."
        icon={<PointOfSaleIcon color="primary" />}
        chips={[
          cash?.is_open ? "Caja abierta" : "Caja cerrada",
          `Items: ${cart.items.length}`,
        ]}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Venta" value={formatMoney(total)} accent="#0b1e3b" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Descuento" value={formatMoney(discount)} accent="#c9a227" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard label="Impuesto" value={formatMoney(tax)} accent="#2f4858" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", flexDirection: compact ? "column" : "row" }}>
          <TextField
            inputRef={barcodeRef}
            label="Escaner (SKU)"
            placeholder="Escanea y Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleBarcode((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = "";
              }
            }}
            sx={{ minWidth: 260, maxWidth: 360, width: compact ? "100%" : "auto" }}
          />
          <TextField
            select
            label="Cliente"
            value={customerId}
            onChange={(e) => setCustomerId(Number(e.target.value))}
            sx={{ minWidth: 220, width: compact ? "100%" : "auto" }}
          >
            <MenuItem value="">Sin cliente</MenuItem>
            {(customers || []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField
            select
            label="Promo"
            value={promoId}
            onChange={(e) => setPromoId(Number(e.target.value))}
            sx={{ minWidth: 220, width: compact ? "100%" : "auto" }}
          >
            <MenuItem value="">Sin promo</MenuItem>
            {(promos || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Busqueda de productos</Typography>
            <ProductSearch priceMap={priceMap} inputRef={searchRef} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <ReceiptLongIcon color="primary" />
              <Typography variant="h6">Carrito</Typography>
            </Stack>
            <Cart />
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", flexDirection: compact ? "column" : "row" }}>
              <Button fullWidth={compact} variant="contained" size="large" disabled={cart.items.length === 0} onClick={() => setPayOpen(true)}>
                Cobrar
              </Button>
              <Button fullWidth={compact} variant="outlined" disabled={!lastSaleId} onClick={handlePrint}>
                Imprimir ticket
              </Button>
              <Button fullWidth={compact} variant="outlined" disabled={!lastSaleId} onClick={handleEscpos}>
                Descargar ESC/POS
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <PaymentDialog
        open={payOpen}
        total={total}
        methods={(paymentMethods || "CASH,CARD,TRANSFER").split(",").map((m) => m.trim().toUpperCase()).filter(Boolean)}
        onClose={() => setPayOpen(false)}
        onConfirm={handlePayment}
      />
    </Box>
  );
};

export default POS;
