from pydantic import BaseModel
from datetime import datetime


class PurchaseItemCreate(BaseModel):
    product_id: int
    qty: int
    unit_cost: float


class PurchaseCreate(BaseModel):
    supplier_id: int
    items: list[PurchaseItemCreate]
    total: float


class PurchaseOut(BaseModel):
    id: int
    total: float

    model_config = {"from_attributes": True}


class PurchaseListOut(BaseModel):
    id: int
    supplier_id: int
    total: float
    created_at: datetime

    model_config = {"from_attributes": True}
