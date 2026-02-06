export type Payment = {
  method: string;
  amount: number;
};

export type PosTotals = {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
};
