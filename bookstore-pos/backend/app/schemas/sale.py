from pydantic import BaseModel, Field
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
    redeem_points: int = Field(default=0, ge=0)
    document_type: str = "TICKET"


class SaleOut(BaseModel):
    id: int
    subtotal: float
    tax: float
    discount: float
    pack_discount: float = 0
    promotion_discount: float = 0
    loyalty_discount: float = 0
    loyalty_points_earned: int = 0
    loyalty_points_redeemed: int = 0
    total: float
    invoice_number: str
    status: str
    promotion_id: int | None = None
    price_list_id: int | None = None
    document_type: str = "TICKET"

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
    document_type: str = "TICKET"
    created_at: datetime

    model_config = {"from_attributes": True}
