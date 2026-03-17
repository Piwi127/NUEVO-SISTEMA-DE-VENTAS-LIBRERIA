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
  author?: string;
  publisher?: string;
  isbn?: string;
  barcode?: string;
  shelf_location?: string;
  category: string;
  tags: string;
  price: number;
  cost: number;
  sale_price: number;
  cost_total: number;
  cost_qty: number;
  direct_costs_breakdown: string;
  direct_costs_total: number;
  desired_margin: number;
  unit_cost: number;
  stock: number;
  stock_min: number;
};

export type Customer = {
  id: number;
  name: string;
  phone?: string | null;
  tax_id?: string | null;
  address?: string | null;
  email?: string | null;
  price_list_id?: number | null;
  loyalty_points?: number;
  loyalty_total_earned?: number;
  loyalty_total_redeemed?: number;
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

export type KardexPage = {
  items: StockMovement[];
  limit: number;
  has_more: boolean;
  next_cursor?: string | null;
};

export type InventoryImportJob = {
  id: number;
  created_by: number;
  status: "pending" | "running" | "success" | "failed" | "partial";
  filename: string;
  file_type: string;
  request_id?: string | null;
  batch_size: number;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  error_rows: number;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  updated_at: string;
};

export type InventoryImportJobError = {
  id: number;
  row_number: number;
  sku?: string | null;
  detail: string;
  raw_data?: string | null;
  created_at: string;
};

export type InventoryImportJobErrorList = {
  job_id: number;
  total_errors: number;
  items: InventoryImportJobError[];
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

export type CashAuditValidation = CashAudit & {
  validated: boolean;
};

export type CashReportValidation = {
  movement_count: number;
  audit_count: number;
  last_audit_type?: string | null;
  last_difference?: number | null;
  is_balanced: boolean;
  notes: string[];
};

export type CashSessionReport = {
  session: CashSession;
  summary: CashSummary;
  period_start: string;
  period_end: string;
  movements: CashMovement[];
  audits: CashAuditValidation[];
  validation: CashReportValidation;
};

export type SaleResponse = {
  id: number;
  subtotal: number;
  tax: number;
  discount: number;
  pack_discount?: number;
  promotion_discount?: number;
  loyalty_discount?: number;
  loyalty_points_earned?: number;
  loyalty_points_redeemed?: number;
  total: number;
  invoice_number: string;
  document_type?: string;
  status: string;
  promotion_id?: number | null;
  price_list_id?: number | null;
};

export type SaleListResponse = {
  id: number;
  user_id: number;
  customer_id?: number | null;
  user_name?: string | null;
  customer_name?: string | null;
  customer_tax_id?: string | null;
  customer_phone?: string | null;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  invoice_number: string;
  document_type?: string;
  created_at: string;
};

export type SaleReturnListResponse = {
  id: number;
  sale_id: number;
  invoice_number: string;
  sale_status: string;
  reason: string;
  created_at: string;
};

export type PurchaseResponse = {
  id: number;
  subtotal?: number;
  direct_costs_total?: number;
  total: number;
};

export type PurchaseListResponse = {
  id: number;
  supplier_id: number;
  subtotal?: number;
  direct_costs_total?: number;
  total: number;
  created_at: string;
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

export type ProfitabilitySummaryReport = {
  from_date: string;
  to_date: string;
  sales_total: number;
  estimated_cost_total: number;
  gross_profit: number;
  margin_percent: number;
};

export type ProfitabilityProductReport = {
  product_id: number;
  name: string;
  qty_sold: number;
  sales_total: number;
  estimated_cost_total: number;
  gross_profit: number;
  margin_percent: number;
};

export type StockRotationReport = {
  product_id: number;
  sku: string;
  name: string;
  author: string;
  publisher: string;
  isbn: string;
  stock: number;
  stock_min: number;
  qty_sold: number;
  sales_total: number;
  avg_daily_sales: number;
  stock_coverage_days?: number | null;
  stock_status: string;
};

export type ReplenishmentSuggestionReport = {
  product_id: number;
  sku: string;
  name: string;
  author: string;
  publisher: string;
  isbn: string;
  stock: number;
  stock_min: number;
  qty_sold: number;
  sales_total: number;
  avg_daily_sales: number;
  stock_coverage_days?: number | null;
  target_stock: number;
  suggested_qty: number;
  urgency: string;
};

export type OperationalAlert = {
  code: string;
  severity: "info" | "warning" | "error" | "success" | string;
  title: string;
  message: string;
  product_id?: number | null;
  suggested_action?: string | null;
};
