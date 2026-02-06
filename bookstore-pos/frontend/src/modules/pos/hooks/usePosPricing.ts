import { useEffect, useRef, useState } from "react";
import { getPriceListItems } from "@/modules/catalog/api";
import type { Customer } from "@/modules/shared/types";

type Promotion = {
  id: number;
  name: string;
  type: string;
  value: number;
};

type UsePosPricingArgs = {
  customers: Customer[] | undefined;
  promos: Promotion[] | undefined;
  subtotal: number;
  setCartDiscount: (value: number) => void;
};

export const usePosPricing = ({ customers, promos, subtotal, setCartDiscount }: UsePosPricingArgs) => {
  const [customerId, setCustomerId] = useState<number | "">("");
  const [promoId, setPromoId] = useState<number | "">("");
  const [priceMap, setPriceMap] = useState<Record<number, number>>({});
  const lastPromo = useRef<number | "">("");

  useEffect(() => {
    const promo = promos?.find((p) => p.id === promoId);
    if (promo) {
      if (promo.type === "PERCENT") {
        setCartDiscount((subtotal * promo.value) / 100);
      } else if (promo.type === "AMOUNT") {
        setCartDiscount(promo.value);
      }
    } else if (!promoId && lastPromo.current) {
      setCartDiscount(0);
    }
    lastPromo.current = promoId;
  }, [promoId, promos, setCartDiscount, subtotal]);

  useEffect(() => {
    const loadPriceList = async () => {
      const customer = customers?.find((c) => c.id === customerId);
      if (!customer?.price_list_id) {
        setPriceMap({});
        return;
      }
      const items = await getPriceListItems(customer.price_list_id);
      const map: Record<number, number> = {};
      items.forEach((item) => {
        map[item.product_id] = item.price;
      });
      setPriceMap(map);
    };
    if (customerId) {
      loadPriceList();
    } else {
      setPriceMap({});
    }
  }, [customerId, customers]);

  return {
    customerId,
    setCustomerId,
    promoId,
    setPromoId,
    priceMap,
  };
};
