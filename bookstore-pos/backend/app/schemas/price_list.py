from pydantic import BaseModel


class PriceListBase(BaseModel):
    name: str


class PriceListCreate(PriceListBase):
    pass


class PriceListOut(PriceListBase):
    id: int
    model_config = {"from_attributes": True}


class PriceListItemCreate(BaseModel):
    product_id: int
    price: float


class PriceListItemOut(BaseModel):
    id: int
    product_id: int
    price: float
    model_config = {"from_attributes": True}
