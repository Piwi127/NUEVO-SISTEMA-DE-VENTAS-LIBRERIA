from pydantic import BaseModel


class DailyReport(BaseModel):
    date: str
    sales_count: int
    total: float


class TopProductReport(BaseModel):
    product_id: int
    name: str
    qty_sold: int
    total_sold: float


class LowStockItem(BaseModel):
    product_id: int
    sku: str
    name: str
    stock: int
    stock_min: int


class ProfitabilitySummaryReport(BaseModel):
    from_date: str
    to_date: str
    sales_total: float
    estimated_cost_total: float
    gross_profit: float
    margin_percent: float


class ProfitabilityProductReport(BaseModel):
    product_id: int
    name: str
    qty_sold: int
    sales_total: float
    estimated_cost_total: float
    gross_profit: float
    margin_percent: float


class StockRotationReport(BaseModel):
    product_id: int
    sku: str
    name: str
    author: str
    publisher: str
    isbn: str
    stock: int
    stock_min: int
    qty_sold: int
    sales_total: float
    avg_daily_sales: float
    stock_coverage_days: float | None
    stock_status: str


class ReplenishmentSuggestionReport(BaseModel):
    product_id: int
    sku: str
    name: str
    author: str
    publisher: str
    isbn: str
    stock: int
    stock_min: int
    qty_sold: int
    sales_total: float
    avg_daily_sales: float
    stock_coverage_days: float | None
    target_stock: int
    suggested_qty: int
    urgency: str


class OperationalAlert(BaseModel):
    code: str
    severity: str
    title: str
    message: str
    product_id: int | None = None
    suggested_action: str | None = None
