from pydantic import BaseModel


class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    qty: int
    unit_cost: float


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    items: list[PurchaseOrderItemCreate]


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
    product_id: int
    qty: int


class ReceiveOrder(BaseModel):
    items: list[ReceiveItem]


class SupplierPaymentCreate(BaseModel):
    supplier_id: int
    amount: float
    method: str
    reference: str = ""
