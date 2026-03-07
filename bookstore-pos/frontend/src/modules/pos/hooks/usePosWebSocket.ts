import { useEffect, useRef } from "react";
import { getWsBaseUrl } from "@/modules/shared/api/runtime";
import { type CartItem } from "@/app/store";

const wsBase = getWsBaseUrl();

type PosWebSocketProps = {
  sessionId: string;
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  totalDiscount: number;
  total: number;
};

export const usePosWebSocket = ({
  sessionId,
  cartItems,
  subtotal,
  tax,
  totalDiscount,
  total,
}: PosWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const latestDisplayPayloadRef = useRef<string>("");

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
      items: cartItems,
      totals: { subtotal, tax, discount: totalDiscount, total },
    });
    latestDisplayPayloadRef.current = payload;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }, [cartItems, subtotal, tax, total, totalDiscount]);

  return { wsRef };
};
