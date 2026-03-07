from pydantic import BaseModel


class ProductBase(BaseModel):
    sku: str
    name: str
    author: str = ""
    publisher: str = ""
    isbn: str = ""
    barcode: str = ""
    shelf_location: str = ""
    category: str = ""
    tags: str = ""
    price: float
    cost: float
    sale_price: float | None = None
    cost_total: float | None = None
    cost_qty: int = 1
    direct_costs_breakdown: str = "{}"
    direct_costs_total: float = 0
    desired_margin: float = 0
    unit_cost: float | None = None
    stock: int = 0
    stock_min: int = 0
    tax_rate: float = 0.0
    tax_included: bool = False


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass


class ProductOut(ProductBase):
    id: int

    model_config = {"from_attributes": True}
