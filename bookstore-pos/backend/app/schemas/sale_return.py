from pydantic import BaseModel


class SaleReturnCreate(BaseModel):
    reason: str = ""


class SaleReturnOut(BaseModel):
    id: int
    sale_id: int
    model_config = {"from_attributes": True}
