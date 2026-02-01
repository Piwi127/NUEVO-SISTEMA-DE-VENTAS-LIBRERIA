from pydantic import BaseModel


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
    total: float
    invoice_number: str

    model_config = {"from_attributes": True}
