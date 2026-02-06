import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as QRCode from "qrcode";
import { useToast } from "@/app/components";
import type { CartItem } from "@/app/store";
import { createSale, downloadEscpos, getReceipt } from "@/modules/pos/api";
import { listProducts } from "@/modules/catalog/api";
import type { Payment, PosTotals } from "@/modules/pos/types";

type CartController = {
  items: CartItem[];
  clear: () => void;
  addItem: (item: Omit<CartItem, "qty">) => void;
};

type UsePosCheckoutArgs = {
  cart: CartController;
  cashIsOpen: boolean;
  customerId: number | "";
  promoId: number | "";
  priceMap: Record<number, number>;
  totals: PosTotals;
  wsRef: React.MutableRefObject<WebSocket | null>;
};

type ReceiptItem = {
  name?: string;
  product_id: number;
  qty: number;
  line_total: number;
};

type ReceiptPayload = {
  invoice_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  created_at: string;
  items: ReceiptItem[];
  store?: {
    name?: string;
    address?: string;
    phone?: string;
    tax_id?: string;
  };
  receipt?: {
    header?: string;
    footer?: string;
    paper_width_mm?: number;
  };
};

export const usePosCheckout = ({ cart, cashIsOpen, customerId, promoId, priceMap, totals, wsRef }: UsePosCheckoutArgs) => {
  const [payOpen, setPayOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const { showToast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (res) => {
      cart.clear();
      wsRef.current?.send(JSON.stringify({ type: "SALE_OK" }));
      showToast({ message: `Venta registrada ${res.invoice_number || ""}`, severity: "success" });
      setLastSaleId(res.id);
      qc.invalidateQueries({ queryKey: ["cash-current"] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast({ message: error?.response?.data?.detail || "Error en venta", severity: "error" });
    },
  });

  const handlePayment = (payments: Payment[]) => {
    if (!cashIsOpen) {
      showToast({ message: "No hay caja abierta", severity: "error" });
      return;
    }
    setPayOpen(false);
    mutation.mutate({
      customer_id: customerId ? Number(customerId) : null,
      items: cart.items.map((item) => ({ product_id: item.product_id, qty: item.qty })),
      payments: payments.map((payment) => ({ method: payment.method, amount: payment.amount })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
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
    const receipt = (await getReceipt(lastSaleId)) as ReceiptPayload;
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
        ${receipt.items.map((item) => `<div>${item.name || item.product_id} x${item.qty} - ${item.line_total.toFixed(2)}</div>`).join("")}
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
    const popup = window.open("", "_blank", "width=400,height=600");
    if (!popup) return;
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
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

  return {
    payOpen,
    setPayOpen,
    lastSaleId,
    mutation,
    handlePayment,
    handleBarcode,
    handlePrint,
    handleEscpos,
  };
};
