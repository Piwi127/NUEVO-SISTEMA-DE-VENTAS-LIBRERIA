from datetime import datetime

from pydantic import BaseModel


class SaleReturnCreate(BaseModel):
    reason: str = ""


class SaleReturnOut(BaseModel):
    id: int
    sale_id: int
    model_config = {"from_attributes": True}


class SaleReturnListOut(BaseModel):
    id: int
    sale_id: int
    invoice_number: str
    sale_status: str
    reason: str
    created_at: datetime
