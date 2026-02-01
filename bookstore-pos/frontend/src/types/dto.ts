export type User = {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  failed_attempts?: number;
  locked_until?: string | null;
  twofa_enabled?: boolean;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  stock_min: number;
};

export type Customer = {
  id: number;
  name: string;
  phone?: string | null;
  price_list_id?: number | null;
};

export type Supplier = {
  id: number;
  name: string;
  phone?: string | null;
};

export type StockMovement = {
  id: number;
  product_id: number;
  type: string;
  qty: number;
  ref: string;
  created_at: string;
};

export type CashSession = {
  id: number;
  user_id: number;
  opened_at: string;
  closed_at?: string | null;
  opening_amount: number;
  is_open: boolean;
};

export type CashMovement = {
  id: number;
  cash_session_id: number;
  type: string;
  amount: number;
  reason: string;
  created_at: string;
};

export type CashAudit = {
  id: number;
  cash_session_id: number;
  type: string;
  expected_amount: number;
  counted_amount: number;
  difference: number;
  created_by: number;
  created_at: string;
};

export type CashSummary = {
  opening_amount: number;
  movements_in: number;
  movements_out: number;
  sales_cash: number;
  expected_amount: number;
};

export type SaleResponse = {
  id: number;
  total: number;
  invoice_number?: string;
};

export type PurchaseResponse = {
  id: number;
  total: number;
};

export type DailyReport = {
  date: string;
  sales_count: number;
  total: number;
};

export type TopProductReport = {
  product_id: number;
  name: string;
  qty_sold: number;
  total_sold: number;
};

export type LowStockItem = {
  product_id: number;
  sku: string;
  name: string;
  stock: number;
  stock_min: number;
};
