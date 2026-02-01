import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, Paper, List, ListItem, ListItemText } from "@mui/material";
import { formatMoney } from "../utils/money";
import { useSettings } from "../store/useSettings";

const wsBase = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace("http", "ws");

type CartItem = { name: string; qty: number; price: number };

type CartPayload = {
  type: string;
  items?: CartItem[];
  totals?: { total: number };
};

const Display: React.FC = () => {
  const { sessionId } = useParams();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  useSettings();

  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(`${wsBase}/ws/display/${sessionId}`);
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
    return () => ws.close();
  }, [sessionId]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0c0f14", color: "#fff", p: 4 }}>
      <Typography variant="h3" sx={{ mb: 3 }}>
        Bookstore POS
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
