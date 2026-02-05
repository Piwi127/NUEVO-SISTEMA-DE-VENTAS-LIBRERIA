from pydantic import BaseModel
from datetime import datetime


class SaleItemCreate(BaseModel):
    product_id: int
    qty: int


class PaymentCreate(BaseModel):
    method: str
    amount: float


class SaleCreate(BaseModel):
    customer_id: int | None = None
    items: list[SaleItemCreate]
    payments: list[PaymentCreate]
    subtotal: float
    tax: float = 0
    discount: float = 0
    total: float
    promotion_id: int | None = None


class SaleOut(BaseModel):
    id: int
    subtotal: float
    tax: float
    discount: float
    total: float
    invoice_number: str
    status: str
    promotion_id: int | None = None
    price_list_id: int | None = None

    model_config = {"from_attributes": True}


class SaleListOut(BaseModel):
    id: int
    user_id: int
    customer_id: int | None
    status: str
    subtotal: float
    tax: float
    discount: float
    total: float
    invoice_number: str
    created_at: datetime

    model_config = {"from_attributes": True}
