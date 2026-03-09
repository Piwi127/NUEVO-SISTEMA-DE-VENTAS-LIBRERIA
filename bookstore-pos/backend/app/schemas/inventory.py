from datetime import datetime

from pydantic import BaseModel


class InventoryMovementCreate(BaseModel):
    product_id: int
    type: str  # IN / OUT / ADJ
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


class KardexPageOut(BaseModel):
    items: list[StockMovementOut]
    limit: int
    has_more: bool
    next_cursor: str | None = None


class InventoryImportJobOut(BaseModel):
    id: int
    created_by: int
    status: str
    filename: str
    file_type: str
    request_id: str | None = None
    batch_size: int
    total_rows: int
    processed_rows: int
    success_rows: int
    error_rows: int
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class InventoryImportJobErrorOut(BaseModel):
    id: int
    row_number: int
    sku: str | None = None
    detail: str
    raw_data: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InventoryImportJobErrorListOut(BaseModel):
    job_id: int
    total_errors: int
    items: list[InventoryImportJobErrorOut]
