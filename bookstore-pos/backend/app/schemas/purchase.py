from datetime import datetime

from pydantic import BaseModel, Field


class PurchaseItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    qty: int = Field(gt=0)
    unit_cost: float = Field(ge=0)


class PurchaseCreate(BaseModel):
    supplier_id: int = Field(gt=0)
    items: list[PurchaseItemCreate] = Field(min_length=1)
    direct_costs_breakdown: dict[str, float] = Field(default_factory=dict)
    total: float | None = Field(default=None, ge=0)


class PurchaseOut(BaseModel):
    id: int
    subtotal: float = 0
    direct_costs_total: float = 0
    total: float

    model_config = {"from_attributes": True}


class PurchaseListOut(BaseModel):
    id: int
    supplier_id: int
    subtotal: float = 0
    direct_costs_total: float = 0
    total: float
    created_at: datetime

    model_config = {"from_attributes": True}
