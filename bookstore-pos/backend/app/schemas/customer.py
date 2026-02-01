from pydantic import BaseModel


class CustomerBase(BaseModel):
    name: str
    phone: str | None = None
    price_list_id: int | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    id: int

    model_config = {"from_attributes": True}
