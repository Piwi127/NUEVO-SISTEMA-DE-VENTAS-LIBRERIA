from pydantic import BaseModel


class ProductBase(BaseModel):
    sku: str
    name: str
    category: str = ""
    price: float
    cost: float
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
