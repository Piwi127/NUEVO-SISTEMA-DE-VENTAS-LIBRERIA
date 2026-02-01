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
