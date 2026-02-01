from pydantic import BaseModel


class WarehouseBase(BaseModel):
    name: str
    location: str = ""


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(WarehouseBase):
    pass


class WarehouseOut(WarehouseBase):
    id: int
    model_config = {"from_attributes": True}


class TransferItem(BaseModel):
    product_id: int
    qty: int


class TransferCreate(BaseModel):
    from_warehouse_id: int
    to_warehouse_id: int
    items: list[TransferItem]


class TransferOut(BaseModel):
    id: int
    status: str
    model_config = {"from_attributes": True}


class BatchCreate(BaseModel):
    product_id: int
    warehouse_id: int
    lot: str
    expiry_date: str = ""
    qty: int


class InventoryCountCreate(BaseModel):
    warehouse_id: int
    product_id: int
    counted_qty: int
