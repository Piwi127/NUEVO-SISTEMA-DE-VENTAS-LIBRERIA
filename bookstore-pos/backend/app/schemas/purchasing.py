from pydantic import BaseModel, Field


class PurchaseOrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    qty: int = Field(gt=0)
    unit_cost: float = Field(ge=0)


class PurchaseOrderCreate(BaseModel):
    supplier_id: int = Field(gt=0)
    items: list[PurchaseOrderItemCreate] = Field(min_length=1)


class PurchaseOrderOut(BaseModel):
    id: int
    supplier_id: int
    status: str
    total: float
    model_config = {"from_attributes": True}


class PurchaseOrderItemOut(BaseModel):
    id: int
    purchase_order_id: int
    product_id: int
    qty: int
    unit_cost: float
    received_qty: int

    model_config = {"from_attributes": True}


class ReceiveItem(BaseModel):
    product_id: int = Field(gt=0)
    qty: int = Field(gt=0)


class ReceiveOrder(BaseModel):
    items: list[ReceiveItem] = Field(min_length=1)
    direct_costs_breakdown: dict[str, float] = Field(default_factory=dict)
    lot_prefix: str = "PO"


class SupplierPaymentCreate(BaseModel):
    supplier_id: int = Field(gt=0)
    amount: float = Field(gt=0)
    method: str = Field(min_length=1)
    reference: str = ""
