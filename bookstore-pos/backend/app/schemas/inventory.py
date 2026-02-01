from datetime import datetime
from pydantic import BaseModel


class InventoryMovementCreate(BaseModel):
    product_id: int
    type: str  # IN / ADJ
    qty: int
    ref: str


class StockMovementOut(BaseModel):
    id: int
    product_id: int
    type: str
    qty: int
    ref: str
    created_at: datetime

    model_config = {"from_attributes": True}
