import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, Paper, List, ListItem, ListItemText } from "@mui/material";
import { formatMoney } from "@/app/utils";
import { useSettings } from "@/app/store";
import { getPublicSettings } from "@/modules/admin/api";
import { getWsBaseUrl } from "@/modules/shared/api/runtime";

const wsBase = getWsBaseUrl();

type CartItem = { name: string; qty: number; price: number };

type CartPayload = {
  type: string;
  items?: CartItem[];
  totals?: { total: number };
};

// Página de display para cliente
// Muestra el carrito en una pantalla externa via WebSocket
  const { sessionId } = useParams();
  const wsRef = useRef<WebSocket | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const {
    projectName,
    setProjectName,
    setCurrency,
    setTaxRate,
    setTaxIncluded,
    setStoreAddress,
    setStorePhone,
    setStoreTaxId,
    setLogoUrl,
    setPaymentMethods,
    setInvoicePrefix,
    setInvoiceNext,
    setReceiptHeader,
    setReceiptFooter,
    setPaperWidthMm,
    setDefaultWarehouseId,
  } = useSettings();

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getPublicSettings();
        setProjectName(s.project_name);
        setCurrency(s.currency as any);
        setTaxRate(s.tax_rate);
        setTaxIncluded(s.tax_included);
        setStoreAddress(s.store_address);
        setStorePhone(s.store_phone);
        setStoreTaxId(s.store_tax_id);
        setLogoUrl(s.logo_url);
        setPaymentMethods(s.payment_methods);
        setInvoicePrefix(s.invoice_prefix);
        setInvoiceNext(s.invoice_next);
        setReceiptHeader(s.receipt_header);
        setReceiptFooter(s.receipt_footer);
        setPaperWidthMm(s.paper_width_mm);
        setDefaultWarehouseId(s.default_warehouse_id ?? null);
      } catch {
        // ignore
      }
    };
    load();
  }, [
    setProjectName,
    setCurrency,
    setTaxRate,
    setTaxIncluded,
    setStoreAddress,
    setStorePhone,
    setStoreTaxId,
    setLogoUrl,
    setPaymentMethods,
    setInvoicePrefix,
    setInvoiceNext,
    setReceiptHeader,
    setReceiptFooter,
    setPaperWidthMm,
    setDefaultWarehouseId,
  ]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      const ws = new WebSocket(`${wsBase}/ws/display/${sessionId}`);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as CartPayload;
        if (data.type === "CART_UPDATE") {
          setMessage("");
          setItems(data.items || []);
          setTotal(data.totals?.total || 0);
        }
        if (data.type === "SALE_OK") {
          setItems([]);
          setTotal(0);
          setMessage("Gracias por su compra");
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

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0c0f14", color: "#fff", p: 4 }}>
      <Typography variant="h3" sx={{ mb: 3 }}>
        {projectName}
      </Typography>
      <Paper sx={{ p: 3, bgcolor: "#121826", color: "#fff" }}>
        {message ? (
          <Typography variant="h4" color="success.main">
            {message}
          </Typography>
        ) : (
          <>
            <List>
              {items.map((i, idx) => (
                <ListItem key={idx} sx={{ borderBottom: "1px solid #1f2937" }}>
                  <ListItemText primary={`${i.name} x${i.qty}`} secondary={formatMoney(i.price * i.qty)} />
                </ListItem>
              ))}
            </List>
            <Typography variant="h4" sx={{ mt: 2 }}>
              Total: {formatMoney(total)}
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Display;
