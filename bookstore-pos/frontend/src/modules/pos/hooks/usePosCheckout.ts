import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/app/components";
import type { CartItem } from "@/app/store";
import { createSale, downloadEscpos, downloadRenderedDocumentPdf, getRenderedDocumentHtml } from "@/modules/pos/api";
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
  redeemPoints: number;
  priceMap: Record<number, number>;
  totals: PosTotals;
  wsRef: React.MutableRefObject<WebSocket | null>;
};

type LastSaleSummary = {
  id: number;
  invoiceNumber: string;
  total: number;
  status: string;
  createdAt: string;
};

export const usePosCheckout = ({ cart, cashIsOpen, customerId, promoId, redeemPoints, priceMap, totals, wsRef }: UsePosCheckoutArgs) => {
  const [payOpen, setPayOpen] = useState(false);
  const [lastSale, setLastSale] = useState<LastSaleSummary | null>(null);
  const { showToast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (res) => {
      cart.clear();
      wsRef.current?.send(JSON.stringify({ type: "SALE_OK" }));
      showToast({ message: `Venta registrada ${res.invoice_number || ""}`, severity: "success" });
      setLastSale({
        id: res.id,
        invoiceNumber: res.invoice_number,
        total: res.total,
        status: res.status,
        createdAt: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["cash-current"] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      showToast({ message: error?.response?.data?.detail || "Error en venta", severity: "error" });
    },
  });

  const handlePayment = (payload: { payments: Payment[]; documentType: "TICKET" | "BOLETA" | "FACTURA" }) => {
    if (!cashIsOpen) {
      showToast({ message: "No hay caja abierta", severity: "error" });
      return;
    }
    setPayOpen(false);
    mutation.mutate({
      customer_id: customerId ? Number(customerId) : null,
      items: cart.items.map((item) => ({ product_id: item.product_id, qty: item.qty })),
      payments: payload.payments.map((payment) => ({ method: payment.method, amount: payment.amount })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      promotion_id: promoId ? Number(promoId) : null,
      redeem_points: Math.max(0, Math.floor(redeemPoints || 0)),
      document_type: payload.documentType,
    });
  };

  const handleBarcode = async (code: string) => {
    if (!code.trim()) return;
    const list = await listProducts(code.trim());
    const exact = list.find((product) => product.sku === code.trim());
    if (exact) {
      const price = priceMap[exact.id] ?? exact.sale_price ?? exact.price;
      cart.addItem({ product_id: exact.id, sku: exact.sku, name: exact.name, price });
    } else {
      showToast({ message: "Producto no encontrado", severity: "error" });
    }
  };

  const handlePrint = async () => {
    if (!lastSale) return;
    const html = await getRenderedDocumentHtml(lastSale.id);
    const popup = window.open("", "_blank", "width=400,height=600");
    if (!popup) return;
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleEscpos = async () => {
    if (!lastSale) return;
    const blob = await downloadEscpos(lastSale.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket_${lastSale.id}.bin`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePdf = async () => {
    if (!lastSale) return;
    const blob = await downloadRenderedDocumentPdf(lastSale.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documento_${lastSale.id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearLastSale = () => {
    setLastSale(null);
  };

  return {
    payOpen,
    setPayOpen,
    lastSale,
    clearLastSale,
    mutation,
    handlePayment,
    handleBarcode,
    handlePrint,
    handlePdf,
    handleEscpos,
  };
};
