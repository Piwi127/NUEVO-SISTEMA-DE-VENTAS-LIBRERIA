import { useSyncExternalStore } from "react";

export type CartItem = {
  product_id: number;
  sku: string;
  name: string;
  price: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  discount: number;
  tax: number;
};

type Listener = () => void;

const state: CartState = {
  items: [],
  discount: 0,
  tax: 0,
};

const listeners = new Set<Listener>();

let snapshot: CartState & { items: CartItem[] } = { ...state, items: [...state.items] };

const emit = () => {
  snapshot = { ...state, items: [...state.items] };
  listeners.forEach((l) => l());
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => snapshot;

const addItem = (item: Omit<CartItem, "qty">) => {
  const existing = state.items.find((i) => i.product_id === item.product_id);
  if (existing) {
    existing.qty += 1;
  } else {
    state.items.push({ ...item, qty: 1 });
  }
  emit();
};

const removeItem = (product_id: number) => {
  state.items = state.items.filter((i) => i.product_id !== product_id);
  emit();
};

const setQty = (product_id: number, qty: number) => {
  const item = state.items.find((i) => i.product_id === product_id);
  if (!item) return;
  if (!Number.isFinite(qty)) return;
  item.qty = Math.max(1, Math.floor(qty));
  emit();
};

const clear = () => {
  state.items = [];
  state.discount = 0;
  state.tax = 0;
  emit();
};

const setDiscount = (discount: number) => {
  if (!Number.isFinite(discount)) {
    state.discount = 0;
  } else {
    state.discount = Math.max(0, discount);
  }
  emit();
};

const setTax = (tax: number) => {
  if (!Number.isFinite(tax)) {
    state.tax = 0;
  } else {
    state.tax = Math.max(0, tax);
  }
  emit();
};

const totals = () => {
  const subtotal = state.items.reduce((acc, i) => acc + i.price * i.qty, 0);
  const total = subtotal + state.tax - state.discount;
  return { subtotal, total, discount: state.discount, tax: state.tax };
};

export const useCartStore = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snapshot,
    addItem,
    removeItem,
    setQty,
    clear,
    setDiscount,
    setTax,
    totals,
  };
};
