from pydantic import BaseModel


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
